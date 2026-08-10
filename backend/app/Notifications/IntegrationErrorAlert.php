<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\OrganizationIntegration;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Integration bloquee en erreur — alerte aux admins de l'organisation.
 *
 * Appelee par App\Console\Commands\SyncIntegrations :
 *   new IntegrationErrorAlert($integration, $since)  // $since = diffForHumans()
 */
class IntegrationErrorAlert extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly OrganizationIntegration $integration,
        public readonly string                  $since,
    ) {
        $this->queue = 'notifications';
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $name = $this->integration->connector?->name
            ?? $this->integration->connector?->slug
            ?? 'Integration #' . $this->integration->id;

        return [
            'type'           => 'integration_error',
            'category'       => 'system',
            'severity'       => 'error',
            'title'          => 'Intégration en erreur',
            'body'           => "L'intégration « {$name} » est en erreur depuis {$this->since}."
                              . ($this->integration->error_message ? ' ' . $this->integration->error_message : ''),
            'action_url'     => '/parametres/integrations',
            'action_label'   => 'Reconnecter',
            'integration_id' => $this->integration->id,
            'connector'      => $this->integration->connector?->slug,
            'since'          => $this->since,
            'error_message'  => $this->integration->error_message,
        ];
    }
}
