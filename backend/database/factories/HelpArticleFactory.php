<?php

namespace Database\Factories;

use App\Models\HelpArticle;
use App\Models\HelpCategory;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * HelpArticleFactory — Factory pour les articles du centre d'aide SECRETIS ERP
 *
 * Gère les traductions JSON multilingues (fr/en) et les états de publication.
 */
class HelpArticleFactory extends Factory
{
    protected $model = HelpArticle::class;

    public function definition(): array
    {
        $titleFr   = $this->faker->sentence(rand(5, 10));
        $titleEn   = $this->faker->sentence(rand(5, 10));
        $slug      = Str::slug($titleFr) . '-' . $this->faker->unique()->randomNumber(5);
        $excerptFr = $this->faker->paragraph(2);
        $excerptEn = $this->faker->paragraph(2);
        $contentFr = $this->generateMarkdownContent('fr');
        $contentEn = $this->generateMarkdownContent('en');

        return [
            'help_category_id'  => HelpCategory::factory(),
            'slug'              => $slug,
            'author_id'         => 1, // SuperAdmin IBIG par défaut
            'status'            => 'draft',
            'is_featured'       => false,
            'view_count'        => 0,
            'helpful_count'     => 0,
            'not_helpful_count' => 0,
            'translations'      => [
                'fr' => [
                    'title'            => $titleFr,
                    'content'          => $contentFr,
                    'excerpt'          => $excerptFr,
                    'meta_title'       => $titleFr . ' — SECRETIS ERP',
                    'meta_description' => substr($excerptFr, 0, 160),
                ],
                'en' => [
                    'title'            => $titleEn,
                    'content'          => $contentEn,
                    'excerpt'          => $excerptEn,
                    'meta_title'       => $titleEn . ' — SECRETIS ERP',
                    'meta_description' => substr($excerptEn, 0, 160),
                ],
            ],
            'published_at' => null,
        ];
    }

    // -------------------------------------------------------------------------
    // États prédéfinis
    // -------------------------------------------------------------------------

    /**
     * Article publié (prêt à être accessible publiquement).
     */
    public function published(): static
    {
        return $this->state([
            'status'       => 'published',
            'published_at' => now()->subDays(rand(1, 30)),
        ]);
    }

    /**
     * Article en brouillon.
     */
    public function draft(): static
    {
        return $this->state([
            'status'       => 'draft',
            'published_at' => null,
        ]);
    }

    /**
     * Article archivé.
     */
    public function archived(): static
    {
        return $this->state([
            'status'       => 'archived',
            'published_at' => now()->subMonths(rand(2, 12)),
        ]);
    }

    /**
     * Article mis en avant (featured).
     */
    public function featured(): static
    {
        return $this->state([
            'status'       => 'published',
            'is_featured'  => true,
            'published_at' => now()->subDays(rand(1, 7)),
        ]);
    }

    /**
     * Article populaire avec beaucoup de vues.
     */
    public function popular(): static
    {
        return $this->state([
            'status'        => 'published',
            'is_featured'   => true,
            'view_count'    => rand(500, 5000),
            'helpful_count' => rand(50, 500),
            'published_at'  => now()->subMonths(rand(1, 6)),
        ]);
    }

    /**
     * Article concernant un module spécifique (injecté dans les traductions).
     */
    public function forModule(string $module): static
    {
        $moduleNames = [
            'courrier'    => ['fr' => 'Gestion du courrier', 'en' => 'Mail management'],
            'agenda'      => ['fr' => 'Agenda et réservations', 'en' => 'Calendar and bookings'],
            'taches'      => ['fr' => 'Tâches et projets', 'en' => 'Tasks and projects'],
            'rh'          => ['fr' => 'Ressources humaines', 'en' => 'Human resources'],
            'comptabilite'=> ['fr' => 'Comptabilité SYSCOHADA', 'en' => 'SYSCOHADA accounting'],
            'sara'        => ['fr' => 'Assistant SARA', 'en' => 'SARA AI assistant'],
        ];

        $label = $moduleNames[$module] ?? ['fr' => ucfirst($module), 'en' => ucfirst($module)];

        return $this->state(function (array $attributes) use ($module, $label) {
            $translations = $attributes['translations'];
            $translations['fr']['title']   = "Guide : " . $label['fr'] . " — " . $this->faker->sentence(4);
            $translations['en']['title']   = "Guide: " . $label['en'] . " — " . $this->faker->sentence(4);
            $translations['fr']['meta_title'] = $translations['fr']['title'] . ' — SECRETIS ERP';
            $translations['en']['meta_title'] = $translations['en']['title'] . ' — SECRETIS ERP';

            return ['translations' => $translations];
        });
    }

    /**
     * Article appartenant à une catégorie spécifique.
     */
    public function inCategory(int|HelpCategory $category): static
    {
        $categoryId = $category instanceof HelpCategory ? $category->id : $category;

        return $this->state([
            'help_category_id' => $categoryId,
        ]);
    }

    /**
     * Article rédigé par un auteur spécifique.
     */
    public function byAuthor(int|User $author): static
    {
        $authorId = $author instanceof User ? $author->id : $author;

        return $this->state([
            'author_id' => $authorId,
        ]);
    }

    /**
     * Article avec des compteurs d'utilité déjà renseignés.
     */
    public function withFeedback(int $helpful = 10, int $notHelpful = 2): static
    {
        return $this->state([
            'helpful_count'     => $helpful,
            'not_helpful_count' => $notHelpful,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /**
     * Génère un contenu Markdown réaliste pour un article d'aide.
     */
    private function generateMarkdownContent(string $locale = 'fr'): string
    {
        if ($locale === 'fr') {
            return implode("\n\n", [
                "## Introduction\n\n" . $this->faker->paragraph(3),
                "## Étapes à suivre\n\n1. " . implode("\n2. ", $this->faker->sentences(4)),
                "## Configuration\n\n" . $this->faker->paragraph(2),
                "### Paramètres avancés\n\n" . $this->faker->paragraph(2),
                "## Questions fréquentes\n\n**Q : " . $this->faker->sentence() . "**\n\n" . $this->faker->paragraph(),
                "> **Astuce :** " . $this->faker->sentence(),
                "## Voir aussi\n\n- " . implode("\n- ", $this->faker->sentences(3)),
            ]);
        }

        return implode("\n\n", [
            "## Introduction\n\n" . $this->faker->paragraph(3),
            "## Steps to follow\n\n1. " . implode("\n2. ", $this->faker->sentences(4)),
            "## Configuration\n\n" . $this->faker->paragraph(2),
            "> **Tip:** " . $this->faker->sentence(),
            "## See also\n\n- " . implode("\n- ", $this->faker->sentences(3)),
        ]);
    }
}
