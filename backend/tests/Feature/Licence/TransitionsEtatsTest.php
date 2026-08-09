<?php

namespace Tests\Feature\Licence;

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
 * TRANSITIONS D'ÉTAT DE LICENCE — cahier IBIG SOFT v1.1, sections 2, 5.5, 5.6,
 * 9.6 et porte de recette « ESSAI ET ÉTATS » de la section 13.
 *
 * Un test par transition, plus les transitions INTERDITES : celles qui
 * supprimeraient des données sans avertissement, celles qui fermeraient à la
 * fois la lecture et l'écriture, et toute prolongation automatique.
 *
 * CE QUI EST VÉRIFIÉ, ET POURQUOI SOUS CETTE FORME
 * ------------------------------------------------
 * L'état d'un espace n'est pas une colonne : c'est un CALCUL fait à chaque
 * requête par `LicenceService::etat()`, à partir des dates et de la date du
 * serveur. Chaque test place donc l'espace dans une situation temporelle, puis
 * interroge le moteur — jamais la colonne `etat`, qui n'est qu'un cache. Un
 * test qui lirait la colonne passerait alors même que le calcul serait faux, et
 * ce sont les utilisateurs qui verraient le calcul, pas la colonne.
 *
 * AVERTISSEMENT SUR L'ENVIRONNEMENT DE TEST — IDENTIQUE À PlafondCourriersTest
 * ---------------------------------------------------------------------------
 * `phpunit.xml` laisse `DB_CONNECTION` en commentaire et il n'existe ni
 * `.env.testing` ni base de recette. Deux garde-fous :
 *   1. `DatabaseTransactions` — tout est annulé en fin de test ;
 *   2. `setUp()` refuse de démarrer si la base porte un nom de production.
 *
 * De plus, la migration du socle (`2026_08_09_000001_licence_six_etats`) est
 * écrite en PostgreSQL — contraintes `NOT VALID`, fonctions et déclencheurs
 * PL/pgSQL. Elle ne peut pas s'appliquer sur SQLite : ces tests exigent une
 * base PostgreSQL de recette, pas seulement « une base ». Voir le compte rendu.
 */
class TransitionsEtatsTest extends TestCase
{
    use DatabaseTransactions;

    private LicenceService $licence;

    protected function setUp(): void
    {
        parent::setUp();

        $base = (string) config('database.connections.' . config('database.default') . '.database');

        if (str_contains($base, 'prod')) {
            $this->markTestSkipped(
                "Aucune base de test dédiée : la connexion pointe sur « {$base} ». "
                . 'Créez une base PostgreSQL de recette et renseignez DB_DATABASE '
                . 'dans phpunit.xml avant d\'exécuter ces tests.'
            );
        }

        $this->licence = app(LicenceService::class);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TRANSITIONS ATTENDUES
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * VISITEUR → FREE.
     *
     * Un espace sans licence est en Découverte, pas en lecture seule. Le défaut
     * inverse bloquerait en écriture un client qui n'a rien fait de mal, le jour
     * même de son inscription.
     */
    public function test_visiteur_vers_free_un_espace_sans_licence_est_en_decouverte(): void
    {
        [$org] = $this->espace();

        $this->assertNull($this->licence->licence($org->id));
        $this->assertSame('FREE', $this->licence->etat($org->id));
        $this->assertTrue($this->licence->droits('FREE')['ecriture']);
        $this->assertTrue($this->licence->droits('FREE')['quotas']);
    }

    /** VISITEUR → TRIAL : la durée est imposée par la configuration, pas choisie. */
    public function test_visiteur_vers_trial_ouvre_un_essai_de_la_duree_configuree(): void
    {
        [$org, $user] = $this->espace();

        $licence = $this->licence->demarrerEssai($org->id, 'Pro', $user);

        $this->assertSame('TRIAL', $this->licence->etat($org->id));
        $this->assertNotNull($licence->ends_at, 'Un essai sans date de fin serait une licence perpétuelle.');

        $this->assertSame(
            $this->licence->essaiJours(),
            (int) now()->startOfDay()->diffInDays($licence->ends_at->startOfDay(), false),
            'La durée d\'essai doit être exactement celle de licence.config.json.'
        );

        // La date de purge est posée dès l'ouverture : échéance + grâce + rétention.
        $this->assertNotNull($licence->date_purge);
        $this->assertTrue($licence->date_purge->greaterThan($licence->ends_at));

        $this->assertTransitionJournalisee($org, null, 'TRIAL');
    }

    /**
     * TRIAL → FREE, automatique, AUCUNE DONNÉE PERDUE.
     *
     * C'est la transition la plus sensible du modèle : c'est celle où le client
     * perd des fonctions. S'il y perdait aussi des données, la promesse
     * commerciale tomberait avec.
     */
    public function test_trial_vers_free_est_automatique_et_ne_perd_aucune_donnee(): void
    {
        [$org, $user] = $this->espace();

        $licence = $this->licence->demarrerEssai($org->id, 'Pro', $user);

        // Des données produites pendant l'essai, au-delà du plafond gratuit.
        $compteur = CourrierService::COMPTEUR;
        $plafond  = (int) $this->licence->plafond($compteur);
        $courriers = $this->semerDesCourriers($org, $plafond + 3);

        $this->assertSame('TRIAL', $this->licence->etat($org->id));

        // L'échéance survient. Aucune tâche n'a encore tourné.
        $this->reculerEcheance($licence, jours: 1);

        // Le calcul bascule immédiatement, sans attendre la tâche de 03:00.
        $this->assertSame(
            'FREE',
            $this->licence->etat($org->id),
            'Un essai échu bascule en Découverte, jamais en lecture seule (décision D6).'
        );

        // AUCUNE donnée perdue.
        $this->assertSame(
            $courriers,
            MailRegistry::where('organization_id', $org->id)->count(),
            'La fin d\'un essai ne supprime rien.'
        );

        // L'écriture reste ouverte : c'est le volume qui est bridé, pas l'usage.
        $this->assertTrue($this->licence->droits('FREE')['ecriture']);

        // L'excédent est en lecture seule, mais VISIBLE : rien n'est masqué.
        $this->assertGreaterThan($plafond, $courriers);
        $this->assertSame(
            $courriers,
            MailRegistry::where('organization_id', $org->id)->count(),
            'L\'excédent au-delà du plafond reste visible, il n\'est ni masqué ni archivé.'
        );

        // Le recalcul quotidien ne fait que constater ; il ne décide rien de plus.
        $bilan = $this->licence->recalculerEtats();

        $this->assertGreaterThanOrEqual(1, $bilan['TRIAL_vers_FREE']);
        $this->assertSame('FREE', $licence->fresh()->etat);
        $this->assertSame($courriers, MailRegistry::where('organization_id', $org->id)->count());
        $this->assertTransitionJournalisee($org, 'TRIAL', 'FREE');
    }

    /** TRIAL → ACTIVE : le paiement pendant l'essai ouvre l'abonnement. */
    public function test_trial_vers_active_apres_paiement(): void
    {
        [$org, $user] = $this->espace();

        $licence   = $this->licence->demarrerEssai($org->id, 'Pro', $user);
        $courriers = $this->semerDesCourriers($org, 2);

        $this->activer($licence, 'TRIAL');

        $this->assertSame('ACTIVE', $this->licence->etat($org->id));
        $this->assertNotNull($licence->fresh()->ends_at);
        $this->assertSame($courriers, MailRegistry::where('organization_id', $org->id)->count());

        // Aucun plafond, aucun filigrane : les droits suivent l'état.
        $this->assertFalse($this->licence->droits('ACTIVE')['quotas']);
        $this->assertFalse($this->licence->droits('ACTIVE')['filigrane']);
        $this->assertTrue($this->licence->peut($org->id, 'export'));

        $this->assertTransitionJournalisee($org, 'TRIAL', 'ACTIVE');
    }

    /** FREE → ACTIVE : on peut payer sans être jamais passé par un essai. */
    public function test_free_vers_active_sans_passer_par_un_essai(): void
    {
        [$org] = $this->espace();

        $this->assertSame('FREE', $this->licence->etat($org->id));

        $courriers = $this->semerDesCourriers($org, 1);
        $licence   = $this->licenceDans('FREE', $org, fin: null);

        $this->activer($licence, 'FREE');

        $this->assertSame('ACTIVE', $this->licence->etat($org->id));
        $this->assertSame($courriers, MailRegistry::where('organization_id', $org->id)->count());
        $this->assertTransitionJournalisee($org, 'FREE', 'ACTIVE');
    }

    /** ACTIVE → GRACE : l'échéance ouvre la période de grâce, à accès complet. */
    public function test_active_vers_grace_maintient_l_acces_complet(): void
    {
        [$org] = $this->espace();

        $licence = $this->licenceDans('ACTIVE', $org, fin: now()->subDay());

        $this->assertSame('GRACE', $this->licence->etat($org->id));

        // Pendant la grâce, RIEN ne se ferme (section 2, tableau des droits).
        foreach (['ecriture', 'export', 'api', 'multi_utilisateur'] as $droit) {
            $this->assertTrue(
                $this->licence->peut($org->id, $droit),
                "La période de grâce ne ferme rien : « {$droit} » doit rester ouvert."
            );
        }

        $this->assertFalse($this->licence->droits('GRACE')['filigrane']);

        $complet = $this->licence->etatComplet($org->id);
        $this->assertSame('GRACE', $complet['etat']);
        $this->assertNotNull($complet['message']);
    }

    /** GRACE → ACTIVE : le renouvellement pendant la grâce rétablit tout. */
    public function test_grace_vers_active_par_renouvellement(): void
    {
        [$org] = $this->espace();

        $courriers = $this->semerDesCourriers($org, 2);
        $licence   = $this->licenceDans('ACTIVE', $org, fin: now()->subDay());

        $this->assertSame('GRACE', $this->licence->etat($org->id));

        $this->activer($licence, 'GRACE');

        $this->assertSame('ACTIVE', $this->licence->etat($org->id));
        $this->assertSame($courriers, MailRegistry::where('organization_id', $org->id)->count());
        $this->assertTransitionJournalisee($org, 'GRACE', 'ACTIVE');
    }

    /** GRACE → EXPIRED : la grâce épuisée ferme l'écriture, et elle seule. */
    public function test_grace_vers_expired_ferme_l_ecriture_et_conserve_les_donnees(): void
    {
        [$org] = $this->espace();

        $courriers = $this->semerDesCourriers($org, 3);

        $fin = now()->subDays($this->licence->graceJours() + 2);
        $this->licenceDans('ACTIVE', $org, fin: $fin);

        $this->assertSame('EXPIRED', $this->licence->etat($org->id));

        // Écriture fermée…
        $this->assertFalse($this->licence->droits('EXPIRED')['ecriture']);

        // …mais rien n'est supprimé, et la date de purge est dans le futur.
        $this->assertSame($courriers, MailRegistry::where('organization_id', $org->id)->count());

        $licence = $this->licence->licence($org->id);
        $this->assertNotNull($licence->date_purge);
        $this->assertTrue(
            $licence->date_purge->greaterThan(now()),
            'La purge est planifiée, jamais immédiate.'
        );
    }

    /** EXPIRED → ACTIVE : la réactivation restitue TOUT, sans perte. */
    public function test_expired_vers_active_restitue_integralement_les_donnees(): void
    {
        [$org] = $this->espace();

        $courriers = $this->semerDesCourriers($org, 4);

        $fin     = now()->subDays($this->licence->graceJours() + 10);
        $licence = $this->licenceDans('ACTIVE', $org, fin: $fin);

        $this->assertSame('EXPIRED', $this->licence->etat($org->id));

        $this->activer($licence, 'EXPIRED');

        $this->assertSame('ACTIVE', $this->licence->etat($org->id));

        // Restauration INTÉGRALE : le compte des enregistrements ne bouge pas
        // d'un cran entre avant l'expiration et après la réactivation.
        $this->assertSame(
            $courriers,
            MailRegistry::where('organization_id', $org->id)->count(),
            'La réactivation restitue l\'intégralité des données.'
        );

        // Et tous les droits sont rouverts.
        foreach (['ecriture', 'export', 'api', 'multi_utilisateur', 'sara'] as $droit) {
            $this->assertTrue($this->licence->peut($org->id, $droit));
        }

        $this->assertTransitionJournalisee($org, 'EXPIRED', 'ACTIVE');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // TRANSITIONS INTERDITES
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * INTERDIT — aucune transition ne supprime de données sans avertissement.
     *
     * Le test parcourt toute la chronologie d'un espace abandonné : essai,
     * Découverte, abonnement, grâce, lecture seule. À aucune étape le nombre
     * d'enregistrements ne doit varier, et la date de purge doit rester
     * annoncée et future.
     */
    public function test_interdit_aucune_transition_ne_supprime_de_donnees_sans_avertissement(): void
    {
        [$org, $user] = $this->espace();

        $licence   = $this->licence->demarrerEssai($org->id, 'Pro', $user);
        $attendus  = $this->semerDesCourriers($org, 4);

        $etapes = [
            'fin d\'essai'      => fn () => $this->reculerEcheance($licence, 1),
            'grâce'             => fn () => $this->deplacer($licence, 'ACTIVE', now()->subDay()),
            'lecture seule'     => fn () => $this->deplacer($licence, 'ACTIVE', now()->subDays($this->licence->graceJours() + 5)),
        ];

        foreach ($etapes as $nom => $etape) {
            $etape();
            $this->licence->recalculerEtats();

            $this->assertSame(
                $attendus,
                MailRegistry::where('organization_id', $org->id)->count(),
                "L'étape « {$nom} » ne doit supprimer aucun enregistrement."
            );
        }

        // Après la lecture seule, la suppression reste ANNONCÉE et FUTURE :
        // c'est ce qui laisse la place aux deux avertissements avant purge.
        $fraiche = $licence->fresh();

        $this->assertSame('EXPIRED', $this->licence->etat($org->id));
        $this->assertNotNull($fraiche->date_purge, 'Une purge non datée ne peut pas être annoncée.');
        $this->assertTrue($fraiche->date_purge->greaterThan(now()));

        $this->assertGreaterThanOrEqual(
            $this->licence->retentionJours(),
            (int) now()->startOfDay()->diffInDays($fraiche->date_purge->startOfDay(), false)
                + $this->licence->graceJours() + 5,
            'Le délai de conservation doit être au moins celui de la configuration.'
        );
    }

    /**
     * INTERDIT — aucun état ne ferme simultanément la lecture et l'écriture.
     *
     * On ne se contente pas de lire la table des droits : on fait passer une
     * requête de lecture par le contrôle réel. Un tableau bien rempli et un
     * middleware trop zélé donneraient exactement le même tableau, et pourtant
     * un client enfermé dehors.
     */
    public function test_interdit_aucun_etat_ne_ferme_a_la_fois_la_lecture_et_l_ecriture(): void
    {
        [$org, $user] = $this->espace();

        $middleware = app(EnforceLicence::class);

        foreach (LicenceService::ETATS as $etat) {
            $this->poserEtat($org, $etat);

            $requete = Request::create('/courrier', 'GET');
            $requete->headers->set('Accept', 'application/json');
            $requete->setUserResolver(fn () => $user);

            $reponse = $middleware->handle($requete, fn () => response('registre'));

            $this->assertSame(
                200,
                $reponse->getStatusCode(),
                "L'état « {$etat} » ne doit jamais fermer la lecture."
            );
            $this->assertSame('registre', $reponse->getContent());
        }
    }

    /**
     * INTERDIT — aucune prolongation automatique.
     *
     * Ni le recalcul quotidien, ni une seconde demande de prolongation ne
     * peuvent repousser une échéance.
     */
    public function test_interdit_aucune_prolongation_automatique(): void
    {
        [$org, $user] = $this->espace();

        $licence = $this->licence->demarrerEssai($org->id, 'Pro', $user);
        $avant   = $licence->fresh()->ends_at->copy();

        // Le recalcul quotidien ne repousse jamais une date de fin.
        $this->licence->recalculerEtats();
        $this->assertTrue($avant->equalTo($licence->fresh()->ends_at));

        // Une prolongation est manuelle, motivée, et unique.
        $this->licence->prolongerEssai($org->id, $user, 'Recette : première et unique prolongation.');

        $apres = $licence->fresh();
        $this->assertTrue($apres->prolongation_faite);
        $this->assertSame(
            (int) $this->licence->config()['prolongation_jours'],
            (int) $avant->diffInDays($apres->ends_at)
        );

        // La seconde est refusée.
        $this->expectException(\RuntimeException::class);
        $this->licence->prolongerEssai($org->id, $user, 'Recette : seconde tentative.');
    }

    /** INTERDIT — une prolongation sans motif n'est pas une prolongation. */
    public function test_interdit_prolongation_sans_motif(): void
    {
        [$org, $user] = $this->espace();

        $this->licence->demarrerEssai($org->id, 'Pro', $user);

        $this->expectException(\RuntimeException::class);
        $this->licence->prolongerEssai($org->id, $user, '   ');
    }

    /** INTERDIT — un second essai sur un espace qui en a déjà un. */
    public function test_interdit_deuxieme_essai_sur_un_espace_deja_servi(): void
    {
        [$org, $user] = $this->espace();

        $this->licence->demarrerEssai($org->id, 'Pro', $user);

        $this->expectException(\RuntimeException::class);
        $this->licence->demarrerEssai($org->id, 'Pro', $user);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // AUCUNE LICENCE SANS DATE DE FIN
    // ═════════════════════════════════════════════════════════════════════════

    /** Décision D5 : hors DEMO et FREE, toute licence porte une date de fin. */
    public function test_aucune_licence_sans_date_de_fin_dans_la_base(): void
    {
        $fautives = DB::table('licenses')
            ->whereNull('ends_at')
            ->whereNotNull('etat')
            ->whereNotIn('etat', LicenceService::SANS_ECHEANCE)
            ->get(['id', 'organization_id', 'etat']);

        $this->assertCount(
            0,
            $fautives,
            'Licences sans date de fin : ' . $fautives->pluck('id')->implode(', ')
        );
    }

    /** Et le moteur n'en fabrique jamais : l'essai qu'il ouvre est daté. */
    public function test_le_moteur_ne_cree_jamais_de_licence_sans_date_de_fin(): void
    {
        [$org, $user] = $this->espace();

        $licence = $this->licence->demarrerEssai($org->id, 'Pro', $user);

        $this->assertNotNull($licence->ends_at);
        $this->assertNotNull($licence->grace_until);
        $this->assertNotNull($licence->date_purge);
        $this->assertNotContains($licence->etat, LicenceService::SANS_ECHEANCE);
    }

    /**
     * La contrainte de base refuse elle-même l'insertion.
     *
     * C'est la seule vérification qui survivrait à une réécriture complète du
     * service : tant que `licenses_jamais_perpetuelle` tient, aucun code, aucun
     * script d'import et aucune console ne peut créer une licence sans terme.
     * La contrainte est écrite en PostgreSQL ; ailleurs, le test le dit.
     */
    public function test_la_contrainte_de_base_refuse_une_licence_perpetuelle(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->markTestSkipped(
                'La contrainte `licenses_jamais_perpetuelle` est une contrainte PostgreSQL. '
                . 'Sur ' . DB::connection()->getDriverName() . ', elle n\'existe pas : le test '
                . 'ne prouverait rien.'
            );
        }

        [$org] = $this->espace();

        $this->expectException(\Illuminate\Database\QueryException::class);

        License::create([
            'organization_id' => $org->id,
            'plan_id'         => 'recette',
            'plan_name'       => 'Recette',
            'etat'            => 'ACTIVE',
            'solution'        => $this->licence->solution(),
            'origine'         => 'migration',
            'cle_licence'     => 'RECETTE-' . bin2hex(random_bytes(8)),
            'starts_at'       => now(),
            'ends_at'         => null,   // ← ce que la contrainte doit refuser
        ]);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Utilitaires
    // ═════════════════════════════════════════════════════════════════════════

    /** @return array{0: Organization, 1: User} */
    private function espace(): array
    {
        $suffixe = 'recette-' . bin2hex(random_bytes(4));

        $org = Organization::create([
            'name'     => 'Espace de recette (états)',
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

    /**
     * Sème des courriers SANS passer par CourrierService.
     *
     * Le service applique le plafond et génère des références en collision avec
     * celles des autres espaces (défaut connu, documenté dans
     * PlafondCourriersTest). Ici on veut seulement des données à ne pas perdre :
     * l'insertion directe est la façon la plus honnête de les obtenir sans
     * dépendre du comportement qu'on est en train de tester.
     *
     * @return int le nombre d'enregistrements présents après l'ensemencement
     */
    private function semerDesCourriers(Organization $org, int $combien): int
    {
        for ($i = 1; $i <= $combien; $i++) {
            DB::table('mail_registry')->insert([
                'organization_id' => $org->id,
                'reference'       => 'RECETTE-' . bin2hex(random_bytes(8)),
                'subject'         => "Courrier de recette {$i}",
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }

        return MailRegistry::where('organization_id', $org->id)->count();
    }

    /** Crée une licence dans l'état voulu, avec la date de fin donnée. */
    private function licenceDans(string $etat, Organization $org, ?\Carbon\Carbon $fin): License
    {
        $existante = $this->licence->licence($org->id);
        $existante?->update(['superseded_at' => now()]);

        return License::create([
            'organization_id' => $org->id,
            'plan_id'         => 'recette',
            'plan_name'       => 'Recette',
            'etat'            => $etat,
            'solution'        => $this->licence->solution(),
            'origine'         => 'migration',
            'cle_licence'     => 'RECETTE-' . bin2hex(random_bytes(8)),
            'starts_at'       => now()->subYear(),
            'ends_at'         => $fin,
            'grace_until'     => $fin?->copy()->addDays($this->licence->graceJours()),
            'date_purge'      => $fin?->copy()->addDays(
                $this->licence->graceJours() + $this->licence->retentionJours()
            ),
        ]);
    }

    /** Place l'espace dans un état donné, pour les parcours exhaustifs. */
    private function poserEtat(Organization $org, string $etat): void
    {
        $fin = match ($etat) {
            'DEMO', 'FREE' => null,
            'GRACE'        => now()->subDay(),
            'EXPIRED'      => now()->subDays($this->licence->graceJours() + 5),
            default        => now()->addDays(30),
        };

        // GRACE et EXPIRED sont des états CALCULÉS à partir d'un abonnement échu :
        // les écrire tels quels laisserait le calcul les recouvrir.
        $stocke = in_array($etat, ['GRACE', 'EXPIRED'], true) ? 'ACTIVE' : $etat;

        $this->licenceDans($stocke, $org, $fin);

        $this->assertSame($etat, $this->licence->etat($org->id), "Mise en place de l'état {$etat}.");
    }

    /** Fait comme si le temps avait passé : la date de fin recule dans le passé. */
    private function reculerEcheance(License $licence, int $jours): void
    {
        $nouvelleFin = now()->subDays($jours);

        $licence->forceFill([
            'ends_at'     => $nouvelleFin,
            'grace_until' => $nouvelleFin->copy()->addDays($this->licence->graceJours()),
            'date_purge'  => $nouvelleFin->copy()->addDays(
                $this->licence->graceJours() + $this->licence->retentionJours()
            ),
        ])->save();
    }

    private function deplacer(License $licence, string $etat, \Carbon\Carbon $fin): void
    {
        $licence->forceFill([
            'etat'        => $etat,
            'ends_at'     => $fin,
            'grace_until' => $fin->copy()->addDays($this->licence->graceJours()),
            'date_purge'  => $fin->copy()->addDays(
                $this->licence->graceJours() + $this->licence->retentionJours()
            ),
        ])->save();
    }

    /**
     * Active une formule, comme le ferait la console après un paiement.
     *
     * La date de fin est obligatoire : c'est tout l'objet de la décision D5.
     */
    private function activer(License $licence, string $depuis): void
    {
        $fin = now()->addDays(30);

        $licence->forceFill([
            'etat'        => 'ACTIVE',
            'ends_at'     => $fin,
            'grace_until' => $fin->copy()->addDays($this->licence->graceJours()),
            'date_purge'  => $fin->copy()->addDays(
                $this->licence->graceJours() + $this->licence->retentionJours()
            ),
        ])->save();

        $this->licence->journaliser($licence, $depuis, 'ACTIVE', 'Activation après paiement (recette)', 'systeme');
    }

    private function assertTransitionJournalisee(Organization $org, ?string $avant, string $apres): void
    {
        $requete = DB::table('license_transitions')
            ->where('organization_id', $org->id)
            ->where('etat_apres', $apres);

        $avant === null
            ? $requete->whereNull('etat_avant')
            : $requete->where('etat_avant', $avant);

        $this->assertTrue(
            $requete->exists(),
            sprintf(
                'La transition %s → %s doit être journalisée : sans journal, une '
                . 'contestation de facturation ne peut pas être tranchée.',
                $avant ?? '(aucun)',
                $apres
            )
        );
    }
}
