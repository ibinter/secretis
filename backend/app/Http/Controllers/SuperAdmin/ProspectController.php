<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Prospect;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * ProspectController — CRM Prospects IBIG SECRETIS
 *
 * Gestion complète du pipeline commercial :
 * Nouveau → Contacté → Démo planifiée → Offre envoyée → Client → Perdu
 */
class ProspectController extends Controller
{
    // Statuts valides du pipeline (ordre Kanban)
    private const STATUSES = ['new', 'contacted', 'demo_scheduled', 'offer_sent', 'won', 'lost'];

    // -------------------------------------------------------------------------
    // index() — Liste prospects avec filtres
    // -------------------------------------------------------------------------

    public function index(Request $request): Response
    {
        $query = Prospect::with(['notes' => fn ($q) => $q->latest()->limit(3), 'demos'])
            ->withCount(['notes', 'demos']);

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn ($sub) => $sub
                ->where('name', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
                ->orWhere('company', 'like', "%{$q}%")
            );
        }

        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $prospects = $query->orderByDesc('created_at')->paginate(50)->appends($request->query());

        // Statistiques pipeline
        $stats = [];
        foreach (self::STATUSES as $status) {
            $stats[$status] = Prospect::where('status', $status)->count();
        }

        return Inertia::render('SuperAdmin/Prospects', [
            'prospects' => $prospects,
            'stats'     => $stats,
            'filters'   => $request->only(['search', 'source', 'status', 'date_from', 'date_to']),
        ]);
    }

    // -------------------------------------------------------------------------
    // store() — Créer un prospect manuellement
    // -------------------------------------------------------------------------

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:255',
            'email'   => 'required|email|unique:prospects,email',
            'phone'   => 'nullable|string|max:30',
            'company' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:2',
            'source'  => 'required|in:website,referral,cold_outreach,linkedin,event,other',
            'plan_interest' => 'nullable|in:Starter,Pro,Enterprise',
            'notes'   => 'nullable|string|max:2000',
        ]);

        $prospect = DB::transaction(function () use ($validated) {
            $p = Prospect::create(array_merge($validated, [
                'status'     => 'new',
                'created_by' => Auth::id(),
            ]));

            if (!empty($validated['notes'])) {
                $p->notes()->create([
                    'content'    => $validated['notes'],
                    'created_by' => Auth::id(),
                ]);
            }

            return $p;
        });

        return response()->json([
            'success'  => true,
            'message'  => 'Prospect créé avec succès.',
            'prospect' => $prospect->load('notes'),
        ], 201);
    }

    // -------------------------------------------------------------------------
    // show($id) — Détail prospect
    // -------------------------------------------------------------------------

    public function show(int $id): JsonResponse
    {
        $prospect = Prospect::with([
            'notes.creator',
            'demos',
            'organization',
        ])->findOrFail($id);

        return response()->json(['prospect' => $prospect]);
    }

    // -------------------------------------------------------------------------
    // update($id) — Mettre à jour un prospect
    // -------------------------------------------------------------------------

    public function update(Request $request, int $id): JsonResponse
    {
        $prospect = Prospect::findOrFail($id);

        $validated = $request->validate([
            'name'          => 'sometimes|string|max:255',
            'email'         => "sometimes|email|unique:prospects,email,{$id}",
            'phone'         => 'nullable|string|max:30',
            'company'       => 'nullable|string|max:255',
            'country'       => 'nullable|string|max:2',
            'source'        => 'sometimes|in:website,referral,cold_outreach,linkedin,event,other',
            'status'        => 'sometimes|in:' . implode(',', self::STATUSES),
            'plan_interest' => 'nullable|in:Starter,Pro,Enterprise',
        ]);

        $prospect->update($validated);

        return response()->json([
            'success'  => true,
            'message'  => 'Prospect mis à jour.',
            'prospect' => $prospect->fresh(),
        ]);
    }

    // -------------------------------------------------------------------------
    // destroy($id) — Supprimer un prospect
    // -------------------------------------------------------------------------

    public function destroy(int $id): JsonResponse
    {
        $prospect = Prospect::findOrFail($id);
        $prospect->delete();

        return response()->json(['success' => true, 'message' => 'Prospect supprimé.']);
    }

    // -------------------------------------------------------------------------
    // convert($id) — Convertir un prospect en organisation cliente
    // -------------------------------------------------------------------------

    public function convert(Request $request, int $id): JsonResponse
    {
        $prospect = Prospect::findOrFail($id);

        abort_if($prospect->organization_id !== null, 422, 'Ce prospect est déjà converti.');

        $validated = $request->validate([
            'plan'   => 'required|in:Starter,Pro,Enterprise',
            'months' => 'required|integer|min:1|max:60',
        ]);

        $org = DB::transaction(function () use ($prospect, $validated) {
            // Créer l'organisation
            $org = Organization::create([
                'name'          => $prospect->company ?: $prospect->name,
                'slug'          => Str::slug($prospect->company ?: $prospect->name) . '-' . Str::random(4),
                'email'         => $prospect->email,
                'phone'         => $prospect->phone,
                'country'       => $prospect->country ?? 'CI',
                'timezone'      => 'Africa/Abidjan',
                'status'        => 'active',
                'trial_ends_at' => now()->addMonths($validated['months']),
                'settings'      => ['plan' => $validated['plan'], 'modules' => []],
            ]);

            // Créer l'utilisateur admin de l'organisation
            $tempPassword = Str::random(16);
            User::create([
                'organization_id' => $org->id,
                'name'            => $prospect->name,
                'email'           => $prospect->email,
                'password'        => Hash::make($tempPassword),
                'status'          => 'active',
            ])->assignRole('admin');

            // Lier le prospect à l'organisation
            $prospect->update([
                'status'          => 'won',
                'organization_id' => $org->id,
                'converted_at'    => now(),
            ]);

            // Envoyer email de bienvenue avec identifiants
            try {
                Mail::send('emails.welcome-new-client', [
                    'org'           => $org,
                    'prospect'      => $prospect,
                    'temp_password' => $tempPassword,
                    'plan'          => $validated['plan'],
                    'expires_at'    => now()->addMonths($validated['months'])->format('d/m/Y'),
                ], function ($mail) use ($prospect, $org) {
                    $mail->to($prospect->email)
                         ->subject("[SECRETIS] Bienvenue ! Votre espace {$org->name} est prêt");
                });
            } catch (\Throwable $e) {
                Log::warning("Welcome email failed for prospect {$prospect->id}", ['error' => $e->getMessage()]);
            }

            return $org;
        });

        return response()->json([
            'success' => true,
            'message' => "Prospect converti en organisation : {$org->name}",
            'org_id'  => $org->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // addNote($id) — Ajouter une note de suivi commercial
    // -------------------------------------------------------------------------

    public function addNote(Request $request, int $id): JsonResponse
    {
        $prospect = Prospect::findOrFail($id);

        $validated = $request->validate([
            'content' => 'required|string|min:2|max:5000',
            'type'    => 'nullable|in:call,email,meeting,other',
        ]);

        $note = $prospect->notes()->create([
            'content'    => $validated['content'],
            'type'       => $validated['type'] ?? 'other',
            'created_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Note ajoutée.',
            'note'    => $note->load('creator'),
        ], 201);
    }

    // -------------------------------------------------------------------------
    // scheduleDemo($id) — Planifier une démonstration
    // -------------------------------------------------------------------------

    public function scheduleDemo(Request $request, int $id): JsonResponse
    {
        $prospect = Prospect::findOrFail($id);

        $validated = $request->validate([
            'scheduled_at' => 'required|date|after:now',
            'duration_min' => 'required|integer|in:30,45,60,90',
            'platform'     => 'required|in:zoom,teams,meet,phone,in_person',
            'notes'        => 'nullable|string|max:1000',
        ]);

        $demo = DB::transaction(function () use ($prospect, $validated) {
            $demo = $prospect->demos()->create(array_merge($validated, [
                'status'     => 'scheduled',
                'created_by' => Auth::id(),
            ]));

            // Passer le prospect au statut "Démo planifiée"
            if (in_array($prospect->status, ['new', 'contacted'])) {
                $prospect->update(['status' => 'demo_scheduled']);
            }

            // Envoyer confirmation email au prospect
            try {
                Mail::send('emails.demo-scheduled', [
                    'prospect' => $prospect,
                    'demo'     => $demo,
                ], function ($mail) use ($prospect, $demo) {
                    $mail->to($prospect->email)
                         ->subject('[SECRETIS] Votre démonstration est confirmée — ' . \Carbon\Carbon::parse($demo->scheduled_at)->format('d/m/Y H:i'));
                });
            } catch (\Throwable $e) {
                Log::warning("Demo confirmation email failed", ['error' => $e->getMessage()]);
            }

            return $demo;
        });

        return response()->json([
            'success' => true,
            'message' => 'Démonstration planifiée avec succès.',
            'demo'    => $demo,
        ], 201);
    }

    // -------------------------------------------------------------------------
    // sendOffer($id) — Envoyer une offre personnalisée par email
    // -------------------------------------------------------------------------

    public function sendOffer(Request $request, int $id): JsonResponse
    {
        $prospect = Prospect::findOrFail($id);

        $validated = $request->validate([
            'plan'          => 'required|in:Starter,Pro,Enterprise',
            'months'        => 'required|integer|min:1|max:60',
            'price'         => 'required|numeric|min:0',
            'currency'      => 'required|in:XOF,EUR,USD',
            'discount_pct'  => 'nullable|integer|min:0|max:100',
            'valid_until'   => 'required|date|after:today',
            'message'       => 'nullable|string|max:3000',
            'features'      => 'nullable|array',
            'features.*'    => 'string|max:200',
        ]);

        try {
            Mail::send('emails.prospect-offer', array_merge($validated, [
                'prospect' => $prospect,
            ]), function ($mail) use ($prospect, $validated) {
                $mail->to($prospect->email)
                     ->subject("[SECRETIS] Votre offre personnalisée — Plan {$validated['plan']}");
            });
        } catch (\Throwable $e) {
            Log::error("Offer email failed for prospect {$prospect->id}", ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => "Erreur d'envoi email : " . $e->getMessage()], 500);
        }

        // Mettre à jour statut prospect
        if (in_array($prospect->status, ['new', 'contacted', 'demo_scheduled'])) {
            $prospect->update(['status' => 'offer_sent']);
        }

        // Enregistrer une note
        $prospect->notes()->create([
            'content'    => "Offre envoyée : Plan {$validated['plan']} — {$validated['price']} {$validated['currency']} / {$validated['months']} mois. Valide jusqu'au " . \Carbon\Carbon::parse($validated['valid_until'])->format('d/m/Y'),
            'type'       => 'email',
            'created_by' => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Offre envoyée à {$prospect->email}",
        ]);
    }
}
