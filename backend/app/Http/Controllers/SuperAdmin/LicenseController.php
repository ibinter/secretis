<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

/**
 * LicenseController — Gestion des licences organisations
 *
 * Toutes les actions modifient le statut de l'organisation et journalisent
 * un événement dans audit_logs. Les notifications email sont envoyées à l'admin.
 */
class LicenseController extends Controller
{
    // Plans disponibles et leurs durées maximales
    private const PLANS = ['Starter', 'Pro', 'Enterprise'];
    private const MAX_EXTENSION_MONTHS = 60;

    // -------------------------------------------------------------------------
    // activate($orgId) — Activer une licence avec plan et durée
    // -------------------------------------------------------------------------

    public function activate(Request $request, int $orgId): JsonResponse
    {
        $validated = $request->validate([
            'plan'   => 'required|in:Starter,Pro,Enterprise',
            'months' => 'required|integer|min:1|max:' . self::MAX_EXTENSION_MONTHS,
        ]);

        $org = Organization::findOrFail($orgId);

        DB::transaction(function () use ($org, $validated) {
            $expiresAt = now()->addMonths($validated['months']);

            $org->update([
                'status'        => 'active',
                'trial_ends_at' => $expiresAt,
                'settings'      => array_merge($org->settings ?? [], [
                    'plan'       => $validated['plan'],
                    'activated_at' => now()->toIso8601String(),
                ]),
            ]);

            $this->logAudit('license.activate', $org->id, [
                'plan'       => $validated['plan'],
                'months'     => $validated['months'],
                'expires_at' => $expiresAt->toDateString(),
            ]);

            $this->notifyOrgAdmin($org, 'activation', [
                'plan'       => $validated['plan'],
                'expires_at' => $expiresAt->format('d/m/Y'),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => "Licence activée ({$validated['plan']}) jusqu'au " . now()->addMonths($validated['months'])->format('d/m/Y'),
            'org'     => $org->fresh(),
        ]);
    }

    // -------------------------------------------------------------------------
    // extend($orgId) — Prolonger la licence de N mois
    // -------------------------------------------------------------------------

    public function extend(Request $request, int $orgId): JsonResponse
    {
        $validated = $request->validate([
            'months' => 'required|integer|min:1|max:' . self::MAX_EXTENSION_MONTHS,
            'reason' => 'nullable|string|max:500',
        ]);

        $org = Organization::findOrFail($orgId);

        DB::transaction(function () use ($org, $validated) {
            // Partir de la date actuelle d'expiration si dans le futur, sinon from now
            $baseDate  = ($org->trial_ends_at && $org->trial_ends_at->isFuture())
                ? $org->trial_ends_at
                : now();
            $newExpiry = $baseDate->addMonths($validated['months']);

            $org->update([
                'trial_ends_at' => $newExpiry,
                'status'        => 'active',
            ]);

            $this->logAudit('license.extend', $org->id, [
                'months'      => $validated['months'],
                'new_expiry'  => $newExpiry->toDateString(),
                'reason'      => $validated['reason'] ?? null,
            ]);

            $this->notifyOrgAdmin($org, 'extension', [
                'months'     => $validated['months'],
                'expires_at' => $newExpiry->format('d/m/Y'),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => "Licence prolongée de {$validated['months']} mois.",
            'org'     => $org->fresh(),
        ]);
    }

    // -------------------------------------------------------------------------
    // suspend($orgId) — Suspendre avec motif obligatoire
    // -------------------------------------------------------------------------

    public function suspend(Request $request, int $orgId): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:10|max:1000',
        ]);

        $org = Organization::findOrFail($orgId);

        abort_if($org->status === 'suspended', 422, 'Organisation déjà suspendue.');

        DB::transaction(function () use ($org, $validated) {
            $org->update(['status' => 'suspended']);

            $this->logAudit('license.suspend', $org->id, [
                'reason'          => $validated['reason'],
                'previous_status' => $org->getOriginal('status'),
            ]);

            $this->notifyOrgAdmin($org, 'suspension', ['reason' => $validated['reason']]);
        });

        return response()->json([
            'success' => true,
            'message' => "Organisation {$org->name} suspendue.",
        ]);
    }

    // -------------------------------------------------------------------------
    // revoke($orgId) — Révoquer définitivement
    // -------------------------------------------------------------------------

    public function revoke(Request $request, int $orgId): JsonResponse
    {
        $validated = $request->validate([
            'reason'      => 'required|string|min:10|max:1000',
            'confirm'     => 'required|accepted',   // case à cocher côté front
        ]);

        $org = Organization::findOrFail($orgId);

        DB::transaction(function () use ($org, $validated) {
            $org->update([
                'status'   => 'cancelled',
                'settings' => array_merge($org->settings ?? [], [
                    'revoked_at'     => now()->toIso8601String(),
                    'revoked_reason' => $validated['reason'],
                    'revoked_by'     => Auth::id(),
                ]),
            ]);

            $this->logAudit('license.revoke', $org->id, [
                'reason' => $validated['reason'],
            ]);

            $this->notifyOrgAdmin($org, 'revocation', ['reason' => $validated['reason']]);
        });

        return response()->json([
            'success' => true,
            'message' => "Licence de {$org->name} révoquée définitivement.",
        ]);
    }

    // -------------------------------------------------------------------------
    // changePlan($orgId) — Changer de plan (upgrade / downgrade)
    // -------------------------------------------------------------------------

    public function changePlan(Request $request, int $orgId): JsonResponse
    {
        $validated = $request->validate([
            'plan'   => 'required|in:Starter,Pro,Enterprise',
            'reason' => 'nullable|string|max:500',
        ]);

        $org = Organization::findOrFail($orgId);
        $oldPlan = $org->settings['plan'] ?? 'N/A';

        DB::transaction(function () use ($org, $validated, $oldPlan) {
            $org->update([
                'settings' => array_merge($org->settings ?? [], [
                    'plan'            => $validated['plan'],
                    'plan_changed_at' => now()->toIso8601String(),
                    'plan_changed_by' => Auth::id(),
                ]),
            ]);

            $this->logAudit('license.change_plan', $org->id, [
                'old_plan' => $oldPlan,
                'new_plan' => $validated['plan'],
                'reason'   => $validated['reason'] ?? null,
            ]);

            $this->notifyOrgAdmin($org, 'plan_change', [
                'old_plan' => $oldPlan,
                'new_plan' => $validated['plan'],
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => "Plan changé : {$oldPlan} → {$validated['plan']}",
            'org'     => $org->fresh(),
        ]);
    }

    // -------------------------------------------------------------------------
    // bulkAction() — Actions groupées sur plusieurs organisations
    // -------------------------------------------------------------------------

    public function bulkAction(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action'   => 'required|in:suspend,extend,activate,revoke',
            'org_ids'  => 'required|array|min:1|max:50',
            'org_ids.*'=> 'integer|exists:organizations,id',
            'months'   => 'required_if:action,extend,activate|integer|min:1|max:60',
            'plan'     => 'required_if:action,activate|in:Starter,Pro,Enterprise',
            'reason'   => 'required_if:action,suspend,revoke|string|min:5|max:1000',
        ]);

        $results  = ['success' => [], 'failed' => []];
        $orgs     = Organization::whereIn('id', $validated['org_ids'])->get();

        foreach ($orgs as $org) {
            try {
                DB::transaction(function () use ($org, $validated) {
                    match ($validated['action']) {
                        'suspend'  => $org->update(['status' => 'suspended']),
                        'activate' => $org->update([
                            'status'        => 'active',
                            'trial_ends_at' => now()->addMonths($validated['months']),
                        ]),
                        'extend'   => $org->update([
                            'trial_ends_at' => ($org->trial_ends_at?->isFuture()
                                ? $org->trial_ends_at
                                : now())->addMonths($validated['months']),
                            'status' => 'active',
                        ]),
                        'revoke'   => $org->update(['status' => 'cancelled']),
                    };

                    $this->logAudit("license.bulk.{$validated['action']}", $org->id, [
                        'bulk'   => true,
                        'reason' => $validated['reason'] ?? null,
                    ]);
                });

                $results['success'][] = $org->name;
            } catch (\Throwable $e) {
                $results['failed'][] = ['name' => $org->name, 'error' => $e->getMessage()];
                Log::error("Bulk license action failed for org {$org->id}", ['error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'success' => true,
            'results' => $results,
            'message' => count($results['success']) . ' organisation(s) traitée(s) avec succès.',
        ]);
    }

    // -------------------------------------------------------------------------
    // Méthodes privées
    // -------------------------------------------------------------------------

    private function logAudit(string $action, ?int $orgId, array $context = []): void
    {
        try {
            DB::table('audit_logs')->insert([
                'user_id'         => Auth::id(),
                'organization_id' => $orgId,
                'action'          => $action,
                'context'         => json_encode($context),
                'ip_address'      => request()->ip(),
                'user_agent'      => request()->userAgent(),
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Audit log failed', ['action' => $action, 'error' => $e->getMessage()]);
        }
    }

    private function notifyOrgAdmin(Organization $org, string $type, array $data = []): void
    {
        try {
            $admin = $org->users()
                ->whereHas('roles', fn ($q) => $q->where('name', 'admin'))
                ->where('status', 'active')
                ->orderBy('created_at')
                ->first();

            if (!$admin) {
                return;
            }

            $subjects = [
                'activation' => "[SECRETIS] Votre licence a été activée — {$org->name}",
                'extension'  => "[SECRETIS] Votre licence a été prolongée — {$org->name}",
                'suspension' => "[SECRETIS] Votre compte a été suspendu — {$org->name}",
                'revocation' => "[SECRETIS] Votre licence a été révoquée — {$org->name}",
                'plan_change'=> "[SECRETIS] Votre plan a été modifié — {$org->name}",
            ];

            Mail::send("emails.license-{$type}", array_merge(['org' => $org, 'admin' => $admin], $data),
                function ($mail) use ($admin, $subjects, $type) {
                    $mail->to($admin->email)->subject($subjects[$type] ?? "[SECRETIS] Mise à jour de votre licence");
                }
            );
        } catch (\Throwable $e) {
            Log::warning("License notification email failed for org {$org->id}", ['error' => $e->getMessage()]);
        }
    }
}
