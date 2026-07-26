<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\TicketMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SupportController extends Controller
{
    public function index(Request $request): Response
    {
        $tickets = SupportTicket::with('user:id,name,email')
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('SuperAdmin/Support/Tickets/Index', [
            'tickets' => $tickets,
            'sla'     => [
                'open'     => SupportTicket::whereIn('status', ['open', 'pending'])->count(),
                'resolved' => SupportTicket::where('status', 'resolved')->count(),
            ],
        ]);
    }

    public function showInertia(SupportTicket $ticket): Response
    {
        $ticket->load(['user:id,name,email', 'messages.user:id,name']);
        return Inertia::render('SuperAdmin/Support/Tickets/Show', ['ticket' => $ticket]);
    }

    public function reply(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $request->validate(['message' => 'required|string']);
        TicketMessage::create([
            'support_ticket_id' => $ticket->id,
            'user_id'           => Auth::id(),
            'message'           => $request->input('message'),
            'is_staff'          => true,
        ]);
        $ticket->update(['status' => 'pending']);
        return back()->with('success', 'Réponse envoyée.');
    }

    public function message(Request $request, SupportTicket $ticket): RedirectResponse
    {
        return $this->reply($request, $ticket);
    }

    public function updateStatus(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $status = $request->validate(['status' => 'required|string'])['status'];
        $data = ['status' => $status];
        if ($status === 'resolved') $data['resolved_at'] = now();
        $ticket->update($data);
        return back()->with('success', 'Statut mis à jour.');
    }

    public function update(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $ticket->update($request->only(['priority', 'category', 'subject', 'status']));
        return back()->with('success', 'Ticket mis à jour.');
    }

    public function assign(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $ticket->update(['assigned_to' => $request->input('user_id', Auth::id())]);
        return back()->with('success', 'Ticket assigné.');
    }
}
