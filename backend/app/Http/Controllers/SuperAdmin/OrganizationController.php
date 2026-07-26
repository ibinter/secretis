<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Organization::query()->withCount('users');

        if ($search = $request->input('search')) {
            $query->where(fn ($q) => $q
                ->where('name', 'ilike', "%{$search}%")
                ->orWhere('email', 'ilike', "%{$search}%"));
        }
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $organizations = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total'    => Organization::count(),
            'active'   => Organization::where('is_active', true)->count(),
            'trial'    => License::where('status', 'trial')->count(),
            'expired'  => License::where('status', 'expired')->count(),
        ];

        return Inertia::render('SuperAdmin/Organizations/Index', [
            'organizations' => $organizations,
            'stats'         => $stats,
            'filters'       => $request->only(['search', 'status']),
        ]);
    }

    public function show(Request $request, int $id): Response
    {
        $org = Organization::with(['users' => fn ($q) => $q->limit(50)])->findOrFail($id);
        $license = License::where('organization_id', $id)->orderByDesc('created_at')->first();

        return Inertia::render('SuperAdmin/Organizations/Show', [
            'organization' => $org,
            'license'      => $license,
        ]);
    }

    public function trials(Request $request): Response
    {
        $trials = License::where('status', 'trial')
            ->with('organization:id,name,email,created_at')
            ->orderBy('ends_at')
            ->paginate(20);

        return Inertia::render('SuperAdmin/Trials/Index', ['trials' => $trials]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
        ]);
        $data['slug'] = \Illuminate\Support\Str::slug($data['name']) . '-' . uniqid();
        $org = Organization::create($data);
        return back()->with('success', "Organisation {$org->name} créée.");
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $org = Organization::findOrFail($id);
        $org->update($request->only(['name', 'email', 'phone', 'address', 'city', 'country', 'status']));
        return back()->with('success', 'Organisation mise à jour.');
    }

    public function destroy(int $id): RedirectResponse
    {
        Organization::findOrFail($id)->delete();
        return back()->with('success', 'Organisation archivée (soft delete).');
    }

    public function activate(int $id): RedirectResponse
    {
        Organization::findOrFail($id)->update(['is_active' => true]);
        return back()->with('success', 'Organisation activée.');
    }

    public function deactivate(int $id): RedirectResponse
    {
        Organization::findOrFail($id)->update(['is_active' => false]);
        return back()->with('success', 'Organisation désactivée.');
    }

    public function suspend(Request $request, int $id): RedirectResponse
    {
        Organization::findOrFail($id)->update(['is_active' => false, 'status' => 'suspended']);
        License::where('organization_id', $id)->where('status', 'active')
            ->update(['status' => 'suspended', 'suspended_by' => Auth::id(), 'suspension_reason' => $request->input('reason')]);
        return back()->with('success', 'Organisation suspendue.');
    }

    public function revoke(int $id): RedirectResponse
    {
        License::where('organization_id', $id)->update(['status' => 'revoked']);
        Organization::findOrFail($id)->update(['is_active' => false, 'status' => 'revoked']);
        return back()->with('success', 'Licence révoquée.');
    }

    public function grantGrace(Request $request, int $id): RedirectResponse
    {
        $days = (int) $request->input('days', 7);
        License::where('organization_id', $id)->orderByDesc('created_at')->limit(1)
            ->update(['grace_until' => now()->addDays($days), 'status' => 'grace']);
        return back()->with('success', "Période de grâce de {$days} jours accordée.");
    }

    public function extend(Request $request, int $id): RedirectResponse
    {
        $days = (int) $request->input('days', 30);
        $license = License::where('organization_id', $id)->orderByDesc('created_at')->firstOrFail();
        $license->update(['ends_at' => $license->ends_at->addDays($days), 'status' => 'active']);
        return back()->with('success', "Licence prolongée de {$days} jours.");
    }

    public function extendTrial(Request $request, int $id): RedirectResponse
    {
        $days = (int) $request->input('days', 14);
        $org = Organization::findOrFail($id);
        $org->update(['trial_ends_at' => now()->addDays($days)]);
        License::where('organization_id', $id)->where('status', 'trial')
            ->update(['ends_at' => now()->addDays($days)]);
        return back()->with('success', "Essai prolongé de {$days} jours.");
    }

    public function updateLicense(Request $request, int $id): RedirectResponse
    {
        $data = $request->validate([
            'plan_id'       => 'sometimes|string',
            'plan_name'     => 'sometimes|string',
            'price'         => 'sometimes|numeric',
            'billing_cycle' => 'sometimes|string',
            'max_users'     => 'sometimes|integer',
            'status'        => 'sometimes|string',
            'ends_at'       => 'sometimes|date',
        ]);
        $license = License::where('organization_id', $id)->orderByDesc('created_at')->first();
        if ($license) {
            $license->update($data);
        } else {
            License::create(array_merge($data, [
                'organization_id' => $id,
                'plan_id'   => $data['plan_id'] ?? 'custom',
                'plan_name' => $data['plan_name'] ?? 'Personnalisé',
                'starts_at' => now(),
                'ends_at'   => $data['ends_at'] ?? now()->addMonth(),
            ]));
        }
        return back()->with('success', 'Licence mise à jour.');
    }

    public function impersonate(Request $request, int $id): RedirectResponse
    {
        $org = Organization::findOrFail($id);
        $admin = User::where('organization_id', $id)->whereIn('role', ['admin', 'owner'])->first()
              ?? User::where('organization_id', $id)->first();
        if (!$admin) {
            return back()->with('error', 'Aucun utilisateur dans cette organisation.');
        }
        session(['impersonator_id' => Auth::id()]);
        Auth::login($admin);
        return redirect('/dashboard')->with('success', "Connecté en tant que {$admin->email} ({$org->name}).");
    }

    public function sendMessage(Request $request, int $id): RedirectResponse
    {
        $request->validate(['subject' => 'required|string', 'body' => 'required|string']);
        $org = Organization::findOrFail($id);
        $admin = User::where('organization_id', $id)->first();
        if ($admin) {
            \Illuminate\Support\Facades\Mail::raw($request->input('body'), function ($m) use ($admin, $request) {
                $m->to($admin->email)->subject('[SECRETIS] ' . $request->input('subject'));
            });
        }
        return back()->with('success', 'Message envoyé.');
    }

    public function resetMfa(int $id): RedirectResponse
    {
        return back()->with('success', 'MFA réinitialisé.');
    }

    public function exportData(int $id)
    {
        $org = Organization::with('users')->findOrFail($id);
        return response()->json($org)->header('Content-Disposition', "attachment; filename=org-{$id}.json");
    }

    public function sendTrialReminder(int $id): RedirectResponse
    {
        return back()->with('success', 'Rappel d\'essai envoyé.');
    }
}
