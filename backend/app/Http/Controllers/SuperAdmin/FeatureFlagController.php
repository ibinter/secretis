<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\FeatureFlag;
use App\Services\AuditService;
use App\Services\FeatureFlagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * FeatureFlagController — CRUD Feature Flags SuperAdmin IBIG Soft
 *
 * ACCÈS RESTREINT : middleware 'role:superadmin_ibig'
 */
class FeatureFlagController extends Controller
{
    public function __construct(
        private readonly FeatureFlagService $flagService,
        private readonly AuditService       $audit,
    ) {
        $this->middleware(['auth', 'role:superadmin_ibig']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/feature-flags
    // ─────────────────────────────────────────────────────────────────────────

    public function index(): Response
    {
        return Inertia::render('SuperAdmin/FeatureFlags', [
            'flags' => $this->flagService->getAll(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/feature-flags
    // ─────────────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'slug'            => 'required|string|unique:feature_flags,slug|regex:/^[a-z0-9_-]+$/',
            'name'            => 'required|string|max:255',
            'description'     => 'nullable|string',
            'is_global'       => 'boolean',
            'target_org_ids'  => 'nullable|array',
            'target_org_ids.*'=> 'integer|exists:organizations,id',
            'target_plans'    => 'nullable|array',
            'target_plans.*'  => 'string|in:starter,pro,enterprise,on_premise',
            'enabled_percent' => 'integer|min:0|max:100',
            'is_active'       => 'boolean',
        ]);

        $flag = FeatureFlag::create([
            ...$validated,
            'created_by' => Auth::id(),
        ]);

        $this->audit->logCreated('feature_flags', 'feature_flag', $flag->id, ['slug' => $flag->slug]);

        return response()->json([
            'flag'    => $flag,
            'message' => "Feature flag «{$flag->name}» créé avec succès.",
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /superadmin/feature-flags/{flag}
    // ─────────────────────────────────────────────────────────────────────────

    public function update(Request $request, FeatureFlag $flag): JsonResponse
    {
        $validated = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'description'     => 'nullable|string',
            'is_global'       => 'boolean',
            'target_org_ids'  => 'nullable|array',
            'target_org_ids.*'=> 'integer|exists:organizations,id',
            'target_plans'    => 'nullable|array',
            'target_plans.*'  => 'string|in:starter,pro,enterprise,on_premise',
            'enabled_percent' => 'integer|min:0|max:100',
            'is_active'       => 'boolean',
        ]);

        $old = $flag->toArray();
        $flag->update($validated);
        $this->audit->logUpdated('feature_flags', 'feature_flag', $flag->id, $old, $validated);

        return response()->json([
            'flag'    => $flag->fresh(),
            'message' => "Feature flag «{$flag->name}» mis à jour.",
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /superadmin/feature-flags/{flag}
    // ─────────────────────────────────────────────────────────────────────────

    public function destroy(FeatureFlag $flag): JsonResponse
    {
        $this->audit->logDeleted('feature_flags', 'feature_flag', $flag->id, $flag->toArray());
        $flag->delete();

        return response()->json(['message' => "Feature flag supprimé."]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/feature-flags/{slug}/toggle
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Bascule l'état actif/inactif d'un flag.
     */
    public function toggle(string $slug): JsonResponse
    {
        $flag = $this->flagService->toggle($slug);

        $this->audit->log(
            $flag->is_active ? 'enabled' : 'disabled',
            'feature_flags',
            'feature_flag',
            $flag->id,
            [],
            ['is_active' => $flag->is_active]
        );

        return response()->json([
            'flag'    => $flag,
            'message' => "Flag «{$flag->name}» " . ($flag->is_active ? 'activé' : 'désactivé') . '.',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/feature-flags/{slug}/rollout
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Configure le déploiement progressif d'un flag.
     */
    public function rollout(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'percent' => 'required|integer|min:0|max:100',
        ]);

        $this->flagService->setGlobalRollout($slug, $validated['percent']);

        $flag = FeatureFlag::where('slug', $slug)->firstOrFail();

        $this->audit->log('rollout_updated', 'feature_flags', 'feature_flag', $flag->id, [], [
            'enabled_percent' => $validated['percent'],
        ]);

        return response()->json([
            'flag'    => $flag->fresh(),
            'message' => "Rollout mis à jour : {$validated['percent']}% des organisations.",
        ]);
    }
}
