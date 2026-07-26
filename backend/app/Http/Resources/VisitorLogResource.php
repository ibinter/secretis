<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * VisitorLogResource — Transformation API des entrées visiteurs (accueil)
 *
 * RGPD : les données personnelles du visiteur sont incluses uniquement
 * pour les utilisateurs ayant la permission accueil.read.
 * En mode anonymisé, seule l'initiale est fournie.
 */
class VisitorLogResource extends JsonResource
{
    private bool $anonymized = false;

    /** Anonymise les données personnelles (RGPD) */
    public function anonymized(): self
    {
        $this->anonymized = true;
        return $this;
    }

    /**
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Contrôle d'accès aux données personnelles
        $canViewPersonal = ! $this->anonymized
            && $request->user()?->can('accueil.read');

        return [
            'id'            => $this->id,
            // Données personnelles conditionnelles
            'visitor_name'  => $canViewPersonal
                ? $this->visitor_name
                : $this->anonymizeName($this->visitor_name),
            'visitor_email' => $canViewPersonal ? $this->visitor_email : null,
            'visitor_phone' => $canViewPersonal ? $this->visitor_phone : null,
            'company'       => $this->visitor_company, // non-personnel
            'purpose'       => $this->purpose,
            'badge_number'  => $this->badge_number,
            'status'        => $this->status,           // expected|arrived|departed|no_show

            // Horaires
            'expected_at'  => $this->expected_at?->toIso8601String(),
            'checked_in_at'  => $this->checked_in_at?->toIso8601String(),
            'checked_out_at' => $this->checked_out_at?->toIso8601String(),

            // Durée de visite (calculée si départ enregistré)
            'duration_minutes' => $this->checked_in_at && $this->checked_out_at
                ? (int) $this->checked_in_at->diffInMinutes($this->checked_out_at)
                : null,

            // Hôte
            'host' => $this->whenLoaded('host', fn() =>
                $this->host ? [
                    'id'     => $this->host->id,
                    'name'   => $this->host->name,
                    'avatar' => $this->host->avatar,
                ] : null
            ),

            'created_at' => $this->created_at->toIso8601String(),
        ];
    }

    /** Retourne seulement l'initiale + * (ex: "J. ****") */
    private function anonymizeName(?string $name): ?string
    {
        if (! $name) {
            return null;
        }
        $parts = explode(' ', trim($name), 2);
        return strtoupper(substr($parts[0], 0, 1)) . '. ****';
    }
}
