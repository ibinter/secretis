<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Prospect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

/**
 * DemoController — Gestion des demandes de démonstration SECRETIS
 *
 * Cycle de vie : pending → confirmed → completed | cancelled
 */
class DemoController extends Controller
{
    // -------------------------------------------------------------------------
    // index() — Liste des demandes de démonstration
    // -------------------------------------------------------------------------

    public function index(Request $request): Response
    {
        $query = DB::table('prospect_demos')
            ->join('prospects', 'prospect_demos.prospect_id', '=', 'prospects.id')
            ->select([
                'prospect_demos.*',
                'prospects.name as prospect_name',
                'prospects.email as prospect_email',
                'prospects.company as prospect_company',
                'prospects.phone as prospect_phone',
            ]);

        if ($request->filled('status')) {
            $query->where('prospect_demos.status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('prospect_demos.scheduled_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('prospect_demos.scheduled_at', '<=', $request->date_to);
        }

        if ($request->filled('platform')) {
            $query->where('prospect_demos.platform', $request->platform);
        }

        $demos = $query->orderBy('prospect_demos.scheduled_at', 'asc')
            ->paginate(20)
            ->appends($request->query());

        // Stats rapides
        $stats = [
            'pending'   => DB::table('prospect_demos')->where('status', 'scheduled')->count(),
            'today'     => DB::table('prospect_demos')->whereDate('scheduled_at', today())->count(),
            'this_week' => DB::table('prospect_demos')
                ->whereBetween('scheduled_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->count(),
            'completed' => DB::table('prospect_demos')->where('status', 'completed')->count(),
        ];

        return Inertia::render('SuperAdmin/Demos', [
            'demos'   => $demos,
            'stats'   => $stats,
            'filters' => $request->only(['status', 'date_from', 'date_to', 'platform']),
        ]);
    }

    // -------------------------------------------------------------------------
    // show($id) — Détail d'une démo
    // -------------------------------------------------------------------------

    public function show(int $id): JsonResponse
    {
        $demo = DB::table('prospect_demos')
            ->join('prospects', 'prospect_demos.prospect_id', '=', 'prospects.id')
            ->select('prospect_demos.*', 'prospects.name as prospect_name', 'prospects.email as prospect_email', 'prospects.company as prospect_company')
            ->where('prospect_demos.id', $id)
            ->firstOrFail();

        return response()->json(['demo' => $demo]);
    }

    // -------------------------------------------------------------------------
    // update($id) — Modifier une démo
    // -------------------------------------------------------------------------

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'scheduled_at' => 'sometimes|date',
            'duration_min' => 'sometimes|integer|in:30,45,60,90',
            'platform'     => 'sometimes|in:zoom,teams,meet,phone,in_person',
            'notes'        => 'nullable|string|max:2000',
        ]);

        DB::table('prospect_demos')->where('id', $id)->update(array_merge($validated, [
            'updated_at' => now(),
        ]));

        return response()->json(['success' => true, 'message' => 'Démo mise à jour.']);
    }

    // -------------------------------------------------------------------------
    // confirm($id) — Confirmer avec envoi email de confirmation
    // -------------------------------------------------------------------------

    public function confirm(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'scheduled_at' => 'required|date|after:now',
            'duration_min' => 'required|integer|in:30,45,60,90',
            'platform'     => 'required|in:zoom,teams,meet,phone,in_person',
            'meeting_link' => 'nullable|url|max:500',
            'notes'        => 'nullable|string|max:1000',
        ]);

        $demo = DB::table('prospect_demos')->where('id', $id)->first();
        abort_unless($demo, 404, 'Démo introuvable.');
        abort_if($demo->status === 'completed', 422, 'Démo déjà réalisée.');
        abort_if($demo->status === 'cancelled', 422, 'Démo annulée, impossible de confirmer.');

        DB::table('prospect_demos')->where('id', $id)->update(array_merge($validated, [
            'status'       => 'confirmed',
            'confirmed_at' => now(),
            'confirmed_by' => Auth::id(),
            'updated_at'   => now(),
        ]));

        // Récupérer le prospect pour l'email
        $prospect = Prospect::find($demo->prospect_id);

        if ($prospect) {
            try {
                Mail::send('emails.demo-confirmed', [
                    'prospect'     => $prospect,
                    'scheduled_at' => \Carbon\Carbon::parse($validated['scheduled_at']),
                    'duration_min' => $validated['duration_min'],
                    'platform'     => $validated['platform'],
                    'meeting_link' => $validated['meeting_link'] ?? null,
                    'notes'        => $validated['notes'] ?? null,
                ], function ($mail) use ($prospect, $validated) {
                    $mail->to($prospect->email)
                         ->subject('[SECRETIS] Confirmation de votre démonstration — '
                             . \Carbon\Carbon::parse($validated['scheduled_at'])->format('d/m/Y à H:i'));
                });
            } catch (\Throwable $e) {
                Log::warning("Demo confirmation email failed for demo {$id}", ['error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Démonstration confirmée et email envoyé au prospect.',
        ]);
    }

    // -------------------------------------------------------------------------
    // complete($id) — Marquer comme réalisée avec notes de résultat
    // -------------------------------------------------------------------------

    public function complete(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'outcome'     => 'required|in:positive,neutral,negative',
            'notes'       => 'required|string|min:10|max:3000',
            'next_action' => 'nullable|in:send_offer,follow_up,schedule_another,close_lost',
        ]);

        $demo = DB::table('prospect_demos')->where('id', $id)->first();
        abort_unless($demo, 404);
        abort_if($demo->status === 'completed', 422, 'Démo déjà marquée comme réalisée.');

        DB::transaction(function () use ($id, $demo, $validated) {
            DB::table('prospect_demos')->where('id', $id)->update([
                'status'       => 'completed',
                'completed_at' => now(),
                'completed_by' => Auth::id(),
                'outcome'      => $validated['outcome'],
                'result_notes' => $validated['notes'],
                'next_action'  => $validated['next_action'] ?? null,
                'updated_at'   => now(),
            ]);

            // Mettre à jour le statut du prospect si nécessaire
            if ($validated['next_action'] === 'close_lost') {
                Prospect::where('id', $demo->prospect_id)->update(['status' => 'lost']);
            } elseif (in_array($validated['outcome'], ['positive', 'neutral'])
                && $validated['next_action'] !== 'close_lost') {
                // Garder en demo_scheduled ou passer à l'étape suivante selon l'outcome
                if ($validated['outcome'] === 'positive') {
                    Prospect::where('id', $demo->prospect_id)
                        ->whereIn('status', ['new', 'contacted', 'demo_scheduled'])
                        ->update(['status' => 'offer_sent']);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Démonstration marquée comme réalisée.',
        ]);
    }

    // -------------------------------------------------------------------------
    // cancel($id) — Annuler avec motif
    // -------------------------------------------------------------------------

    public function cancel(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'reason'     => 'required|string|min:5|max:1000',
            'notify_prospect' => 'boolean',
        ]);

        $demo = DB::table('prospect_demos')->where('id', $id)->first();
        abort_unless($demo, 404);
        abort_if(in_array($demo->status, ['completed', 'cancelled']), 422, 'Impossible d\'annuler cette démo.');

        DB::table('prospect_demos')->where('id', $id)->update([
            'status'        => 'cancelled',
            'cancelled_at'  => now(),
            'cancelled_by'  => Auth::id(),
            'cancel_reason' => $validated['reason'],
            'updated_at'    => now(),
        ]);

        // Notifier le prospect si demandé
        if ($request->boolean('notify_prospect', true)) {
            $prospect = Prospect::find($demo->prospect_id);
            if ($prospect) {
                try {
                    Mail::send('emails.demo-cancelled', [
                        'prospect'     => $prospect,
                        'scheduled_at' => \Carbon\Carbon::parse($demo->scheduled_at),
                        'reason'       => $validated['reason'],
                    ], function ($mail) use ($prospect) {
                        $mail->to($prospect->email)
                             ->subject('[SECRETIS] Démonstration annulée — Reprogrammons ensemble');
                    });
                } catch (\Throwable $e) {
                    Log::warning("Demo cancel notification failed", ['error' => $e->getMessage()]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Démonstration annulée.' . ($request->boolean('notify_prospect', true) ? ' Le prospect a été notifié.' : ''),
        ]);
    }
}
