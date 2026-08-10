<?php

declare(strict_types=1);

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * BackupRestoredNotification — Email envoyé aux SuperAdmins après une restauration.
 *
 * Envoyée qu'elle soit réussie ou échouée, pour audit et traçabilité.
 */
class BackupRestoredNotification extends Notification
{
    public function __construct(
        private readonly string $filename,
        private readonly bool   $success,
        private readonly string $initiatedBy,
        private readonly string $error = '',
    ) {}

    // ─────────────────────────────────────────────────────────────────────────

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    // ─────────────────────────────────────────────────────────────────────────

    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'SECRETIS ERP');
        $now     = now()->format('d/m/Y à H:i');

        if ($this->success) {
            return (new MailMessage())
                ->subject("[{$appName}] ✅ Restauration réussie — {$this->filename}")
                ->greeting("Bonjour {$notifiable->name},")
                ->line("La restauration de la sauvegarde a été effectuée avec succès.")
                ->line("**Fichier restauré :** `{$this->filename}`")
                ->line("**Date :** {$now}")
                ->line("**Initiée par :** {$this->initiatedBy}")
                ->line("L'application SECRETIS ERP est de nouveau opérationnelle.")
                ->salutation("L'équipe IBIG Soft");
        }

        return (new MailMessage())
            ->subject("[{$appName}] ❌ ÉCHEC de la restauration — {$this->filename}")
            ->greeting("Bonjour {$notifiable->name},")
            ->line("**ATTENTION** : La restauration de la sauvegarde a échoué.")
            ->line("**Fichier :** `{$this->filename}`")
            ->line("**Date :** {$now}")
            ->line("**Initiée par :** {$this->initiatedBy}")
            ->line("**Erreur :** {$this->error}")
            ->line("Vérifiez les logs système immédiatement. L'application a été remise en ligne automatiquement.")
            ->salutation("L'équipe IBIG Soft");
    }
}
