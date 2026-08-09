<?php

namespace Tests\Feature\Licence;

use App\Exceptions\PlafondAtteintException;
use App\Http\Middleware\EnforceLicence;
use App\Models\License;
use App\Models\MailRegistry;
use App\Models\Organization;
use App\Models\User;
use App\Services\CourrierService;
use App\Services\LicenceService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Plafond `courriers_mois` du palier Découverte — cahier IBIG SOFT v1.1,
 * sections 3.7, 8.5, 9.5 et 9.8, et porte de recette « PALIER DÉCOUVERTE »
 * de la section 13.
 *
 * AVERTISSEMENT SUR L'ENVIRONNEMENT DE TEST
 * -----------------------------------------
 * `phpunit.xml` laisse `DB_CONNECTION` en commentaire et il n'existe ni
 * `.env.testing` ni base `*_test` : sans précaution, ce test s'exécuterait sur
 * la base de PRODUCTION. Deux garde-fous :
 *   1. `DatabaseTransactions` — tout est annulé en fin de test ;
 *   2. `setUp()` refuse de démarrer si la base porte un nom de production.
 * Tant qu'une base de test n'existe pas, la recette passe par
 * `tests/manuel/licence-plafond-courriers.php`, qui prouve la même chose sans
 * dépendre de PHPUnit.
 */
class PlafondCourriersTest extends TestCase
{
    use DatabaseTransactions;

    private LicenceService $licence;
    private CourrierService $courrier;
    private string $compteur;
    private int $plafond;

    protected function setUp(): void
    {
        parent::setUp();

        $base = (string) config('database.connections.' . config('database.default') . '.database');

        if (str_contains($base, 'prod')) {
            $this->markTestSkipped(
                "Aucune base de test dédiée : la connexion pointe sur « {$base} ». "
                . 'Créez une base de recette et renseignez DB_DATABASE dans phpunit.xml '
                . 'avant d\'exécuter ce test. Recette de repli : '
                . 'php artisan tinker tests/manuel/licence-plafond-courriers.php'
            );
        }

        $this->licence  = app(LicenceService::class);
        $this->courrier = app(CourrierService::class);
        $this->compteur = CourrierService::COMPTEUR;
        $this->plafond  = (int) $this->licence->plafond($this->compteur);
    }

    // ─────────────────────────────────────────────────────────────────────────

    public function test_le_plafond_accepte_les_courriers_prevus_puis_refuse_le_suivant(): void
    {
        [$org, $user] = $this->espaceDecouverte();

        $this->assertSame('FREE', $this->licence->etat($org->id));
        $this->assertSame(0, $this->licence->usage($org->id, $this->compteur));

        for ($i = 1; $i <= $this->plafond; $i++) {
            $this->courrier->registerIncoming(
                ['subject' => "Courrier {$i}", 'urgency' => 'normal'],
                $user
            );
        }

        $this->assertSame(
            $this->plafond,
            MailRegistry::where('organization_id', $org->id)->count(),
            'Les courriers sous le plafond doivent tous être enregistrés.'
        );
        $this->assertSame($this->plafond, $this->licence->usage($org->id, $this->compteur));
        $this->assertFalse($this->licence->peutCreer($org->id, $this->compteur));

        $hitsAvant = DB::table('quota_hits')->where('organization_id', $org->id)->count();

        try {
            $this->courrier->registerIncoming(
                ['subject' => 'Courrier au-delà du plafond', 'urgency' => 'normal'],
                $user
            );
            $this->fail('Le courrier au-delà du plafond aurait dû être refusé.');
        } catch (PlafondAtteintException $e) {
            // Le texte n'est pas réécrit ici : on vérifie qu'il vient bien du moteur.
            $this->assertSame($this->licence->messageRefus($this->compteur), $e->getMessage());
        }

        // Données intactes : rien n'est supprimé, rien n'est masqué (section 3.7).
        $this->assertSame(
            $this->plafond,
            MailRegistry::where('organization_id', $org->id)->count(),
            'Un refus ne doit laisser aucun courrier partiel derrière lui.'
        );
        $this->assertSame(
            $this->plafond,
            $this->licence->usage($org->id, $this->compteur),
            'Un refus ne doit pas consommer de quota.'
        );

        // Tentative journalisée (section 9.8).
        $hits = DB::table('quota_hits')->where('organization_id', $org->id)->get();

        $this->assertCount($hitsAvant + 1, $hits);
        $this->assertSame($this->compteur, $hits->last()->compteur);
        $this->assertSame($this->plafond, (int) $hits->last()->plafond);
        $this->assertSame($this->plafond + 1, (int) $hits->last()->valeur_tentee);
        $this->assertSame((int) $user->id, (int) $hits->last()->user_id);
    }

    public function test_le_message_de_refus_respecte_le_vocabulaire_impose(): void
    {
        $message = mb_strtolower($this->licence->messageRefus($this->compteur));

        foreach ($this->licence->config()['termes_bannis'] as $terme) {
            $this->assertStringNotContainsString(mb_strtolower($terme), $message);
        }
    }

    public function test_le_compteur_mensuel_repart_a_zero_au_mois_suivant(): void
    {
        [$org, $user] = $this->espaceDecouverte();

        $this->courrier->registerIncoming(['subject' => 'Courrier', 'urgency' => 'normal'], $user);

        $periode  = trim($this->licence->periode($this->compteur));
        $suivante = \Carbon\Carbon::createFromFormat('Y-m', $periode)->addMonth()->format('Y-m');

        $this->assertTrue($this->licence->estMensuel($this->compteur));
        $this->assertSame(1, $this->licence->usage($org->id, $this->compteur));

        // Le mois suivant est une ligne distincte : il n'existe pas encore, donc
        // il vaut zéro. C'est la remise à zéro du 1er du mois, sans tâche à jouer.
        $valeurSuivante = DB::table('quotas_usage')
            ->where('organization_id', $org->id)
            ->where('solution', $this->licence->solution())
            ->where('compteur', $this->compteur)
            ->where('periode', $suivante)
            ->value('valeur');

        $this->assertNull($valeurSuivante);
    }

    public function test_la_suppression_ne_rend_une_place_que_sur_le_mois_courant(): void
    {
        [$org, $user] = $this->espaceDecouverte();

        // Les deux courriers sont enregistrés AVANT toute suppression : le
        // générateur de références recompte les courriers non supprimés, il
        // réémettrait donc une référence déjà prise (voir
        // `ecarterLesReferencesEnCollision`, même défaut produit).
        $recent = $this->courrier->registerIncoming(['subject' => 'Récent', 'urgency' => 'normal'], $user);
        $ancien = $this->courrier->registerIncoming(['subject' => 'Ancien', 'urgency' => 'normal'], $user);

        $this->assertSame(2, $this->licence->usage($org->id, $this->compteur));

        // Courrier du mois en cours : la place est rendue.
        $recent->delete();
        $this->courrier->decompterCourrier($recent);
        $this->assertSame(1, $this->licence->usage($org->id, $this->compteur));

        // Courrier d'un mois antérieur : la place du mois courant ne bouge pas,
        // sinon il suffirait d'archiver de vieux courriers pour se rouvrir le mois.
        $ancien->forceFill(['created_at' => now()->subMonths(2)])->save();

        $usageAvant = $this->licence->usage($org->id, $this->compteur);
        $ancien->delete();
        $this->courrier->decompterCourrier($ancien);

        $this->assertSame($usageAvant, $this->licence->usage($org->id, $this->compteur));
    }

    public function test_la_lecture_reste_ouverte_et_seule_lecriture_ferme_en_lecture_seule(): void
    {
        [$org, $user] = $this->espaceDecouverte();
        $this->licenceExpiree($org);

        $this->assertSame('EXPIRED', $this->licence->etat($org->id));

        $middleware = app(EnforceLicence::class);

        // Lecture : jamais bloquée, quel que soit l'état (section 2).
        $lecture = $this->requete('GET', '/courrier', $user);
        $reponse = $middleware->handle($lecture, fn () => response('registre'));
        $this->assertSame(200, $reponse->getStatusCode());
        $this->assertSame('registre', $reponse->getContent());

        // Écriture : refusée, avec un texte conforme au glossaire.
        $ecriture = $this->requete('POST', '/courrier', $user);
        $refus    = $middleware->handle($ecriture, fn () => response('ne doit pas passer'));

        $this->assertSame(403, $refus->getStatusCode());
        $this->assertStringNotContainsString('ne doit pas passer', (string) $refus->getContent());

        $charge = json_decode((string) $refus->getContent(), true);
        $this->assertSame('EXPIRED', $charge['licence']['etat']);
        $this->assertStringContainsString('lecture seule', mb_strtolower($charge['message']));

        foreach ($this->licence->config()['termes_bannis'] as $terme) {
            $this->assertStringNotContainsString(
                mb_strtolower($terme),
                mb_strtolower($charge['message'])
            );
        }
    }

    public function test_le_chemin_du_paiement_reste_ouvert_en_lecture_seule(): void
    {
        [$org, $user] = $this->espaceDecouverte();
        $this->licenceExpiree($org);

        $middleware = app(EnforceLicence::class);
        $reponse    = $middleware->handle(
            $this->requete('POST', '/abonnement/commander', $user),
            fn () => response('paiement')
        );

        $this->assertSame(200, $reponse->getStatusCode(), 'Un espace en lecture seule doit pouvoir payer.');
    }

    public function test_les_droits_fermes_le_sont_reellement_au_palier_decouverte(): void
    {
        [$org] = $this->espaceDecouverte();

        foreach (['export', 'api', 'multi_utilisateur', 'whatsapp', 'sms', 'sara'] as $droit) {
            $this->assertFalse(
                $this->licence->peut($org->id, $droit),
                "Le droit « {$droit} » doit rester fermé au palier Découverte."
            );
        }

        // Ce qui reste ouvert doit le rester : le palier bride le volume, pas l'usage.
        $this->assertTrue($this->licence->peut($org->id, 'ecriture'));
    }

    // ─── Utilitaires ─────────────────────────────────────────────────────────

    /** @return array{0: Organization, 1: User} */
    private function espaceDecouverte(): array
    {
        $this->ecarterLesReferencesEnCollision();

        $suffixe = 'recette-' . bin2hex(random_bytes(4));

        $org = Organization::create([
            'name'     => 'Espace de recette',
            'slug'     => $suffixe,
            'email'    => "{$suffixe}@exemple.test",
            'country'  => 'CI',
            'timezone' => 'Africa/Abidjan',
        ]);

        $user = User::create([
            'organization_id' => $org->id,
            'name'            => 'Agent de recette',
            'email'           => "agent-{$suffixe}@exemple.test",
            'password'        => bcrypt(bin2hex(random_bytes(8))),
        ]);

        return [$org, $user];
    }

    /** Une licence échue, grâce comprise : l'espace est en lecture seule. */
    private function licenceExpiree(Organization $org): License
    {
        // `status` n'est pas écrit : le déclencheur `licenses_sync_status_trg`
        // l'aligne sur `etat`.
        return License::create([
            'organization_id' => $org->id,
            'plan_id'         => 'recette',
            'plan_name'       => 'Recette',
            'etat'            => 'EXPIRED',
            'solution'        => $this->licence->solution(),
            'origine'         => 'migration',
            'cle_licence'     => 'RECETTE-' . bin2hex(random_bytes(8)),
            'starts_at'       => now()->subYear(),
            'ends_at'         => now()->subMonths(4),
            'grace_until'     => now()->subMonths(4)->addDays($this->licence->graceJours()),
            'date_purge'      => now()->addDays($this->licence->retentionJours()),
        ]);
    }

    private function requete(string $methode, string $uri, User $user): Request
    {
        $requete = Request::create($uri, $methode);
        $requete->headers->set('Accept', 'application/json');
        $requete->setUserResolver(fn () => $user);

        return $requete;
    }

    /**
     * DÉFAUT PRODUIT connu, étranger à cette surface :
     * `mail_registry.reference` est unique GLOBALEMENT alors que
     * `CourrierService::generateReference()` numérote PAR ORGANISATION. Le
     * premier courrier de tout nouvel espace entre donc en collision avec celui
     * du premier espace. On écarte les références concernées le temps du test —
     * `DatabaseTransactions` annule l'opération.
     */
    private function ecarterLesReferencesEnCollision(): void
    {
        $references = [];

        foreach (['ENTRANT', 'SORTANT'] as $prefixe) {
            for ($i = 1; $i <= $this->plafond + 3; $i++) {
                $references[] = sprintf('REF-%s-%d-%05d', $prefixe, now()->year, $i);
            }
        }

        DB::table('mail_registry')
            ->whereIn('reference', $references)
            ->update(['reference' => DB::raw("reference || '-ecartee-par-le-test'")]);
    }
}
