<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Crm\CrmActivity;
use App\Models\Crm\CrmContact;
use App\Models\Crm\CrmDeal;
use App\Models\Crm\CrmEmailSequence;
use App\Models\Crm\CrmEmailTemplate;
use App\Models\Crm\CrmPipelineStage;
use App\Services\CrmService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * CrmController — Console SuperAdmin IBIG Soft
 *
 * Toutes les routes sont protégées par :
 *   middleware(['auth', 'superadmin'])
 *
 * Préfixe : /superadmin/crm
 *
 * Routes disponibles :
 *   GET    /pipeline               — Vue kanban pipeline
 *   GET    /forecast               — Prévisions revenus
 *   GET    /analytics              — Dashboard analytique
 *   GET    /contacts               — Liste contacts
 *   POST   /contacts               — Créer un contact
 *   GET    /contacts/{id}          — Fiche contact
 *   PUT    /contacts/{id}          — Modifier un contact
 *   DELETE /contacts/{id}          — Supprimer un contact
 *   POST   /contacts/{id}/convert  — Convertir → client SECRETIS
 *   GET    /deals                  — Liste deals
 *   POST   /deals                  — Créer un deal
 *   PUT    /deals/{id}             — Modifier un deal
 *   POST   /deals/{id}/stage       — Changer le stage
 *   GET    /activities             — Liste activités
 *   POST   /activities             — Créer une activité
 *   PUT    /activities/{id}        — Modifier une activité
 *   POST   /activities/{id}/complete — Marquer comme terminée
 *   GET    /email-templates        — Liste templates
 *   POST   /email-templates        — Créer un template
 *   PUT    /email-templates/{id}   — Modifier un template
 *   POST   /emails/send            — Envoyer un email
 *   GET    /sequences              — Liste séquences
 *   POST   /sequences              — Créer une séquence
 *   PUT    /sequences/{id}         — Modifier une séquence
 */
class CrmController extends Controller
{
    public function __construct(private CrmService $crmService)
    {
    }

    // =========================================================================
    // PIPELINE
    // =========================================================================

    /**
     * GET /superadmin/crm/pipeline
     * Retourne toutes les deals groupées par stage.
     */
    public function pipeline(Request $request): JsonResponse
    {
        $data = $this->crmService->getPipelineData();
        return response()->json($data);
    }

    /**
     * GET /superadmin/crm/forecast
     * Prévisions de revenus sur N mois.
     */
    public function forecast(Request $request): JsonResponse
    {
        $months = (int) $request->get('months', 3);
        $months = min(12, max(1, $months));

        $data = $this->crmService->getForecast($months);
        return response()->json($data);
    }

    /**
     * GET /superadmin/crm/analytics
     * Dashboard analytique complet.
     */
    public function analytics(Request $request): JsonResponse
    {
        $start = Carbon::parse($request->get('start', now()->subMonths(6)->startOfMonth()));
        $end   = Carbon::parse($request->get('end', now()->endOfMonth()));

        $data = $this->crmService->getSalesAnalytics($start, $end);
        return response()->json($data);
    }

    // =========================================================================
    // CONTACTS
    // =========================================================================

    /**
     * GET /superadmin/crm/contacts
     */
    public function contacts(Request $request): JsonResponse
    {
        $query = CrmContact::query()->with('assignedUser');

        // Filtres
        if ($type = $request->get('type')) {
            $query->where('type', $type);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($country = $request->get('country')) {
            $query->where('country', $country);
        }
        if ($assignedTo = $request->get('assigned_to')) {
            $query->where('assigned_to', $assignedTo);
        }
        if ($source = $request->get('source')) {
            $query->where('source', $source);
        }
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'LIKE', "%{$search}%")
                  ->orWhere('contact_name', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        $contacts = $query
            ->withCount('deals')
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($contacts);
    }

    /**
     * POST /superadmin/crm/contacts
     */
    public function storeContact(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type'           => ['required', Rule::in(['prospect', 'client', 'partner', 'lead'])],
            'company_name'   => ['required', 'string', 'max:255'],
            'contact_name'   => ['required', 'string', 'max:255'],
            'email'          => ['required', 'email', 'unique:crm_contacts,email'],
            'phone'          => ['nullable', 'string', 'max:30'],
            'country'        => ['nullable', 'string', 'size:2'],
            'city'           => ['nullable', 'string', 'max:100'],
            'sector'         => ['nullable', 'string', 'max:100'],
            'employee_count' => ['nullable', 'integer', 'min:1'],
            'annual_revenue' => ['nullable', 'integer', 'min:0'],
            'source'         => ['nullable', Rule::in(['web', 'referral', 'partner', 'event', 'cold', 'social', 'inbound'])],
            'notes'          => ['nullable', 'string'],
            'assigned_to'    => ['nullable', 'integer', 'exists:users,id'],
            'tags'           => ['nullable', 'array'],
        ]);

        $validated['status']      = 'new';
        $validated['assigned_to'] = $validated['assigned_to'] ?? Auth::id();

        $contact = CrmContact::create($validated);

        // Calculer le score BANT initial
        $score = $this->crmService->qualifyLead($contact);
        $contact->update(['bant_score' => $score]);

        return response()->json($contact->fresh(), 201);
    }

    /**
     * GET /superadmin/crm/contacts/{id}
     */
    public function showContact(int $id): JsonResponse
    {
        $contact = CrmContact::with([
            'deals.stage',
            'activities' => fn($q) => $q->orderByDesc('created_at')->limit(50),
            'emailLogs'  => fn($q) => $q->orderByDesc('sent_at')->limit(20),
            'assignedUser',
        ])->findOrFail($id);

        return response()->json($contact);
    }

    /**
     * PUT /superadmin/crm/contacts/{id}
     */
    public function updateContact(Request $request, int $id): JsonResponse
    {
        $contact = CrmContact::findOrFail($id);

        $validated = $request->validate([
            'type'           => [Rule::in(['prospect', 'client', 'partner', 'lead'])],
            'company_name'   => ['string', 'max:255'],
            'contact_name'   => ['string', 'max:255'],
            'email'          => ['email', Rule::unique('crm_contacts', 'email')->ignore($id)],
            'phone'          => ['nullable', 'string', 'max:30'],
            'country'        => ['nullable', 'string', 'size:2'],
            'city'           => ['nullable', 'string', 'max:100'],
            'sector'         => ['nullable', 'string', 'max:100'],
            'employee_count' => ['nullable', 'integer', 'min:1'],
            'annual_revenue' => ['nullable', 'integer', 'min:0'],
            'source'         => ['nullable', Rule::in(['web', 'referral', 'partner', 'event', 'cold', 'social', 'inbound'])],
            'status'         => ['nullable', Rule::in(['new', 'contacted', 'qualified', 'demo', 'proposal', 'negotiation', 'won', 'lost', 'inactive'])],
            'notes'          => ['nullable', 'string'],
            'assigned_to'    => ['nullable', 'integer', 'exists:users,id'],
            'tags'           => ['nullable', 'array'],
        ]);

        $contact->update($validated);

        // Recalculer BANT
        $score = $this->crmService->qualifyLead($contact->fresh());
        $contact->update(['bant_score' => $score]);

        return response()->json($contact->fresh());
    }

    /**
     * DELETE /superadmin/crm/contacts/{id}
     */
    public function destroyContact(int $id): JsonResponse
    {
        $contact = CrmContact::findOrFail($id);
        $contact->delete();

        return response()->json(['message' => 'Contact supprimé.']);
    }

    /**
     * POST /superadmin/crm/contacts/{id}/convert
     * Convertit un prospect CRM en organisation SECRETIS.
     */
    public function convertContact(Request $request, int $id): JsonResponse
    {
        $contact = CrmContact::findOrFail($id);

        $validated = $request->validate([
            'timezone' => ['nullable', 'string', 'timezone'],
        ]);

        $organization = $this->crmService->convertToClient($contact, $validated);

        return response()->json([
            'message'      => "Contact converti en client. Organisation #{$organization->id} créée.",
            'organization' => $organization,
        ], 201);
    }

    // =========================================================================
    // DEALS
    // =========================================================================

    /**
     * GET /superadmin/crm/deals
     */
    public function deals(Request $request): JsonResponse
    {
        $query = CrmDeal::with('contact', 'stage', 'assignedUser');

        if ($stageId = $request->get('stage_id')) {
            $query->where('stage_id', $stageId);
        }
        if ($plan = $request->get('plan')) {
            $query->where('plan', $plan);
        }
        if ($assignedTo = $request->get('assigned_to')) {
            $query->where('assigned_to', $assignedTo);
        }

        $deals = $query->orderByDesc('value')->paginate(50);
        return response()->json($deals);
    }

    /**
     * POST /superadmin/crm/deals
     */
    public function storeDeal(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'contact_id'          => ['required', 'integer', 'exists:crm_contacts,id'],
            'stage_id'            => ['nullable', 'integer', 'exists:crm_pipeline_stages,id'],
            'title'               => ['required', 'string', 'max:255'],
            'value'               => ['required', 'integer', 'min:0'],
            'currency'            => ['nullable', 'string', 'size:3'],
            'plan'                => ['nullable', Rule::in(['starter', 'pro', 'enterprise'])],
            'users_count'         => ['nullable', 'integer', 'min:1'],
            'close_date_expected' => ['nullable', 'date'],
            'probability'         => ['nullable', 'integer', 'min:0', 'max:100'],
            'notes'               => ['nullable', 'string'],
            'assigned_to'         => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $validated['assigned_to'] = $validated['assigned_to'] ?? Auth::id();

        $deal = $this->crmService->createDeal($validated);

        return response()->json($deal, 201);
    }

    /**
     * PUT /superadmin/crm/deals/{id}
     */
    public function updateDeal(Request $request, int $id): JsonResponse
    {
        $deal = CrmDeal::findOrFail($id);

        $validated = $request->validate([
            'title'               => ['string', 'max:255'],
            'value'               => ['integer', 'min:0'],
            'plan'                => ['nullable', Rule::in(['starter', 'pro', 'enterprise'])],
            'users_count'         => ['nullable', 'integer', 'min:1'],
            'close_date_expected' => ['nullable', 'date'],
            'probability'         => ['nullable', 'integer', 'min:0', 'max:100'],
            'lost_reason'         => ['nullable', 'string', 'max:500'],
            'notes'               => ['nullable', 'string'],
            'assigned_to'         => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $deal->update($validated);

        return response()->json($deal->fresh(['contact', 'stage']));
    }

    /**
     * POST /superadmin/crm/deals/{id}/stage
     * Change le stage d'un deal.
     */
    public function moveDealStage(Request $request, int $id): JsonResponse
    {
        $deal = CrmDeal::with('stage', 'contact')->findOrFail($id);

        $request->validate([
            'stage_id'    => ['required', 'integer', 'exists:crm_pipeline_stages,id'],
            'lost_reason' => ['nullable', 'string', 'max:500'],
        ]);

        if ($request->filled('lost_reason')) {
            $deal->update(['lost_reason' => $request->input('lost_reason')]);
        }

        $this->crmService->moveDeal($deal, $request->integer('stage_id'));

        return response()->json([
            'message' => 'Stage mis à jour.',
            'deal'    => $deal->fresh(['stage', 'contact']),
        ]);
    }

    // =========================================================================
    // ACTIVITÉS
    // =========================================================================

    /**
     * GET /superadmin/crm/activities
     */
    public function activities(Request $request): JsonResponse
    {
        $query = CrmActivity::with('contact', 'deal');

        if ($contactId = $request->get('contact_id')) {
            $query->where('contact_id', $contactId);
        }
        if ($type = $request->get('type')) {
            $query->where('type', $type);
        }
        if ($request->boolean('pending')) {
            $query->whereNull('completed_at');
        }
        if ($request->boolean('today')) {
            $query->whereDate('scheduled_at', today());
        }

        $activities = $query->orderByDesc('created_at')->paginate(50);
        return response()->json($activities);
    }

    /**
     * POST /superadmin/crm/activities
     */
    public function storeActivity(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'contact_id'   => ['required', 'integer', 'exists:crm_contacts,id'],
            'deal_id'      => ['nullable', 'integer', 'exists:crm_deals,id'],
            'type'         => ['required', Rule::in(['call', 'email', 'meeting', 'demo', 'proposal', 'follow_up', 'note', 'task'])],
            'subject'      => ['required', 'string', 'max:255'],
            'notes'        => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'outcome'      => ['nullable', 'string', 'max:500'],
        ]);

        $validated['created_by'] = Auth::id();

        $activity = CrmActivity::create($validated);

        // Mettre à jour last_contact_at du contact
        CrmContact::where('id', $validated['contact_id'])
            ->update(['last_contact_at' => now()]);

        return response()->json($activity->load('contact', 'deal'), 201);
    }

    /**
     * PUT /superadmin/crm/activities/{id}
     */
    public function updateActivity(Request $request, int $id): JsonResponse
    {
        $activity = CrmActivity::findOrFail($id);

        $validated = $request->validate([
            'type'         => [Rule::in(['call', 'email', 'meeting', 'demo', 'proposal', 'follow_up', 'note', 'task'])],
            'subject'      => ['string', 'max:255'],
            'notes'        => ['nullable', 'string'],
            'scheduled_at' => ['nullable', 'date'],
            'outcome'      => ['nullable', 'string', 'max:500'],
        ]);

        $activity->update($validated);
        return response()->json($activity->fresh());
    }

    /**
     * POST /superadmin/crm/activities/{id}/complete
     */
    public function completeActivity(Request $request, int $id): JsonResponse
    {
        $activity = CrmActivity::findOrFail($id);

        $activity->update([
            'completed_at' => now(),
            'outcome'      => $request->input('outcome', $activity->outcome),
        ]);

        return response()->json(['message' => 'Activité marquée comme terminée.', 'activity' => $activity->fresh()]);
    }

    // =========================================================================
    // EMAIL TEMPLATES
    // =========================================================================

    /**
     * GET /superadmin/crm/email-templates
     */
    public function emailTemplates(Request $request): JsonResponse
    {
        $query = CrmEmailTemplate::query();

        if ($category = $request->get('category')) {
            $query->where('category', $category);
        }

        $templates = $query->withCount([
            'emailLogs',
            'emailLogs as opened_count' => fn($q) => $q->whereNotNull('opened_at'),
        ])->orderByDesc('created_at')->get();

        return response()->json($templates);
    }

    /**
     * POST /superadmin/crm/email-templates
     */
    public function storeEmailTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'      => ['required', 'string', 'max:255'],
            'subject'   => ['required', 'string', 'max:255'],
            'body_html' => ['required', 'string'],
            'body_text' => ['nullable', 'string'],
            'category'  => ['required', Rule::in(['outreach', 'follow_up', 'demo', 'proposal', 'onboarding', 'churn_prevention'])],
            'variables' => ['nullable', 'array'],
        ]);

        $validated['created_by'] = Auth::id();

        $template = CrmEmailTemplate::create($validated);
        return response()->json($template, 201);
    }

    /**
     * PUT /superadmin/crm/email-templates/{id}
     */
    public function updateEmailTemplate(Request $request, int $id): JsonResponse
    {
        $template = CrmEmailTemplate::findOrFail($id);

        $validated = $request->validate([
            'name'      => ['string', 'max:255'],
            'subject'   => ['string', 'max:255'],
            'body_html' => ['string'],
            'body_text' => ['nullable', 'string'],
            'category'  => [Rule::in(['outreach', 'follow_up', 'demo', 'proposal', 'onboarding', 'churn_prevention'])],
            'variables' => ['nullable', 'array'],
            'is_active' => ['boolean'],
        ]);

        $template->update($validated);
        return response()->json($template->fresh());
    }

    /**
     * POST /superadmin/crm/emails/send
     * Envoie un email de template à un contact.
     */
    public function sendEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'contact_id'  => ['required', 'integer', 'exists:crm_contacts,id'],
            'template_id' => ['required', 'integer', 'exists:crm_email_templates,id'],
            'variables'   => ['nullable', 'array'],
        ]);

        $contact = CrmContact::findOrFail($validated['contact_id']);

        $this->crmService->sendEmailFromTemplate(
            $contact,
            $validated['template_id'],
            $validated['variables'] ?? []
        );

        return response()->json(['message' => "Email envoyé à {$contact->email}."]);
    }

    // =========================================================================
    // SÉQUENCES
    // =========================================================================

    /**
     * GET /superadmin/crm/sequences
     */
    public function sequences(): JsonResponse
    {
        $sequences = CrmEmailSequence::with('steps')->orderByDesc('created_at')->get();
        return response()->json($sequences);
    }

    /**
     * POST /superadmin/crm/sequences
     */
    public function storeSequence(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'trigger'          => ['required', Rule::in(['manual', 'deal_stage_change', 'trial_start', 'trial_expiry', 'demo_done', 'proposal_sent'])],
            'trigger_stage_id' => ['nullable', 'integer', 'exists:crm_pipeline_stages,id'],
            'steps'            => ['required', 'array', 'min:1'],
            'steps.*.delay_days'  => ['required', 'integer', 'min:0'],
            'steps.*.template_id' => ['required', 'integer', 'exists:crm_email_templates,id'],
            'is_active'        => ['boolean'],
        ]);

        $sequence = CrmEmailSequence::create($validated);
        return response()->json($sequence, 201);
    }

    /**
     * PUT /superadmin/crm/sequences/{id}
     */
    public function updateSequence(Request $request, int $id): JsonResponse
    {
        $sequence = CrmEmailSequence::findOrFail($id);

        $validated = $request->validate([
            'name'             => ['string', 'max:255'],
            'trigger'          => [Rule::in(['manual', 'deal_stage_change', 'trial_start', 'trial_expiry', 'demo_done', 'proposal_sent'])],
            'trigger_stage_id' => ['nullable', 'integer', 'exists:crm_pipeline_stages,id'],
            'steps'            => ['array', 'min:1'],
            'steps.*.delay_days'  => ['integer', 'min:0'],
            'steps.*.template_id' => ['integer', 'exists:crm_email_templates,id'],
            'is_active'        => ['boolean'],
        ]);

        $sequence->update($validated);
        return response()->json($sequence->fresh());
    }

    // =========================================================================
    // PIPELINE STAGES
    // =========================================================================

    /**
     * GET /superadmin/crm/stages
     */
    public function stages(): JsonResponse
    {
        $stages = CrmPipelineStage::orderBy('order')->get();
        return response()->json($stages);
    }
}
