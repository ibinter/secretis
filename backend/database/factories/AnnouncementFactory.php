<?php

namespace Database\Factories;

use App\Models\Announcement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * AnnouncementFactory — Factory pour les annonces plateforme SECRETIS ERP
 *
 * Fournit des états pour les différents types de ciblage : all / plan / org.
 */
class AnnouncementFactory extends Factory
{
    protected $model = Announcement::class;

    public function definition(): array
    {
        $titleFr   = $this->faker->sentence(4);
        $messageFr = $this->faker->paragraph(2);
        $titleEn   = $this->faker->sentence(4);
        $messageEn = $this->faker->paragraph(2);

        return [
            'title'          => ['fr' => $titleFr, 'en' => $titleEn],
            'message'        => ['fr' => $messageFr, 'en' => $messageEn],
            'type'           => $this->faker->randomElement(['info', 'warning', 'success', 'feature']),
            'color'          => null,
            'display'        => $this->faker->randomElement(['banner', 'modal', 'both']),
            'target'         => 'all',
            'target_ids'     => null,
            'cta_label'      => null,
            'cta_url'        => null,
            'is_dismissible' => true,
            'is_active'      => true,
            'starts_at'      => now()->subMinutes(30),
            'ends_at'        => now()->addDays(7),
            'created_by'     => 1, // SuperAdmin IBIG par défaut
        ];
    }

    // -------------------------------------------------------------------------
    // États prédéfinis — types
    // -------------------------------------------------------------------------

    /**
     * Annonce de type information.
     */
    public function info(): static
    {
        return $this->state([
            'type'  => 'info',
            'color' => '#3B82F6',
        ]);
    }

    /**
     * Annonce d'avertissement (maintenance, dégradation).
     */
    public function warning(): static
    {
        return $this->state([
            'type'  => 'warning',
            'color' => '#F59E0B',
            'title' => [
                'fr' => 'Maintenance planifiée le ' . now()->addDays(3)->format('d/m/Y'),
                'en' => 'Scheduled maintenance on ' . now()->addDays(3)->format('m/d/Y'),
            ],
        ]);
    }

    /**
     * Annonce de succès / bonne nouvelle.
     */
    public function success(): static
    {
        return $this->state([
            'type'  => 'success',
            'color' => '#10B981',
        ]);
    }

    /**
     * Annonce de nouvelle fonctionnalité.
     */
    public function feature(): static
    {
        return $this->state([
            'type'        => 'feature',
            'color'       => '#8B5CF6',
            'display'     => 'modal',
            'cta_label'   => 'Découvrir',
            'cta_url'     => '/whats-new',
        ]);
    }

    /**
     * Annonce de maintenance.
     */
    public function maintenance(): static
    {
        return $this->state([
            'type'    => 'maintenance',
            'color'   => '#EF4444',
            'display' => 'banner',
            'title'   => [
                'fr' => 'Maintenance en cours — service partiellement disponible',
                'en' => 'Maintenance in progress — service partially available',
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // États prédéfinis — ciblage
    // -------------------------------------------------------------------------

    /**
     * Annonce globale (visible par tous les utilisateurs).
     */
    public function forAll(): static
    {
        return $this->state([
            'target'     => 'all',
            'target_ids' => null,
        ]);
    }

    /**
     * Annonce ciblant un ou plusieurs plans tarifaires.
     */
    public function forPlan(array $planIds): static
    {
        return $this->state([
            'target'     => 'plan',
            'target_ids' => $planIds,
        ]);
    }

    /**
     * Annonce ciblant une ou plusieurs organisations.
     */
    public function forOrganization(array $orgIds): static
    {
        return $this->state([
            'target'     => 'org',
            'target_ids' => $orgIds,
        ]);
    }

    // -------------------------------------------------------------------------
    // États prédéfinis — cycle de vie
    // -------------------------------------------------------------------------

    /**
     * Annonce active dans la fenêtre de diffusion courante.
     */
    public function active(): static
    {
        return $this->state([
            'is_active' => true,
            'starts_at' => now()->subHour(),
            'ends_at'   => now()->addDays(14),
        ]);
    }

    /**
     * Annonce expirée (ends_at dans le passé).
     */
    public function expired(): static
    {
        return $this->state([
            'is_active' => true,
            'starts_at' => now()->subDays(10),
            'ends_at'   => now()->subDay(),
        ]);
    }

    /**
     * Annonce désactivée manuellement.
     */
    public function inactive(): static
    {
        return $this->state([
            'is_active' => false,
        ]);
    }

    /**
     * Annonce planifiée (pas encore débutée).
     */
    public function scheduled(): static
    {
        return $this->state([
            'is_active' => true,
            'starts_at' => now()->addDays(3),
            'ends_at'   => now()->addDays(10),
        ]);
    }

    /**
     * Annonce sans date de fin (permanente tant qu'active).
     */
    public function permanent(): static
    {
        return $this->state([
            'is_active' => true,
            'starts_at' => now()->subDay(),
            'ends_at'   => null,
        ]);
    }

    /**
     * Annonce non dismissable (l'utilisateur ne peut pas la fermer).
     */
    public function nonDismissible(): static
    {
        return $this->state([
            'is_dismissible' => false,
        ]);
    }

    /**
     * Annonce avec un CTA (call-to-action).
     */
    public function withCta(string $label, string $url): static
    {
        return $this->state([
            'cta_label' => $label,
            'cta_url'   => $url,
        ]);
    }

    /**
     * Annonce affichée en modal uniquement.
     */
    public function modal(): static
    {
        return $this->state([
            'display' => 'modal',
        ]);
    }

    /**
     * Annonce affichée en bannière uniquement.
     */
    public function banner(): static
    {
        return $this->state([
            'display' => 'banner',
        ]);
    }
}
