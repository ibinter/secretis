<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CrmProspectsController — Console SuperAdmin IBIG SECRETIS
 *
 * Toutes les routes sont protégées par middleware(['auth', 'role:superadmin_ibig'])
 * Préfixe : /superadmin/crm
 *
 * Routes :
 *   GET    /prospects                         prospects()
 *   GET    /prospects/{id}                    showProspect()
 *   POST   /prospects                         storeProspect()
 *   PUT    /prospects/{id}                    updateProspect()
 *   POST   /prospects/{id}/move-stage         moveStage()
 *   POST   /prospects/{id}/convert-to-trial   convertToTrial()
 *   POST   /prospects/{id}/interactions       logInteraction()
 *   GET    /demonstrations                    demonstrations()
 *   POST   /demonstrations                    scheduleDemo()
 *   POST   /demonstrations/{id}/confirm       confirmDemo()
 *   POST   /demonstrations/{id}/send-reminder sendDemoReminder()
 *   POST   /demonstrations/{id}/notes         recordDemoNotes()
 *   GET    /offers                            offers()
 *   POST   /offers                            createOffer()
 *   POST   /offers/{id}/send                  sendOffer()
 *   GET    /offers/{id}/pdf                   generateOfferPdf()
 *   POST   /offers/{id}/duplicate             duplicateOffer()
 *   GET    /offers/accept/{token}             acceptOffer()     [public]
 *   GET    /campaigns                         campaigns()
 *   POST   /campaigns                         createCampaign()
 *   POST   /campaigns/{id}/send               sendCampaign()
 */
class CrmProspectsController extends Controller
{
    // =========================================================================
    // PROSPECTS
    // =========================================================================

    /**
     * GET /superadmin/crm/prospects
     */
    public function prospects(Request $request): Response
    {
        $query = DB::table('prospects')
            ->whereNull('deleted_at')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(function ($sub) use ($q) {
                $sub->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('company', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->filled('country')) {
            $query->where('country', $request->country);
        }

        $prospects = $query->paginate(30)->appends($request->query());

        $kpi = [
            'new_week'        => DB::table('prospects')->where('created_at', '>=', now()->subWeek())->whereNull('deleted_at')->count(),
            'in_progress'     => DB::table('prospects')->whereNotIn('stage', ['won', 'lost'])->whereNull('deleted_at')->count(),
            'demos_scheduled' => DB::table('demonstrations')->where('status', 'scheduled')->whereNull('deleted_at')->count(),
            'converted_month' => DB::table('prospects')->where('stage', 'won')->where('converted_at', '>=', now()->startOfMonth())->whereNull('deleted_at')->count(),
        ];

        return Inertia::render('SuperAdmin/Crm/Prospects/Index', [
            'prospects' => $prospects,
            'kpi'       => $kpi,
            'filters'   => $request->only(['search', 'stage', 'assigned_to', 'country']),
        ]);
    }

    /**
     * GET /superadmin/crm/prospects/{id}
     */
    public function showProspect(int $id): Response
    {
        $prospect = DB::table('prospects')->find($id);
        abort_unless($prospect, 404);

        $interactions = DB::table('prospect_interactions')
            ->where('prospect_id', $id)
            ->orderByDesc('created_at')
            ->get();

        $this->logAudit('prospect.view', $id);

        return Inertia::render('SuperAdmin/Crm/Prospects/Show', [
            'prospect' => $prospect,
            'timeline' => $interactions,
        ]);
    }

    /**
     * POST /superadmin/crm/prospects
     */
    public function storeProspect(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name'  => 'required|string|max:100',
            'last_name'   => 'required|string|max:100',
            'company'     => 'nullable|string|max:200',
            'function'    => 'nullable|string|max:100',
            'email'       => 'nullable|email|max:200',
            'phone'       => 'nullable|string|max:30',
            'whatsapp'    => 'nullable|string|max:30',
            'country'     => 'nullable|string|max:5',
            'sector'      => 'nullable|string|max:100',
            'software'    => 'nullable|string|max:100',
            'source'      => 'nullable|string|max:50',
            'assigned_to' => 'nullable|integer|exists:users,id',
        ]);

        $id = DB::table('prospects')->insertGetId(array_merge($data, [
            'stage'      => 'new',
            'score'      => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        $this->logAudit('prospect.created', $id);

        return response()->json(['id' => $id, 'message' => 'Prospect créé.'], 201);
    }

    /**
     * PUT /superadmin/crm/prospects/{id}
     */
    public function updateProspect(int $id, Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name'   => 'sometimes|string|max:100',
            'last_name'    => 'sometimes|string|max:100',
            'company'      => 'nullable|string|max:200',
            'function'     => 'nullable|string|max:100',
            'email'        => 'nullable|email|max:200',
            'phone'        => 'nullable|string|max:30',
            'whatsapp'     => 'nullable|string|max:30',
            'country'      => 'nullable|string|max:5',
            'sector'       => 'nullable|string|max:100',
            'software'     => 'nullable|string|max:100',
            'source'       => 'nullable|string|max:50',
            'notes'        => 'nullable|string',
            'bant'         => 'nullable|array',
            'score'        => 'nullable|integer|min:0|max:100',
            'assigned_to'  => 'nullable|integer|exists:users,id',
            'next_action'  => 'nullable|string|max:255',
            'next_action_at' => 'nullable|date',
        ]);

        DB::table('prospects')->where('id', $id)->update(array_merge($data, [
            'updated_at' => now(),
        ]));

        $this->logAudit('prospect.updated', $id);

        return response()->json(['message' => 'Prospect mis à jour.']);
    }

    /**
     * POST /superadmin/crm/prospects/{id}/move-stage
     */
    public function moveStage(int $id, Request $request): JsonResponse
    {
        $request->validate(['stage' => 'required|string']);

        $prospect  = DB::table('prospects')->find($id);
        abort_unless($prospect, 404);

        $oldStage = $prospect->stage;
        $newStage = $request->stage;

        DB::table('prospects')->where('id', $id)->update([
            'stage'      => $newStage,
            'updated_at' => now(),
        ]);

        // Enregistrer l'interaction de changement de stage
        DB::table('prospect_interactions')->insert([
            'prospect_id' => $id,
            'user_id'     => Auth::id(),
            'type'        => 'stage',
            'description' => "Stage : {$oldStage} → {$newStage}",
            'metadata'    => json_encode(['from_stage' => $oldStage, 'to_stage' => $newStage]),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        if ($newStage === 'won') {
            DB::table('prospects')->where('id', $id)->update(['converted_at' => now()]);
        }

        $this->logAudit('prospect.stage_moved', $id, ['from' => $oldStage, 'to' => $newStage]);

        return response()->json(['message' => "Stage mis à jour : {$newStage}."]);
    }

    /**
     * POST /superadmin/crm/prospects/{id}/convert-to-trial
     * Crée une organisation en mode trial depuis un prospect.
     */
    public function convertToTrial(int $id, Request $request): JsonResponse
    {
        $prospect = DB::table('prospects')->find($id);
        abort_unless($prospect, 404);

        $request->validate([
            'plan'         => 'nullable|string',
            'trial_days'   => 'nullable|integer|min:1|max:90',
        ]);

        // Créer l'organisation (simplifié — le contrôleur org gère le détail)
        $orgId = DB::table('organizations')->insertGetId([
            'name'         => $prospect->company ?? "{$prospect->first_name} {$prospect->last_name}",
            'email'        => $prospect->email,
            'country'      => $prospect->country,
            'status'       => 'trial',
            'trial_ends_at' => now()->addDays($request->input('trial_days', 14)),
            'created_at'   => now(),
            'updated_at'   => now(),
        ]);

        // Marquer le prospect comme converti
        DB::table('prospects')->where('id', $id)->update([
            'organization_id' => $orgId,
            'stage'           => 'won',
            'converted_at'    => now(),
            'updated_at'      => now(),
        ]);

        DB::table('prospect_interactions')->insert([
            'prospect_id' => $id,
            'user_id'     => Auth::id(),
            'type'        => 'conversion',
            'description' => "Converti en essai gratuit — Organisation #{$orgId} créée.",
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $this->logAudit('prospect.converted_to_trial', $id, ['org_id' => $orgId]);

        return response()->json(['message' => 'Converti en essai.', 'organization_id' => $orgId], 201);
    }

    /**
     * POST /superadmin/crm/prospects/{id}/interactions
     */
    public function logInteraction(int $id, Request $request): JsonResponse
    {
        $data = $request->validate([
            'type'        => 'required|string|in:call,email,demo,offer,note,meeting',
            'description' => 'required|string|max:2000',
            'metadata'    => 'nullable|array',
        ]);

        $intId = DB::table('prospect_interactions')->insertGetId([
            'prospect_id' => $id,
            'user_id'     => Auth::id(),
            'type'        => $data['type'],
            'description' => $data['description'],
            'metadata'    => isset($data['metadata']) ? json_encode($data['metadata']) : null,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json([
            'message'     => 'Interaction enregistrée.',
            'interaction' => DB::table('prospect_interactions')->find($intId),
        ], 201);
    }

    // =========================================================================
    // DÉMONSTRATIONS
    // =========================================================================

    /**
     * GET /superadmin/crm/demonstrations
     */
    public function demonstrations(Request $request): Response
    {
        $demos = DB::table('demonstrations')
            ->whereNull('deleted_at')
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderBy('scheduled_at')
            ->get();

        return Inertia::render('SuperAdmin/Crm/Demonstrations/Index', [
            'demos' => $demos,
        ]);
    }

    /**
     * POST /superadmin/crm/demonstrations
     */
    public function scheduleDemo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'prospect_id'  => 'required|integer|exists:prospects,id',
            'software'     => 'nullable|string',
            'scheduled_at' => 'required|date|after:now',
            'timezone'     => 'nullable|string|max:50',
            'mode'         => 'nullable|string|in:visio,presentiel',
            'link'         => 'nullable|url',
            'duration_min' => 'nullable|integer|min:15|max:180',
        ]);

        $id = DB::table('demonstrations')->insertGetId(array_merge($data, [
            'agent_id'   => Auth::id(),
            'status'     => 'scheduled',
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        DB::table('prospect_interactions')->insert([
            'prospect_id' => $data['prospect_id'],
            'user_id'     => Auth::id(),
            'type'        => 'demo',
            'description' => 'Démonstration planifiée pour le ' . \Carbon\Carbon::parse($data['scheduled_at'])->format('d/m/Y à H:i'),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json(['id' => $id, 'message' => 'Démonstration planifiée.'], 201);
    }

    /**
     * POST /superadmin/crm/demonstrations/{id}/confirm
     */
    public function confirmDemo(int $id): JsonResponse
    {
        DB::table('demonstrations')->where('id', $id)->update([
            'status'       => 'confirmed',
            'confirmed_at' => now(),
            'updated_at'   => now(),
        ]);

        return response()->json(['message' => 'Démonstration confirmée.']);
    }

    /**
     * POST /superadmin/crm/demonstrations/{id}/send-reminder
     */
    public function sendDemoReminder(int $id): JsonResponse
    {
        $demo = DB::table('demonstrations')->find($id);
        abort_unless($demo, 404);

        $prospect = DB::table('prospects')->find($demo->prospect_id);

        try {
            \Illuminate\Support\Facades\Mail::send(
                'emails.demo-reminder',
                ['demo' => $demo, 'prospect' => $prospect],
                function ($mail) use ($prospect, $demo) {
                    $mail->to($prospect->email)
                         ->subject('Rappel : votre démonstration SECRETIS — ' . \Carbon\Carbon::parse($demo->scheduled_at)->format('d/m/Y à H:i'));
                }
            );
        } catch (\Throwable $e) {
            Log::warning('Demo reminder email failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Erreur envoi rappel.'], 500);
        }

        return response()->json(['message' => 'Rappel envoyé.']);
    }

    /**
     * POST /superadmin/crm/demonstrations/{id}/notes
     */
    public function recordDemoNotes(int $id, Request $request): JsonResponse
    {
        $request->validate(['notes' => 'required|string|max:5000']);

        DB::table('demonstrations')->where('id', $id)->update([
            'notes'      => $request->notes,
            'status'     => 'done',
            'done_at'    => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Compte-rendu enregistré.']);
    }

    // =========================================================================
    // OFFRES COMMERCIALES
    // =========================================================================

    /**
     * GET /superadmin/crm/offers
     */
    public function offers(Request $request): Response
    {
        $offers = DB::table('commercial_offers')
            ->whereNull('deleted_at')
            ->when($request->status, fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('created_at')
            ->paginate(20);

        return Inertia::render('SuperAdmin/Crm/Offers/Index', [
            'offers'  => $offers,
            'filters' => $request->only(['status']),
        ]);
    }

    /**
     * POST /superadmin/crm/offers
     */
    public function createOffer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'prospect_id'    => 'nullable|integer|exists:prospects,id',
            'organization_id'=> 'nullable|integer|exists:organizations,id',
            'software'       => 'nullable|string',
            'plan'           => 'nullable|string',
            'users'          => 'nullable|integer|min:1',
            'entities'       => 'nullable|integer|min:1',
            'period'         => 'nullable|string|in:monthly,yearly',
            'discount_pct'   => 'nullable|integer|min:0|max:100',
            'conditions'     => 'nullable|string',
            'valid_days'     => 'nullable|integer|min:1|max:365',
            'extras'         => 'nullable|array',
            'extras.*.desc'  => 'required_with:extras|string',
            'extras.*.unit_price' => 'required_with:extras|integer|min:0',
            'extras.*.qty'   => 'required_with:extras|integer|min:1',
            'total_ht'       => 'required|integer|min:0',
            'total_ttc'      => 'required|integer|min:0',
            'action'         => 'nullable|string|in:draft,send',
        ]);

        // Générer numéro unique
        $number = 'OFF-' . date('Y') . '-' . str_pad(
            DB::table('commercial_offers')->count() + 1,
            3, '0', STR_PAD_LEFT
        );

        $offerId = DB::table('commercial_offers')->insertGetId([
            'number'          => $number,
            'prospect_id'     => $data['prospect_id'] ?? null,
            'organization_id' => $data['organization_id'] ?? null,
            'created_by'      => Auth::id(),
            'software'        => $data['software'] ?? null,
            'plan'            => $data['plan'] ?? null,
            'users_count'     => $data['users'] ?? 1,
            'entities_count'  => $data['entities'] ?? 1,
            'period'          => $data['period'] ?? 'yearly',
            'discount_pct'    => $data['discount_pct'] ?? 0,
            'amount_ht'       => $data['total_ht'],
            'amount_ttc'      => $data['total_ttc'],
            'conditions'      => $data['conditions'] ?? null,
            'status'          => 'draft',
            'accept_token'    => Str::random(40),
            'valid_until'     => now()->addDays($data['valid_days'] ?? 30)->toDateString(),
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // Insérer les lignes supplémentaires
        foreach ($data['extras'] ?? [] as $i => $extra) {
            DB::table('commercial_offer_lines')->insert([
                'commercial_offer_id' => $offerId,
                'description'  => $extra['desc'],
                'unit_price'   => $extra['unit_price'],
                'quantity'     => $extra['qty'],
                'total'        => $extra['unit_price'] * $extra['qty'],
                'sort_order'   => $i,
                'created_at'   => now(),
                'updated_at'   => now(),
            ]);
        }

        // Envoyer si demandé
        if (($data['action'] ?? 'draft') === 'send') {
            $this->doSendOffer($offerId);
        }

        $this->logAudit('offer.created', $offerId, ['number' => $number]);

        return response()->json([
            'id'      => $offerId,
            'number'  => $number,
            'message' => 'Offre créée.',
        ], 201);
    }

    /**
     * POST /superadmin/crm/offers/{id}/send
     */
    public function sendOffer(int $id): JsonResponse
    {
        $this->doSendOffer($id);
        return response()->json(['message' => 'Offre envoyée.']);
    }

    private function doSendOffer(int $offerId): void
    {
        $offer   = DB::table('commercial_offers')->find($offerId);
        if (!$offer) return;

        $prospect = $offer->prospect_id ? DB::table('prospects')->find($offer->prospect_id) : null;
        $email    = $prospect?->email;
        if (!$email) return;

        try {
            \Illuminate\Support\Facades\Mail::send(
                'emails.commercial-offer',
                ['offer' => $offer, 'prospect' => $prospect],
                function ($mail) use ($email, $offer) {
                    $mail->to($email)->subject("Votre offre SECRETIS — {$offer->number}");
                }
            );

            DB::table('commercial_offers')->where('id', $offerId)->update([
                'status'     => 'sent',
                'sent_at'    => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Offer email failed', ['offer_id' => $offerId, 'error' => $e->getMessage()]);
        }
    }

    /**
     * GET /superadmin/crm/offers/{id}/pdf
     * Génère le PDF de l'offre.
     */
    public function generateOfferPdf(int $id): \Illuminate\Http\Response
    {
        $offer = DB::table('commercial_offers')->find($id);
        abort_unless($offer, 404);

        $lines = DB::table('commercial_offer_lines')->where('commercial_offer_id', $id)->orderBy('sort_order')->get();
        $prospect = $offer->prospect_id ? DB::table('prospects')->find($offer->prospect_id) : null;

        // Générer le PDF via la vue blade
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.commercial-offer', compact('offer', 'lines', 'prospect'));

        return $pdf->download("offre-{$offer->number}.pdf");
    }

    /**
     * POST /superadmin/crm/offers/{id}/duplicate
     */
    public function duplicateOffer(int $id): JsonResponse
    {
        $offer = DB::table('commercial_offers')->find($id);
        abort_unless($offer, 404);

        $number = 'OFF-' . date('Y') . '-' . str_pad(
            DB::table('commercial_offers')->count() + 1,
            3, '0', STR_PAD_LEFT
        );

        $newId = DB::table('commercial_offers')->insertGetId(array_merge(
            (array) $offer,
            ['id' => null, 'number' => $number, 'status' => 'draft', 'accept_token' => Str::random(40), 'sent_at' => null, 'viewed_at' => null, 'accepted_at' => null, 'refused_at' => null, 'created_at' => now(), 'updated_at' => now()]
        ));

        $lines = DB::table('commercial_offer_lines')->where('commercial_offer_id', $id)->get();
        foreach ($lines as $line) {
            DB::table('commercial_offer_lines')->insert(array_merge((array) $line, ['id' => null, 'commercial_offer_id' => $newId, 'created_at' => now(), 'updated_at' => now()]));
        }

        return response()->json(['id' => $newId, 'number' => $number, 'message' => 'Offre dupliquée.'], 201);
    }

    /**
     * GET /offers/accept/{token} — Route publique (lien signé envoyé par email)
     */
    public function acceptOffer(string $token): \Illuminate\Http\RedirectResponse
    {
        $offer = DB::table('commercial_offers')->where('accept_token', $token)->where('status', '!=', 'expired')->first();

        abort_unless($offer, 404, 'Lien expiré ou invalide.');

        DB::table('commercial_offers')->where('id', $offer->id)->update([
            'status'      => 'accepted',
            'accepted_at' => now(),
            'updated_at'  => now(),
        ]);

        $this->logAudit('offer.accepted', $offer->id, ['token' => substr($token, 0, 8) . '…']);

        return redirect('/offer-accepted?ref=' . $offer->number);
    }

    // =========================================================================
    // CAMPAGNES
    // =========================================================================

    /**
     * GET /superadmin/crm/campaigns
     */
    public function campaigns(Request $request): Response
    {
        $campaigns = DB::table('campaigns')
            ->whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->get();

        $templates = DB::table('crm_email_templates')
            ->whereNull('deleted_at')
            ->get();

        return Inertia::render('SuperAdmin/Crm/Campaigns/Index', [
            'campaigns' => $campaigns,
            'templates' => $templates,
        ]);
    }

    /**
     * POST /superadmin/crm/campaigns
     */
    public function createCampaign(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'       => 'required|string|max:255',
            'type'       => 'required|string|in:email,whatsapp',
            'target'     => 'required|string',
            'start_date' => 'required|date',
            'end_date'   => 'nullable|date|after_or_equal:start_date',
            'message_template' => 'nullable|string',
            'subject'    => 'nullable|string|max:255',
        ]);

        $id = DB::table('campaigns')->insertGetId(array_merge($data, [
            'status'     => 'draft',
            'created_by' => Auth::id(),
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        $this->logAudit('campaign.created', $id);

        return response()->json(['id' => $id, 'message' => 'Campagne créée.'], 201);
    }

    /**
     * POST /superadmin/crm/campaigns/{id}/send
     * Lance la campagne en file d'attente.
     */
    public function sendCampaign(int $id): JsonResponse
    {
        $campaign = DB::table('campaigns')->find($id);
        abort_unless($campaign, 404);
        abort_if($campaign->status === 'done', 422, 'Cette campagne est terminée.');

        DB::table('campaigns')->where('id', $id)->update([
            'status'      => 'running',
            'launched_at' => now(),
            'updated_at'  => now(),
        ]);

        // Dispatcher un job asynchrone
        dispatch(new \App\Jobs\SendCrmCampaignJob($id));

        $this->logAudit('campaign.launched', $id);

        return response()->json(['message' => 'Campagne lancée.']);
    }

    // =========================================================================
    // Audit log
    // =========================================================================

    private function logAudit(string $action, ?int $targetId = null, array $context = []): void
    {
        try {
            DB::table('audit_logs')->insert([
                'user_id'         => Auth::id(),
                'organization_id' => null,
                'action'          => $action,
                'context'         => json_encode(array_merge($context, ['target_id' => $targetId])),
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
