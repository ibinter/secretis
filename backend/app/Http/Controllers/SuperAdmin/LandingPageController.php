<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

/**
 * LandingPageController — Éditeur de contenu Landing Page SECRETIS
 *
 * 34 zones administrables groupées par section :
 * Hero, Tarifs, Témoignages, FAQ, Barre supérieure, Section SARA, Footer
 */
class LandingPageController extends Controller
{
    // Cache key et TTL
    private const CACHE_KEY = 'landing_page_content';
    private const CACHE_TTL = 3600; // 1 heure

    // -------------------------------------------------------------------------
    // Définition des 34 zones administrables
    // -------------------------------------------------------------------------
    private function getZoneDefinitions(): array
    {
        return [
            // ── Barre supérieure (3 zones) ─────────────────────────────────────
            'topbar_phone'   => ['section' => 'topbar',      'label' => 'Téléphone contact',       'type' => 'text'],
            'topbar_email'   => ['section' => 'topbar',      'label' => 'Email contact',            'type' => 'email'],
            'topbar_promo'   => ['section' => 'topbar',      'label' => 'Message promotionnel',     'type' => 'text'],

            // ── Hero (6 zones) ─────────────────────────────────────────────────
            'hero_title'        => ['section' => 'hero', 'label' => 'Titre principal',             'type' => 'text'],
            'hero_subtitle'     => ['section' => 'hero', 'label' => 'Sous-titre',                  'type' => 'text'],
            'hero_cta_primary'  => ['section' => 'hero', 'label' => 'Bouton CTA principal',        'type' => 'text'],
            'hero_cta_secondary'=> ['section' => 'hero', 'label' => 'Bouton CTA secondaire',       'type' => 'text'],
            'hero_cta_url'      => ['section' => 'hero', 'label' => 'URL CTA principal',           'type' => 'url'],
            'hero_badge'        => ['section' => 'hero', 'label' => 'Badge (ex: Nouveau)',          'type' => 'text'],

            // ── Tarifs (6 zones) ──────────────────────────────────────────────
            'pricing_title'          => ['section' => 'pricing', 'label' => 'Titre section tarifs',       'type' => 'text'],
            'pricing_subtitle'       => ['section' => 'pricing', 'label' => 'Sous-titre tarifs',          'type' => 'text'],
            'pricing_starter_price'  => ['section' => 'pricing', 'label' => 'Prix Starter (XOF/mois)',    'type' => 'number'],
            'pricing_pro_price'      => ['section' => 'pricing', 'label' => 'Prix Pro (XOF/mois)',        'type' => 'number'],
            'pricing_enterprise_price'=> ['section' => 'pricing','label' => 'Prix Enterprise (XOF/mois)', 'type' => 'number'],
            'pricing_features'       => ['section' => 'pricing', 'label' => 'Features par plan (JSON)',   'type' => 'json'],

            // ── Témoignages (5 zones) ─────────────────────────────────────────
            'testimonials_title'    => ['section' => 'testimonials', 'label' => 'Titre section témoignages', 'type' => 'text'],
            'testimonials_subtitle' => ['section' => 'testimonials', 'label' => 'Sous-titre témoignages',    'type' => 'text'],
            'testimonials_list'     => ['section' => 'testimonials', 'label' => 'Liste témoignages (JSON)',   'type' => 'json'],
            'testimonials_pending'  => ['section' => 'testimonials', 'label' => 'Témoignages en attente',     'type' => 'json'],
            'testimonials_cta'      => ['section' => 'testimonials', 'label' => 'CTA laisser témoignage',     'type' => 'text'],

            // ── Section SARA IA (5 zones) ─────────────────────────────────────
            'sara_title'      => ['section' => 'sara', 'label' => 'Titre section SARA',          'type' => 'text'],
            'sara_subtitle'   => ['section' => 'sara', 'label' => 'Sous-titre SARA',             'type' => 'text'],
            'sara_features'   => ['section' => 'sara', 'label' => 'Fonctionnalités SARA (JSON)', 'type' => 'json'],
            'sara_cta'        => ['section' => 'sara', 'label' => 'Bouton CTA SARA',             'type' => 'text'],
            'sara_cta_url'    => ['section' => 'sara', 'label' => 'URL CTA SARA',                'type' => 'url'],

            // ── FAQ publique (4 zones) ────────────────────────────────────────
            'faq_title'    => ['section' => 'faq', 'label' => 'Titre section FAQ',     'type' => 'text'],
            'faq_subtitle' => ['section' => 'faq', 'label' => 'Sous-titre FAQ',        'type' => 'text'],
            'faq_items'    => ['section' => 'faq', 'label' => 'Questions/Réponses FAQ','type' => 'json'],
            'faq_cta'      => ['section' => 'faq', 'label' => 'CTA support FAQ',       'type' => 'text'],

            // ── Footer (5 zones) ──────────────────────────────────────────────
            'footer_tagline'     => ['section' => 'footer', 'label' => 'Tagline footer',               'type' => 'text'],
            'footer_links'       => ['section' => 'footer', 'label' => 'Liens footer (JSON)',           'type' => 'json'],
            'footer_social'      => ['section' => 'footer', 'label' => 'Réseaux sociaux (JSON)',        'type' => 'json'],
            'footer_legal'       => ['section' => 'footer', 'label' => 'Texte légal / copyright',      'type' => 'text'],
            'footer_newsletter'  => ['section' => 'footer', 'label' => 'CTA Newsletter',               'type' => 'text'],
        ];
    }

    // -------------------------------------------------------------------------
    // get() — Contenu de toutes les zones administrables
    // -------------------------------------------------------------------------

    public function get(): JsonResponse
    {
        $definitions = $this->getZoneDefinitions();
        $zones       = [];

        // Charger les valeurs depuis la base (table landing_page_content)
        $dbValues = DB::table('landing_page_content')
            ->pluck('value', 'zone_key')
            ->toArray();

        foreach ($definitions as $key => $def) {
            $rawValue = $dbValues[$key] ?? null;
            $zones[$key] = array_merge($def, [
                'key'        => $key,
                'value'      => in_array($def['type'], ['json'])
                    ? ($rawValue ? json_decode($rawValue, true) : null)
                    : $rawValue,
                'updated_at' => DB::table('landing_page_content')
                    ->where('zone_key', $key)
                    ->value('updated_at'),
                'published'  => (bool) DB::table('landing_page_content')
                    ->where('zone_key', $key)
                    ->value('published'),
            ]);
        }

        // Grouper par section
        $bySection = [];
        foreach ($zones as $zone) {
            $bySection[$zone['section']][] = $zone;
        }

        return response()->json([
            'zones'      => $zones,
            'by_section' => $bySection,
            'sections'   => array_keys($bySection),
        ]);
    }

    // -------------------------------------------------------------------------
    // update() — Sauvegarder les modifications d'une zone
    // -------------------------------------------------------------------------

    public function update(Request $request): JsonResponse
    {
        $definitions = $this->getZoneDefinitions();

        $validated = $request->validate([
            'zone_key' => 'required|string|in:' . implode(',', array_keys($definitions)),
            'value'    => 'present',
            'publish'  => 'boolean',
        ]);

        $zoneKey = $validated['zone_key'];
        $def     = $definitions[$zoneKey];
        $value   = $validated['value'];

        // Validation spécifique selon le type
        if ($def['type'] === 'email' && $value) {
            abort_unless(filter_var($value, FILTER_VALIDATE_EMAIL), 422, 'Email invalide.');
        }

        if ($def['type'] === 'url' && $value) {
            abort_unless(filter_var($value, FILTER_VALIDATE_URL), 422, 'URL invalide.');
        }

        if ($def['type'] === 'json' && $value) {
            if (!is_array($value)) {
                $decoded = json_decode($value, true);
                abort_unless(json_last_error() === JSON_ERROR_NONE, 422, 'JSON invalide.');
                $value = $decoded;
            }
        }

        $serialized = is_array($value) ? json_encode($value, JSON_UNESCAPED_UNICODE) : $value;

        DB::table('landing_page_content')->updateOrInsert(
            ['zone_key' => $zoneKey],
            [
                'value'      => $serialized,
                'published'  => $request->boolean('publish', false) ? 1 : 0,
                'updated_by' => auth()->id(),
                'updated_at' => now(),
            ]
        );

        // Invalider le cache landing
        Cache::forget(self::CACHE_KEY);

        return response()->json([
            'success'  => true,
            'zone_key' => $zoneKey,
            'message'  => 'Zone mise à jour avec succès.',
        ]);
    }

    // -------------------------------------------------------------------------
    // publishAll() — Publier toutes les zones modifiées
    // -------------------------------------------------------------------------

    public function publishAll(): JsonResponse
    {
        $count = DB::table('landing_page_content')
            ->where('published', 0)
            ->update([
                'published'    => 1,
                'published_at' => now(),
                'published_by' => auth()->id(),
                'updated_at'   => now(),
            ]);

        Cache::forget(self::CACHE_KEY);

        Log::info("Landing page published by SuperAdmin", [
            'user_id' => auth()->id(),
            'zones'   => $count,
        ]);

        return response()->json([
            'success' => true,
            'message' => "{$count} zone(s) publiée(s) avec succès.",
            'count'   => $count,
        ]);
    }

    // -------------------------------------------------------------------------
    // addTestimonial() — Ajouter un témoignage en attente de validation
    // -------------------------------------------------------------------------

    public function addTestimonial(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'author'       => 'required|string|max:100',
            'company'      => 'nullable|string|max:100',
            'role'         => 'nullable|string|max:100',
            'content'      => 'required|string|min:20|max:1000',
            'rating'       => 'required|integer|min:1|max:5',
            'avatar_url'   => 'nullable|url|max:500',
            'approved'     => 'boolean',
        ]);

        $pendingKey     = 'testimonials_pending';
        $currentPending = DB::table('landing_page_content')
            ->where('zone_key', $pendingKey)
            ->value('value');

        $pending   = $currentPending ? json_decode($currentPending, true) : [];
        $pending[] = array_merge($validated, [
            'id'         => uniqid('testi_'),
            'created_at' => now()->toIso8601String(),
        ]);

        DB::table('landing_page_content')->updateOrInsert(
            ['zone_key' => $pendingKey],
            [
                'value'      => json_encode($pending, JSON_UNESCAPED_UNICODE),
                'updated_by' => auth()->id(),
                'updated_at' => now(),
            ]
        );

        return response()->json(['success' => true, 'message' => 'Témoignage ajouté en attente de validation.']);
    }

    // -------------------------------------------------------------------------
    // approveTestimonial() — Valider un témoignage
    // -------------------------------------------------------------------------

    public function approveTestimonial(Request $request, string $testimonialId): JsonResponse
    {
        $pendingRow  = DB::table('landing_page_content')->where('zone_key', 'testimonials_pending')->first();
        $approvedRow = DB::table('landing_page_content')->where('zone_key', 'testimonials_list')->first();

        $pending  = $pendingRow  ? json_decode($pendingRow->value,  true) : [];
        $approved = $approvedRow ? json_decode($approvedRow->value, true) : [];

        $idx = array_search($testimonialId, array_column($pending, 'id'));
        abort_if($idx === false, 404, 'Témoignage introuvable.');

        $testi               = $pending[$idx];
        $testi['approved']   = true;
        $testi['approved_at']= now()->toIso8601String();
        $approved[]          = $testi;
        array_splice($pending, $idx, 1);

        DB::table('landing_page_content')->updateOrInsert(
            ['zone_key' => 'testimonials_list'],
            ['value' => json_encode($approved, JSON_UNESCAPED_UNICODE), 'updated_at' => now()]
        );
        DB::table('landing_page_content')->updateOrInsert(
            ['zone_key' => 'testimonials_pending'],
            ['value' => json_encode($pending, JSON_UNESCAPED_UNICODE), 'updated_at' => now()]
        );

        Cache::forget(self::CACHE_KEY);

        return response()->json(['success' => true, 'message' => 'Témoignage approuvé et publié.']);
    }

    // -------------------------------------------------------------------------
    // faqCrud() — CRUD FAQ publique
    // -------------------------------------------------------------------------

    public function faqCreate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question' => 'required|string|min:10|max:500',
            'answer'   => 'required|string|min:20|max:3000',
            'order'    => 'nullable|integer|min:0',
        ]);

        $row   = DB::table('landing_page_content')->where('zone_key', 'faq_items')->first();
        $items = $row ? json_decode($row->value, true) : [];

        $items[] = array_merge($validated, [
            'id'         => uniqid('faq_'),
            'created_at' => now()->toIso8601String(),
        ]);

        // Trier par order
        usort($items, fn ($a, $b) => ($a['order'] ?? 999) <=> ($b['order'] ?? 999));

        DB::table('landing_page_content')->updateOrInsert(
            ['zone_key' => 'faq_items'],
            ['value' => json_encode($items, JSON_UNESCAPED_UNICODE), 'updated_at' => now()]
        );

        Cache::forget(self::CACHE_KEY);

        return response()->json(['success' => true, 'message' => 'Question FAQ ajoutée.']);
    }

    public function faqDelete(Request $request, string $faqId): JsonResponse
    {
        $row   = DB::table('landing_page_content')->where('zone_key', 'faq_items')->first();
        $items = $row ? json_decode($row->value, true) : [];
        $items = array_values(array_filter($items, fn ($i) => $i['id'] !== $faqId));

        DB::table('landing_page_content')->updateOrInsert(
            ['zone_key' => 'faq_items'],
            ['value' => json_encode($items, JSON_UNESCAPED_UNICODE), 'updated_at' => now()]
        );

        Cache::forget(self::CACHE_KEY);

        return response()->json(['success' => true, 'message' => 'Question FAQ supprimée.']);
    }
}
