<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * OrganizationController — Console SuperAdmin IBIG SECRETIS
 *
 * Toutes les actions sont journalisées dans audit_logs.
 * La prise en main (impersonation) génère une alerte email à l'admin de l'org.
 */
class OrganizationController extends Controller
{
    // -------------------------------------------------------------------------
    // index() — Liste toutes les organisations avec filtres avancés
    // -------------------------------------------------------------------------

    public function index(Request $request): Response
    {
        $query = Organization::withCount(['users'])
            ->with(['plan'])
            ->withTrashed(); // inclut les supprimées pour le superadmin

        // ── Filtres ────────────────────────────────────────────────────────────
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('slug', 'like', "%{$q}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('plan')) {
            $query->whereHas('plan', fn ($q) => $q->where('slug', $request->plan));
        }

        if ($request->filled('country')) {
            $query->where('country', $request->country);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // ── Tri ────────────────────────────────────────────────────────────────
        $sortField = $request->get('sort', 'created_at');
        $sortDir   = $request->get('dir', 'desc');
        $allowedSorts = ['name', 'created_at', 'status', 'trial_ends_at', 'users_count'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $organizations = $query->paginate(20)->appends($request->query());

        // ── Statistiques rapides ───────────────────────────────────────────────
        $stats = [
            'total'     => Organization::count(),
            'active'    => Organization::where('status', 'active')->count(),
            'trial'     => Organization::where('status', 'trial')->count(),
            'suspended' => Organization::where('status', 'suspended')->count(),
            'expired'   => Organization::where('status', 'expired')->count(),
        ];

        return Inertia::render('SuperAdmin/Organizations', [
            'organizations' => $organizations,
            'stats'         => $stats,
            'filters'       => $request->only(['search', 'status', 'plan', 'country', 'date_from', 'date_to', 'sort', 'dir']),
        ]);
    }

    // -------------------------------------------------------------------------
    // show($id) — Profil complet d'une organisation
    // -------------------------------------------------------------------------

    public function show(int $id): Response
    {
        $org = Organization::with([
            'users.roles',
            'plan',
            'payments' => fn ($q) => $q->latest()->limit(20),
        ])
        ->withTrashed()
        ->findOrFail($id);

        // Récupérer les logs d'audit pour cette organisation
        $auditLogs = \DB::table('audit_logs')
            ->where('organization_id', $id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        // Modules actifs (depuis settings)
        $activeModules = $org->settings['modules'] ?? [];

        $this->logAudit('organization.view', $id, ['org_name' => $org->name]);

        return Inertia::render('SuperAdmin/OrganizationDetail', [
            'organization'  => $org,
            'auditLogs'     => $auditLogs,
            'activeModules' => $activeModules,
        ]);
    }

    // -------------------------------------------------------------------------
    // impersonate($id) — Prise en main sécurisée
    // -------------------------------------------------------------------------

    public function impersonate(int $id): \Illuminate\Http\RedirectResponse
    {
        $superAdmin = Auth::user();

        // Vérification stricte : seul le superadmin peut impersonifier
        abort_unless($superAdmin->hasRole('superadmin_ibig'), 403, 'Accès non autorisé.');

        $org = Organization::findOrFail($id);

        // Trouver l'admin principal de l'organisation (premier admin actif)
        $adminUser = User::where('organization_id', $id)
            ->where('status', 'active')
            ->whereHas('roles', fn ($q) => $q->where('name', 'admin'))
            ->orderBy('created_at')
            ->firstOrFail();

        // Sauvegarder la session superadmin originale
        session([
            'impersonating'         => true,
            'impersonator_id'       => $superAdmin->id,
            'impersonator_name'     => $superAdmin->name,
            'impersonator_email'    => $superAdmin->email,
            'impersonated_org_id'   => $org->id,
            'impersonated_org_name' => $org->name,
            'impersonated_user_id'  => $adminUser->id,
            'impersonation_started' => now()->toIso8601String(),
        ]);

        // Log d'audit obligatoire
        $this->logAudit('organization.impersonate', $id, [
            'org_name'       => $org->name,
            'target_user_id' => $adminUser->id,
            'target_email'   => $adminUser->email,
        ]);

        // Alerte email à l'admin de l'organisation
        try {
            Mail::send('emails.impersonation-alert', [
                'org'        => $org,
                'adminUser'  => $adminUser,
                'superAdmin' => $superAdmin,
                'ip'         => request()->ip(),
                'time'       => now()->format('d/m/Y H:i:s'),
            ], function ($mail) use ($adminUser, $org) {
                $mail->to($adminUser->email)
                     ->subject("[SECRETIS] Accès administrateur à votre espace — {$org->name}");
            });
        } catch (\Throwable $e) {
            Log::warning('Impersonation email failed', ['error' => $e->getMessage()]);
        }

        // Connecter en tant que l'admin de l'organisation
        Auth::login($adminUser);

        return redirect()->route('dashboard')
            ->with('impersonation_notice', "Vous naviguez en tant que {$adminUser->name} ({$org->name})");
    }

    // -------------------------------------------------------------------------
    // stopImpersonation() — Retour à la session superadmin
    // -------------------------------------------------------------------------

    public function stopImpersonation(): \Illuminate\Http\RedirectResponse
    {
        abort_unless(session('impersonating'), 403, 'Pas de session d\'impersonation active.');

        $impersonatorId   = session('impersonator_id');
        $impersonatedOrgId = session('impersonated_org_id');

        // Log de fin d'impersonation
        $this->logAudit('organization.impersonate.stop', $impersonatedOrgId, [
            'impersonator_id' => $impersonatorId,
            'duration_seconds' => now()->diffInSeconds(
                \Carbon\Carbon::parse(session('impersonation_started'))
            ),
        ]);

        // Nettoyer les données d'impersonation
        session()->forget([
            'impersonating', 'impersonator_id', 'impersonator_name',
            'impersonator_email', 'impersonated_org_id', 'impersonated_org_name',
            'impersonated_user_id', 'impersonation_started',
        ]);

        // Reconnecter le superadmin
        $superAdmin = User::findOrFail($impersonatorId);
        Auth::login($superAdmin);

        return redirect()->route('superadmin.organizations.index')
            ->with('success', 'Impersonation terminée. Vous êtes revenu à votre session SuperAdmin.');
    }

    // -------------------------------------------------------------------------
    // exportCsv() — Export CSV de toutes les organisations
    // -------------------------------------------------------------------------

    public function exportCsv(Request $request): StreamedResponse
    {
        $this->logAudit('organization.export', null, ['format' => 'csv']);

        $query = Organization::with('plan')->withCount('users');

        // Appliquer les mêmes filtres que index()
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('plan')) {
            $query->whereHas('plan', fn ($q) => $q->where('slug', $request->plan));
        }

        $organizations = $query->orderBy('created_at', 'desc')->get();

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="organisations_' . now()->format('Ymd_His') . '.csv"',
        ];

        return response()->streamDownload(function () use ($organizations) {
            $fp = fopen('php://output', 'w');
            // BOM UTF-8 pour Excel
            fwrite($fp, "\xEF\xBB\xBF");

            fputcsv($fp, [
                'ID', 'Nom', 'Slug', 'Email', 'Pays', 'Plan',
                'Statut', 'Utilisateurs', 'Date inscription', 'Fin licence',
            ], ';');

            foreach ($organizations as $org) {
                fputcsv($fp, [
                    $org->id,
                    $org->name,
                    $org->slug,
                    $org->email,
                    $org->country,
                    $org->plan?->name ?? 'N/A',
                    $org->status,
                    $org->users_count,
                    $org->created_at?->format('d/m/Y'),
                    $org->trial_ends_at?->format('d/m/Y') ?? 'N/A',
                ], ';');
            }

            fclose($fp);
        }, 'organisations_' . now()->format('Ymd_His') . '.csv', $headers);
    }

    // -------------------------------------------------------------------------
    // Méthode privée — Journal d'audit
    // -------------------------------------------------------------------------

    private function logAudit(string $action, ?int $orgId, array $context = []): void
    {
        try {
            \DB::table('audit_logs')->insert([
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
}
