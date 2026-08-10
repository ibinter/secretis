<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    private function orgId(): int
    {
        return Auth::user()->organization_id;
    }

    public function index(Request $request): Response
    {
        $query = User::where('organization_id', $this->orgId())
            ->with(['roles:name', 'department:id,name'])
            ->orderBy('name');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $users = $query->paginate(20)->withQueryString()
            ->through(fn (User $u) => [
                'id'            => $u->id,
                'name'          => $u->name,
                'email'         => $u->email,
                'status'        => $u->status,
                'avatar'        => $u->avatar,
                'roles'         => $u->roles->pluck('name'),
                'department'    => $u->department?->only(['id', 'name']),
                'last_login_at' => $u->last_login_at?->toIso8601String(),
                'created_at'    => $u->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Users/Index', [
            'users'   => $users,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Users/Create', [
            'departments'     => Department::where('organization_id', $this->orgId())->orderBy('name')->get(['id', 'name']),
            'available_roles' => Role::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        // Multi-utilisateur fermé au palier Découverte (section 3.3) : l'espace
        // gratuit compte un utilisateur, celui qui l'a ouvert.
        app(\App\Services\LicenceGarde::class)->exiger('multi_utilisateur');

        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password'      => ['required', 'string', 'min:8', 'confirmed'],
            'status'        => ['required', 'in:active,inactive'],
            'department_id' => ['nullable', 'integer'],
            'role'          => ['nullable', 'string', 'max:60'],
        ]);

        $user = User::create([
            'organization_id' => $this->orgId(),
            'name'            => $validated['name'],
            'email'           => $validated['email'],
            'password'        => Hash::make($validated['password']),
            'status'          => $validated['status'],
            'department_id'   => $validated['department_id'] ?? null,
        ]);

        if (! empty($validated['role'])) {
            try { $user->assignRole($validated['role']); } catch (\Throwable) {}
        }

        return redirect()->route('users.show', $user)->with('success', 'Utilisateur créé.');
    }

    public function show(User $user): Response
    {
        abort_if($user->organization_id !== $this->orgId(), 403);

        $user->load(['roles:name', 'department:id,name']);

        return Inertia::render('Users/Show', [
            'user' => [
                'id'            => $user->id,
                'name'          => $user->name,
                'email'         => $user->email,
                'status'        => $user->status,
                'avatar'        => $user->avatar,
                'roles'         => $user->roles->pluck('name'),
                'department'    => $user->department?->only(['id', 'name']),
                'last_login_at' => $user->last_login_at?->toIso8601String(),
                'created_at'    => $user->created_at?->toIso8601String(),
                'locked_until'  => $user->locked_until?->toIso8601String(),
            ],
        ]);
    }

    public function edit(User $user): Response
    {
        abort_if($user->organization_id !== $this->orgId(), 403);

        $user->load(['roles:name', 'department:id,name']);

        return Inertia::render('Users/Edit', [
            'user' => [
                'id'            => $user->id,
                'name'          => $user->name,
                'email'         => $user->email,
                'status'        => $user->status,
                'avatar'        => $user->avatar,
                'department_id' => $user->department_id,
                'roles'         => $user->roles->pluck('name'),
            ],
            'departments'     => Department::where('organization_id', $this->orgId())->orderBy('name')->get(['id', 'name']),
            'available_roles' => Role::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        abort_if($user->organization_id !== $this->orgId(), 403);

        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'status'        => ['required', 'in:active,inactive,locked'],
            'department_id' => ['nullable', 'integer'],
            'password'      => ['nullable', 'string', 'min:8', 'confirmed'],
            'role'          => ['nullable', 'string', 'max:60'],
        ]);

        $updates = [
            'name'          => $validated['name'],
            'email'         => $validated['email'],
            'status'        => $validated['status'],
            'department_id' => $validated['department_id'] ?? null,
        ];
        if (! empty($validated['password'])) {
            $updates['password'] = Hash::make($validated['password']);
        }
        $user->update($updates);

        if (! empty($validated['role'])) {
            try { $user->syncRoles([$validated['role']]); } catch (\Throwable) {}
        }

        return redirect()->route('users.show', $user)->with('success', 'Utilisateur mis à jour.');
    }

    public function destroy(User $user): RedirectResponse
    {
        abort_if($user->organization_id !== $this->orgId(), 403);
        abort_if($user->id === Auth::id(), 403, 'Impossible de supprimer votre propre compte.');

        $user->update(['status' => 'inactive']);

        return redirect()->route('users.index')->with('success', 'Utilisateur désactivé.');
    }

    // =========================================================================
    // API (routes /api/v1/users/*) — retour JSON, org-scopé
    // =========================================================================

    /**
     * POST /api/v1/users/invite
     * Crée un utilisateur dans l'organisation courante et lui assigne un rôle.
     */
    public function invite(Request $request): JsonResponse
    {
        // Multi-utilisateur fermé au palier Découverte (section 3.3).
        app(\App\Services\LicenceGarde::class)->exiger('multi_utilisateur', $request->user());

        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'role'          => ['nullable', 'string', 'max:60'],
            'department_id' => ['nullable', 'integer'],
        ]);

        $user = User::create([
            'organization_id' => $this->orgId(),
            'name'            => $validated['name'],
            'email'           => $validated['email'],
            'password'        => Hash::make(\Illuminate\Support\Str::random(32)),
            'status'          => 'active',
            'department_id'   => $validated['department_id'] ?? null,
        ]);

        if (! empty($validated['role'])) {
            try { $user->assignRole($validated['role']); } catch (\Throwable) {}
        }

        return response()->json([
            'message' => 'Utilisateur invité.',
            'data'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames(),
            ],
        ], 201);
    }

    /**
     * PUT /api/v1/users/{id}/role
     * Remplace les rôles de l'utilisateur (org-scopé).
     */
    public function updateRole(Request $request, string $id): JsonResponse
    {
        $user = User::where('organization_id', $this->orgId())->findOrFail($id);

        $validated = $request->validate([
            'role' => ['required', 'string', 'max:60'],
        ]);

        try {
            $user->syncRoles([$validated['role']]);
        } catch (\Throwable) {
            return response()->json(['message' => 'Rôle invalide.'], 422);
        }

        return response()->json([
            'message' => 'Rôle mis à jour.',
            'data'    => ['id' => $user->id, 'roles' => $user->getRoleNames()],
        ]);
    }

    /**
     * POST /api/v1/users/{id}/activate
     */
    public function activate(string $id): JsonResponse
    {
        $user = User::where('organization_id', $this->orgId())->findOrFail($id);
        $user->update(['status' => 'active']);

        return response()->json([
            'message' => 'Utilisateur activé.',
            'data'    => ['id' => $user->id, 'status' => $user->status],
        ]);
    }

    /**
     * POST /api/v1/users/{id}/deactivate
     */
    public function deactivate(string $id): JsonResponse
    {
        $user = User::where('organization_id', $this->orgId())->findOrFail($id);
        abort_if($user->id === Auth::id(), 403, 'Impossible de désactiver votre propre compte.');

        $user->update(['status' => 'inactive']);

        return response()->json([
            'message' => 'Utilisateur désactivé.',
            'data'    => ['id' => $user->id, 'status' => $user->status],
        ]);
    }

    /**
     * GET /api/users/search?q=...
     * Recherche d'utilisateurs de l'organisation — renvoie un TABLEAU JSON simple
     * (consommé par la messagerie : Pages/Messages/Index.jsx attend res.data.map()).
     */
    public function search(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q', ''));

        if (mb_strlen($term) < 2) {
            return response()->json([]);
        }

        $like = '%' . str_replace(['%', '_'], ['\%', '\_'], $term) . '%';

        $users = User::where('organization_id', $this->orgId())
            ->where('id', '!=', Auth::id())
            ->where(fn ($q) => $q->where('name', 'ilike', $like)->orWhere('email', 'ilike', $like))
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'email', 'avatar'])
            ->map(fn (User $u) => [
                'id'     => $u->id,
                'name'   => $u->name,
                'email'  => $u->email,
                'avatar' => $u->avatar,
            ]);

        return response()->json($users);
    }

    /**
     * PATCH /parametres/utilisateurs/{id}/toggle
     * Active ou désactive un compte selon le statut transmis.
     */
    public function toggleStatus(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'statut' => ['required', 'in:active,inactive'],
        ]);

        return $validated['statut'] === 'active'
            ? $this->activate($id)
            : $this->deactivate($id);
    }

    /**
     * POST /parametres/utilisateurs/{id}/reset-mdp
     * Envoie un lien de réinitialisation de mot de passe à l'utilisateur.
     */
    public function resetPassword(string $id): JsonResponse
    {
        $user = User::where('organization_id', $this->orgId())->findOrFail($id);

        $status = \Illuminate\Support\Facades\Password::sendResetLink(['email' => $user->email]);

        return response()->json([
            'message' => $status === \Illuminate\Support\Facades\Password::RESET_LINK_SENT
                ? 'Lien de réinitialisation envoyé à ' . $user->email . '.'
                : "Impossible d'envoyer le lien de réinitialisation.",
        ], $status === \Illuminate\Support\Facades\Password::RESET_LINK_SENT ? 200 : 422);
    }

    /**
     * GET /parametres/utilisateurs/{id}/historique
     * Dernières actions de l'utilisateur (journal d'audit).
     */
    public function history(string $id): JsonResponse
    {
        $user = User::where('organization_id', $this->orgId())->findOrFail($id);

        $logs = \Illuminate\Support\Facades\Schema::hasTable('audit_logs')
            ? \Illuminate\Support\Facades\DB::table('audit_logs')
                ->where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->limit(50)
                ->get(['id', 'action', 'module', 'resource_type', 'resource_id', 'created_at'])
            : collect();

        return response()->json(['data' => $logs]);
    }
}
