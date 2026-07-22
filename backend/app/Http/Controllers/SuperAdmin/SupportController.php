<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * SupportController — Gestion des tickets support SuperAdmin IBIG Soft
 *
 * ACCÈS RESTREINT : middleware 'role:superadmin_ibig'
 */
class SupportController extends Controller
{
    public function __construct(private readonly AuditService $audit)
    {
        $this->middleware(['auth', 'role:superadmin_ibig']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/support
    // ─────────────────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $query = SupportTicket::with(['organization', 'assignee'])
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END")
            ->orderBy('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }
        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn ($qb) =>
                $qb->where('title', 'ilike', "%{$q}%")
                   ->orWhere('ticket_number', 'ilike', "%{$q}%")
            );
        }

        $tickets = $query->paginate(25)->through(fn ($t) => $this->formatTicket($t));

        return Inertia::render('SuperAdmin/SupportDashboard', [
            'tickets' => $tickets,
            'stats'   => $this->getStats(),
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/support/tickets/{id}
    // ─────────────────────────────────────────────────────────────────────────

    public function show(SupportTicket $ticket): JsonResponse
    {
        return response()->json($this->formatTicket($ticket->load(['organization', 'assignee'])));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/support/tickets
    // ─────────────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'organization_id'  => 'required|exists:organizations,id',
            'title'            => 'required|string|max:255',
            'category'         => 'required|in:bug,feature_request,billing,how_to,other',
            'priority'         => 'required|in:low,normal,high,urgent',
            'created_by_email' => 'required|email',
            'message'          => 'required|string',
        ]);

        $ticket = SupportTicket::create([
            'organization_id'  => $validated['organization_id'],
            'ticket_number'    => $this->generateTicketNumber(),
            'title'            => $validated['title'],
            'category'         => $validated['category'],
            'priority'         => $validated['priority'],
            'status'           => 'open',
            'created_by_email' => $validated['created_by_email'],
            'messages'         => [[
                'id'          => 1,
                'author_type' => 'client',
                'author_name' => $validated['created_by_email'],
                'content'     => $validated['message'],
                'attachments' => [],
                'created_at'  => now()->toISOString(),
            ]],
        ]);

        $this->audit->logCreated('support', 'ticket', $ticket->id, ['ticket_number' => $ticket->ticket_number]);

        return response()->json($this->formatTicket($ticket), 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT /superadmin/support/tickets/{id}
    // ─────────────────────────────────────────────────────────────────────────

    public function update(Request $request, SupportTicket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'title'    => 'sometimes|string|max:255',
            'category' => 'sometimes|in:bug,feature_request,billing,how_to,other',
            'priority' => 'sometimes|in:low,normal,high,urgent',
            'status'   => 'sometimes|in:open,in_progress,waiting_customer,resolved,closed',
        ]);

        $old = $ticket->toArray();
        $ticket->update($validated);
        $this->audit->logUpdated('support', 'ticket', $ticket->id, $old, $validated);

        return response()->json($this->formatTicket($ticket->fresh()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/support/tickets/{id}/assign
    // ─────────────────────────────────────────────────────────────────────────

    public function assign(Request $request, SupportTicket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $ticket->update([
            'assigned_to' => $validated['user_id'],
            'status'      => $ticket->status === 'open' ? 'in_progress' : $ticket->status,
        ]);

        $this->audit->log('assigned', 'support', 'ticket', $ticket->id, [], ['assigned_to' => $validated['user_id']]);

        return response()->json(['success' => true, 'ticket' => $this->formatTicket($ticket->fresh(['assignee']))]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/support/tickets/{id}/message
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Ajoute un message de réponse IBIG au thread du ticket.
     */
    public function message(Request $request, SupportTicket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'content'     => 'required|string',
            'attachments' => 'nullable|array',
        ]);

        $messages   = $ticket->messages ?? [];
        $nextId     = count($messages) + 1;
        $agentName  = Auth::user()?->name ?? 'Support IBIG Soft';

        $newMessage = [
            'id'          => $nextId,
            'author_type' => 'agent',
            'author_name' => $agentName,
            'content'     => $validated['content'],
            'attachments' => $validated['attachments'] ?? [],
            'created_at'  => now()->toISOString(),
        ];

        $messages[] = $newMessage;

        $updateData = ['messages' => $messages];

        // Premier retour
        if ($ticket->first_response_at === null) {
            $updateData['first_response_at'] = now();
        }

        // Changer le statut si toujours ouvert
        if ($ticket->status === 'open') {
            $updateData['status'] = 'in_progress';
        }

        $ticket->update($updateData);

        return response()->json(['message' => $newMessage, 'ticket' => $this->formatTicket($ticket->fresh())]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /superadmin/support/tickets/{id}/resolve
    // ─────────────────────────────────────────────────────────────────────────

    public function resolve(SupportTicket $ticket): JsonResponse
    {
        $ticket->update([
            'status'      => 'resolved',
            'resolved_at' => now(),
        ]);

        $this->audit->log('resolved', 'support', 'ticket', $ticket->id);

        return response()->json(['success' => true, 'ticket' => $this->formatTicket($ticket->fresh())]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /superadmin/support/stats
    // ─────────────────────────────────────────────────────────────────────────

    public function stats(): JsonResponse
    {
        return response()->json($this->getStats());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private function getStats(): array
    {
        $totalResolved = SupportTicket::where('status', 'resolved')
            ->whereNotNull('resolved_at')
            ->whereNotNull('created_at')
            ->get(['created_at', 'resolved_at', 'satisfaction_rating']);

        // MTTR : Mean Time To Resolve (en heures)
        $mttr = $totalResolved->count() > 0
            ? $totalResolved->avg(fn ($t) => Carbon::parse($t->created_at)->diffInHours($t->resolved_at))
            : null;

        // CSAT : Customer Satisfaction (moyenne des notes 1-5)
        $csat = $totalResolved->whereNotNull('satisfaction_rating')->count() > 0
            ? $totalResolved->whereNotNull('satisfaction_rating')->avg('satisfaction_rating')
            : null;

        return [
            'open'       => SupportTicket::whereIn('status', ['open', 'in_progress'])->count(),
            'resolved'   => SupportTicket::where('status', 'resolved')->count(),
            'this_week'  => SupportTicket::where('created_at', '>=', Carbon::now()->startOfWeek())->count(),
            'urgent'     => SupportTicket::where('priority', 'urgent')->whereNotIn('status', ['resolved', 'closed'])->count(),
            'mttr_hours' => $mttr ? round($mttr, 1) : null,
            'csat'       => $csat ? round($csat, 2) : null,
            'by_status'  => SupportTicket::selectRaw('status, COUNT(*) as cnt')
                ->groupBy('status')
                ->pluck('cnt', 'status'),
            'by_priority' => SupportTicket::selectRaw('priority, COUNT(*) as cnt')
                ->whereNotIn('status', ['resolved', 'closed'])
                ->groupBy('priority')
                ->pluck('cnt', 'priority'),
        ];
    }

    private function formatTicket(SupportTicket $ticket): array
    {
        return [
            'id'               => $ticket->id,
            'ticket_number'    => $ticket->ticket_number,
            'title'            => $ticket->title,
            'category'         => $ticket->category,
            'priority'         => $ticket->priority,
            'status'           => $ticket->status,
            'organization_id'  => $ticket->organization_id,
            'organization_name'=> $ticket->organization?->name,
            'assigned_to'      => $ticket->assigned_to,
            'assignee_name'    => $ticket->assignee?->name,
            'first_response_at'=> $ticket->first_response_at?->toDateTimeString(),
            'resolved_at'      => $ticket->resolved_at?->toDateTimeString(),
            'satisfaction_rating' => $ticket->satisfaction_rating,
            'created_by_email' => $ticket->created_by_email,
            'messages'         => $ticket->messages ?? [],
            'created_at'       => $ticket->created_at?->toDateTimeString(),
            'age_hours'        => $ticket->created_at ? $ticket->created_at->diffInHours(now()) : 0,
        ];
    }

    private function generateTicketNumber(): string
    {
        $year  = now()->year;
        $count = SupportTicket::whereYear('created_at', $year)->count() + 1;
        return sprintf('TKT-%d-%05d', $year, $count);
    }
}
