<?php

declare(strict_types=1);

namespace App\Services\Sara;

/**
 * Value-object représentant la réponse de SARA v2.
 */
readonly class SaraResponse
{
    public function __construct(
        /** Message principal à afficher à l'utilisateur */
        public string $message,

        /** L'action nécessite-t-elle une confirmation ? */
        public bool $requiresConfirmation = false,

        /**
         * Action en attente de confirmation.
         * Structure : { type, params, summary }
         */
        public ?array $pendingAction = null,

        /** La réponse est-elle une erreur ? */
        public bool $isError = false,

        /** Métadonnées supplémentaires (intent, type, etc.) */
        public array $metadata = [],

        /** Suggestions rapides à afficher après la réponse */
        public array $quickActions = [],
    ) {
    }

    /**
     * Sérialise pour l'API JSON.
     */
    public function toArray(): array
    {
        return [
            'message'               => $this->message,
            'requires_confirmation' => $this->requiresConfirmation,
            'pending_action'        => $this->pendingAction,
            'is_error'              => $this->isError,
            'metadata'              => $this->metadata,
            'quick_actions'         => $this->quickActions,
            'version'               => SaraV2Service::VERSION,
        ];
    }
}
