<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\LicenceSequenceMail;
use App\Models\License;
use App\Models\Organization;
use App\Models\User;
use App\Services\LicenceService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Séquence d'e-mails d'essai et d'expiration — cahier IBIG SOFT v1.1,
 * sections 5.4, 8.6 et 8.8.
 *
 *   php artisan licence:emails                 # les destinataires du jour
 *   php artisan licence:emails --dry-run       # sélection seule, aucun envoi
 *   php artisan licence:emails --jalon=J-3     # un seul jalon
 *   php artisan licence:emails --date=2026-08-20   # rejouer une journée
 *
 * CETTE COMMANDE NE SE PLANIFIE PAS ELLE-MÊME. La planification est tenue
 * ailleurs (App\Console\Kernel / routes/console.php) : une commande qui
 * s'enregistrerait toute seule rendrait la fréquence d'envoi invisible depuis
 * l'endroit où on la cherche. Elle est faite pour tourner une fois par jour,
 * après le recalcul d'états de 03:00 (section 9.6).
 *
 * IDEMPOTENCE
 * -----------
 * Chaque envoi est réservé dans `licence_emails` AVANT d'être envoyé, sur une
 * contrainte d'unicité (license_id, jalon). Relancer la commande dix fois dans
 * la journée n'envoie rien de plus ; et la relance commerciale J+7 reste unique
 * pour toujours, pas seulement pour aujourd'hui. Si l'envoi échoue, la
 * réservation est levée pour que le message puisse être retenté demain.
 *
 * AUCUN CHIFFRE MÉTIER N'EST ÉCRIT ICI. Durée d'essai, plafond, nom du palier
 * gratuit, dates de fin et de purge viennent tous de LicenceService.
 */
class LicenceEmails extends Command
{
    protected $signature = 'licence:emails
                            {--date= : Date de référence au format Y-m-d (défaut : aujourd\'hui)}
                            {--jalon= : Ne traiter qu\'un jalon (J+1, J-3, J-1, J0, J+7, J+60, J+83)}
                            {--dry-run : Afficher les destinataires sans envoyer ni tracer}';

    protected $description = 'Envoie les e-mails de la séquence d\'essai et d\'expiration (sections 5.4, 8.6 et 8.8)';

    /**
     * Les sept jalons du cahier.
     *
     * Ces décalages ne sont PAS des paramètres de licence : ce sont les jalons
     * de la séquence, fixés par les sections 5.4 et 8.8, au même titre que les
     * objets d'e-mail de la section 8.6. Ce qu'ils ne font jamais, c'est servir
     * à calculer une durée d'essai ou une rétention — celles-là viennent du
     * moteur, et les jalons J+60/J+83 sont même refusés si la rétention
     * configurée les rendait postérieurs à la purge.
     */
    private const JALONS = ['J+1', 'J-3', 'J-1', 'J0', 'J+7', 'J+60', 'J+83'];

    /** Jalons de la section 8.8, comptés depuis l'entrée en état expiré. */
    private const JOURS_AVIS_PURGE = ['J+60' => 60, 'J+83' => 83];

    /**
     * Retard toléré sur le message de bascule (J0).
     *
     * La bascule tombe la veille ou le jour même selon l'heure de fin d'essai,
     * et un ordonnanceur peut sauter une journée. Au-delà, le message perd son
     * objet : on n'annonce pas comme une nouvelle un changement d'état vieux
     * d'une semaine.
     */
    private const TOLERANCE_BASCULE_JOURS = 3;

    public function __construct(private readonly LicenceService $moteur)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $jour   = $this->jourDeReference();
        $jalons = $this->jalonsDemandes();

        if ($jalons === null) {
            return self::FAILURE;
        }

        $this->info(sprintf(
            'Séquence %s — date de référence %s%s',
            $this->moteur->nomSolution(),
            $jour->toDateString(),
            $this->option('dry-run') ? ' (simulation)' : ''
        ));
        $this->newLine();

        $total = 0;

        foreach ($jalons as $jalon) {
            $candidats = $this->candidats($jalon, $jour);
            $envoyes   = 0;

            foreach ($candidats as $licence) {
                if ($this->traiter($jalon, $licence)) {
                    $envoyes++;
                }
            }

            $this->line(sprintf(
                '  %-5s  %d candidat(s), %d envoi(s)',
                $jalon,
                $candidats->count(),
                $envoyes
            ));

            $total += $envoyes;
        }

        $this->newLine();
        $this->info("Terminé — {$total} message(s).");

        return self::SUCCESS;
    }

    // ─── Sélection ──────────────────────────────────────────────────────────

    /**
     * Les licences concernées par un jalon à la date de référence.
     *
     * L'état stocké sert de PRÉ-FILTRE seulement : c'est l'état calculé qui
     * décide, conformément à la règle 2 du brief. Une licence dont la tâche de
     * 03:00 n'a pas encore rafraîchi la colonne `etat` est donc traitée
     * correctement quand même.
     *
     * @return \Illuminate\Support\Collection<int,License>
     */
    private function candidats(string $jalon, Carbon $jour): \Illuminate\Support\Collection
    {
        $requete = License::query()->whereNull('superseded_at');

        match ($jalon) {
            // Essai en cours — décalages comptés sur les dates de la licence.
            'J+1' => $requete->where('etat', 'TRIAL')
                ->whereDate('starts_at', $jour->copy()->subDay()->toDateString()),

            'J-3' => $requete->where('etat', 'TRIAL')
                ->whereDate('ends_at', $jour->copy()->addDays(3)->toDateString()),

            'J-1' => $requete->where('etat', 'TRIAL')
                ->whereDate('ends_at', $jour->copy()->addDay()->toDateString()),

            // La bascule en Découverte n'est pas pilotée par une date mais par
            // l'état réel : selon l'heure de fin d'essai et l'heure de passage
            // de la tâche de recalcul, elle tombe la veille ou le jour même.
            // Cibler l'état plutôt que la date évite un message envoyé avant
            // que la bascule ait eu lieu — ou jamais envoyé si elle a glissé.
            //
            // La fenêtre est bornée en amont : « votre espace est passé en
            // Découverte » annonce un fait récent. Reçu trois mois plus tard —
            // au premier passage de la commande après sa mise en service, par
            // exemple — il inquiéterait sans rien apprendre.
            'J0' => $requete->whereIn('etat', ['TRIAL', 'FREE'])
                ->where('origine', 'essai')
                ->whereNotNull('ends_at')
                ->where('ends_at', '<', $jour->copy()->endOfDay())
                ->where('ends_at', '>=', $jour->copy()->subDays(self::TOLERANCE_BASCULE_JOURS)->startOfDay()),

            // Même tolérance que J0, pour la raison inverse : la relance
            // commerciale est UNIQUE (section 8.6). Une journée d'ordonnanceur
            // sautée ne doit pas la supprimer purement et simplement. La
            // contrainte d'unicité fait le reste — la fenêtre élargit
            // l'occasion d'envoyer, jamais le nombre d'envois.
            'J+7' => $requete->whereIn('etat', ['TRIAL', 'FREE'])
                ->where('origine', 'essai')
                ->whereDate('ends_at', '<=', $jour->copy()->subDays(7)->toDateString())
                ->whereDate('ends_at', '>=', $jour->copy()->subDays(7 + self::TOLERANCE_BASCULE_JOURS)->toDateString()),

            // Avis avant purge : comptés depuis l'entrée en état expiré,
            // c'est-à-dire depuis la fin de la période de grâce.
            'J+60', 'J+83' => $requete->where('etat', 'EXPIRED'),
        };

        $candidats = $requete->orderBy('id')->get();

        if (in_array($jalon, ['J+60', 'J+83'], true)) {
            $candidats = $candidats->filter(
                fn (License $l) => $this->debutExpiration($l)?->isSameDay(
                    $jour->copy()->subDays(self::JOURS_AVIS_PURGE[$jalon])
                ) === true
            );
        }

        // Filtres qui exigent l'état CALCULÉ : ils viennent après la requête,
        // parce que l'autorité n'est pas dans la colonne.
        return $candidats->filter(function (License $l) use ($jalon) {
            $etat = $this->moteur->etat((int) $l->organization_id);

            // La licence sélectionnée doit être celle que le moteur considère
            // comme courante : sinon un renouvellement est passé entre-temps et
            // le jalon n'a plus de sens.
            if ($this->moteur->licence((int) $l->organization_id)?->id !== $l->id) {
                return false;
            }

            return match ($jalon) {
                'J+1', 'J-3', 'J-1' => $etat === 'TRIAL',
                'J0', 'J+7'         => $etat === 'FREE',
                'J+60', 'J+83'      => $etat === 'EXPIRED',
            };
        })->values();
    }

    /**
     * Entrée en état expiré : fin de la période de grâce.
     *
     * `grace_until` est renseignée par le moteur ; la reconstruction depuis
     * `ends_at` n'est là que pour les lignes antérieures au socle.
     */
    private function debutExpiration(License $licence): ?Carbon
    {
        if ($licence->grace_until) {
            return Carbon::parse($licence->grace_until)->startOfDay();
        }

        return $licence->ends_at
            ? Carbon::parse($licence->ends_at)->addDays($this->moteur->graceJours())->startOfDay()
            : null;
    }

    // ─── Envoi ──────────────────────────────────────────────────────────────

    /** @return bool vrai si un message a été envoyé */
    private function traiter(string $jalon, License $licence): bool
    {
        $organisation = Organization::find($licence->organization_id);
        $destinataire = $this->destinataire($licence);

        if (! $organisation || ! $destinataire || ! filter_var($destinataire['email'], FILTER_VALIDATE_EMAIL)) {
            $this->warn("    {$jalon} — licence #{$licence->id} : aucun destinataire exploitable, ignorée.");

            return false;
        }

        $donnees = $this->contexte($jalon, $licence, $organisation, $destinataire);
        $message = new LicenceSequenceMail($jalon, $donnees);

        if ($this->option('dry-run')) {
            $this->line("    [simulation] {$jalon} → {$destinataire['email']} — « {$message->sujet()} »");

            return false;
        }

        // Réservation AVANT envoi. `insertOrIgnore` s'appuie sur la contrainte
        // d'unicité : deux exécutions simultanées ne peuvent pas réserver le
        // même jalon, et la seconde repart sans rien envoyer.
        $reserve = DB::table('licence_emails')->insertOrIgnore([
            'license_id'      => $licence->id,
            'organization_id' => $licence->organization_id,
            'solution'        => $this->moteur->solution(),
            'jalon'           => $jalon,
            'destinataire'    => $destinataire['email'],
            'sujet'           => $message->sujet(),
            'user_id'         => $destinataire['id'],
            'envoye_le'       => now(),
        ]);

        if ($reserve === 0) {
            return false;   // déjà envoyé — c'est le cas nominal d'une relance
        }

        try {
            Mail::to($destinataire['email'], $destinataire['nom'])->send($message);
        } catch (\Throwable $e) {
            // La réservation est levée : sans cela, un incident de messagerie
            // ferait disparaître définitivement un message de la séquence.
            DB::table('licence_emails')
                ->where('license_id', $licence->id)
                ->where('jalon', $jalon)
                ->delete();

            Log::error('[licence:emails] Envoi impossible', [
                'jalon'      => $jalon,
                'license_id' => $licence->id,
                'erreur'     => $e->getMessage(),
            ]);

            $this->error("    {$jalon} — licence #{$licence->id} : {$e->getMessage()}");

            return false;
        }

        Log::info('[licence:emails] Message envoyé', [
            'jalon'           => $jalon,
            'license_id'      => $licence->id,
            'organization_id' => $licence->organization_id,
        ]);

        return true;
    }

    /**
     * Destinataire : l'administrateur de l'espace.
     *
     * Le palier gratuit est mono-utilisateur (section 3.2) ; en essai il peut y
     * avoir plusieurs comptes, mais la séquence s'adresse à celui qui décide.
     * Repli sur l'adresse de l'organisation si aucun compte administrateur
     * actif n'existe — un espace sans admin ne doit pas être privé de la
     * séquence.
     *
     * @return array{id:?int,email:string,nom:string}|null
     */
    private function destinataire(License $licence): ?array
    {
        $utilisateur = User::query()
            ->where('organization_id', $licence->organization_id)
            ->whereIn('role', ['admin', 'superadmin'])
            ->orderByRaw("CASE WHEN role = 'admin' THEN 0 ELSE 1 END")
            ->orderBy('id')
            ->first();

        if ($utilisateur && $utilisateur->email) {
            return [
                'id'    => (int) $utilisateur->id,
                'email' => (string) $utilisateur->email,
                'nom'   => $this->nomUtilisateur($utilisateur),
            ];
        }

        $organisation = Organization::find($licence->organization_id);

        return $organisation?->email
            ? ['id' => null, 'email' => (string) $organisation->email, 'nom' => (string) $organisation->name]
            : null;
    }

    /**
     * Le schéma porte `first_name`/`last_name`, plusieurs points du code lisent
     * `name`. On accepte les deux plutôt que de trancher ici : ce n'est pas le
     * chantier, et une civilité vide vaut mieux qu'un e-mail non envoyé.
     */
    private function nomUtilisateur(User $u): string
    {
        $nom = trim((string) ($u->name ?? ''));

        if ($nom === '') {
            $nom = trim(((string) ($u->first_name ?? '')) . ' ' . ((string) ($u->last_name ?? '')));
        }

        return $nom !== '' ? $nom : 'Bonjour';
    }

    // ─── Contexte ───────────────────────────────────────────────────────────

    /**
     * Tout ce que les vues affichent. Chaque valeur métier vient du moteur :
     * aucune vue n'a le droit d'écrire une durée, un plafond ou un nom de
     * formule.
     *
     * @param  array{id:?int,email:string,nom:string}  $destinataire
     * @return array<string,mixed>
     */
    private function contexte(
        string $jalon,
        License $licence,
        Organization $organisation,
        array $destinataire,
    ): array {
        $orgId  = (int) $licence->organization_id;
        $etat   = $this->moteur->etatComplet($orgId);
        $config = $this->moteur->config();

        $fin   = $licence->ends_at ? Carbon::parse($licence->ends_at) : null;
        $purge = $licence->date_purge ? Carbon::parse($licence->date_purge) : null;

        // Jours restants pour les jalons d'essai. Le moteur les calcule déjà
        // pour la bannière : on ne recalcule pas une seconde vérité.
        $joursRestants = $etat['jours_restants'];

        return [
            'jalon'             => $jalon,
            'solution'          => $this->moteur->nomSolution(),
            'destinataire_nom'  => $destinataire['nom'],
            'unsubscribe_email' => $destinataire['email'],
            'org_nom'           => (string) $organisation->name,

            'essai_jours'       => $this->moteur->essaiJours(),
            'jours_restants'    => $joursRestants,
            'date_fin'          => $fin?->format('d/m/Y') ?? '—',
            'date_purge'        => $purge?->format('d/m/Y') ?? '—',

            'formule'           => (string) ($licence->plan_name ?: $config['gratuit']['nom']),
            'palier_gratuit'    => (string) $config['gratuit']['nom'],
            'plafond_resume'    => $this->moteur->resumePlafond(),
            'ferme'             => (array) ($config['gratuit']['exclus'] ?? []),
            'garde'             => (array) ($config['gratuit']['inclus'] ?? []),
            'filigrane'         => $this->moteur->filigrane(),
            'banniere'          => (string) ($etat['message'] ?? ''),

            'url_espace'        => rtrim((string) config('app.url'), '/') . '/login',
            'url_formules'      => rtrim((string) config('app.url'), '/') . '/abonnement',
            'url_aide'          => rtrim((string) config('app.url'), '/') . '/aide',

            'mail_solution'     => (string) config('ibigsoft.mail_secretis'),
            'mail_support'      => (string) config('ibigsoft.mail_support'),
            'whatsapp_numero'   => (string) config('ibigsoft.whatsapp'),
            'whatsapp_lien'     => (string) config('ibigsoft.whatsapp_link'),
        ];
    }

    // ─── Options ────────────────────────────────────────────────────────────

    private function jourDeReference(): Carbon
    {
        $date = $this->option('date');

        return $date ? Carbon::parse((string) $date)->startOfDay() : Carbon::today();
    }

    /** @return list<string>|null null si l'option est invalide */
    private function jalonsDemandes(): ?array
    {
        $demande = $this->option('jalon');

        if ($demande !== null && ! in_array($demande, self::JALONS, true)) {
            $this->error("Jalon inconnu : {$demande}. Attendus : " . implode(', ', self::JALONS) . '.');

            return null;
        }

        $jalons = $demande !== null ? [$demande] : self::JALONS;

        // Garde-fou : un avis « avant purge » postérieur à la purge n'avertit
        // plus personne. Si la rétention configurée descendait sous 83 jours,
        // le jalon serait silencieusement inutile — on le dit à voix haute
        // plutôt que de le laisser tourner à vide.
        $retention = $this->moteur->retentionJours();

        return array_values(array_filter($jalons, function (string $jalon) use ($retention) {
            $decalage = self::JOURS_AVIS_PURGE[$jalon] ?? null;

            if ($decalage !== null && $decalage >= $retention) {
                $this->warn(
                    "  {$jalon} ignoré : la rétention configurée est de {$retention} jour(s), "
                    . "l'avis tomberait après la purge. À signaler plutôt qu'à contourner."
                );

                return false;
            }

            return true;
        }));
    }
}
