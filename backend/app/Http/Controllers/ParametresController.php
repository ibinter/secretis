<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ParametresController extends Controller
{
    public function index(Request $request): Response|JsonResponse
    {
        if ($request->wantsJson() && ! $request->hasHeader('X-Inertia')) {
            return response()->json(['data' => [], 'success' => true]);
        }

        $user = Auth::user()->load('organization');

        return Inertia::render('Parametres/Index', [
            'organization' => $user->organization,
        ]);
    }

    // ── Organisation ─────────────────────────────────────────────────────────

    public function updateOrganisation(Request $request): JsonResponse
    {
        $user = Auth::user();
        $org  = $user->organization;

        if (! $org) {
            return response()->json(['message' => 'Organisation introuvable.'], 404);
        }

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'max:255'],
            'phone'    => ['nullable', 'string', 'max:30'],
            'address'  => ['nullable', 'string', 'max:500'],
            'country'  => ['nullable', 'string', 'size:2'],
            'timezone' => ['nullable', 'string', 'max:60'],
            'settings' => ['nullable', 'array'],
        ]);

        $org->update($validated);

        return response()->json([
            'message'      => 'Paramètres de l\'organisation mis à jour.',
            'organization' => $org->fresh(),
        ]);
    }

    // ── Utilisateurs ─────────────────────────────────────────────────────────

    public function utilisateurs(Request $request): Response
    {
        $user  = Auth::user();
        $users = User::where('organization_id', $user->organization_id)
            ->with(['roles', 'department:id,name'])
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'status'     => $u->status,
                'roles'      => $u->roles->pluck('name'),
                'department' => $u->department?->only(['id', 'name']),
                'last_login_at' => $u->last_login_at?->toIso8601String(),
            ]);

        return Inertia::render('Parametres/Utilisateurs', [
            'users' => $users,
        ]);
    }

    public function inviteUtilisateur(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'name'  => ['required', 'string', 'max:255'],
            'role'  => ['nullable', 'string', 'max:60'],
        ]);

        $user = Auth::user();

        $tempPassword = Str::random(12);
        $invited = User::create([
            'organization_id' => $user->organization_id,
            'name'            => $validated['name'],
            'email'           => $validated['email'],
            'password'        => bcrypt($tempPassword),
            'status'          => 'active',
        ]);

        if (! empty($validated['role'])) {
            try {
                $invited->assignRole($validated['role']);
            } catch (\Throwable) {}
        }

        return response()->json([
            'message' => "Invitation envoyée à {$validated['email']}.",
            'user'    => $invited->only(['id', 'name', 'email', 'status']),
        ], 201);
    }

    // ── Rôles ─────────────────────────────────────────────────────────────────

    public function roles(): Response
    {
        $user  = Auth::user();
        $users = User::where('organization_id', $user->organization_id)
            ->with('roles')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'email' => $u->email,
                'roles' => $u->roles->pluck('name'),
            ]);

        $availableRoles = \Spatie\Permission\Models\Role::all(['id', 'name']);

        return Inertia::render('Parametres/Roles', [
            'users'          => $users,
            'available_roles' => $availableRoles,
        ]);
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    public function notifications(): Response
    {
        $user  = Auth::user();
        $prefs = $user->preferences['notifications'] ?? [];

        return Inertia::render('Parametres/Notifications', [
            'preferences' => $prefs,
        ]);
    }

    public function updateNotifications(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preferences' => ['required', 'array'],
        ]);

        $user = Auth::user();
        $prefs = $user->preferences ?? [];
        $prefs['notifications'] = $validated['preferences'];
        $user->update(['preferences' => $prefs]);

        return response()->json(['message' => 'Préférences de notification enregistrées.']);
    }

    // ── Langue & Région ───────────────────────────────────────────────────────

    public function langueRegion(): Response
    {
        $user = Auth::user()->load('organization');

        return Inertia::render('Parametres/LangueRegion', [
            'organization' => $user->organization?->only(['id', 'country', 'timezone']),
            'user_locale'  => $user->preferences['locale'] ?? 'fr',
        ]);
    }

    public function updateLangueRegion(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'locale'   => ['required', 'in:fr,en,ar'],
            'timezone' => ['nullable', 'string', 'max:60'],
            'country'  => ['nullable', 'string', 'size:2'],
        ]);

        $user = Auth::user();
        $prefs = $user->preferences ?? [];
        $prefs['locale'] = $validated['locale'];
        $user->update(['preferences' => $prefs]);

        if ($user->organization) {
            $orgUpdate = array_filter([
                'timezone' => $validated['timezone'] ?? null,
                'country'  => $validated['country'] ?? null,
            ]);
            if (! empty($orgUpdate)) {
                $user->organization->update($orgUpdate);
            }
        }

        return response()->json(['message' => 'Langue et région mises à jour.']);
    }

    // ── Assignation de rôle ───────────────────────────────────────────────────

    public function assignRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'max:60'],
        ]);

        // Vérification multi-tenant
        if ($user->organization_id !== Auth::user()->organization_id) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        try {
            if ($user->hasRole($validated['role'])) {
                $user->removeRole($validated['role']);
                $message = "Rôle '{$validated['role']}' retiré.";
            } else {
                $user->assignRole($validated['role']);
                $message = "Rôle '{$validated['role']}' attribué.";
            }
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Erreur lors de l\'assignation du rôle.'], 422);
        }

        return response()->json([
            'message' => $message,
            'roles'   => $user->fresh()->roles->pluck('name'),
        ]);
    }

    // ── Sécurité ─────────────────────────────────────────────────────────────

    public function securite(): Response
    {
        $user = Auth::user();

        return Inertia::render('Parametres/Securite', [
            'mfa_enabled'         => false,
            'failed_attempts'     => $user->failed_login_attempts ?? 0,
            'last_login_at'       => $user->last_login_at?->toIso8601String(),
            'last_login_ip'       => null,
            'active_sessions'     => 1,
        ]);
    }
}
