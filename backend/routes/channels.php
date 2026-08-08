<?php

use Illuminate\Support\Facades\Broadcast;

/**
 * SECRETIS ERP — autorisations des canaux temps réel.
 *
 * Ce fichier ne contenait AUCUNE définition : tout abonnement à un canal privé
 * était donc refusé, et les événements diffusés (messagerie, arrivée visiteur,
 * notifications) ne parvenaient jamais au navigateur.
 */

/** Canal personnel : badge de notifications, messages reçus. */
Broadcast::channel('user.{userId}', function ($user, int $userId) {
    return (int) $user->id === $userId;
});

/** Canal d'une conversation : réservé à ses participants actifs. */
Broadcast::channel('conversation.{conversationId}', function ($user, int $conversationId) {
    return \App\Models\ConversationParticipant::where('conversation_id', $conversationId)
        ->where('user_id', $user->id)
        ->whereNull('left_at')
        ->exists();
});

/** Canaux d'organisation (accueil, tableaux de bord) : membres de l'organisation. */
Broadcast::channel('org.{organizationId}.{scope}', function ($user, int $organizationId, string $scope) {
    return (int) $user->organization_id === $organizationId;
});

Broadcast::channel('organization.{organizationId}', function ($user, int $organizationId) {
    return (int) $user->organization_id === $organizationId;
});

/** Présence : qui est en ligne dans l'organisation. */
Broadcast::channel('presence.org.{organizationId}', function ($user, int $organizationId) {
    if ((int) $user->organization_id !== $organizationId) {
        return false;
    }

    return ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatar ?? null];
});
