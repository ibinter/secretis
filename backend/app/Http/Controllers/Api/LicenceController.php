<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\User;
use App\Services\LicenceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * API de licence — cahier IBIG SOFT v1.1, section 9.4.
 *
 * Ce contrôleur n'est qu'une FAÇADE HTTP. Il ne calcule pas d'état, ne connaît
 * aucune durée, aucun plafond, aucun prix : tout vient de LicenceService, qui
 * lit lui-même config/licence.config.json. Une valeur écrite en dur ici serait
 * une seconde vérité, exactement ce que la section 12 cherche à éliminer.
 *
 * ── SÉCURITÉ (section 9.8) ──────────────────────────────────────────────────
 * 1. L'état n'est JAMAIS accepté depuis le client. Aucune méthode ne lit un
 *    `etat` dans la requête. L'organisation elle-même n'est pas lue dans le
 *    corps : elle vient de l'utilisateur authentifié, ou — pour le webhook —
 *    de l'enregistrement de paiement retrouvé en base.
 * 2. TOUTE réponse porte l'état courant, recalculé à l'instant : clé `etat` du
 *    corps et en-tête `X-Licence-Etat`. Le front s'y conforme, y compris sur
 *    les réponses d'erreur — c'est justement quand une requête est refusée que
 *    l'interface a besoin de savoir pourquoi.
 * 3. Les refus de quota sont journalisés (`quota_hits`) et les refus d'état
 *    tracés dans les logs applicatifs.
 *
 * ── CODES D'ERREUR : pourquoi 402 pour le quota et 403 pour l'état ──────────
 * Le cahier impose de distinguer deux refus de nature différente, et le choix
 * est cohérent dans tout le fichier :
 *
 *   402 Payment Required  → `QUOTA_DEPASSE`.
 *       Le plafond du palier gratuit est atteint. Le refus est COMMERCIAL et
 *       LEVABLE : la même requête réussira une fois une formule activée. 402
 *       est la seule réponse HTTP qui dise « ce n'est pas vous, c'est le
 *       palier ». Un 403 ferait croire à un défaut de droit d'accès, et un 429
 *       à une limitation de débit — deux contresens qui orientent mal le
 *       support comme le client.
 *
 *   403 Forbidden         → `ETAT_LECTURE_SEULE`, `DROIT_ABSENT`.
 *       L'état courant n'ouvre pas l'écriture (EXPIRED) ou pas ce droit
 *       (export, API…). Le refus n'est pas levable en payant cette requête-ci ;
 *       il tient à l'état de l'espace. Et il ne coupe rien : la lecture reste
 *       ouverte, conformément à la décision D6 — on ne coupe pas, on ne
 *       supprime pas.
 *
 *   409 Conflict          → l'état actuel rend l'opération sans objet
 *                           (essai déjà en cours, paiement non validé…).
 *   404 Not Found         → clé, référence ou compteur inconnu.
 *   422 Unprocessable     → validation du corps de requête.
 *   401 Unauthorized      → absence d'authentification, ou signature de
 *                           webhook invalide.
 *
 * Aucun endpoint ne renvoie 5xx pour un refus métier : un serveur en erreur et
 * un espace au plafond ne se pilotent pas de la même façon côté client.
 *
 * ── ARBITRAGE EN ATTENTE ────────────────────────────────────────────────────
 * `App\Exceptions\PlafondAtteintException`, livrée par le chantier voisin,
 * rend le plafond en 403 et non en 402. Aucun endpoint de CE contrôleur ne
 * refuse pour cause de quota — le contrôle vit à l'écriture — donc les deux
 * conventions ne se croisent nulle part dans le code aujourd'hui. Elles se
 * croisent en revanche dans la documentation, et un seul statut doit survivre.
 * Signalé dans docs/API-LICENCE.md § 4 ; à trancher, pas à contourner.
 */
class LicenceController extends Controller
{
    public function __construct(
        private readonly LicenceService $licence,
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/licence/etat
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * État complet de l'espace courant.
     *
     * Appelé au chargement de l'application et toutes les 15 minutes
     * (section 9.4). C'est la seule source d'autorité du front : rien de
     * décisif ne doit vivre dans localStorage.
     */
    public function etat(Request $request): JsonResponse
    {
        $orgId = $this->organisation($request);

        if ($orgId === null) {
            return $this->erreurSansEtat('ORGANISATION_ABSENTE',
                'Aucun espace n\'est rattaché à ce compte.', 403);
        }

        return $this->reponse($orgId, $this->licence->etatComplet($orgId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/licence/verifier
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Vérification d'une clé — sert aussi à l'on-premise (section 9.7).
     *
     * DEUX RÈGLES QUI GOUVERNENT CETTE MÉTHODE :
     *
     * 1. Elle ne renvoie JAMAIS 4xx pour une clé inconnue ou échue. Une
     *    instance installée chez le client interprète tout code d'erreur comme
     *    « je n'ai pas pu vérifier », et le cahier exige que ce doute ne bloque
     *    rien. Le verdict est donc dans le corps (`valide: false`), en 200, où
     *    il ne peut pas être confondu avec une panne réseau.
     *
     * 2. Elle dit à l'instance appelante COMBIEN DE TEMPS elle peut se passer
     *    d'elle : `hors_ligne.tolerance_jours`, lu dans la configuration. Passé
     *    ce délai sans vérification réussie, l'instance bascule en LECTURE
     *    SEULE — jamais en blocage total. « Une clinique ou une école bloquée
     *    un jour de rentrée coûte plus cher en réputation que l'impayé. »
     */
    public function verifier(Request $request): JsonResponse
    {
        $donnees = $this->valider($request, [
            'cle_licence' => ['required', 'string', 'max:64'],
        ]);

        $licence = License::where('cle_licence', $donnees['cle_licence'])->first();

        // Consigne minimale : une clé inconnue présentée en boucle est soit une
        // erreur de saisie chez un client, soit un balayage. Les deux méritent
        // d'être visibles, aucun des deux ne mérite un blocage.
        if (! $licence) {
            Log::warning('Licence — vérification d\'une clé inconnue', [
                'ip' => $request->ip(),
            ]);

            return response()->json($this->enveloppeHorsLigne([
                'valide'   => false,
                'motif'    => 'CLE_INCONNUE',
                'message'  => 'Cette clé n\'est pas reconnue. L\'accès reste ouvert en '
                            . 'lecture seule le temps de la régulariser.',
                'etat'     => null,
                'solution' => $this->licence->solution(),
                'formule'  => null,
                'date_fin' => null,
            ]))->header('X-Licence-Etat', 'INCONNU');
        }

        $etat = $this->licence->etat($licence->organization_id);

        // « Valide » ne veut pas dire « payé » : cela veut dire que la clé
        // ouvre encore l'écriture. GRACE en fait partie — c'est tout l'objet
        // d'une période de grâce.
        $valide = in_array($etat, ['DEMO', 'FREE', 'TRIAL', 'ACTIVE', 'GRACE'], true);

        return $this->reponse($licence->organization_id, $this->enveloppeHorsLigne([
            'valide'     => $valide,
            'motif'      => $valide ? null : 'ETAT_LECTURE_SEULE',
            'solution'   => $licence->solution ?: $this->licence->solution(),
            'formule'    => in_array($etat, ['DEMO', 'FREE'], true) ? null : $licence->plan_name,
            'date_fin'   => $licence->ends_at ? Carbon::parse($licence->ends_at)->toDateString() : null,
            'date_purge' => $licence->date_purge ? Carbon::parse($licence->date_purge)->toDateString() : null,
            'droits'     => $this->licence->droits($etat),
        ]), 200, $etat);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/licence/essai
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Démarre un essai. La durée n'est pas un paramètre : elle vient du moteur.
     *
     * `plans.trial_days` est volontairement ignoré — la décision D4 impose une
     * durée unique par solution, et la migration du socle a vidé la colonne
     * pour qu'aucun code ne puisse en tirer une seconde vérité.
     */
    public function essai(Request $request): JsonResponse
    {
        $orgId = $this->organisation($request);

        if ($orgId === null) {
            return $this->erreurSansEtat('ORGANISATION_ABSENTE',
                'Aucun espace n\'est rattaché à ce compte.', 403);
        }

        $donnees = $this->valider($request, [
            'formule'  => ['required', 'string', 'max:60'],
            // La spec 9.4 prévoit `solution` pour les déploiements multi-produits.
            // Ici l'instance ne sert qu'une solution : on accepte le champ, mais
            // on refuse qu'il désigne autre chose que la solution installée.
            'solution' => ['sometimes', 'string', 'max:32'],
        ]);

        if (isset($donnees['solution']) && $donnees['solution'] !== $this->licence->solution()) {
            return $this->erreur($orgId, 'SOLUTION_INCONNUE',
                'Cette instance ne sert pas la solution demandée.', 422);
        }

        $formule = $this->formule($donnees['formule']);

        if ($formule === null) {
            return $this->erreur($orgId, 'FORMULE_INCONNUE',
                'Cette formule n\'existe pas ou n\'est plus proposée.', 404);
        }

        try {
            $licence = $this->licence->demarrerEssai($orgId, $formule->name, $request->user());
        } catch (\RuntimeException $e) {
            // Un espace déjà servi n'est pas une erreur du client : c'est un
            // conflit d'état, et le front doit pouvoir l'afficher tel quel.
            return $this->erreur($orgId, 'ETAT_INCOMPATIBLE', $e->getMessage(), 409);
        }

        return $this->reponse($orgId, [
            'demarre'  => true,
            'formule'  => $licence->plan_name,
            'date_fin' => Carbon::parse($licence->ends_at)->toDateString(),
            'licence'  => $this->licence->etatComplet($orgId),
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/licence/activer
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Activation par clé de licence OU par référence de paiement.
     *
     * L'un ou l'autre, jamais les deux : deux chemins d'activation dans une
     * même requête, ce sont deux vérités possibles sur la formule obtenue.
     */
    public function activer(Request $request): JsonResponse
    {
        $orgId = $this->organisation($request);

        if ($orgId === null) {
            return $this->erreurSansEtat('ORGANISATION_ABSENTE',
                'Aucun espace n\'est rattaché à ce compte.', 403);
        }

        $donnees = $this->valider($request, [
            'cle_licence'        => ['required_without:reference_paiement', 'prohibits:reference_paiement', 'string', 'max:64'],
            'reference_paiement' => ['required_without:cle_licence', 'string', 'max:120'],
        ]);

        if (isset($donnees['cle_licence'])) {
            return $this->activerParCle($orgId, $donnees['cle_licence'], $request);
        }

        return $this->activerParPaiement(
            $orgId,
            $donnees['reference_paiement'],
            'superadmin',
            $request->user(),
            $request,
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/quotas/{compteur}
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Consommation d'un compteur métier.
     *
     * C'est une LECTURE : elle ne consomme rien et ne journalise aucune
     * tentative de dépassement. Le contrôle qui fait foi se fait à l'écriture,
     * dans la couche métier (section 9.5) — masquer un bouton n'empêche
     * personne d'appeler l'API, et compter un dépassement ici gonflerait
     * `quota_hits` à chaque rafraîchissement d'écran, ruinant le signal
     * commercial que la section 9.8 cherche précisément à produire.
     *
     * Quand le compteur est plein, la réponse reste 200 (la lecture a réussi)
     * mais porte `autorise: false` et le texte officiel de refus. Le 402 est
     * réservé aux endpoints d'écriture qui, eux, refusent réellement.
     */
    public function quota(Request $request, string $compteur): JsonResponse
    {
        $orgId = $this->organisation($request);

        if ($orgId === null) {
            return $this->erreurSansEtat('ORGANISATION_ABSENTE',
                'Aucun espace n\'est rattaché à ce compte.', 403);
        }

        if (! in_array($compteur, $this->compteursConnus(), true)) {
            // Sans ce garde-fou, une faute de frappe dans le nom du compteur
            // renverrait « plafond null, donc autorisé » : un quota désactivé
            // en silence, ce qui est le pire des deux mondes.
            return $this->erreur($orgId, 'COMPTEUR_INCONNU',
                'Ce compteur métier n\'existe pas pour cette solution.', 404, [
                    'compteurs_disponibles' => $this->compteursConnus(),
                ]);
        }

        $quota = $this->licence->quota($orgId, $compteur);
        $etat  = $this->licence->etat($orgId);

        if (! $quota['autorise']) {
            // Deux refus se cachent derrière un même `autorise: false`, et les
            // confondre trompe l'utilisateur : un espace expiré à zéro courrier
            // s'entendrait dire que son plafond est atteint, ce qui est faux et
            // l'orienterait vers le mauvais geste. Le motif est donc explicite,
            // et le texte repris du moteur — jamais réécrit ici.
            $lectureSeule = ! ($this->licence->droits($etat)['ecriture'] ?? true);

            $quota['motif_refus']   = $lectureSeule ? 'ETAT_LECTURE_SEULE' : 'QUOTA_DEPASSE';
            $quota['message_refus'] = $lectureSeule
                ? $this->licence->etatComplet($orgId)['message']
                : $this->licence->messageRefus($compteur);
        }

        return $this->reponse($orgId, $quota, 200, $etat);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/paiement/callback  (webhook)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Webhook de la passerelle : passage en ACTIVE et journalisation.
     *
     * TROIS RÈGLES REPRISES DU MODULE PAIEMENTS EXISTANT :
     *  1. Aucune authentification — une passerelle ne porte pas de session.
     *     La sécurité tient ENTIÈREMENT à la signature HMAC, comparée en temps
     *     constant (`hash_equals`).
     *  2. L'organisation et le montant ne sont JAMAIS lus dans le corps : ils
     *     viennent de l'enregistrement de paiement retrouvé en base à partir de
     *     la référence. Un corps signé reste un corps rédigé par un tiers.
     *  3. Hors signature invalide, on répond 200 même en cas de refus métier :
     *     un 4xx déclenche des relivraisons en boucle chez la plupart des
     *     passerelles, ce qui transforme une erreur de données en incident.
     */
    public function callbackPaiement(Request $request): JsonResponse
    {
        if (! $this->signatureValide($request)) {
            Log::warning('Licence — callback de paiement à signature invalide', [
                'ip' => $request->ip(),
            ]);

            // Aucun état n'est divulgué à un appelant non signé : on ne sait
            // même pas de quel espace il prétend parler.
            return response()->json([
                'recu'    => false,
                'code'    => 'SIGNATURE_INVALIDE',
                'message' => 'Signature absente ou invalide.',
            ], 401)->header('X-Licence-Etat', 'INCONNU');
        }

        try {
            $donnees = $this->valider($request, [
                'reference_paiement' => ['required', 'string', 'max:120'],
                'statut'             => ['sometimes', 'string', 'max:32'],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'recu'    => true,
                'traite'  => false,
                'code'    => 'CORPS_INVALIDE',
                'erreurs' => $e->errors(),
            ], 200)->header('X-Licence-Etat', 'INCONNU');
        }

        $statut = strtolower((string) ($donnees['statut'] ?? 'succes'));

        if (! in_array($statut, ['succes', 'success', 'validated', 'paid', 'completed'], true)) {
            Log::info('Licence — callback de paiement non abouti, ignoré', [
                'reference' => $donnees['reference_paiement'],
                'statut'    => $statut,
            ]);

            return response()->json([
                'recu'   => true,
                'traite' => false,
                'motif'  => 'STATUT_NON_ABOUTI',
            ], 200)->header('X-Licence-Etat', 'INCONNU');
        }

        $paiement = $this->paiement(null, $donnees['reference_paiement']);

        if ($paiement === null) {
            Log::warning('Licence — callback pour une référence inconnue', [
                'reference' => $donnees['reference_paiement'],
            ]);

            return response()->json([
                'recu'   => true,
                'traite' => false,
                'motif'  => 'PAIEMENT_INTROUVABLE',
            ], 200)->header('X-Licence-Etat', 'INCONNU');
        }

        $reponse = $this->activerParPaiement(
            (int) $paiement->organization_id,
            $donnees['reference_paiement'],
            'paiement',
            null,
            $request,
        );

        // Le refus métier est déjà journalisé par activerParPaiement ; on le
        // renvoie en 200 pour ne pas provoquer de relivraison en boucle.
        return response()->json(
            ['recu' => true, 'traite' => $reponse->getStatusCode() < 300]
            + (array) $reponse->getData(true),
            200,
        )->header('X-Licence-Etat', $reponse->headers->get('X-Licence-Etat', 'INCONNU'));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Activation — chemins internes
    // ═════════════════════════════════════════════════════════════════════════

    private function activerParCle(int $orgId, string $cle, Request $request): JsonResponse
    {
        $licence = License::where('cle_licence', $cle)->first();

        if (! $licence) {
            Log::warning('Licence — activation avec une clé inconnue', [
                'organization_id' => $orgId,
                'user_id'         => $request->user()?->id,
                'ip'              => $request->ip(),
            ]);

            return $this->erreur($orgId, 'CLE_INCONNUE',
                'Cette clé de licence n\'est pas reconnue.', 404);
        }

        if ((int) $licence->organization_id !== $orgId) {
            // Tentative d'appropriation d'une clé d'un autre espace : c'est le
            // seul cas de ce contrôleur qui relève de la sécurité et non de
            // l'ergonomie. Le message reste volontairement avare.
            Log::warning('Licence — clé présentée par un autre espace', [
                'organization_id' => $orgId,
                'licence_org'     => $licence->organization_id,
                'user_id'         => $request->user()?->id,
                'ip'              => $request->ip(),
            ]);

            return $this->erreur($orgId, 'CLE_INCONNUE',
                'Cette clé de licence n\'est pas reconnue.', 404);
        }

        $avant = $this->licence->etat($orgId);

        if ($avant === 'ACTIVE') {
            // Idempotence : réactiver une licence déjà active n'est pas une
            // erreur, c'est un doublon de requête.
            return $this->reponse($orgId, [
                'active'  => true,
                'deja'    => true,
                'licence' => $this->licence->etatComplet($orgId),
            ]);
        }

        if ($licence->ends_at && Carbon::parse($licence->ends_at)->isPast()) {
            return $this->erreur($orgId, 'CLE_ECHUE',
                'Cette clé est arrivée à échéance. Un renouvellement est nécessaire.', 409, [
                    'date_fin' => Carbon::parse($licence->ends_at)->toDateString(),
                ]);
        }

        DB::transaction(function () use ($licence, $orgId, $avant, $request, $cle) {
            $licence->forceFill(['etat' => 'ACTIVE'])->save();

            $this->licence->journaliser(
                $licence, $avant, 'ACTIVE',
                'Activation par clé de licence',
                $request->user() ? 'superadmin' : 'systeme',
                $request->user(),
                ['cle_licence' => substr($cle, -6)],
            );
        });

        return $this->reponse($orgId, [
            'active'  => true,
            'licence' => $this->licence->etatComplet($orgId),
        ]);
    }

    /**
     * Activation à partir d'un paiement encaissé.
     *
     * La DURÉE vient du paiement (`duration_months`), jamais d'une constante :
     * si elle est absente, on refuse plutôt que d'en inventer une. Une durée
     * devinée se propage silencieusement à la date de grâce, à la date de purge
     * et à la facturation suivante.
     */
    private function activerParPaiement(
        int $orgId,
        string $reference,
        string $acteur,
        ?User $utilisateur,
        Request $request,
    ): JsonResponse {
        $paiement = $this->paiement($orgId, $reference);

        if ($paiement === null) {
            return $this->erreur($orgId, 'PAIEMENT_INTROUVABLE',
                'Aucun paiement ne correspond à cette référence pour cet espace.', 404);
        }

        if (! $paiement->encaisse) {
            return $this->erreur($orgId, 'PAIEMENT_NON_VALIDE',
                'Ce paiement n\'est pas encore encaissé. L\'activation aura lieu '
                . 'dès sa validation.', 409, ['statut_paiement' => $paiement->statut]);
        }

        $mois = (int) ($paiement->mois ?? 0);

        if ($mois < 1) {
            Log::error('Licence — paiement sans durée exploitable', [
                'reference'       => $reference,
                'organization_id' => $orgId,
            ]);

            return $this->erreur($orgId, 'DUREE_INDETERMINEE',
                'La durée souscrite est introuvable sur ce paiement. '
                . 'L\'activation demande une intervention.', 409);
        }

        $formule = $this->formule((string) $paiement->formule);

        if ($formule === null) {
            return $this->erreur($orgId, 'FORMULE_INCONNUE',
                'La formule portée par ce paiement n\'existe pas au catalogue.', 404);
        }

        $courante = $this->licence->licence($orgId);
        $avant    = $courante ? $this->licence->etat($orgId) : null;

        // Idempotence du webhook : une seconde livraison du même événement ne
        // doit pas produire une seconde période d'abonnement.
        $dejaFait = DB::table('license_transitions')
            ->where('organization_id', $orgId)
            ->where('etat_apres', 'ACTIVE')
            ->where('cause', 'like', '%' . $reference . '%')
            ->exists();

        if ($dejaFait) {
            return $this->reponse($orgId, [
                'active'  => true,
                'deja'    => true,
                'licence' => $this->licence->etatComplet($orgId),
            ]);
        }

        $licence = DB::transaction(function () use (
            $orgId, $mois, $formule, $courante, $avant, $reference, $acteur, $utilisateur, $paiement
        ) {
            $courante?->forceFill(['superseded_at' => now()])->save();

            $fin = now()->addMonthsNoOverflow($mois);

            $nouvelle = new License();
            $nouvelle->forceFill([
                'organization_id' => $orgId,
                'plan_id'         => $formule->slug,
                'plan_name'       => $formule->name,
                'price'           => $paiement->montant ?? $formule->price_xof,
                'etat'            => 'ACTIVE',
                'solution'        => $this->licence->solution(),
                'origine'         => 'paiement',
                'starts_at'       => now(),
                'ends_at'         => $fin,
                'grace_until'     => $fin->copy()->addDays($this->licence->graceJours()),
                'date_purge'      => $fin->copy()->addDays(
                    $this->licence->graceJours() + $this->licence->retentionJours()
                ),
            ])->save();

            $this->licence->journaliser(
                $nouvelle, $avant, 'ACTIVE',
                "Activation par paiement {$reference}",
                $acteur, $utilisateur,
                ['reference_paiement' => $reference, 'mois' => $mois, 'formule' => $formule->slug],
            );

            return $nouvelle;
        });

        Log::info('Licence — espace activé', [
            'organization_id' => $orgId,
            'reference'       => $reference,
            'formule'         => $formule->slug,
            'date_fin'        => $licence->ends_at,
        ]);

        return $this->reponse($orgId, [
            'active'   => true,
            'formule'  => $licence->plan_name,
            'date_fin' => Carbon::parse($licence->ends_at)->toDateString(),
            'licence'  => $this->licence->etatComplet($orgId),
        ]);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Recherches
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Retrouve un paiement encaissable à partir d'une référence.
     *
     * Les passerelles renvoient tantôt notre référence, tantôt la leur : on
     * accepte les deux, plus la référence de commande. `$orgId` à null n'ouvre
     * rien — c'est le chemin webhook, qui déduit ensuite l'espace du paiement
     * retrouvé au lieu de le lire dans le corps.
     *
     * @return object{organization_id:int,statut:string,encaisse:bool,mois:?int,formule:?string,montant:?float}|null
     */
    private function paiement(?int $orgId, string $reference): ?object
    {
        $requete = DB::table('payments')
            ->where(function ($q) use ($reference) {
                $q->where('reference', $reference)
                  ->orWhere('gateway_ref', $reference)
                  ->orWhere('idempotency_key', $reference);
            });

        if ($orgId !== null) {
            $requete->where('organization_id', $orgId);
        }

        $paiement = $requete->orderByDesc('id')->first();

        if ($paiement) {
            return (object) [
                'organization_id' => (int) $paiement->organization_id,
                'statut'          => (string) $paiement->status,
                'encaisse'        => $paiement->status === 'validated',
                'mois'            => $paiement->duration_months,
                'formule'         => $paiement->plan_slug,
                'montant'         => $paiement->amount,
            ];
        }

        $requete = DB::table('orders')->where('reference', $reference);

        if ($orgId !== null) {
            $requete->where('organization_id', $orgId);
        }

        $commande = $requete->orderByDesc('id')->first();

        if (! $commande) {
            return null;
        }

        return (object) [
            'organization_id' => (int) $commande->organization_id,
            'statut'          => (string) $commande->status,
            'encaisse'        => $commande->status === 'paid',
            'mois'            => $commande->quantity_months,
            'formule'         => $commande->plan_code,
            'montant'         => $commande->amount_xof ?? $commande->amount,
        ];
    }

    /** Formule du catalogue, par slug ou par nom. Les prix vivent dans `plans`. */
    private function formule(string $reference): ?object
    {
        return DB::table('plans')
            ->where('is_active', true)
            ->where(function ($q) use ($reference) {
                $q->where('slug', $reference)->orWhere('name', $reference);
            })
            ->first();
    }

    /**
     * Compteurs métier déclarés pour la solution.
     *
     * Lus dans la configuration — jamais énumérés ici, sans quoi ajouter un
     * compteur demanderait de modifier deux fichiers, et l'un des deux serait
     * oublié.
     *
     * @return list<string>
     */
    private function compteursConnus(): array
    {
        $config = $this->licence->config()['gratuit'] ?? [];

        return array_values(array_unique(array_merge(
            array_keys($config['quotas'] ?? []),
            $config['compteurs_mensuels'] ?? [],
            $config['compteurs_cumulatifs'] ?? [],
        )));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Enveloppes de réponse
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Réponse portant l'état courant (section 9.8).
     *
     * L'état est recalculé ici, au dernier moment, et non repris d'une variable
     * en amont : entre le début du traitement et la réponse, une activation a
     * pu changer la donne.
     */
    private function reponse(int $orgId, array $donnees, int $statut = 200, ?string $etat = null): JsonResponse
    {
        $etat ??= $this->licence->etat($orgId);

        return response()
            ->json(['etat' => $etat] + $donnees, $statut)
            ->header('X-Licence-Etat', $etat);
    }

    private function erreur(int $orgId, string $code, string $message, int $statut, array $extra = []): JsonResponse
    {
        return $this->reponse($orgId, ['code' => $code, 'message' => $message] + $extra, $statut);
    }

    /** Erreur émise avant toute résolution d'espace : pas d'état à porter. */
    private function erreurSansEtat(string $code, string $message, int $statut): JsonResponse
    {
        return response()
            ->json(['etat' => null, 'code' => $code, 'message' => $message], $statut)
            ->header('X-Licence-Etat', 'INCONNU');
    }

    /** Volet on-premise (section 9.7), ajouté aux réponses de vérification. */
    private function enveloppeHorsLigne(array $donnees): array
    {
        $tolerance = (int) ($this->licence->config()['tolerance_hors_ligne_jours'] ?? 0);

        return $donnees + [
            'hors_ligne' => [
                'tolerance_jours'    => $tolerance,
                'verifie_le'         => now()->toIso8601String(),
                'degradation_le'     => now()->addDays($tolerance)->toIso8601String(),
                'comportement_apres' => 'lecture_seule',
                // Explicite dans la charge utile, et non pas seulement dans la
                // documentation : c'est la garantie que le cahier place le plus
                // haut, et une instance on-premise ne lit pas la documentation.
                'blocage_total'      => false,
            ],
        ];
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Entrées
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Espace de l'utilisateur authentifié.
     *
     * L'identifiant d'organisation n'est jamais lu dans la requête : le fournir
     * reviendrait à laisser le client choisir l'espace dont il lit — ou
     * dont il active — la licence.
     */
    private function organisation(Request $request): ?int
    {
        $orgId = $request->user()?->organization_id;

        return $orgId ? (int) $orgId : null;
    }

    /**
     * Validation du corps, avec des messages en français.
     *
     * Les messages par défaut de Laravel sortent en anglais sur cette
     * instance ; une API de licence qui répond « The cle licence field is
     * required » à un client ivoirien fait porter au support une traduction
     * que le code peut faire lui-même.
     *
     * @return array<string,mixed>
     */
    private function valider(Request $request, array $regles): array
    {
        return $request->validate($regles, [
            'cle_licence.required'                 => 'La clé de licence est obligatoire.',
            'cle_licence.required_without'         => 'Indiquez une clé de licence ou une référence de paiement.',
            'cle_licence.prohibits'                => 'Indiquez une clé de licence OU une référence de paiement, pas les deux.',
            'cle_licence.max'                      => 'Cette clé de licence n\'a pas un format valide.',
            'reference_paiement.required'          => 'La référence de paiement est obligatoire.',
            'reference_paiement.required_without'  => 'Indiquez une référence de paiement ou une clé de licence.',
            'formule.required'                     => 'La formule est obligatoire.',
            'statut.string'                        => 'Le statut du paiement doit être une chaîne de caractères.',
            'solution.string'                      => 'La solution doit être une chaîne de caractères.',
        ]);
    }

    /**
     * Signature HMAC du webhook, comparée en temps constant.
     *
     * Le secret n'a pas de valeur par défaut : sans secret configuré, le
     * webhook refuse tout. Un secret vide accepté par défaut transformerait un
     * oubli de configuration en porte ouverte sur l'activation des licences.
     */
    private function signatureValide(Request $request): bool
    {
        $secret = (string) config('licence-api.webhook_secret', '');

        if ($secret === '') {
            Log::error('Licence — LICENCE_WEBHOOK_SECRET non configuré : callback refusé.');

            return false;
        }

        $entete    = (string) config('licence-api.webhook_header', 'X-Licence-Signature');
        $signature = (string) $request->header($entete, '');

        if ($signature === '') {
            return false;
        }

        $attendue = hash_hmac('sha256', $request->getContent(), $secret);

        return hash_equals($attendue, $signature);
    }
}
