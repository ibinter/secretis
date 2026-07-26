<?php

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\TicketMessage;
use App\Notifications\TicketReplyNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * TicketController — Gestion des tickets de support (côté client)
 *
 * Toutes les actions sont scopées sur l'organisation de l'utilisateur.
 */
class TicketController extends Controller
{
    /** MIME autorisés pour les pièces jointes */
    private const ALLOWED_MIMES = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
    ];

    // -------------------------------------------------------------------------
    // Liste des tickets de l'organisation
    // -------------------------------------------------------------------------

    public function index(Request $request): Response
    {
        $user  = Auth::user();
        $orgId = $user->organization_id;

        $query = SupportTicket::forOrganization($orgId)
            ->with(['user', 'assignedTo'])
            ->latest();

        // Filtres
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
        }
        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        // Si non-admin org : seulement ses propres tickets
        if (! $user->hasRole(['admin', 'super-admin'])) {
            $query->where('user_id', $user->id);
        }

        $tickets = $query->paginate(20)->through(fn (SupportTicket $t) => $this->mapTicket($t));

        return Inertia::render('Support/Tickets/Index', [
            'tickets' => $tickets,
            'filters' => $request->only(['status', 'priority', 'category', 'date_from', 'date_to']),
            'isAdmin' => $user->hasRole(['admin', 'super-admin']),
            'stats'   => [
                'open'       => SupportTicket::forOrganization($orgId)->where('status', 'open')->count(),
                'in_progress'=> SupportTicket::forOrganization($orgId)->where('status', 'in_progress')->count(),
                'resolved'   => SupportTicket::forOrganization($orgId)->whereIn('status', ['resolved', 'closed'])->count(),
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Formulaire de création
    // -------------------------------------------------------------------------

    public function create(): Response
    {
        return Inertia::render('Support/Tickets/Create', [
            'categories' => [
                ['value' => 'technical',       'label' => 'Problème technique'],
                ['value' => 'billing',         'label' => 'Facturation & Abonnement'],
                ['value' => 'feature_request', 'label' => 'Demande de fonctionnalité'],
                ['value' => 'training',        'label' => 'Formation & Utilisation'],
                ['value' => 'other',           'label' => 'Autre'],
            ],
            'priorities' => [
                ['value' => 'low',    'label' => 'Faible',   'description' => 'Pas urgent'],
                ['value' => 'medium', 'label' => 'Moyen',    'description' => 'Dans les 48h'],
                ['value' => 'high',   'label' => 'Élevé',    'description' => 'Dans les 24h'],
                ['value' => 'urgent', 'label' => 'Urgent',   'description' => 'Bloquant'],
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Création du ticket
    // -------------------------------------------------------------------------

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'subject'     => 'required|string|max:255',
            'category'    => 'required|in:technical,billing,feature_request,training,other',
            'priority'    => 'required|in:low,medium,high,urgent',
            'message'     => 'required|string|min:20|max:10000',
            'attachments' => 'nullable|array|max:3',
            'attachments.*' => 'file|max:5120|mimes:pdf,png,jpg,jpeg,docx,doc',
        ]);

        $user = Auth::user();

        $ticket = SupportTicket::create([
            'organization_id' => $user->organization_id,
            'user_id'         => $user->id,
            'subject'         => $validated['subject'],
            'category'        => $validated['category'],
            'priority'        => $validated['priority'],
            'metadata'        => [
                'user_agent'    => $request->userAgent(),
                'ip'            => $request->ip(),
                'created_from'  => 'web',
            ],
        ]);

        // Premier message
        $attachments = $this->handleAttachments($request, $ticket->id);

        TicketMessage::create([
            'ticket_id'   => $ticket->id,
            'user_id'     => $user->id,
            'message'     => $validated['message'],
            'attachments' => $attachments,
        ]);

        return redirect()->route('support.tickets.show', $ticket)
            ->with('success', "Ticket {$ticket->ticket_number} créé. Notre équipe vous répondra sous 24-48h.");
    }

    // -------------------------------------------------------------------------
    // Affichage d'un ticket
    // -------------------------------------------------------------------------

    public function show(SupportTicket $ticket): Response
    {
        $this->authorizeTicket($ticket);

        $user = Auth::user();
        $isSuperAdmin = $user->hasRole('super-admin');

        $messages = $ticket->messages()
            ->with('user')
            ->when(! $isSuperAdmin, fn ($q) => $q->where('is_internal', false))
            ->get()
            ->map(fn (TicketMessage $m) => [
                'id'          => $m->id,
                'message'     => $m->message,
                'is_internal' => $m->is_internal,
                'is_auto_reply'=> $m->is_auto_reply,
                'attachments' => $m->attachments ?? [],
                'created_at'  => $m->created_at->toISOString(),
                'user'        => [
                    'id'     => $m->user->id,
                    'name'   => $m->user->name,
                    'avatar' => $m->user->avatar ?? null,
                    'is_me'  => $m->user->id === $user->id,
                    'role'   => $m->user->hasRole('super-admin') ? 'support' : 'client',
                ],
            ]);

        return Inertia::render('Support/Tickets/Show', [
            'ticket'   => $this->mapTicketFull($ticket),
            'messages' => $messages,
            'canClose' => in_array($ticket->status, ['open', 'in_progress', 'waiting_client']),
            'canRate'  => $ticket->status === 'resolved' && $ticket->satisfaction_rating === null,
        ]);
    }

    // -------------------------------------------------------------------------
    // Ajouter un message au ticket
    // -------------------------------------------------------------------------

    public function addMessage(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $this->authorizeTicket($ticket);

        abort_if(in_array($ticket->status, ['closed']), 403, 'Ce ticket est clôturé.');

        $validated = $request->validate([
            'message'       => 'required|string|min:1|max:10000',
            'attachments'   => 'nullable|array|max:3',
            'attachments.*' => 'file|max:5120|mimes:pdf,png,jpg,jpeg,docx,doc',
        ]);

        $user        = Auth::user();
        $attachments = $this->handleAttachments($request, $ticket->id);

        $message = TicketMessage::create([
            'ticket_id'   => $ticket->id,
            'user_id'     => $user->id,
            'message'     => $validated['message'],
            'attachments' => $attachments,
        ]);

        // Remettre en open si le client répond après waiting_client
        if ($ticket->status === 'waiting_client') {
            $ticket->update(['status' => 'in_progress']);
        }

        // Notifier l'agent assigné si différent du demandeur
        if ($ticket->assigned_to && $ticket->assigned_to !== $user->id) {
            $ticket->assignedTo?->notify(
                new TicketReplyNotification($ticket, $message, $user)
            );
        }

        return redirect()->route('support.tickets.show', $ticket)
            ->with('success', 'Message envoyé.');
    }

    // -------------------------------------------------------------------------
    // Clôturer un ticket
    // -------------------------------------------------------------------------

    public function close(SupportTicket $ticket): RedirectResponse
    {
        $this->authorizeTicket($ticket);

        abort_unless(
            in_array($ticket->status, ['open', 'in_progress', 'waiting_client', 'resolved']),
            422,
            'Ce ticket ne peut pas être clôturé dans son état actuel.'
        );

        $ticket->update([
            'status'    => 'closed',
            'closed_at' => now(),
        ]);

        return redirect()->route('support.tickets.show', $ticket)
            ->with('success', 'Ticket clôturé.');
    }

    // -------------------------------------------------------------------------
    // Évaluation de satisfaction
    // -------------------------------------------------------------------------

    public function rate(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $this->authorizeTicket($ticket);

        abort_unless($ticket->status === 'resolved', 422, 'Seuls les tickets résolus peuvent être évalués.');
        abort_if($ticket->satisfaction_rating !== null, 422, 'Ce ticket a déjà été évalué.');

        $validated = $request->validate([
            'rating'  => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $ticket->update([
            'satisfaction_rating'  => $validated['rating'],
            'satisfaction_comment' => $validated['comment'] ?? null,
        ]);

        return redirect()->route('support.tickets.show', $ticket)
            ->with('success', 'Merci pour votre évaluation !');
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    /** Vérification d'accès : l'utilisateur doit appartenir à l'org du ticket */
    private function authorizeTicket(SupportTicket $ticket): void
    {
        $user = Auth::user();

        if ($user->hasRole('super-admin')) {
            return;
        }

        abort_unless(
            $ticket->organization_id === $user->organization_id,
            403,
            'Accès refusé.'
        );

        // Un utilisateur normal ne voit que ses propres tickets (sauf admin org)
        if (! $user->hasRole('admin')) {
            abort_unless($ticket->user_id === $user->id, 403, 'Accès refusé.');
        }
    }

    /** Traite les pièces jointes et les stocke de façon privée */
    private function handleAttachments(Request $request, int $ticketId): array
    {
        if (! $request->hasFile('attachments')) {
            return [];
        }

        $result = [];
        foreach ($request->file('attachments') as $file) {
            // Vérification MIME supplémentaire
            if (! in_array($file->getMimeType(), self::ALLOWED_MIMES)) {
                continue;
            }

            $path = $file->store("support/tickets/{$ticketId}", 'private');

            $result[] = [
                'name' => $file->getClientOriginalName(),
                'path' => $path,
                'size' => $file->getSize(),
                'mime' => $file->getMimeType(),
            ];
        }

        return $result;
    }

    private function mapTicket(SupportTicket $t): array
    {
        return [
            'id'            => $t->id,
            'ticket_number' => $t->ticket_number,
            'subject'       => $t->subject,
            'status'        => $t->status,
            'priority'      => $t->priority,
            'category'      => $t->category,
            'created_at'    => $t->created_at->toISOString(),
            'assigned_to'   => $t->assignedTo ? ['name' => $t->assignedTo->name] : null,
            'is_overdue'    => $t->is_overdue,
        ];
    }

    private function mapTicketFull(SupportTicket $t): array
    {
        return array_merge($this->mapTicket($t), [
            'resolved_at'         => $t->resolved_at?->toISOString(),
            'closed_at'           => $t->closed_at?->toISOString(),
            'first_response_at'   => $t->first_response_at?->toISOString(),
            'satisfaction_rating' => $t->satisfaction_rating,
            'satisfaction_comment'=> $t->satisfaction_comment,
            'user'                => [
                'id'   => $t->user->id,
                'name' => $t->user->name,
            ],
        ]);
    }
}
