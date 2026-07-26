<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Faq extends Model
{
    protected $fillable = [
        'category',
        'order',
        'is_featured',
        'is_active',
        'translations',
    ];

    protected $casts = [
        'translations' => 'array',
        'is_featured'  => 'boolean',
        'is_active'    => 'boolean',
        'order'        => 'integer',
    ];

    // ─── Scopes ──────────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }

    public function scopeByCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('order');
    }

    // ─── Accesseurs ──────────────────────────────────────────────────────────

    public function getQuestion(string $locale = 'fr'): string
    {
        return $this->translations[$locale]['question']
            ?? $this->translations['fr']['question']
            ?? '';
    }

    public function getAnswer(string $locale = 'fr'): string
    {
        return $this->translations[$locale]['answer']
            ?? $this->translations['fr']['answer']
            ?? '';
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public static function categories(): array
    {
        return [
            'demarrage'    => ['fr' => 'Démarrage & Compte',       'en' => 'Getting Started & Account'],
            'agenda'       => ['fr' => 'Agenda & Réunions',        'en' => 'Calendar & Meetings'],
            'documents'    => ['fr' => 'Gestion documentaire',     'en' => 'Document Management'],
            'taches'       => ['fr' => 'Tâches & Projets',         'en' => 'Tasks & Projects'],
            'visiteurs'    => ['fr' => 'Visiteurs & Réception',    'en' => 'Visitors & Reception'],
            'paiements'    => ['fr' => 'Paiements & Abonnement',   'en' => 'Payments & Subscription'],
            'utilisateurs' => ['fr' => 'Utilisateurs & Permissions','en' => 'Users & Permissions'],
            'rapports'     => ['fr' => 'Rapports & Exports',       'en' => 'Reports & Exports'],
            'sara'         => ['fr' => 'SARA Assistant IA',        'en' => 'SARA AI Assistant'],
            'securite'     => ['fr' => 'Sécurité & Conformité',    'en' => 'Security & Compliance'],
        ];
    }
}
