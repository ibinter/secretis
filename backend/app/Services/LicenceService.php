<?php

namespace App\Services;

use App\Models\License;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Moteur de licence à six états — cahier IBIG SOFT v1.1, sections 2, 3, 5 et 9.
 *
 * RÈGLE ABSOLUE (section 2) : l'état est calculé CÔTÉ SERVEUR à chaque requête.
 * Le client n'a jamais autorité. Une valeur d'état reçue du navigateur est
 * ignorée — ce service ne prend aucun état en paramètre, il le déduit.
 *
 * INTERDIT ici comme ailleurs : écrire une durée, un plafond ou un prix en dur.
 * Tout vient de config/licence.config.json.
 *
 * Ce service ne remplace pas LicenseService (activation, paiement, suspension
 * commerciale) : il porte la couche états/quotas/droits que celui-ci n'a
 * jamais eue. Les deux cohabitent, le nouveau fait foi sur l'état.
 */
class LicenceService
{
    public const ETATS = ['DEMO', 'FREE', 'TRIAL', 'ACTIVE', 'GRACE', 'EXPIRED'];

    /** États dispensés de date de fin (décision D5 : aucun autre). */
    public const SANS_ECHEANCE = ['DEMO', 'FREE'];

    private ?array $config = null;

    // ─── Configuration ──────────────────────────────────────────────────────

    /** La source unique de vérité. Lue une fois par requête. */
    public function config(): array
    {
        if ($this->config !== null) {
            return $this->config;
        }

        $chemin = config_path('licence.config.json');

        if (! is_file($chemin)) {
            // Ne jamais retomber sur des valeurs par défaut : une durée d'essai
            // devinée est pire qu'une erreur, parce qu'elle se propage
            // silencieusement à toutes les surfaces.
            throw new \RuntimeException(
                'licence.config.json est introuvable. La source unique de vérité '
                . 'ne peut pas être suppléée par des valeurs par défaut.'
            );
        }

        $config = json_decode(file_get_contents($chemin), true, 512, JSON_THROW_ON_ERROR);

        return $this->config = $config;
    }

    public function essaiJours(): int      { return (int) $this->config()['essai_jours']; }
    public function graceJours(): int      { return (int) $this->config()['grace_jours']; }
    public function retentionJours(): int  { return (int) $this->config()['retention_jours']; }
    public function solution(): string     { return $this->config()['solution']; }
    public function nomSolution(): string  { return $this->config()['nom']; }

    /** Plafonds du palier Découverte, par compteur métier. */
    public function plafonds(): array
    {
        return $this->config()['gratuit']['quotas'] ?? [];
    }

    public function plafond(string $compteur): ?int
    {
        return $this->plafonds()[$compteur] ?? null;
    }

    /** « 5 courriers par mois » — jamais réécrit à la main ailleurs. */
    public function resumePlafond(): string
    {
        return $this->config()['gratuit']['resume'] ?? '';
    }

    /** Le compteur est-il un flux mensuel ou un stock cumulatif ? */
    public function estMensuel(string $compteur): bool
    {
        return in_array($compteur, $this->config()['gratuit']['compteurs_mensuels'] ?? [], true);
    }

    public function filigrane(): string
    {
        return sprintf('Généré avec %s — %s', $this->nomSolution(), $this->config()['domaine_editeur']);
    }

    // ─── État ───────────────────────────────────────────────────────────────

    /**
     * Licence courante d'une organisation.
     *
     * Une organisation sans licence est en FREE : c'est le seul défaut sûr.
     * La traiter comme EXPIRED bloquerait en écriture un compte qui n'a rien
     * fait de mal ; la traiter comme ACTIVE ouvrirait tout gratuitement.
     */
    public function licence(int $orgId): ?License
    {
        return License::where('organization_id', $orgId)
            ->whereNull('superseded_at')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * État calculé — la seule autorité.
     *
     * L'état stocké n'est qu'un cache : une licence dont la date est passée est
     * expirée même si la tâche planifiée de 03:00 n'est pas encore passée. Le
     * contraire laisserait un abonnement échu ouvert jusqu'au lendemain.
     */
    public function etat(int $orgId): string
    {
        $licence = $this->licence($orgId);

        if (! $licence) {
            return 'FREE';
        }

        $etat = $licence->etat ?: 'FREE';

        if (in_array($etat, self::SANS_ECHEANCE, true)) {
            return $etat;
        }

        $maintenant = now();
        $fin        = $licence->ends_at ? Carbon::parse($licence->ends_at) : null;

        if (! $fin) {
            return $etat;
        }

        if ($maintenant->lte($fin)) {
            return $etat;
        }

        // Un essai échu bascule en Découverte, jamais en expiré (décision D6).
        if ($etat === 'TRIAL') {
            return 'FREE';
        }

        $finGrace = $licence->grace_until
            ? Carbon::parse($licence->grace_until)
            : $fin->copy()->addDays($this->graceJours());

        return $maintenant->lte($finGrace) ? 'GRACE' : 'EXPIRED';
    }

    /** Réponse de GET /api/licence/etat (section 9.4). */
    public function etatComplet(int $orgId): array
    {
        $licence = $this->licence($orgId);
        $etat    = $this->etat($orgId);
        $config  = $this->config();

        $fin = $licence?->ends_at ? Carbon::parse($licence->ends_at) : null;

        $joursRestants = match ($etat) {
            'TRIAL', 'ACTIVE' => $fin ? max(0, (int) now()->startOfDay()->diffInDays($fin->startOfDay(), false)) : null,
            'GRACE'           => $licence?->grace_until
                ? max(0, (int) now()->startOfDay()->diffInDays(Carbon::parse($licence->grace_until)->startOfDay(), false))
                : null,
            default           => null,
        };

        return [
            'etat'            => $etat,
            'solution'        => $this->solution(),
            'formule'         => in_array($etat, ['DEMO', 'FREE'], true) ? null : $licence?->plan_name,
            'jours_restants'  => $joursRestants,
            'date_fin'        => $fin?->toDateString(),
            'date_purge'      => $licence?->date_purge ? Carbon::parse($licence->date_purge)->toDateString() : null,
            'droits'          => $this->droits($etat),
            'quotas'          => $this->quotas($orgId, $etat),
            'plafond_resume'  => $this->resumePlafond(),
            'filigrane'       => $this->droits($etat)['filigrane'] ? $this->filigrane() : null,
            'message'         => $this->banniere($orgId, $etat, $joursRestants, $licence),
            'prolongeable'    => $etat === 'TRIAL' && ! ($licence?->prolongation_faite),

            // Les durées descendent avec l'état : sans elles, la page
            // abonnement devait soit les redemander, soit les réécrire — et
            // les réécrire, c'est créer une seconde vérité.
            'reglages'        => [
                'essai_jours'     => $this->essaiJours(),
                'grace_jours'     => $this->graceJours(),
                'retention_jours' => $this->retentionJours(),
            ],
            'palier'           => $config['gratuit'],
            'formule_suivante' => $this->formuleSuivante(),
            'glossaire'        => $config['glossaire'] ?? [],
        ];
    }

    /** Droits ouverts par état. Table lue dans la configuration, pas décidée ici. */
    public function droits(string $etat): array
    {
        return $this->config()['droits_par_etat'][$etat]
            ?? $this->config()['droits_par_etat']['EXPIRED'];
    }

    /** Un droit ponctuel : export, api, sara, multi_utilisateur, whatsapp, sms. */
    public function peut(int $orgId, string $droit): bool
    {
        return (bool) ($this->droits($this->etat($orgId))[$droit] ?? false);
    }

    // ─── Quotas ─────────────────────────────────────────────────────────────

    /**
     * Contrôle d'écriture (section 9.5).
     *
     * Appelé DANS LA COUCHE MÉTIER, à l'écriture, jamais à l'affichage :
     * masquer un bouton n'empêche personne d'appeler l'API.
     */
    public function peutCreer(int $orgId, string $compteur): bool
    {
        $etat = $this->etat($orgId);

        if (in_array($etat, ['ACTIVE', 'GRACE', 'TRIAL'], true)) {
            return true;
        }

        if ($etat === 'EXPIRED') {
            return false;   // lecture seule
        }

        $plafond = $this->plafond($compteur);

        if ($plafond === null) {
            return true;    // compteur non plafonné pour cette solution
        }

        return $this->usage($orgId, $compteur) < $plafond;
    }

    /** Usage courant. Les compteurs mensuels sont lus sur la période en cours. */
    public function usage(int $orgId, string $compteur): int
    {
        return (int) DB::table('quotas_usage')
            ->where('organization_id', $orgId)
            ->where('solution', $this->solution())
            ->where('compteur', $compteur)
            ->where('periode', $this->periode($compteur, $orgId))
            ->value('valeur');
    }

    /**
     * Incrémente après une écriture réussie.
     *
     * Volontairement séparé de `peutCreer` : compter avant que l'écriture ait
     * abouti ferait décompter un courrier qu'une validation a finalement
     * refusé. Le quota se consommerait sans que rien n'existe.
     */
    public function incrementer(int $orgId, string $compteur, int $de = 1): void
    {
        $periode = $this->periode($compteur, $orgId);

        // ON CONFLICT plutôt que lire-puis-écrire : deux courriers enregistrés
        // simultanément se compteraient sinon pour un seul.
        DB::statement('
            INSERT INTO quotas_usage (organization_id, solution, compteur, periode, valeur, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ON CONFLICT (organization_id, solution, compteur, periode)
            DO UPDATE SET valeur = quotas_usage.valeur + EXCLUDED.valeur, updated_at = NOW()
        ', [$orgId, $this->solution(), $compteur, $periode, $de]);
    }

    /** Décrémente — suppression d'un enregistrement compté. Jamais sous zéro. */
    public function decrementer(int $orgId, string $compteur, int $de = 1): void
    {
        DB::table('quotas_usage')
            ->where('organization_id', $orgId)
            ->where('solution', $this->solution())
            ->where('compteur', $compteur)
            ->where('periode', $this->periode($compteur, $orgId))
            ->update(['valeur' => DB::raw("GREATEST(0, valeur - {$de})"), 'updated_at' => now()]);
    }

    /** Réponse de GET /api/quotas/{compteur}. */
    public function quota(int $orgId, string $compteur): array
    {
        $plafond = $this->plafond($compteur);
        $valeur  = $this->usage($orgId, $compteur);

        return [
            'compteur'  => $compteur,
            // Intitulé lisible : sans lui, l'interface affichait la clé
            // technique « courriers_mois » à l'utilisateur final.
            'libelle'   => $this->libelleCompteur($compteur),
            'valeur'    => $valeur,
            'plafond'   => $plafond,
            'restant'   => $plafond === null ? null : max(0, $plafond - $valeur),
            'autorise'  => $this->peutCreer($orgId, $compteur),
            'periode'   => $this->periode($compteur, $orgId),
            'mensuel'   => $this->estMensuel($compteur),
        ];
    }

    /** Tous les quotas de la solution. Vide si l'état ne plafonne pas. */
    public function quotas(int $orgId, ?string $etat = null): array
    {
        $etat ??= $this->etat($orgId);

        if (! ($this->droits($etat)['quotas'] ?? false)) {
            return [];
        }

        $resultat = [];

        foreach (array_keys($this->plafonds()) as $compteur) {
            $resultat[$compteur] = $this->quota($orgId, $compteur);
        }

        return $resultat;
    }

    /**
     * Journalise une tentative de dépassement (section 9.8).
     *
     * Ce n'est pas de la télémétrie : un espace qui bute cinq fois sur le
     * plafond est le prospect le plus chaud du portefeuille.
     */
    public function journaliserDepassement(int $orgId, string $compteur, ?int $userId = null): void
    {
        DB::table('quota_hits')->insert([
            'organization_id' => $orgId,
            'solution'        => $this->solution(),
            'compteur'        => $compteur,
            'plafond'         => (int) $this->plafond($compteur),
            'valeur_tentee'   => $this->usage($orgId, $compteur) + 1,
            'user_id'         => $userId,
            'created_at'      => now(),
        ]);
    }

    /**
     * Message de refus au plafond (texte officiel, section 8.5).
     *
     * Le texte n'est pas réécrit à chaque point d'appel : une formulation qui
     * varie d'un écran à l'autre donne l'impression de règles qui varient.
     */
    public function messageRefus(string $compteur): string
    {
        return sprintf(
            'Limite du palier %s atteinte (%s). Vos données restent accessibles et '
            . 'modifiables. Pour aller au-delà, activez la formule %s.',
            $this->config()['gratuit']['nom'],
            $this->resumePlafond(),
            $this->formuleSuivante()['nom'] ?? '—'
        );
    }

    /** La formule payante immédiatement supérieure. Lue dans `plans`, pas ici. */
    public function formuleSuivante(): array
    {
        $slug = $this->config()['formule_suivante'] ?? null;

        $plan = $slug
            ? DB::table('plans')->where('slug', $slug)->first()
            : DB::table('plans')->where('is_active', true)->orderBy('price_xof')->first();

        return $plan ? ['slug' => $plan->slug, 'nom' => $plan->name, 'prix' => $plan->price_xof] : [];
    }

    /**
     * Intitulé lisible d'un compteur métier.
     *
     * Déduit du résumé de plafond quand la configuration n'en donne pas :
     * « 5 courriers par mois » livre déjà le mot que l'utilisateur reconnaît.
     */
    public function libelleCompteur(string $compteur): string
    {
        $libelles = $this->config()['gratuit']['libelles'] ?? [];

        if (isset($libelles[$compteur])) {
            return $libelles[$compteur];
        }

        // courriers_mois -> « courriers par mois »
        $base = str_replace('_', ' ', $compteur);

        return str_replace([' mois', ' an'], [' par mois', ' par an'], $base);
    }

    /**
     * Période d'un compteur : 'YYYY-MM' pour un flux, 'total' pour un stock.
     *
     * Le mois est celui du FUSEAU DU LOCATAIRE (section 9.5) : à Abidjan, un
     * courrier enregistré le 1er à 00h30 relève du nouveau mois, pas de
     * l'ancien parce que le serveur est en UTC.
     */
    public function periode(string $compteur, ?int $orgId = null): string
    {
        if (! $this->estMensuel($compteur)) {
            return 'total';
        }

        $fuseau = $orgId
            ? DB::table('organizations')->where('id', $orgId)->value('timezone')
            : null;

        return now($fuseau ?: config('app.timezone'))->format('Y-m');
    }

    // ─── Transitions ────────────────────────────────────────────────────────

    /** POST /api/licence/essai — durée imposée par la configuration. */
    public function demarrerEssai(int $orgId, string $formule, ?User $acteur = null): License
    {
        return DB::transaction(function () use ($orgId, $formule, $acteur) {
            $existante = $this->licence($orgId);

            if ($existante && in_array($this->etat($orgId), ['TRIAL', 'ACTIVE', 'GRACE'], true)) {
                throw new \RuntimeException(
                    'Cet espace dispose déjà d\'un essai ou d\'un abonnement en cours.'
                );
            }

            $avant = $existante ? $this->etat($orgId) : null;
            $existante?->update(['superseded_at' => now()]);

            $fin = now()->addDays($this->essaiJours());

            $licence = License::create([
                'organization_id' => $orgId,
                'plan_name'       => $formule,
                'etat'            => 'TRIAL',
                'status'          => 'trial',
                'solution'        => $this->solution(),
                'origine'         => 'essai',
                'cle_licence'     => $this->genererCle(),
                'starts_at'       => now(),
                'ends_at'         => $fin,
                'grace_until'     => $fin->copy()->addDays($this->graceJours()),
                'date_purge'      => $fin->copy()->addDays($this->graceJours() + $this->retentionJours()),
            ]);

            $this->journaliser($licence, $avant, 'TRIAL', 'Démarrage d\'essai', $acteur ? 'superadmin' : 'systeme', $acteur);

            return $licence;
        });
    }

    /**
     * Prolongation : 15 jours, UNE SEULE FOIS, accordée manuellement.
     *
     * La section 5.5 en fait une prise de contact commerciale : elle exige donc
     * un acteur et un motif, et se refuse à la seconde demande.
     */
    public function prolongerEssai(int $orgId, User $acteur, string $motif): License
    {
        return DB::transaction(function () use ($orgId, $acteur, $motif) {
            $licence = $this->licence($orgId);

            if (! $licence || $this->etat($orgId) !== 'TRIAL') {
                throw new \RuntimeException('Seul un essai en cours peut être prolongé.');
            }

            if ($licence->prolongation_faite) {
                throw new \RuntimeException(
                    'Cet essai a déjà été prolongé une fois. Une seconde prolongation '
                    . 'n\'est pas prévue : elle appelle une proposition commerciale.'
                );
            }

            if (trim($motif) === '') {
                throw new \RuntimeException('Le motif de prolongation est obligatoire.');
            }

            $jours = (int) $this->config()['prolongation_jours'];
            $fin   = Carbon::parse($licence->ends_at)->addDays($jours);

            $licence->update([
                'ends_at'            => $fin,
                'grace_until'        => $fin->copy()->addDays($this->graceJours()),
                'date_purge'         => $fin->copy()->addDays($this->graceJours() + $this->retentionJours()),
                'prolongation_faite' => true,
                'prolongation_le'    => now(),
                'prolongation_motif' => $motif,
            ]);

            $this->journaliser($licence, 'TRIAL', 'TRIAL', "Prolongation de {$jours} jours : {$motif}", 'superadmin', $acteur);

            return $licence;
        });
    }

    /**
     * Recalcul quotidien (tâche de 03:00, section 9.6).
     *
     * @return array<string,int> nombre de transitions par type
     */
    public function recalculerEtats(): array
    {
        $bilan = ['TRIAL_vers_FREE' => 0, 'ACTIVE_vers_GRACE' => 0, 'GRACE_vers_EXPIRED' => 0];

        License::whereNull('superseded_at')
            ->whereNotIn('etat', self::SANS_ECHEANCE)
            ->whereNotNull('ends_at')
            ->chunkById(200, function ($licences) use (&$bilan) {
                foreach ($licences as $licence) {
                    $avant = $licence->etat;
                    $apres = $this->etat($licence->organization_id);

                    if ($avant === $apres) {
                        continue;
                    }

                    $cle = "{$avant}_vers_{$apres}";

                    // Un essai qui s'achève ne coupe rien et ne supprime rien :
                    // il bascule en Découverte, et l'excédent passe en lecture
                    // seule sans être masqué (décision D6, section 5.6).
                    $licence->update(['etat' => $apres]);

                    $this->journaliser($licence, $avant, $apres, 'Recalcul automatique', 'systeme');

                    if (isset($bilan[$cle])) {
                        $bilan[$cle]++;
                    }
                }
            });

        return $bilan;
    }

    // ─── Bannières (textes officiels, section 8.4) ───────────────────────────

    private function banniere(int $orgId, string $etat, ?int $jours, ?License $licence): ?string
    {
        $plafond = $this->resumePlafond();

        return match ($etat) {
            'DEMO'   => 'Démonstration publique. Les données sont fictives et effacées chaque nuit.',
            'TRIAL'  => $jours !== null && $jours <= 1
                ? 'Dernier jour d\'essai. Activez une formule pour conserver l\'export et le multi-utilisateur.'
                : sprintf('Essai en cours — %d jour(s) restant(s) sur la formule %s.', $jours ?? 0, $licence?->plan_name ?? '—'),
            'FREE'   => $this->essaiConsomme($orgId)
                // Après un essai, le message rassure d'abord : l'utilisateur
                // vient de perdre des fonctions, pas ses données.
                ? sprintf('Essai terminé. Vos données sont conservées : %s restent modifiables, le reste est en lecture seule.', $plafond)
                : sprintf('Palier %s — %s. Passez à une formule payante pour lever la limite.', $this->config()['gratuit']['nom'], $plafond),
            'GRACE'  => sprintf('Abonnement échu. Accès maintenu %d jour(s), puis passage en lecture seule.', $jours ?? $this->graceJours()),
            'EXPIRED'=> sprintf(
                'Abonnement expiré — lecture seule. Données conservées jusqu\'au %s.',
                $licence?->date_purge ? Carbon::parse($licence->date_purge)->format('d/m/Y') : '—'
            ),
            default  => null,
        };
    }

    /** Un espace passé par un essai reçoit un message différent d'un espace neuf. */
    private function essaiConsomme(int $orgId): bool
    {
        return DB::table('license_transitions')
            ->where('organization_id', $orgId)
            ->where('etat_avant', 'TRIAL')
            ->exists();
    }

    // ─── Journal ────────────────────────────────────────────────────────────

    public function journaliser(
        ?License $licence,
        ?string $avant,
        string $apres,
        string $cause,
        string $acteur = 'systeme',
        ?User $user = null,
        array $contexte = [],
    ): void {
        DB::table('license_transitions')->insert([
            'license_id'      => $licence?->id,
            'organization_id' => $licence?->organization_id ?? 0,
            'solution'        => $this->solution(),
            'etat_avant'      => $avant,
            'etat_apres'      => $apres,
            'cause'           => $cause,
            'acteur'          => $acteur,
            'acteur_user_id'  => $user?->id,
            'contexte'        => $contexte ? json_encode($contexte) : null,
            'created_at'      => now(),
        ]);
    }

    /**
     * Clé datée, jamais perpétuelle (décision D5).
     *
     * Publique : l'activation après paiement passe par le contrôleur d'API, et
     * une clé absente rendrait la licence invérifiable en installation
     * on-premise — le seul contexte où la clé est réellement manipulée à la
     * main. La dupliquer ailleurs serait pire : deux générateurs finissent par
     * produire deux formats.
     */
    public function genererCle(): string
    {
        return strtoupper($this->solution() . '-' . bin2hex(random_bytes(12)));
    }
}
