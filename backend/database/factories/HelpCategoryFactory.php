<?php

namespace Database\Factories;

use App\Models\HelpCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * HelpCategoryFactory — Factory pour les catégories du centre d'aide SECRETIS ERP
 */
class HelpCategoryFactory extends Factory
{
    protected $model = HelpCategory::class;

    private static int $orderCounter = 0;

    private static array $icons = [
        'heroicons:academic-cap',
        'heroicons:book-open',
        'heroicons:chat-bubble-left-right',
        'heroicons:cog-6-tooth',
        'heroicons:credit-card',
        'heroicons:document-text',
        'heroicons:envelope',
        'heroicons:question-mark-circle',
        'heroicons:shield-check',
        'heroicons:users',
    ];

    private static array $colors = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
        '#8B5CF6', '#06B6D4', '#F97316', '#84CC16',
    ];

    public function definition(): array
    {
        $nameFr = $this->faker->words(rand(2, 4), true);
        $nameEn = $this->faker->words(rand(2, 4), true);
        $slug   = Str::slug($nameFr) . '-' . $this->faker->unique()->randomNumber(4);

        self::$orderCounter++;

        return [
            'slug'         => $slug,
            'icon'         => $this->faker->randomElement(self::$icons),
            'color'        => $this->faker->randomElement(self::$colors),
            'order'        => self::$orderCounter,
            'is_active'    => true,
            'translations' => [
                'fr' => [
                    'name'        => ucfirst($nameFr),
                    'description' => $this->faker->sentence(8),
                ],
                'en' => [
                    'name'        => ucfirst($nameEn),
                    'description' => $this->faker->sentence(8),
                ],
            ],
        ];
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
