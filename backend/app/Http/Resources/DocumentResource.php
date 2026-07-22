<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * DocumentResource — Transformation API des documents GED
 *
 * Gestion des versions : seule la version courante est incluse par défaut.
 * L'historique des versions est disponible en mode détail.
 *
 * Sécurité : le chemin de stockage physique (storage_path) n'est jamais exposé.
 * Un URL de téléchargement signé/protégé est fourni à la place.
 */
class DocumentResource extends JsonResource
{
    private bool $detailed = false;

    public function withDetail(): self
    {
        $this->detailed = true;
        return $this;
    }

    /**
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $base = [
            'id'           => $this->id,
            'title'        => $this->title,
            'description'  => $this->description,
            'type'         => $this->type,         // pdf|word|excel|image|other
            'mime_type'    => $this->mime_type,
            'file_size'    => $this->file_size,    // En octets
            'file_size_human' => $this->formatted_size ?? $this->formatSize($this->file_size),
            'extension'    => $this->extension,
            'status'       => $this->status,       // draft|published|archived

            // Dossier parent
            'folder_id'   => $this->folder_id,
            'folder_name' => $this->whenLoaded('folder', fn() => $this->folder?->name),

            // Version courante (sans le path physique)
            'version'       => $this->current_version ?? 1,
            'is_latest'     => true,

            // URL de téléchargement (route protégée, pas le path S3 brut)
            'download_url' => route('documents.download', $this->id),
            'preview_url'  => route('documents.preview', $this->id),

            // Auteur
            'created_by' => $this->whenLoaded('creator', fn() => [
                'id'     => $this->creator->id,
                'name'   => $this->creator->name,
                'avatar' => $this->creator->avatar,
            ]),

            // Méta
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];

        if (! $this->detailed) {
            return $base;
        }

        return array_merge($base, [
            'tags'     => $this->tags ?? [],
            'metadata' => $this->metadata ?? [],

            // Toutes les versions
            'versions' => $this->whenLoaded('versions', fn() =>
                $this->versions->map(fn($v) => [
                    'id'           => $v->id,
                    'version'      => $v->version_number,
                    'file_size'    => $v->file_size,
                    'created_at'   => $v->created_at->toIso8601String(),
                    'created_by'   => ['id' => $v->user_id, 'name' => $v->user?->name],
                    'download_url' => route('documents.version.download', [$this->id, $v->id]),
                    'comment'      => $v->comment,
                ])->values()
            ),

            // Permissions sur ce document (pour l'UI bouton télécharger/modifier)
            'can' => [
                'edit'    => $request->user()?->can('update', $this->resource),
                'delete'  => $request->user()?->can('delete', $this->resource),
                'share'   => $request->user()?->can('share', $this->resource),
            ],
        ]);
    }

    private function formatSize(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1) . ' Mo';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 1) . ' Ko';
        }
        return $bytes . ' o';
    }
}
