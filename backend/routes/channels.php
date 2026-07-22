<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| SECRETIS ERP — Canaux Broadcast WebSocket (Laravel Reverb)
| Toutes les 12 vagues — Version définitive
|--------------------------------------------------------------------------
|
| Les canaux privés (Broadcast::channel) sont authentifiés automatiquement
| par Sanctum lors du handshake Reverb.
|
| Présence (presence-*) : retourner un tableau = authentifié + données utilisateur
| Privé (sans presence) : retourner true/false = autorisé ou non
|
*/

use App\Models\Document;
use App\Models\Meeting;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// =============================================================================
// CANAL ORGANISATION — Événements globaux du tenant
// Abonnés : tous les utilisateurs authentifiés de l'organisation
// Usage : broadcast tenant-wide (announcements, org settings changes, etc.)
// =============================================================================

Broadcast::channel('organization.{orgId}', function (User $user, int $orgId): bool {
    return (int) $user->organization_id === $orgId;
});

// =============================================================================
// CANAL UTILISATEUR PRIVÉ — Notifications personnelles
// Abonné : l'utilisateur lui-même uniquement
// Usage : notifications push, messages directs, alertes personnelles
// =============================================================================

Broadcast::channel('user.{userId}', function (User $user, int $userId): bool {
    return (int) $user->id === $userId;
});

// =============================================================================
// CANAL PRÉSENCE ORGANISATION — Qui est en ligne
// Abonnés : tous les membres de l'organisation
// Usage : indicateurs de présence, liste des utilisateurs connectés
// =============================================================================

Broadcast::channel('presence-organization.{orgId}', function (User $user, int $orgId): array|false {
    if ((int) $user->organization_id !== $orgId) {
        return false;
    }

    return [
        'id'         => $user->id,
        'name'       => $user->name,
        'email'      => $user->email,
        'avatar_url' => $user->avatar_url,
        'role'       => $user->roles->first()?->name,
        'department' => $user->department?->name,
    ];
});

// =============================================================================
// CANAL RÉCEPTION VISITEURS — Module Accueil (Vague 6)
// Abonnés : utilisateurs ayant le rôle réceptionniste ou admin accueil
// Usage : arrivées temps réel, check-in/check-out, alertes sécurité
// =============================================================================

Broadcast::channel('visitor.reception.{orgId}', function (User $user, int $orgId): bool {
    return (int) $user->organization_id === $orgId
        && ($user->hasRole(['receptionist', 'admin', 'super_admin'])
            || $user->hasPermissionTo('reception.view'));
});

// =============================================================================
// CANAL FLOTTE GPS — Module Flotte (Vague 5/9)
// Abonnés : utilisateurs ayant l'accès gestion flotte
// Usage : positions GPS temps réel, alertes géofencing, alertes maintenance
// =============================================================================

Broadcast::channel('fleet.{orgId}', function (User $user, int $orgId): bool {
    return (int) $user->organization_id === $orgId
        && ($user->hasRole(['fleet_manager', 'admin', 'super_admin'])
            || $user->hasPermissionTo('fleet.view'));
});

// =============================================================================
// CANAL PRÉSENCE FLOTTE — Conducteurs en ligne
// Usage : tableau de bord temps réel des conducteurs actifs
// =============================================================================

Broadcast::channel('presence-fleet.{orgId}', function (User $user, int $orgId): array|false {
    if ((int) $user->organization_id !== $orgId) {
        return false;
    }
    if (! $user->hasPermissionTo('fleet.view')) {
        return false;
    }

    return [
        'id'   => $user->id,
        'name' => $user->name,
    ];
});

// =============================================================================
// CANAL DOCUMENT — GED collaborative (Vague 2)
// Abonnés : utilisateurs ayant accès au document spécifique
// Usage : édition collaborative, commentaires temps réel, workflow validation
// =============================================================================

Broadcast::channel('document.{documentId}', function (User $user, int $documentId): bool {
    $document = Document::find($documentId);

    if (! $document) {
        return false;
    }

    // L'organisation doit correspondre
    if ((int) $user->organization_id !== (int) $document->organization_id) {
        return false;
    }

    // Vérification accès : propriétaire, partagé ou admin
    return $document->owner_id === $user->id
        || $document->shares()->where('user_id', $user->id)->exists()
        || $user->hasRole(['admin', 'super_admin'])
        || $user->hasPermissionTo('ged.view');
});

// =============================================================================
// CANAL PRÉSENCE DOCUMENT — Qui lit/édite ce document
// Usage : indicateur "X utilisateurs sur ce document"
// =============================================================================

Broadcast::channel('presence-document.{documentId}', function (User $user, int $documentId): array|false {
    $document = Document::find($documentId);

    if (! $document || (int) $user->organization_id !== (int) $document->organization_id) {
        return false;
    }

    $hasAccess = $document->owner_id === $user->id
        || $document->shares()->where('user_id', $user->id)->exists()
        || $user->hasPermissionTo('ged.view');

    if (! $hasAccess) {
        return false;
    }

    return [
        'id'         => $user->id,
        'name'       => $user->name,
        'avatar_url' => $user->avatar_url,
    ];
});

// =============================================================================
// CANAL RÉUNION — Module Réunions (Vague 3)
// Abonnés : participants invités à la réunion
// Usage : prise de notes collaborative, vote, levée de séance temps réel
// =============================================================================

Broadcast::channel('meeting.{meetingId}', function (User $user, int $meetingId): bool {
    $meeting = Meeting::find($meetingId);

    if (! $meeting) {
        return false;
    }

    if ((int) $user->organization_id !== (int) $meeting->organization_id) {
        return false;
    }

    // Organisateur, participant ou admin
    return $meeting->organizer_id === $user->id
        || $meeting->participants()->where('user_id', $user->id)->exists()
        || $user->hasRole(['admin', 'super_admin']);
});

// =============================================================================
// CANAL PRÉSENCE RÉUNION — Participants connectés en direct
// Usage : liste des présents, tour de parole, levée de main
// =============================================================================

Broadcast::channel('presence-meeting.{meetingId}', function (User $user, int $meetingId): array|false {
    $meeting = Meeting::find($meetingId);

    if (! $meeting || (int) $user->organization_id !== (int) $meeting->organization_id) {
        return false;
    }

    $isParticipant = $meeting->organizer_id === $user->id
        || $meeting->participants()->where('user_id', $user->id)->exists()
        || $user->hasRole(['admin', 'super_admin']);

    if (! $isParticipant) {
        return false;
    }

    return [
        'id'         => $user->id,
        'name'       => $user->name,
        'avatar_url' => $user->avatar_url,
        'role'       => $meeting->organizer_id === $user->id ? 'organizer' : 'participant',
    ];
});

// =============================================================================
// CANAL MESSAGING — Messagerie interne (Vague 5)
// Abonnés : membres du channel de conversation
// Usage : messages temps réel, typing indicators, réactions emoji
// =============================================================================

Broadcast::channel('chat.{channelId}', function (User $user, int $channelId): bool {
    return $user->conversations()->where('conversation_id', $channelId)->exists();
});

Broadcast::channel('presence-chat.{channelId}', function (User $user, int $channelId): array|false {
    if (! $user->conversations()->where('conversation_id', $channelId)->exists()) {
        return false;
    }

    return [
        'id'         => $user->id,
        'name'       => $user->name,
        'avatar_url' => $user->avatar_url,
    ];
});

// =============================================================================
// CANAL MODULE — Présence par module
// Usage : collaboration par module, alertes module-wide
// =============================================================================

Broadcast::channel('presence-module.{orgId}.{module}', function (User $user, int $orgId, string $module): array|false {
    if ((int) $user->organization_id !== $orgId) {
        return false;
    }

    if (! $user->hasPermissionTo("{$module}.view")) {
        return false;
    }

    return [
        'id'     => $user->id,
        'name'   => $user->name,
        'module' => $module,
    ];
});

// =============================================================================
// CANAL AGENDA — Événements agenda temps réel (Vague 1)
// Usage : nouveau rendez-vous, modification, rappel immédiat
// =============================================================================

Broadcast::channel('agenda.{orgId}', function (User $user, int $orgId): bool {
    return (int) $user->organization_id === $orgId
        && $user->hasPermissionTo('agenda.view');
});

// =============================================================================
// CANAL TÂCHES — Kanban collaboratif (Vague 4)
// Usage : déplacement de cartes, assignation, commentaires
// =============================================================================

Broadcast::channel('tasks.{orgId}', function (User $user, int $orgId): bool {
    return (int) $user->organization_id === $orgId
        && $user->hasPermissionTo('taches.view');
});

// =============================================================================
// CANAL NOTIFICATIONS SUPERADMIN — Événements cross-tenant
// Abonnés : super_admin uniquement
// Usage : nouvelles inscriptions, alertes système, métriques SaaS
// =============================================================================

Broadcast::channel('superadmin', function (User $user): bool {
    return $user->hasRole('super_admin');
});

// =============================================================================
// CANAL WORKFLOW DOCUMENT — Validation en cours (Vague 2)
// Abonnés : validateurs assignés au workflow
// Usage : demande d'approbation, relance, escalade
// =============================================================================

Broadcast::channel('workflow.{workflowId}', function (User $user, int $workflowId): bool {
    return \App\Models\DocumentWorkflow::where('id', $workflowId)
        ->where('organization_id', $user->organization_id)
        ->whereHas('steps', function ($q) use ($user) {
            $q->where('approver_id', $user->id);
        })
        ->exists()
        || $user->hasRole(['admin', 'super_admin']);
});

// =============================================================================
// CANAL PORTAIL FOURNISSEUR — (Vague 12)
// Abonnés : utilisateurs du portail fournisseur (auth séparée)
// Usage : statuts commandes, nouvelles demandes de devis
// =============================================================================

Broadcast::channel('supplier.{supplierId}', function (User $user, int $supplierId): bool {
    // Le fournisseur authentifié voit son propre canal
    return isset($user->supplier_id) && (int) $user->supplier_id === $supplierId;
});
