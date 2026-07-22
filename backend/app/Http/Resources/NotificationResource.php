<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * NotificationResource — Transformation API des notifications
 *
 * Compatible avec le système de notifications Laravel (DatabaseNotification).
 * La propriété $this->data contient le tableau JSON de la notification.
 *
 * Structure normalisée pour le frontend :
 *   { id, type, title, body, icon, action_url, read, created_at }
 */
class NotificationResource extends JsonResource
{
    /**
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Les notifications Laravel stockent les données dans data (JSON)
        $data = is_array($this->data) ? $this->data : json_decode($this->data ?? '{}', true);

        return [
            'id'   => $this->id,
            'type' => $this->resolveType($data),

            // Titre et corps normalisés (les notifications doivent fournir ces clés)
            'title'      => $data['title'] ?? $data['subject'] ?? 'Notification',
            'body'       => $data['body']  ?? $data['message'] ?? '',
            'icon'       => $data['icon']  ?? $this->getDefaultIcon($data),
            'color'      => $data['color'] ?? $this->getDefaultColor($data),

            // URL d'action optionnelle (lien vers la ressource concernée)
            'action_url'   => $data['action_url']   ?? null,
            'action_label' => $data['action_label'] ?? null,

            // Données contextuelles brutes (pour les handlers spécifiques du frontend)
            'payload' => $this->filterPayload($data),

            // Statut de lecture
            'read'    => $this->read_at !== null,
            'read_at' => $this->read_at?->toIso8601String(),

            'created_at' => $this->created_at->toIso8601String(),
        ];
    }

    /**
     * Extrait un type court depuis le FQCN de la notification.
     * Ex: App\Notifications\TaskAssigned → task.assigned
     */
    private function resolveType(array $data): string
    {
        if (isset($data['type'])) {
            return $data['type'];
        }

        // Convertit le FQCN en snake_case court
        $fqcn = class_basename($this->type ?? '');
        return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $fqcn) ?? 'generic');
    }

    private function getDefaultIcon(array $data): string
    {
        return match ($data['category'] ?? '') {
            'task'     => 'check-circle',
            'meeting'  => 'users',
            'mail'     => 'mail',
            'document' => 'file-text',
            'system'   => 'settings',
            default    => 'bell',
        };
    }

    private function getDefaultColor(array $data): string
    {
        return match ($data['severity'] ?? 'info') {
            'error'   => 'red',
            'warning' => 'yellow',
            'success' => 'green',
            default   => 'blue',
        };
    }

    /**
     * Supprime les clés déjà normalisées du payload pour éviter la redondance.
     */
    private function filterPayload(array $data): array
    {
        $exclude = ['title', 'body', 'icon', 'color', 'action_url', 'action_label', 'type', 'severity', 'category'];
        return array_diff_key($data, array_flip($exclude));
    }
}
