<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\Organization;
use App\Services\LicenceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * Console superadmin des licences — cahier IBIG SOFT v1.1, section 12.6.
 *
 * CE QUE CE CONTRÔLEUR NE FAIT PAS, ET POURQUOI
 *
 *   1. Il ne calcule aucun état. `LicenceService::etat()` est la seule autorité
 *      (section 2). Recalculer ici produirait une console qui affirme un état
 *      différent de celui que l'application applique — le pire des deux mondes,
 *      parce que le superadmin croirait voir la vérité.
 *
 *   2. Il n'écrit aucune durée, aucun plafond, aucun prix. Tout vient de
 *      `licence.config.json` par le moteur, et descend tel quel dans les props
 *      Inertia : la page React n'a donc rien à deviner ni à formater à partir
 *      d'un nombre inventé.
 *
 *   3. Il ne modifie jamais `license_transitions`. La table refuse UPDATE et
 *      DELETE par déclencheur ; la console se contente de lire. Un journal
 *      qu'un administrateur peut retoucher ne prouve plus rien.
 *
 * LES INTERDITS DE LA SECTION 12.6 SONT REFUSÉS CÔTÉ SERVEUR, pas seulement
 * absents de l'écran. Masquer un champ n'empêche personne d'appeler la route :
 * voir `refuserChampsImposes()`.
 */
class LicencesController extends Controller
{
    /**
     * Fenêtre de préavis du tableau de bord — « espaces à J-3 d'échéance »
     * (section 12.6). Ce n'est ni une durée de licence, ni un plafond : c'est
     * un réglage d'affichage de la console. Il n'a pas d'entrée dans
     * `licence.config.json` — signalé dans le compte rendu plutôt que d'ajouter
     * une clé au fichier, qui ne m'appartient pas.
     */
    private const PREAVIS_ECHEANCE_JOURS = 3;

    /**
     * Seuil de l'alerte commerciale — « espaces ayant buté 5 fois ou plus sur
     * un plafond » (section 12.6). Même remarque : réglage de console, pas
     * paramètre de licence.
     */
    private const SEUIL_PROSPECT_CHAUD = 5;

    /** Champs qu'aucune requête ne peut porter : ils encodent les interdits 12.6. */
    private const CHAMPS_IMPOSES = [
        'jours', 'duree', 'duree_jours', 'essai_jours', 'trial_days',
        'ends_at', 'date_fin', 'expires_at', 'grace_until', 'date_purge',
        'plafond', 'plafonds', 'quota', 'quotas', 'max_users', 'limite',
        'etat', 'status',
    ];

    /** @var list<array<string,mixed>>|null */
    private ?array $espacesMemo = null;

    public function __construct(private readonly LicenceService $licence)
    {
        $this->middleware(['auth', 'role:super_admin']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/licences — tableau de bord + liste des espaces
    // ─────────────────────────────────────────────────────────────────────────

    public function index(Request $request): InertiaResponse
    {
        $filtreEtat = $request->string('etat')->toString();
        $recherche  = trim($request->string('q')->toString());

        if ($filtreEtat !== '' && ! in_array($filtreEtat, LicenceService::ETATS, true)) {
            // « jamais d'état maison » : un filtre inconnu est ignoré, pas
            // interprété. Le silence vaut mieux qu'une liste filtrée sur un
            // critère que personne ne pourrait nommer.
            $filtreEtat = '';
        }

        $espaces = $this->espaces();

        $repartition = array_fill_keys(LicenceService::ETATS, 0);
        foreach ($espaces as $espace) {
            $repartition[$espace['etat']] = ($repartition[$espace['etat']] ?? 0) + 1;
        }

        $visibles = array_values(array_filter($espaces, function (array $e) use ($filtreEtat, $recherche) {
            if ($filtreEtat !== '' && $e['etat'] !== $filtreEtat) {
                return false;
            }
            if ($recherche === '') {
                return true;
            }
            $foin = mb_strtolower($e['nom'] . ' ' . ($e['email'] ?? '') . ' ' . ($e['formule'] ?? ''));

            return str_contains($foin, mb_strtolower($recherche));
        }));

        return Inertia::render('SuperAdmin/Licences/Index', [
            'reglages'      => $this->reglages(),
            'etats'         => LicenceService::ETATS,
            'repartition'   => $repartition,
            'conversion'    => $this->conversion(),
            'echeances'     => $this->echeances($espaces),
            'prospects'     => $this->prospectsChauds(),
            'espaces'       => $visibles,
            'total'         => count($espaces),
            'incoherences'  => $this->incoherences(),
            'filtres'       => ['etat' => $filtreEtat, 'q' => $recherche],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/licences/{organisation} — fiche d'un espace
    // ─────────────────────────────────────────────────────────────────────────

    public function show(int $organisation): InertiaResponse
    {
        $org     = Organization::findOrFail($organisation);
        $licence = $this->licence->licence($org->id);
        $complet = $this->licence->etatComplet($org->id);
        $etat    = $complet['etat'];

        return Inertia::render('SuperAdmin/Licences/Show', [
            'reglages' => $this->reglages(),
            'espace'   => [
                'id'       => $org->id,
                'nom'      => $org->name,
                'email'    => $org->email,
                'pays'     => $org->country,
                'fuseau'   => $org->timezone,
                'actif'    => (bool) $org->is_active,
                'cree_le'  => $org->created_at?->toIso8601String(),
            ],
            'licence'   => $licence ? $this->exposerLicence($licence) : null,
            'etat'      => $etat,
            'etatStocke' => $licence?->etat,
            'complet'   => $complet,
            'droits'    => $this->licence->droits($etat),
            'quotas'    => $this->quotasDetailles($org),
            'journal'   => $this->journal($org->id),
            'butees'    => $this->buteesEspace($org->id),
            'formules'  => $this->formules(),
            'actions'   => $this->actionsPossibles($org->id, $etat, $licence),
            'incoherences' => $this->incoherencesEspace($org->id),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ACTIONS (section 12.6)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Démarrer un essai.
     *
     * La durée n'est PAS un paramètre : elle est imposée par la configuration
     * (section 6, décision D4). La requête ne peut pas en porter une — c'est
     * l'interdit « modifier une durée d'essai au cas par cas », rendu
     * impossible plutôt que déconseillé.
     */
    public function demarrerEssai(Request $request, int $organisation): RedirectResponse
    {
        $this->refuserChampsImposes($request);

        $donnees = $request->validate([
            'formule' => ['required', 'string', 'exists:plans,slug'],
        ]);

        Organization::findOrFail($organisation);

        try {
            $this->licence->demarrerEssai(
                $organisation,
                $donnees['formule'],
                $request->user(),
            );
        } catch (\RuntimeException $e) {
            throw ValidationException::withMessages(['formule' => $e->getMessage()]);
        }

        return back()->with('success', sprintf(
            'Essai démarré pour %d jour(s).',
            $this->licence->essaiJours(),
        ));
    }

    /**
     * Prolonger l'essai — une seule fois, motif obligatoire.
     *
     * Le nombre de jours n'est pas saisi : il vient de la configuration. Le
     * moteur refuse déjà la seconde prolongation ; la console ne fait que
     * transmettre son refus, elle ne le rejoue pas avec ses propres règles.
     */
    public function prolonger(Request $request, int $organisation): RedirectResponse
    {
        $this->refuserChampsImposes($request);

        $donnees = $request->validate([
            'motif' => ['required', 'string', 'min:10', 'max:500'],
        ], [], ['motif' => 'motif de prolongation']);

        try {
            $this->licence->prolongerEssai($organisation, $request->user(), $donnees['motif']);
        } catch (\RuntimeException $e) {
            throw ValidationException::withMessages(['motif' => $e->getMessage()]);
        }

        return back()->with('success', sprintf(
            'Essai prolongé de %d jour(s). Cette prolongation ne pourra pas être répétée.',
            (int) $this->licence->config()['prolongation_jours'],
        ));
    }

    /**
     * Activer une formule après paiement.
     *
     * La date de fin est CALCULÉE à partir de la durée de la formule
     * (`plans.duration_months`) : la console ne la saisit pas et ne peut pas
     * l'omettre. C'est l'interdit « créer une licence sans date de fin » rendu
     * structurellement impossible — la contrainte
     * `licenses_jamais_perpetuelle` sert de dernier rempart en base.
     *
     * Le moteur ne porte pas d'`activerFormule()` : cette transition est donc
     * écrite ici, mais journalisée par `LicenceService::journaliser()` pour que
     * le journal reste unique. Signalé dans le compte rendu.
     */
    public function activer(Request $request, int $organisation): RedirectResponse
    {
        $this->refuserChampsImposes($request);

        $donnees = $request->validate([
            'formule'   => ['required', 'string', 'exists:plans,slug'],
            'reference' => ['required', 'string', 'min:3', 'max:120'],
        ], [], ['reference' => 'référence de paiement']);

        $org  = Organization::findOrFail($organisation);
        $plan = DB::table('plans')->where('slug', $donnees['formule'])->first();

        $mois = max(1, (int) ($plan->duration_months ?? 1));

        DB::transaction(function () use ($org, $plan, $mois, $donnees, $request) {
            $avant     = $this->licence->etat($org->id);
            $precedente = $this->licence->licence($org->id);

            if ($precedente && $this->colonneExiste('superseded_at')) {
                $precedente->superseded_at = now();
                $precedente->save();
            }

            $fin = now()->addMonths($mois)->endOfDay();

            // Attributs posés un par un, jamais par assignation de masse : le
            // modèle License ne déclare pas `etat`, `solution`, `date_purge` ni
            // `origine` dans `$fillable`. Un `create()` les jetterait en
            // silence et produirait une licence sans état — voir compte rendu.
            $nouvelle = new License();
            $nouvelle->organization_id = $org->id;
            $nouvelle->plan_id         = $plan->slug;
            $nouvelle->plan_name       = $plan->name;
            $nouvelle->price           = (float) ($plan->price_xof ?? 0);
            $nouvelle->billing_cycle   = $mois >= 12 ? 'yearly' : 'monthly';
            $nouvelle->max_users       = (int) ($plan->max_users ?? 1);
            $nouvelle->modules         = $plan->modules ? json_decode($plan->modules, true) : null;
            $nouvelle->etat            = 'ACTIVE';
            $nouvelle->status          = 'active'; // réécrit par le déclencheur d'alignement
            $nouvelle->solution        = $this->licence->solution();
            $nouvelle->origine         = 'paiement';
            $nouvelle->external_ref    = $donnees['reference'];
            $nouvelle->starts_at       = now();
            $nouvelle->ends_at         = $fin;
            $nouvelle->grace_until     = $fin->copy()->addDays($this->licence->graceJours());
            $nouvelle->date_purge      = $fin->copy()
                ->addDays($this->licence->graceJours() + $this->licence->retentionJours());
            $nouvelle->activated_by    = $request->user()?->id;
            $nouvelle->save();

            $this->licence->journaliser(
                $nouvelle,
                $avant,
                'ACTIVE',
                sprintf('Activation de la formule %s après paiement — référence %s', $plan->name, $donnees['reference']),
                'paiement',
                $request->user(),
                ['formule' => $plan->slug, 'mois' => $mois, 'reference' => $donnees['reference']],
            );
        });

        return back()->with('success', sprintf('Formule %s activée.', $plan->name));
    }

    /**
     * Exporter les données d'un espace, à la demande du client.
     *
     * L'export est journalisé : un transfert de données hors de la plateforme
     * doit laisser une trace nominative. L'état ne change pas — le journal
     * porte donc le même état avant et après, avec la cause pour seule
     * information nouvelle.
     */
    public function exporter(Request $request, int $organisation): JsonResponse
    {
        $org = Organization::with('users')->findOrFail($organisation);

        $etat    = $this->licence->etat($org->id);
        $licence = $this->licence->licence($org->id);

        $this->licence->journaliser(
            $licence,
            $etat,
            $etat,
            'Export des données de l\'espace à la demande du client',
            'superadmin',
            $request->user(),
            ['espace' => $org->name],
        );

        $charge = [
            'exporte_le'   => now()->toIso8601String(),
            'exporte_par'  => $request->user()?->email,
            'espace'       => $org->only(['id', 'name', 'slug', 'email', 'country', 'timezone', 'created_at']),
            'utilisateurs' => $org->users->map->only(['id', 'name', 'email', 'created_at']),
            'licence'      => $licence ? $this->exposerLicence($licence) : null,
            'etat'         => $this->licence->etatComplet($org->id),
            'quotas'       => $this->quotasDetailles($org),
            'journal'      => $this->journal($org->id, null),
        ];

        return response()
            ->json($charge, 200, [], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            ->header('Content-Disposition', sprintf('attachment; filename="espace-%d-licence.json"', $org->id));
    }

    /**
     * Déclencher une purge.
     *
     * Quatre verrous, dans cet ordre :
     *   1. la rétention doit être échue (`date_purge` dépassée) ;
     *   2. deux confirmations distinctes ;
     *   3. le nom exact de l'espace, saisi à la main ;
     *   4. une référence de sauvegarde froide — l'interdit « supprimer un
     *      espace sans journalisation ni sauvegarde froide » n'est pas un
     *      conseil : sans référence, la requête est refusée.
     *
     * La suppression elle-même n'est PAS câblée ici : la demande est validée,
     * journalisée, et remise à l'exploitation. Une console qui peut effacer
     * huit organisations de production sur un double-clic n'est pas un
     * garde-fou, c'est un risque. Le point de raccordement est signalé dans le
     * compte rendu.
     */
    public function purger(Request $request, int $organisation): RedirectResponse
    {
        $this->refuserChampsImposes($request);

        $org = Organization::findOrFail($organisation);

        $donnees = $request->validate([
            'nom_espace'        => ['required', 'string'],
            'confirmation_une'  => ['accepted'],
            'confirmation_deux' => ['accepted'],
            'sauvegarde_froide' => ['required', 'string', 'min:3', 'max:200'],
        ], [], [
            'nom_espace'        => 'nom de l\'espace',
            'sauvegarde_froide' => 'référence de sauvegarde froide',
        ]);

        if ($donnees['nom_espace'] !== $org->name) {
            throw ValidationException::withMessages([
                'nom_espace' => 'Le nom saisi ne correspond pas à celui de l\'espace.',
            ]);
        }

        $licence = $this->licence->licence($org->id);
        $etat    = $this->licence->etat($org->id);

        if ($etat !== 'EXPIRED') {
            throw ValidationException::withMessages([
                'nom_espace' => 'Seul un espace expiré peut être purgé. Cet espace est en ' . $etat . '.',
            ]);
        }

        $purge = $licence?->date_purge ? Carbon::parse($licence->date_purge) : null;

        if (! $purge || $purge->isFuture()) {
            throw ValidationException::withMessages([
                'nom_espace' => $purge
                    ? 'La rétention court jusqu\'au ' . $purge->format('d/m/Y') . '. La purge est refusée avant cette date.'
                    : 'Cet espace n\'a pas de date de purge : la rétention ne peut pas être vérifiée.',
            ]);
        }

        $this->licence->journaliser(
            $licence,
            $etat,
            $etat,
            'Purge demandée — sauvegarde froide : ' . $donnees['sauvegarde_froide'],
            'superadmin',
            $request->user(),
            [
                'espace'            => $org->name,
                'sauvegarde_froide' => $donnees['sauvegarde_froide'],
                'date_purge'        => $purge->toDateString(),
                'executee'          => false,
            ],
        );

        return back()->with('success',
            'Demande de purge enregistrée et journalisée. La suppression est remise à '
            . 'l\'exploitation : la console ne supprime aucune donnée elle-même.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lectures
    // ─────────────────────────────────────────────────────────────────────────

    /** Tout ce que la page a besoin de savoir sans jamais l'écrire elle-même. */
    private function reglages(): array
    {
        $config = $this->licence->config();

        return [
            'solution'           => $this->licence->solution(),
            'nom_solution'       => $this->licence->nomSolution(),
            'essai_jours'        => $this->licence->essaiJours(),
            'grace_jours'        => $this->licence->graceJours(),
            'retention_jours'    => $this->licence->retentionJours(),
            'prolongation_jours' => (int) $config['prolongation_jours'],
            'prolongation_max'   => (int) $config['prolongation_max'],
            'palier_gratuit'     => $config['gratuit']['nom'],
            'plafonds'           => $this->licence->plafonds(),
            'plafond_resume'     => $this->licence->resumePlafond(),
            'glossaire'          => $config['glossaire'],
            'preavis_jours'      => self::PREAVIS_ECHEANCE_JOURS,
            'seuil_prospect'     => self::SEUIL_PROSPECT_CHAUD,
        ];
    }

    /**
     * Un enregistrement par espace, état calculé par le moteur.
     *
     * Le parcours est fait espace par espace, sans jointure : l'état n'est pas
     * une colonne mais un calcul, et le reproduire en SQL créerait une seconde
     * autorité. Le portefeuille se compte en dizaines ; si un jour il se compte
     * en milliers, c'est le moteur qui devra exposer un calcul par lot — pas la
     * console qui devra deviner.
     *
     * @return list<array<string,mixed>>
     */
    private function espaces(): array
    {
        // Mémoïsé : le tableau de bord et le contrôle d'incohérences le
        // demandent tous les deux dans la même requête, et chaque espace coûte
        // plusieurs lectures.
        if ($this->espacesMemo !== null) {
            return $this->espacesMemo;
        }

        $preavis = self::PREAVIS_ECHEANCE_JOURS;

        return $this->espacesMemo = Organization::query()
            ->orderBy('name')
            ->get()
            ->map(function (Organization $org) use ($preavis) {
                $complet = $this->licence->etatComplet($org->id);
                $licence = $this->licence->licence($org->id);

                $jours = $complet['jours_restants'];

                return [
                    'id'                 => $org->id,
                    'nom'                => $org->name,
                    'email'              => $org->email,
                    'pays'               => $org->country,
                    'actif'              => (bool) $org->is_active,
                    'etat'               => $complet['etat'],
                    'etat_stocke'        => $licence?->etat,
                    'formule'            => $complet['formule'],
                    'date_fin'           => $complet['date_fin'],
                    'date_purge'         => $complet['date_purge'],
                    'jours_restants'     => $jours,
                    'a_echeance'         => $jours !== null && $jours <= $preavis,
                    'quotas'             => $complet['quotas'],
                    'prolongation_faite' => (bool) ($licence?->prolongation_faite),
                    'butees'             => $this->nombreButees($org->id),
                ];
            })
            ->all();
    }

    /** Espaces à J-{préavis} de l'échéance, les plus proches d'abord. */
    private function echeances(array $espaces): array
    {
        $proches = array_values(array_filter($espaces, fn (array $e) => $e['a_echeance']));

        usort($proches, fn ($a, $b) => ($a['jours_restants'] ?? 0) <=> ($b['jours_restants'] ?? 0));

        return $proches;
    }

    /**
     * Taux de conversion essai → payant, lu dans le journal.
     *
     * Le journal est la seule source qui sache qu'un espace ACTIVE est passé
     * par un essai : la licence courante, elle, a remplacé la précédente et ne
     * garde aucune trace de son origine.
     *
     * On ne compte PAS les seules transitions TRIAL → ACTIVE. Un essai qui
     * s'achève bascule d'abord en palier sans frais (décision D6) : le client
     * qui paie trois semaines plus tard passe par FREE → ACTIVE. Ne retenir
     * que la transition directe effacerait de la statistique exactement les
     * conversions que la relance commerciale a produites.
     */
    private function conversion(): array
    {
        $ayantEssaye = DB::table('license_transitions')
            ->where('etat_apres', 'TRIAL')
            ->distinct()
            ->pluck('organization_id');

        $essais = $ayantEssaye->count();

        $convertis = $ayantEssaye->isEmpty() ? 0 : DB::table('license_transitions')
            ->whereIn('organization_id', $ayantEssaye)
            ->where('etat_apres', 'ACTIVE')
            ->distinct()
            ->count('organization_id');

        return [
            'essais'    => $essais,
            'convertis' => $convertis,
            // Pas de taux inventé quand le dénominateur est nul : « 0 % » se
            // lirait comme un échec commercial là où il n'y a simplement
            // aucun essai à convertir.
            'taux'      => $essais > 0 ? round($convertis * 100 / $essais, 1) : null,
        ];
    }

    /**
     * Alerte commerciale (section 12.6) : les espaces qui butent sur le
     * plafond. Le cahier en fait « les prospects les plus chauds du
     * portefeuille » — la liste est donc ordonnée par nombre de butées, pas
     * par ordre alphabétique.
     */
    private function prospectsChauds(): array
    {
        $lignes = DB::table('quota_hits as h')
            ->join('organizations as o', 'o.id', '=', 'h.organization_id')
            ->where('h.solution', $this->licence->solution())
            ->groupBy('h.organization_id', 'o.name', 'o.email', 'h.compteur', 'h.plafond')
            ->havingRaw('COUNT(*) >= ?', [self::SEUIL_PROSPECT_CHAUD])
            ->orderByRaw('COUNT(*) DESC')
            ->get([
                'h.organization_id',
                'o.name',
                'o.email',
                'h.compteur',
                'h.plafond',
                DB::raw('COUNT(*) as butees'),
                DB::raw('MAX(h.created_at) as derniere'),
            ]);

        $suivante = $this->licence->formuleSuivante();

        return $lignes->map(fn ($l) => [
            'organization_id' => (int) $l->organization_id,
            'nom'             => $l->name,
            'email'           => $l->email,
            'compteur'        => $l->compteur,
            'plafond'         => (int) $l->plafond,
            'butees'          => (int) $l->butees,
            'derniere'        => $l->derniere,
            'etat'            => $this->licence->etat((int) $l->organization_id),
            'formule_suivante' => $suivante['nom'] ?? null,
        ])->all();
    }

    private function nombreButees(int $orgId): int
    {
        return (int) DB::table('quota_hits')
            ->where('organization_id', $orgId)
            ->where('solution', $this->licence->solution())
            ->count();
    }

    private function buteesEspace(int $orgId): array
    {
        return DB::table('quota_hits')
            ->where('organization_id', $orgId)
            ->where('solution', $this->licence->solution())
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['compteur', 'plafond', 'valeur_tentee', 'user_id', 'created_at'])
            ->map(fn ($h) => (array) $h)
            ->all();
    }

    /**
     * Vue quotas par espace : compteur, usage, plafond, date de remise à zéro.
     *
     * La date de remise à zéro n'est pas stockée : elle se déduit de la nature
     * du compteur. Un flux mensuel repart au premier du mois DANS LE FUSEAU DE
     * L'ESPACE ; un stock cumulatif ne repart jamais, et il faut le dire plutôt
     * que d'afficher une date vide.
     */
    private function quotasDetailles(Organization $org): array
    {
        $resultat = [];

        foreach (array_keys($this->licence->plafonds()) as $compteur) {
            $quota   = $this->licence->quota($org->id, $compteur);
            $mensuel = $this->licence->estMensuel($compteur);

            $quota['remise_a_zero'] = $mensuel
                ? Carbon::now($org->timezone ?: config('app.timezone'))
                    ->startOfMonth()->addMonth()->toDateString()
                : null;
            $quota['fuseau'] = $mensuel ? ($org->timezone ?: config('app.timezone')) : null;

            $resultat[] = $quota;
        }

        return $resultat;
    }

    /** Journal des transitions — consultable, jamais modifiable. */
    private function journal(int $orgId, ?int $limite = 200): array
    {
        $requete = DB::table('license_transitions as t')
            ->leftJoin('users as u', 'u.id', '=', 't.acteur_user_id')
            ->where('t.organization_id', $orgId)
            ->orderByDesc('t.created_at')
            ->orderByDesc('t.id');

        if ($limite !== null) {
            $requete->limit($limite);
        }

        return $requete->get([
            't.id', 't.etat_avant', 't.etat_apres', 't.cause', 't.acteur',
            't.contexte', 't.created_at', 'u.name as acteur_nom', 'u.email as acteur_email',
        ])->map(fn ($t) => [
            'id'           => (int) $t->id,
            'etat_avant'   => $t->etat_avant,
            'etat_apres'   => $t->etat_apres,
            'cause'        => $t->cause,
            'acteur'       => $t->acteur,
            'acteur_nom'   => $t->acteur_nom,
            'acteur_email' => $t->acteur_email,
            'contexte'     => $t->contexte ? json_decode((string) $t->contexte, true) : null,
            'horodatage'   => $t->created_at,
        ])->all();
    }

    private function formules(): array
    {
        return DB::table('plans')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['slug', 'name', 'price_xof', 'duration_months'])
            ->map(fn ($p) => [
                'slug'            => $p->slug,
                'nom'             => $p->name,
                'prix'            => (float) $p->price_xof,
                'duration_months' => (int) $p->duration_months,
            ])
            ->all();
    }

    /**
     * Ce que la console a le droit de proposer sur cet espace.
     *
     * Renvoyé au client pour désactiver les boutons, mais chaque action revérifie
     * côté serveur : masquer un bouton n'empêche personne d'appeler la route.
     */
    private function actionsPossibles(int $orgId, string $etat, ?License $licence): array
    {
        $purge = $licence?->date_purge ? Carbon::parse($licence->date_purge) : null;

        return [
            'essai' => [
                'possible' => ! in_array($etat, ['TRIAL', 'ACTIVE', 'GRACE'], true),
                'motif'    => in_array($etat, ['TRIAL', 'ACTIVE', 'GRACE'], true)
                    ? 'Cet espace dispose déjà d\'un essai ou d\'un abonnement en cours.'
                    : null,
            ],
            'prolongation' => [
                'possible' => $etat === 'TRIAL' && ! ($licence?->prolongation_faite),
                'motif'    => $etat !== 'TRIAL'
                    ? 'Seul un essai en cours peut être prolongé.'
                    : ($licence?->prolongation_faite
                        ? 'Cet essai a déjà été prolongé. Une seconde prolongation appelle une proposition commerciale.'
                        : null),
            ],
            'activation' => ['possible' => true, 'motif' => null],
            'export'     => ['possible' => true, 'motif' => null],
            'purge' => [
                'possible' => $etat === 'EXPIRED' && $purge !== null && $purge->isPast(),
                'motif'    => $etat !== 'EXPIRED'
                    ? 'Seul un espace expiré peut être purgé.'
                    : ($purge === null
                        ? 'Aucune date de purge : la rétention ne peut pas être vérifiée.'
                        : ($purge->isFuture()
                            ? 'Rétention en cours jusqu\'au ' . $purge->format('d/m/Y') . '.'
                            : null)),
            ],
        ];
    }

    private function exposerLicence(License $licence): array
    {
        $expose = [
            'id'                 => $licence->id,
            'cle_licence'        => $licence->cle_licence,
            'etat'               => $licence->etat,
            'status_historique'  => $licence->status,
            'solution'           => $licence->solution,
            'origine'            => $licence->origine,
            'formule'            => $licence->plan_name,
            'starts_at'          => $licence->starts_at?->toIso8601String(),
            'ends_at'            => $licence->ends_at?->toIso8601String(),
            'grace_until'        => $licence->grace_until?->toIso8601String(),
            'date_purge'         => $licence->date_purge ? Carbon::parse($licence->date_purge)->toIso8601String() : null,
            'prolongation_faite' => (bool) $licence->prolongation_faite,
            'prolongation_le'    => $licence->prolongation_le ? Carbon::parse($licence->prolongation_le)->toIso8601String() : null,
            'prolongation_motif' => $licence->prolongation_motif,
            'external_ref'       => $licence->external_ref,
        ];

        if ($this->colonneExiste('superseded_at')) {
            $expose['superseded_at'] = $licence->superseded_at
                ? Carbon::parse($licence->superseded_at)->toIso8601String()
                : null;
        }

        return $expose;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Incohérences — la console les montre, elle ne les corrige pas
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Contrôles de la section 12.8, joués en lecture seule.
     *
     * Une console d'administration qui n'affiche que ce qui va bien laisse les
     * contradictions vieillir en paix. Chaque anomalie est nommée, comptée et
     * rattachée à ses espaces — et rien n'est réparé automatiquement : une
     * correction silencieuse ferait disparaître la preuve du problème avant
     * qu'on ait compris comment il est arrivé.
     *
     * @return list<array<string,mixed>>
     */
    private function incoherences(): array
    {
        $anomalies = [];

        $ajouter = function (string $code, string $titre, string $explication, array $lignes) use (&$anomalies) {
            if ($lignes !== []) {
                $anomalies[] = compact('code', 'titre', 'explication') + ['lignes' => $lignes];
            }
        };

        $base = fn () => DB::table('licenses as l')
            ->leftJoin('organizations as o', 'o.id', '=', 'l.organization_id');

        $colonnes = ['l.id', 'l.organization_id', 'o.name as espace', 'l.etat', 'l.status', 'l.ends_at', 'l.date_purge'];

        // 1. La contradiction connue : superseded d'un côté, courante de l'autre.
        if ($this->colonneExiste('superseded_at')) {
            $ajouter(
                'superseded_sans_date',
                'Licence marquée remplacée sans date de remplacement',
                'La colonne historique `status` dit « superseded » alors que `superseded_at` est NULL. '
                . 'Le moteur, qui sélectionne la licence courante sur `superseded_at IS NULL`, la considère '
                . 'donc comme active ; le code historique la considère comme remplacée. Les deux lectures '
                . 'se contredisent sur la même ligne.',
                $base()->where('l.status', 'superseded')->whereNull('l.superseded_at')
                    ->get($colonnes)->map(fn ($l) => (array) $l)->all(),
            );

            // 2. Plusieurs licences courantes pour un même espace.
            $doublons = DB::table('licenses')
                ->whereNull('superseded_at')
                ->groupBy('organization_id')
                ->havingRaw('COUNT(*) > 1')
                ->pluck('organization_id');

            $ajouter(
                'licences_courantes_multiples',
                'Plusieurs licences courantes pour un même espace',
                'Le moteur retient la plus récente par identifiant. Les autres restent invisibles sans être '
                . 'closes : une remise en ordre de l\'ordre des identifiants changerait l\'état affiché.',
                $doublons->isEmpty() ? [] : $base()->whereIn('l.organization_id', $doublons)
                    ->whereNull('l.superseded_at')->get($colonnes)->map(fn ($l) => (array) $l)->all(),
            );
        } else {
            $anomalies[] = [
                'code'        => 'colonne_superseded_absente',
                'titre'       => 'Colonne `superseded_at` absente du schéma',
                'explication' => 'Le moteur filtre la licence courante sur `superseded_at IS NULL`, mais aucune '
                    . 'migration du dépôt ne crée cette colonne. Le schéma de production a divergé des migrations.',
                'lignes'      => [],
            ];
        }

        // 3. Licence sans état.
        $ajouter(
            'etat_absent',
            'Licence sans état',
            'La colonne `etat` est vide : le moteur retombe alors sur le palier '
            . $this->licence->config()['gratuit']['nom'] . ', ce qui ouvre l\'écriture plafonnée à un '
            . 'espace dont personne ne sait dans quel palier il se trouve réellement.',
            $base()->whereNull('l.etat')->get($colonnes)->map(fn ($l) => (array) $l)->all(),
        );

        // 4. Licence sans date de fin hors DEMO/FREE (contrainte D5).
        $ajouter(
            'sans_date_de_fin',
            'Licence sans date de fin hors paliers ' . implode(' et ', LicenceService::SANS_ECHEANCE),
            'La contrainte `licenses_jamais_perpetuelle` interdit ce cas. Une ligne ici signifie que la contrainte '
            . 'a été contournée ou désactivée.',
            $base()->whereNull('l.ends_at')->whereNotIn('l.etat', LicenceService::SANS_ECHEANCE)
                ->get($colonnes)->map(fn ($l) => (array) $l)->all(),
        );

        // 5. Durée d'essai non conforme (section 12.8).
        $essai        = $this->licence->essaiJours();
        $prolongation = (int) $this->licence->config()['prolongation_jours'];

        $essaisHorsNorme = $base()->where('l.etat', 'TRIAL')
            ->whereNotNull('l.starts_at')->whereNotNull('l.ends_at')
            ->get(array_merge($colonnes, ['l.starts_at', 'l.prolongation_faite']))
            ->filter(function ($l) use ($essai, $prolongation) {
                $jours   = Carbon::parse($l->starts_at)->startOfDay()
                    ->diffInDays(Carbon::parse($l->ends_at)->startOfDay());
                $attendu = $essai + ($l->prolongation_faite ? $prolongation : 0);

                return (int) $jours !== $attendu;
            })
            ->map(fn ($l) => (array) $l)
            ->values()
            ->all();

        $ajouter(
            'duree_essai_non_conforme',
            'Durée d\'essai non conforme',
            'L\'écart entre le début et la fin ne correspond ni à la durée d\'essai configurée, ni à cette durée '
            . 'augmentée de la prolongation unique. Une durée accordée au cas par cas est exactement ce que '
            . 'la section 12.6 interdit.',
            $essaisHorsNorme,
        );

        // 6. État stocké ≠ état calculé.
        $decalages = [];
        foreach ($this->espaces() as $espace) {
            if ($espace['etat_stocke'] !== null && $espace['etat_stocke'] !== $espace['etat']) {
                $decalages[] = [
                    'organization_id' => $espace['id'],
                    'espace'          => $espace['nom'],
                    'etat'            => $espace['etat'],
                    'status'          => $espace['etat_stocke'],
                    'ends_at'         => $espace['date_fin'],
                ];
            }
        }

        $ajouter(
            'etat_stocke_perime',
            'État stocké différent de l\'état calculé',
            'L\'état calculé fait foi ; la colonne n\'est qu\'un cache que la tâche de 03:00 remet à jour. '
            . 'Un écart durable signale que cette tâche ne tourne pas.',
            $decalages,
        );

        // 7. Seconde vérité tarifaire réapparue.
        if (Schema::hasColumn('plans', 'trial_days')) {
            $ajouter(
                'trial_days_repeuple',
                'Une durée d\'essai par formule est revenue dans `plans`',
                'La colonne `plans.trial_days` a été neutralisée par la migration du socle : une valeur non nulle '
                . 'signifie qu\'une seconde durée d\'essai est en train de se reconstituer, formule par formule.',
                DB::table('plans')->whereNotNull('trial_days')
                    ->get(['id', 'slug', 'name', 'trial_days'])->map(fn ($p) => (array) $p)->all(),
            );
        }

        // 8. Collision du nom du palier gratuit avec une formule payante.
        $nomGratuit = $this->licence->config()['gratuit']['nom'];

        $ajouter(
            'collision_nom_palier',
            'Le nom « ' . $nomGratuit .' » désigne à la fois le palier sans frais et une formule payante',
            'Le même mot porte deux prix. Un prospect qui lit « ' . $nomGratuit . ' » sur la vitrine et dans la '
            . 'grille tarifaire y verra deux offres différentes. Arbitrage en attente : ne pas trancher ici.',
            DB::table('plans')->where('name', $nomGratuit)->where('price_xof', '>', 0)
                ->get(['id', 'slug', 'name', 'price_xof'])->map(fn ($p) => (array) $p)->all(),
        );

        return $anomalies;
    }

    /**
     * Les anomalies qui touchent un espace précis, pour sa fiche.
     *
     * Une anomalie sans ligne (défaut de schéma, collision de nom) n'est pas
     * rattachable à un espace : elle reste sur le tableau de bord, où elle
     * s'adresse à l'éditeur et non au client.
     */
    private function incoherencesEspace(int $orgId): array
    {
        $retenues = [];

        foreach ($this->incoherences() as $anomalie) {
            $lignes = array_values(array_filter(
                $anomalie['lignes'],
                fn ($l) => (int) ($l['organization_id'] ?? 0) === $orgId,
            ));

            if ($lignes !== []) {
                $anomalie['lignes'] = $lignes;
                $retenues[] = $anomalie;
            }
        }

        return $retenues;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Garde-fous
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Refuse toute requête portant une durée, un plafond, une date de fin ou un
     * état.
     *
     * Les interdits de la section 12.6 ne sont pas des recommandations : ils
     * doivent être impossibles. Ne pas afficher le champ ne suffit pas — la
     * route reste appelable au clavier. Une requête qui tente d'imposer une
     * durée est donc rejetée en 422, avec la raison écrite en clair : c'est un
     * refus qu'on peut lire dans les journaux, pas un paramètre ignoré en
     * silence.
     */
    private function refuserChampsImposes(Request $request): void
    {
        $intrus = array_values(array_intersect(array_keys($request->all()), self::CHAMPS_IMPOSES));

        if ($intrus === []) {
            return;
        }

        throw ValidationException::withMessages([
            $intrus[0] => sprintf(
                'La console ne peut pas imposer « %s ». Durées, plafonds, dates de fin et états '
                . 'sont fixés par la configuration de la solution et par la formule : les modifier '
                . 'espace par espace créerait autant de règles que de clients.',
                implode(' », « ', $intrus),
            ),
        ]);
    }

    /** Le schéma de production a divergé des migrations : on vérifie avant de lire. */
    private function colonneExiste(string $colonne): bool
    {
        static $cache = [];

        return $cache[$colonne] ??= Schema::hasColumn('licenses', $colonne);
    }
}
