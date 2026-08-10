<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Exception métier SECRETIS avec codes d'erreur standardisés.
 *
 * Chaque type d'erreur métier ou infrastructure propre à SECRETIS
 * est identifié par un code préfixé SEC- permettant :
 *  - Un suivi précis dans les logs et l'audit trail
 *  - Un affichage cohérent côté frontend
 *  - Une documentation client exploitable
 *
 * ## Plages de codes
 *  - SEC-001 à SEC-009 : Licence et abonnement
 *  - SEC-010 à SEC-019 : Autorisation et accès
 *  - SEC-020 à SEC-029 : Ressources non trouvées
 *  - SEC-030 à SEC-039 : Validation et données
 *  - SEC-040 à SEC-049 : Paiement et facturation
 *  - SEC-050 à SEC-059 : Infrastructure et système
 *  - SEC-060 à SEC-069 : Intégrations externes
 *  - SEC-070 à SEC-079 : Quota et limites
 *
 * ## Usage
 *
 * ```php
 * throw SecretisException::licenceExpiree();
 *
 * throw SecretisException::quotaStockageDepasse(
 *     usedMb: 512,
 *     maxMb: 500
 * );
 *
 * throw new SecretisException(
 *     message: 'Description personnalisée',
 *     code: SecretisException::MODULE_NON_AUTORISE,
 *     httpStatus: 403,
 * );
 * ```
 */
class SecretisException extends RuntimeException
{
    // =========================================================================
    // SEC-001 à SEC-009 — Licence et abonnement
    // =========================================================================

    /** Licence expirée — l'abonnement a atteint sa date de fin */
    public const LICENCE_EXPIREE = 'SEC-001';

    /** Accès au module non autorisé par le plan d'abonnement actuel */
    public const MODULE_NON_AUTORISE = 'SEC-002';

    /** Nombre maximal d'utilisateurs atteint pour ce plan */
    public const LIMITE_UTILISATEURS = 'SEC-003';

    /** Quota de stockage fichiers dépassé pour cette organisation */
    public const QUOTA_STOCKAGE_DEPASSE = 'SEC-004';

    /** Paiement déjà traité — protection idempotence */
    public const PAIEMENT_DEJA_TRAITE = 'SEC-005';

    /** Compte organisation suspendu par l'administrateur IBIG */
    public const COMPTE_SUSPENDU = 'SEC-006';

    /** Organisation en période d'essai — fonctionnalité premium non disponible */
    public const FONCTIONNALITE_PREMIUM = 'SEC-007';

    /** Clé de licence invalide ou corrompue */
    public const LICENCE_INVALIDE = 'SEC-008';

    /** Abonnement non activé — paiement en attente de confirmation */
    public const ABONNEMENT_NON_ACTIVE = 'SEC-009';

    // =========================================================================
    // SEC-010 à SEC-019 — Autorisation et accès
    // =========================================================================

    /** Permission refusée — l'utilisateur n'a pas le droit requis */
    public const PERMISSION_REFUSEE = 'SEC-010';

    /** Rôle insuffisant pour cette opération */
    public const ROLE_INSUFFISANT = 'SEC-011';

    /** Accès interdit — opération sur un tenant différent */
    public const ACCES_TENANT_INTERDIT = 'SEC-012';

    /** Token d'authentification invalide ou expiré */
    public const TOKEN_INVALIDE = 'SEC-013';

    /** Compte utilisateur désactivé */
    public const COMPTE_DESACTIVE = 'SEC-014';

    /** Compte utilisateur verrouillé (trop de tentatives) */
    public const COMPTE_VERROUILLE = 'SEC-015';

    /** Session expirée — reconnexion requise */
    public const SESSION_EXPIREE = 'SEC-016';

    /** Vérification 2FA requise */
    public const DOUBLE_FACTEUR_REQUIS = 'SEC-017';

    /** Code 2FA invalide ou expiré */
    public const CODE_2FA_INVALIDE = 'SEC-018';

    /** IP non autorisée (liste blanche activée) */
    public const IP_NON_AUTORISEE = 'SEC-019';

    // =========================================================================
    // SEC-020 à SEC-029 — Ressources non trouvées
    // =========================================================================

    /** Ressource demandée introuvable ou hors du scope du tenant */
    public const RESSOURCE_INTROUVABLE = 'SEC-020';

    /** Organisation (tenant) introuvable */
    public const ORGANISATION_INTROUVABLE = 'SEC-021';

    /** Utilisateur introuvable */
    public const UTILISATEUR_INTROUVABLE = 'SEC-022';

    /** Courrier introuvable */
    public const COURRIER_INTROUVABLE = 'SEC-023';

    /** Document introuvable */
    public const DOCUMENT_INTROUVABLE = 'SEC-024';

    /** Événement agenda introuvable */
    public const EVENEMENT_INTROUVABLE = 'SEC-025';

    /** Réunion introuvable */
    public const REUNION_INTROUVABLE = 'SEC-026';

    /** Tâche introuvable */
    public const TACHE_INTROUVABLE = 'SEC-027';

    /** Employé introuvable */
    public const EMPLOYE_INTROUVABLE = 'SEC-028';

    /** Ressource physique (salle, véhicule) introuvable */
    public const RESSOURCE_PHYSIQUE_INTROUVABLE = 'SEC-029';

    // =========================================================================
    // SEC-030 à SEC-039 — Validation et données
    // =========================================================================

    /** Données de la requête invalides */
    public const DONNEES_INVALIDES = 'SEC-030';

    /** Conflit de plage horaire détecté (agenda, réservation) */
    public const CONFLIT_HORAIRE = 'SEC-031';

    /** Référence de courrier déjà utilisée */
    public const REFERENCE_DUPLIQUEE = 'SEC-032';

    /** Format de fichier non autorisé */
    public const FORMAT_FICHIER_INTERDIT = 'SEC-033';

    /** Taille de fichier dépassée */
    public const TAILLE_FICHIER_DEPASSEE = 'SEC-034';

    /** Transition de statut invalide (ex: passer de terminé à en cours) */
    public const TRANSITION_STATUT_INVALIDE = 'SEC-035';

    /** Email déjà utilisé dans cette organisation */
    public const EMAIL_DUPLIQUE = 'SEC-036';

    /** Date ou plage horaire invalide */
    public const DATE_INVALIDE = 'SEC-037';

    /** Données encodées ou chiffrées corrompues */
    public const DONNEES_CORROMPUES = 'SEC-038';

    /** Référence circulaire détectée (ex: tâche parente = elle-même) */
    public const REFERENCE_CIRCULAIRE = 'SEC-039';

    // =========================================================================
    // SEC-040 à SEC-049 — Paiement et facturation
    // =========================================================================

    /** Erreur lors du traitement du paiement par le prestataire */
    public const ERREUR_PAIEMENT = 'SEC-040';

    /** Paiement refusé par la banque ou l'opérateur mobile */
    public const PAIEMENT_REFUSE = 'SEC-041';

    /** Montant de paiement incorrect */
    public const MONTANT_INCORRECT = 'SEC-042';

    /** Devise non supportée */
    public const DEVISE_NON_SUPPORTEE = 'SEC-043';

    /** Facture introuvable */
    public const FACTURE_INTROUVABLE = 'SEC-044';

    /** Plan d'abonnement introuvable ou désactivé */
    public const PLAN_INTROUVABLE = 'SEC-045';

    /** Rétrogradation de plan non autorisée (modules actifs dépassent le plan cible) */
    public const RETROGRADE_IMPOSSIBLE = 'SEC-046';

    /** Remboursement non autorisé pour cet achat */
    public const REMBOURSEMENT_NON_AUTORISE = 'SEC-047';

    /** Coupon de réduction invalide ou expiré */
    public const COUPON_INVALIDE = 'SEC-048';

    /** Signature webhook paiement invalide */
    public const SIGNATURE_WEBHOOK_INVALIDE = 'SEC-049';

    // =========================================================================
    // SEC-050 à SEC-059 — Infrastructure et système
    // =========================================================================

    /** Erreur interne du serveur — voir les logs */
    public const ERREUR_INTERNE = 'SEC-050';

    /** Service temporairement indisponible (maintenance) */
    public const SERVICE_INDISPONIBLE = 'SEC-051';

    /** Trop de requêtes — rate limit atteint */
    public const TROP_DE_REQUETES = 'SEC-052';

    /** Délai d'attente dépassé pour une opération longue */
    public const TIMEOUT = 'SEC-053';

    /** Erreur de connexion à la base de données */
    public const ERREUR_BASE_DE_DONNEES = 'SEC-054';

    /** Erreur Redis — cache ou queue indisponible */
    public const ERREUR_REDIS = 'SEC-055';

    /** Erreur du moteur de recherche (Meilisearch) */
    public const ERREUR_MOTEUR_RECHERCHE = 'SEC-056';

    /** Erreur lors de la génération d'un fichier PDF */
    public const ERREUR_GENERATION_PDF = 'SEC-057';

    /** Erreur lors du traitement OCR */
    public const ERREUR_OCR = 'SEC-058';

    /** Erreur lors de l'envoi d'email */
    public const ERREUR_ENVOI_EMAIL = 'SEC-059';

    // =========================================================================
    // SEC-060 à SEC-069 — Intégrations externes
    // =========================================================================

    /** Erreur de connexion à l'API Google Calendar */
    public const ERREUR_GOOGLE_CALENDAR = 'SEC-060';

    /** Token OAuth expiré ou révoqué */
    public const TOKEN_OAUTH_EXPIRE = 'SEC-061';

    /** Erreur API prestataire de paiement (CinetPay, Orange Money...) */
    public const ERREUR_API_PAIEMENT = 'SEC-062';

    /** Erreur API SMS (Orange SMS, MTN SMS) */
    public const ERREUR_API_SMS = 'SEC-063';

    /** Erreur API IA (OpenAI, Anthropic) */
    public const ERREUR_API_IA = 'SEC-064';

    /** Intégration tierce non configurée pour cette organisation */
    public const INTEGRATION_NON_CONFIGUREE = 'SEC-065';

    /** Webhook de l'intégration tierce invalide */
    public const WEBHOOK_INVALIDE = 'SEC-066';

    /** Synchronisation calendrier externe échouée */
    public const SYNC_CALENDRIER_ECHOUEE = 'SEC-067';

    /** Erreur API Meilisearch — indexation échouée */
    public const ERREUR_INDEXATION = 'SEC-068';

    /** Erreur de connexion ERP partenaire (SAP, Odoo) */
    public const ERREUR_ERP_PARTENAIRE = 'SEC-069';

    // =========================================================================
    // SEC-070 à SEC-079 — Quotas et limites
    // =========================================================================

    /** Nombre maximum de courriers par mois atteint pour ce plan */
    public const QUOTA_COURRIERS_ATTEINT = 'SEC-070';

    /** Nombre maximum de réunions simultanées atteint */
    public const QUOTA_REUNIONS_ATTEINT = 'SEC-071';

    /** Nombre maximum d'API calls journaliers atteint */
    public const QUOTA_API_ATTEINT = 'SEC-072';

    /** Nombre maximum de canaux de messagerie atteint */
    public const QUOTA_CANAUX_ATTEINT = 'SEC-073';

    /** Nombre maximum de rapports planifiés atteint */
    public const QUOTA_RAPPORTS_ATTEINT = 'SEC-074';

    /** Nombre maximum de visiteurs enregistrables par jour atteint */
    public const QUOTA_VISITEURS_ATTEINT = 'SEC-075';

    /** Nombre maximum de ressources (salles, véhicules) atteint */
    public const QUOTA_RESSOURCES_ATTEINT = 'SEC-076';

    // =========================================================================
    // Propriétés de l'exception
    // =========================================================================

    /**
     * @param  string          $message    Message lisible de l'erreur
     * @param  string          $errorCode  Code d'erreur SECRETIS (SEC-XXX)
     * @param  int             $httpStatus Code HTTP associé à l'erreur
     * @param  array           $context    Données contextuelles pour le débogage
     * @param  Throwable|null  $previous   Exception d'origine (chaînage)
     */
    public function __construct(
        string $message,
        public readonly string $errorCode = self::ERREUR_INTERNE,
        public readonly int $httpStatus = 400,
        public readonly array $context = [],
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    // =========================================================================
    // Factory methods — Licence et abonnement
    // =========================================================================

    public static function licenceExpiree(): self
    {
        return new self(
            message: 'Votre licence SECRETIS a expiré. Veuillez renouveler votre abonnement.',
            errorCode: self::LICENCE_EXPIREE,
            httpStatus: 402,
        );
    }

    public static function moduleNonAutorise(string $module): self
    {
        return new self(
            message: "Le module '{$module}' n'est pas inclus dans votre plan d'abonnement.",
            errorCode: self::MODULE_NON_AUTORISE,
            httpStatus: 403,
            context: ['module' => $module],
        );
    }

    public static function limiteUtilisateursAtteinte(int $max): self
    {
        return new self(
            message: "La limite de {$max} utilisateurs pour votre plan est atteinte.",
            errorCode: self::LIMITE_UTILISATEURS,
            httpStatus: 403,
            context: ['max_users' => $max],
        );
    }

    public static function quotaStockageDepasse(int $usedMb, int $maxMb): self
    {
        return new self(
            message: "Quota de stockage dépassé ({$usedMb} Mo utilisés / {$maxMb} Mo autorisés).",
            errorCode: self::QUOTA_STOCKAGE_DEPASSE,
            httpStatus: 413,
            context: ['used_mb' => $usedMb, 'max_mb' => $maxMb],
        );
    }

    public static function paiementDejaTraite(string $transactionId): self
    {
        return new self(
            message: 'Ce paiement a déjà été traité (idempotence).',
            errorCode: self::PAIEMENT_DEJA_TRAITE,
            httpStatus: 409,
            context: ['transaction_id' => $transactionId],
        );
    }

    public static function compteSuspendu(): self
    {
        return new self(
            message: 'Ce compte a été suspendu. Contactez le support IBIG à support@ibigsoft.com.',
            errorCode: self::COMPTE_SUSPENDU,
            httpStatus: 403,
        );
    }

    // =========================================================================
    // Factory methods — Autorisation
    // =========================================================================

    public static function permissionRefusee(string $permission): self
    {
        return new self(
            message: "Permission refusée : '{$permission}'.",
            errorCode: self::PERMISSION_REFUSEE,
            httpStatus: 403,
            context: ['permission' => $permission],
        );
    }

    public static function compteDesactive(): self
    {
        return new self(
            message: 'Votre compte est désactivé. Contactez votre administrateur.',
            errorCode: self::COMPTE_DESACTIVE,
            httpStatus: 403,
        );
    }

    public static function compteVerrouille(int $minutesRestantes): self
    {
        return new self(
            message: "Compte temporairement verrouillé. Réessayez dans {$minutesRestantes} minute(s).",
            errorCode: self::COMPTE_VERROUILLE,
            httpStatus: 423,
            context: ['retry_after_minutes' => $minutesRestantes],
        );
    }

    // =========================================================================
    // Factory methods — Données et validation
    // =========================================================================

    public static function conflitHoraire(): self
    {
        return new self(
            message: 'Un conflit de plage horaire a été détecté. Veuillez choisir un autre créneau.',
            errorCode: self::CONFLIT_HORAIRE,
            httpStatus: 409,
        );
    }

    public static function transitionStatutInvalide(string $from, string $to): self
    {
        return new self(
            message: "Impossible de passer du statut '{$from}' au statut '{$to}'.",
            errorCode: self::TRANSITION_STATUT_INVALIDE,
            httpStatus: 422,
            context: ['from' => $from, 'to' => $to],
        );
    }

    public static function formatFichierInterdit(string $extension, array $allowed): self
    {
        return new self(
            message: "Le format de fichier '.{$extension}' n'est pas autorisé. Formats acceptés : " . implode(', ', $allowed),
            errorCode: self::FORMAT_FICHIER_INTERDIT,
            httpStatus: 415,
            context: ['extension' => $extension, 'allowed' => $allowed],
        );
    }

    // =========================================================================
    // Factory methods — Infrastructure
    // =========================================================================

    public static function erreurGenerationPdf(string $details = ''): self
    {
        return new self(
            message: 'La génération du PDF a échoué. Veuillez réessayer.',
            errorCode: self::ERREUR_GENERATION_PDF,
            httpStatus: 500,
            context: ['details' => $details],
        );
    }

    public static function erreurOCR(string $filename): self
    {
        return new self(
            message: "Le traitement OCR du fichier '{$filename}' a échoué.",
            errorCode: self::ERREUR_OCR,
            httpStatus: 500,
            context: ['filename' => $filename],
        );
    }

    public static function signatureWebhookInvalide(string $provider): self
    {
        return new self(
            message: "Signature du webhook '{$provider}' invalide. Requête ignorée.",
            errorCode: self::SIGNATURE_WEBHOOK_INVALIDE,
            httpStatus: 401,
            context: ['provider' => $provider],
        );
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Convertit l'exception en tableau pour les réponses JSON API.
     */
    public function toArray(): array
    {
        return [
            'success'    => false,
            'data'       => null,
            'message'    => $this->getMessage(),
            'error_code' => $this->errorCode,
            'context'    => $this->context,
        ];
    }

    /**
     * Retourne le tableau des codes d'erreur avec leurs descriptions.
     * Utile pour la documentation API et les logs de monitoring.
     *
     * @return array<string, string>
     */
    public static function getAllCodes(): array
    {
        return [
            self::LICENCE_EXPIREE            => 'Licence expirée',
            self::MODULE_NON_AUTORISE         => 'Module non autorisé par le plan',
            self::LIMITE_UTILISATEURS         => 'Limite d\'utilisateurs atteinte',
            self::QUOTA_STOCKAGE_DEPASSE      => 'Quota de stockage dépassé',
            self::PAIEMENT_DEJA_TRAITE        => 'Paiement déjà traité (idempotence)',
            self::COMPTE_SUSPENDU             => 'Acces restreint — contactez le support',
            self::FONCTIONNALITE_PREMIUM      => 'Fonctionnalité premium indisponible en trial',
            self::LICENCE_INVALIDE            => 'Clé de licence invalide',
            self::ABONNEMENT_NON_ACTIVE       => 'Abonnement non activé',
            self::PERMISSION_REFUSEE          => 'Permission refusée',
            self::ROLE_INSUFFISANT            => 'Rôle insuffisant',
            self::ACCES_TENANT_INTERDIT       => 'Accès inter-tenant interdit',
            self::TOKEN_INVALIDE              => 'Token invalide ou expiré',
            self::COMPTE_DESACTIVE            => 'Compte désactivé',
            self::COMPTE_VERROUILLE           => 'Compte verrouillé',
            self::SESSION_EXPIREE             => 'Session expirée',
            self::DOUBLE_FACTEUR_REQUIS       => 'Vérification 2FA requise',
            self::CODE_2FA_INVALIDE           => 'Code 2FA invalide',
            self::IP_NON_AUTORISEE            => 'Adresse IP non autorisée',
            self::RESSOURCE_INTROUVABLE       => 'Ressource introuvable',
            self::ORGANISATION_INTROUVABLE    => 'Organisation introuvable',
            self::UTILISATEUR_INTROUVABLE     => 'Utilisateur introuvable',
            self::COURRIER_INTROUVABLE        => 'Courrier introuvable',
            self::DOCUMENT_INTROUVABLE        => 'Document introuvable',
            self::EVENEMENT_INTROUVABLE       => 'Événement introuvable',
            self::REUNION_INTROUVABLE         => 'Réunion introuvable',
            self::TACHE_INTROUVABLE           => 'Tâche introuvable',
            self::EMPLOYE_INTROUVABLE         => 'Employé introuvable',
            self::RESSOURCE_PHYSIQUE_INTROUVABLE => 'Ressource physique introuvable',
            self::DONNEES_INVALIDES           => 'Données invalides',
            self::CONFLIT_HORAIRE             => 'Conflit de plage horaire',
            self::REFERENCE_DUPLIQUEE         => 'Référence en doublon',
            self::FORMAT_FICHIER_INTERDIT     => 'Format de fichier non autorisé',
            self::TAILLE_FICHIER_DEPASSEE     => 'Taille de fichier dépassée',
            self::TRANSITION_STATUT_INVALIDE  => 'Transition de statut invalide',
            self::EMAIL_DUPLIQUE              => 'Email déjà utilisé',
            self::DATE_INVALIDE               => 'Date invalide',
            self::DONNEES_CORROMPUES          => 'Données corrompues',
            self::REFERENCE_CIRCULAIRE        => 'Référence circulaire détectée',
            self::ERREUR_PAIEMENT             => 'Erreur de traitement du paiement',
            self::PAIEMENT_REFUSE             => 'Paiement refusé',
            self::MONTANT_INCORRECT           => 'Montant incorrect',
            self::DEVISE_NON_SUPPORTEE        => 'Devise non supportée',
            self::FACTURE_INTROUVABLE         => 'Facture introuvable',
            self::PLAN_INTROUVABLE            => 'Plan introuvable',
            self::RETROGRADE_IMPOSSIBLE       => 'Rétrogradation de plan impossible',
            self::REMBOURSEMENT_NON_AUTORISE  => 'Remboursement non autorisé',
            self::COUPON_INVALIDE             => 'Coupon invalide ou expiré',
            self::SIGNATURE_WEBHOOK_INVALIDE  => 'Signature webhook invalide',
            self::ERREUR_INTERNE              => 'Erreur interne du serveur',
            self::SERVICE_INDISPONIBLE        => 'Service temporairement indisponible',
            self::TROP_DE_REQUETES            => 'Trop de requêtes',
            self::TIMEOUT                     => 'Délai d\'attente dépassé',
            self::ERREUR_BASE_DE_DONNEES      => 'Erreur base de données',
            self::ERREUR_REDIS                => 'Erreur Redis',
            self::ERREUR_MOTEUR_RECHERCHE     => 'Erreur moteur de recherche',
            self::ERREUR_GENERATION_PDF       => 'Erreur génération PDF',
            self::ERREUR_OCR                  => 'Erreur traitement OCR',
            self::ERREUR_ENVOI_EMAIL          => 'Erreur envoi email',
            self::ERREUR_GOOGLE_CALENDAR      => 'Erreur API Google Calendar',
            self::TOKEN_OAUTH_EXPIRE          => 'Token OAuth expiré',
            self::ERREUR_API_PAIEMENT         => 'Erreur API prestataire paiement',
            self::ERREUR_API_SMS              => 'Erreur API SMS',
            self::ERREUR_API_IA               => 'Erreur API IA',
            self::INTEGRATION_NON_CONFIGUREE  => 'Intégration non configurée',
            self::WEBHOOK_INVALIDE            => 'Webhook invalide',
            self::SYNC_CALENDRIER_ECHOUEE     => 'Synchronisation calendrier échouée',
            self::ERREUR_INDEXATION           => 'Erreur d\'indexation Meilisearch',
            self::ERREUR_ERP_PARTENAIRE       => 'Erreur connexion ERP partenaire',
            self::QUOTA_COURRIERS_ATTEINT     => 'Quota courriers mensuel atteint',
            self::QUOTA_REUNIONS_ATTEINT      => 'Quota réunions atteint',
            self::QUOTA_API_ATTEINT           => 'Quota API journalier atteint',
            self::QUOTA_CANAUX_ATTEINT        => 'Quota canaux messagerie atteint',
            self::QUOTA_RAPPORTS_ATTEINT      => 'Quota rapports planifiés atteint',
            self::QUOTA_VISITEURS_ATTEINT     => 'Quota visiteurs journalier atteint',
            self::QUOTA_RESSOURCES_ATTEINT    => 'Quota ressources atteint',
        ];
    }
}
