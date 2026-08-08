<?php

namespace App\Http\Controllers;

use App\Models\Delegation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DelegationController extends Controller
{
    public function index(Request $request): Response
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $delegations = Delegation::where('organization_id', $orgId)
            ->with(['delegator:id,name,avatar', 'delegate:id,name,avatar'])
            ->orderByDesc('starts_at')
            ->get();

        // Auto-expirer les délégations passées
        $delegations->each(function (Delegation $d) {
            if ($d->status === 'active' && $d->ends_at && $d->ends_at < now()) {
                $d->update(['status' => 'expired']);
            }
        });

        return Inertia::render('Delegations/Index', [
            'delegations' => $delegations->fresh()->load(['delegator:id,name,avatar', 'delegate:id,name,avatar']),
            'users'       => User::where('organization_id', $orgId)
                ->where('id', '!=', $user->id)
                ->select('id', 'name', 'email', 'avatar')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'title'        => ['required', 'string', 'max:255'],
            'delegate_id'  => ['required', 'exists:users,id', 'different:' . $user->id],
            'delegator_id' => ['nullable', 'exists:users,id'],
            'scope'        => ['nullable', 'string', 'max:1000'],
            'starts_at'    => ['required', 'date'],
            'ends_at'      => ['nullable', 'date', 'after:starts_at'],
            'reason'       => ['nullable', 'string', 'max:500'],
        ]);

        $delegation = Delegation::create([
            'organization_id' => $user->organization_id,
            'delegator_id'    => $validated['delegator_id'] ?? $user->id,
            'delegate_id'     => $validated['delegate_id'],
            'title'           => $validated['title'],
            'scope'           => $validated['scope'] ?? null,
            'starts_at'       => $validated['starts_at'],
            'ends_at'         => $validated['ends_at'] ?? null,
            'reason'          => $validated['reason'] ?? null,
            'status'          => now() >= $validated['starts_at'] ? 'active' : 'pending',
            'created_by'      => $user->id,
        ]);

        return response()->json([
            'message'    => 'Délégation créée.',
            'delegation' => $delegation->load(['delegator:id,name', 'delegate:id,name']),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $delegation = Delegation::where('organization_id', Auth::user()->organization_id)->findOrFail($id);

        if ($delegation->status === 'revoked') {
            return response()->json(['message' => 'Une délégation révoquée ne peut pas être modifiée.'], 422);
        }

        $validated = $request->validate([
            'title'   => ['sometimes', 'string', 'max:255'],
            'scope'   => ['nullable', 'string', 'max:1000'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'reason'  => ['nullable', 'string', 'max:500'],
        ]);

        $delegation->update($validated);

        return response()->json(['message' => 'Délégation mise à jour.', 'delegation' => $delegation->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        $delegation = Delegation::where('organization_id', Auth::user()->organization_id)->findOrFail($id);

        if ($delegation->status === 'active') {
            return response()->json(['message' => 'Révoquez d\'abord la délégation avant de la supprimer.'], 422);
        }

        $delegation->delete();

        return response()->json(['message' => 'Délégation supprimée.']);
    }

    public function revoke(int $id): JsonResponse
    {
        $user       = Auth::user();
        $delegation = Delegation::where('organization_id', $user->organization_id)->findOrFail($id);

        if ($delegation->status === 'revoked') {
            return response()->json(['message' => 'Délégation déjà révoquée.'], 422);
        }

        $delegation->update([
            'status'     => 'revoked',
            'revoked_at' => now(),
            'revoked_by' => $user->id,
        ]);

        return response()->json(['message' => 'Délégation révoquée.']);
    }
}
