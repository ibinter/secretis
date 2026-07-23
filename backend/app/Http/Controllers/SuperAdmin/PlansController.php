<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\Plan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

/**
 * PlansController — Gestion des plans tarifaires SuperAdmin IBIG Soft
 *
 * ACCÈS RESTREINT : Toutes les routes protégées par middleware 'role:super_admin'.
 */
class PlansController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'role:super_admin']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/plans
    // ─────────────────────────────────────────────────────────────────────────

    public function index(): InertiaResponse
    {
        $plans = Plan::orderBy('sort_order')->get()->map(function (Plan $plan) {
            $activeLicenses = License::where('plan_id', $plan->slug)
                ->where('status', 'active')
                ->count();

            $mrr = License::where('plan_id', $plan->slug)
                ->where('status', 'active')
                ->get()
                ->sum(fn ($l) => $l->billing_cycle === 'yearly' ? $l->price / 12 : $l->price);

            return [
                'id'              => $plan->id,
                'slug'            => $plan->slug,
                'name'            => $plan->name,
                'description'     => $plan->description,
                'price_xof'       => $plan->price_xof,
                'price_eur'       => $plan->price_eur,
                'max_users'       => $plan->max_users,
                'duration_months' => $plan->duration_months,
                'features'        => $plan->features ?? [],
                'modules'         => $plan->modules ?? [],
                'is_active'       => $plan->is_active,
                'is_public'       => $plan->is_public,
                'sort_order'      => $plan->sort_order,
                'stats' => [
                    'active_clients' => $activeLicenses,
                    'mrr'            => round($mrr, 0),
                ],
            ];
        });

        return Inertia::render('SuperAdmin/Plans/Index', [
            'plans' => $plans,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/plans/{plan}/edit
    // ─────────────────────────────────────────────────────────────────────────

    public function edit(Plan $plan): InertiaResponse
    {
        $activeLicenses = License::where('plan_id', $plan->slug)
            ->where('status', 'active')
            ->count();

        return Inertia::render('SuperAdmin/Plans/Edit', [
            'plan'            => $plan,
            'active_licenses' => $activeLicenses,
            'all_modules'     => $this->allModules(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /superadmin/plans/{plan}
    // ─────────────────────────────────────────────────────────────────────────

    public function update(Request $request, Plan $plan): RedirectResponse
    {
        $validated = $request->validate([
            'name'             => ['required', 'string', 'max:100'],
            'description'      => ['nullable', 'string', 'max:500'],
            'price_xof'        => ['required', 'numeric', 'min:0'],
            'price_xof_yearly' => ['nullable', 'numeric', 'min:0'],
            'price_eur'        => ['nullable', 'numeric', 'min:0'],
            'max_users'        => ['required', 'integer', 'min:0'],
            'storage_gb'       => ['nullable', 'integer', 'min:0'],
            'trial_days'       => ['required', 'integer', 'min:0', 'max:90'],
            'modules'          => ['nullable', 'array'],
            'modules.*'        => ['string'],
            'features'         => ['nullable', 'array'],
            'is_active'        => ['boolean'],
            'is_public'        => ['boolean'],
            'is_recommended'   => ['boolean'],
        ]);

        try {
            DB::transaction(function () use ($plan, $validated) {
                $features = $validated['features'] ?? $plan->features ?? [];

                // Mettre à jour "Recommandé" dans les features
                $features = array_filter($features, fn ($f) => $f !== 'recommended');
                if (!empty($validated['is_recommended'])) {
                    $features[] = 'recommended';
                }

                $plan->update([
                    'name'            => $validated['name'],
                    'description'     => $validated['description'] ?? $plan->description,
                    'price_xof'       => $validated['price_xof'],
                    'price_eur'       => $validated['price_eur'] ?? $plan->price_eur,
                    'max_users'       => $validated['max_users'],
                    'modules'         => $validated['modules'] ?? $plan->modules,
                    'features'        => array_values($features),
                    'is_active'       => $validated['is_active'] ?? $plan->is_active,
                    'is_public'       => $validated['is_public'] ?? $plan->is_public,
                ]);

                Log::info('[PlansController] Plan mis à jour', [
                    'plan_slug' => $plan->slug,
                    'updated_by'=> auth()->id(),
                    'changes'   => $plan->getChanges(),
                ]);
            });
        } catch (\Throwable $e) {
            Log::error('[PlansController] Erreur mise à jour plan', [
                'plan_slug' => $plan->slug,
                'error'     => $e->getMessage(),
            ]);

            return back()->withErrors(['error' => 'Erreur lors de la mise à jour du plan.']);
        }

        return redirect()
            ->route('superadmin.plans.index')
            ->with('success', "Plan « {$plan->name} » mis à jour avec succès.");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/plans/{plan}/toggle
    // ─────────────────────────────────────────────────────────────────────────

    public function toggle(Plan $plan): RedirectResponse
    {
        $plan->update(['is_active' => !$plan->is_active]);

        Log::info('[PlansController] Plan toggled', [
            'plan_slug'  => $plan->slug,
            'is_active'  => $plan->is_active,
            'updated_by' => auth()->id(),
        ]);

        return back()->with('success', "Plan « {$plan->name} » " . ($plan->is_active ? 'activé' : 'désactivé') . '.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Liste des modules disponibles
    // ─────────────────────────────────────────────────────────────────────────

    private function allModules(): array
    {
        return [
            ['slug' => 'agenda',       'label' => 'Agenda'],
            ['slug' => 'courrier',     'label' => 'Courrier'],
            ['slug' => 'ged',          'label' => 'GED / Documents'],
            ['slug' => 'taches',       'label' => 'Tâches'],
            ['slug' => 'reunions',     'label' => 'Réunions'],
            ['slug' => 'rh',           'label' => 'Ressources Humaines'],
            ['slug' => 'comptabilite', 'label' => 'Comptabilité'],
            ['slug' => 'projets',      'label' => 'Gestion de Projets'],
            ['slug' => 'bi',           'label' => 'Business Intelligence'],
            ['slug' => 'formation',    'label' => 'Formation'],
            ['slug' => 'signatures',   'label' => 'Signatures électroniques'],
            ['slug' => 'ressources',   'label' => 'Ressources matérielles'],
            ['slug' => 'sara',         'label' => 'SARA (IA)'],
            ['slug' => 'procurement',  'label' => 'Achats / Procurement'],
            ['slug' => 'qualite',      'label' => 'Qualité'],
            ['slug' => 'fleet',        'label' => 'Gestion de flotte'],
        ];
    }
}
