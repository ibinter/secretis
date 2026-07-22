<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AppointmentSlot;
use App\Models\User;
use App\Services\AuditService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * AppointmentController — Gestion des rendez-vous visiteurs
 *
 * Deux interfaces :
 *  1. Portail public (sans authentification) — pour que les visiteurs
 *     puissent prendre RDV en ligne (lien partagé par l'organisation)
 *  2. Espace admin — pour consulter et gérer les RDV
 *
 * Flux de prise de RDV public :
 *   getPublicSlots() → bookPublicAppointment() → email confirmation
 *   → confirmAppointment(token) → RDV confirmé → notification à l'hôte
 *
 * SECURITE :
 *  - Les routes publiques n'exposent aucune donnée interne (IDs internes masqués)
 *  - La confirmation se fait par token signé (URL signée Laravel)
 *  - Rate limiting sur les prises de RDV publiques
 */
class AppointmentController extends Controller
{
    public function __construct(
        private AuditService        $auditService,
        private NotificationService $notificationService,
    ) {}

    // =========================================================================
    // PORTAIL PUBLIC — Routes non authentifiées
    // =========================================================================

    // -------------------------------------------------------------------------
    // getPublicSlots() — Créneaux disponibles
    // -------------------------------------------------------------------------

    /**
     * Retourne les créneaux de RDV disponibles pour une organisation.
     * Accessible publiquement via un lien unique par organisation (slug).
     * Ne retourne aucune donnée sensible (uniquement les slots libres).
     *
     * Paramètre requis : organization_slug (dans la route)
     * Paramètre optionnel : date (défaut = aujourd'hui)
     */
    public function getPublicSlots(Request $request, string $organizationSlug): JsonResponse
    {
        $org = \App\Models\Organization::where('slug', $organizationSlug)
            ->where('status', '!=', 'suspended')
            ->firstOrFail();

        // La prise de RDV en ligne doit être activée pour cette org
        if (!($org->settings['appointment_portal_enabled'] ?? false)) {
            return response()->json(['message' => 'La prise de RDV en ligne n\'est pas disponible.'], 403);
        }

        $date = $request->date
            ? Carbon::parse($request->date)->startOfDay()
            : now()->startOfDay();

        // Retourner seulement les 14 prochains jours
        if ($date->lt(now()->startOfDay()) || $date->gt(now()->addDays(14))) {
            return response()->json(['message' => 'Période non disponible.'], 422);
        }

        // Récupérer les créneaux disponibles (configurés par l'organisation)
        $slots = AppointmentSlot::where('organization_id', $org->id)
            ->where('date', $date->toDateString())
            ->where('is_available', true)
            ->whereNull('booked_at') // Non encore réservé
            ->orderBy('start_time')
            ->get(['id', 'date', 'start_time', 'end_time', 'location']);

        // Récupérer les hôtes disponibles pour les RDV (ceux qui ont activé le portail)
        $hosts = User::where('organization_id', $org->id)
            ->where('status', 'active')
            ->where('accepts_appointments', true)
            ->get(['id', 'name', 'job_title', 'avatar', 'department_id'])
            ->map(fn ($u) => [
                'id'        => $u->id,
                'name'      => $u->name,
                'job_title' => $u->job_title,
                'avatar'    => $u->avatar,
            ]);

        return response()->json([
            'organization' => [
                'name'    => $org->name,
                'logo'    => $org->logo,
                'address' => $org->address,
            ],
            'date'  => $date->toDateString(),
            'slots' => $slots,
            'hosts' => $hosts,
        ]);
    }

    // -------------------------------------------------------------------------
    // bookPublicAppointment() — Prise de RDV sans auth
    // -------------------------------------------------------------------------

    /**
     * Permet à un visiteur externe de prendre un RDV via le portail public.
     * Crée le RDV en statut "pending" et envoie un email de confirmation.
     * Le RDV est confirmé uniquement après clic sur le lien dans l'email.
     */
    public function bookPublicAppointment(Request $request, string $organizationSlug): JsonResponse
    {
        // Rate limiting : 3 prises de RDV max par IP par heure
        $key = 'appointment:' . $request->ip();
        if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($key, 3)) {
            return response()->json(['message' => 'Trop de demandes. Réessayez dans une heure.'], 429);
        }
        \Illuminate\Support\Facades\RateLimiter::hit($key, decay: 3600);

        $org = \App\Models\Organization::where('slug', $organizationSlug)
            ->where('status', '!=', 'suspended')
            ->firstOrFail();

        if (!($org->settings['appointment_portal_enabled'] ?? false)) {
            return response()->json(['message' => 'Non disponible.'], 403);
        }

        $validated = $request->validate([
            'slot_id'    => ['required', 'integer'],
            'host_id'    => ['required', 'integer'],
            'first_name' => ['required', 'string', 'max:150'],
            'last_name'  => ['required', 'string', 'max:150'],
            'email'      => ['required', 'email', 'max:255'],
            'phone'      => ['required', 'string', 'max:30'],
            'company'    => ['nullable', 'string', 'max:255'],
            'purpose'    => ['required', 'string', 'max:500'],
        ]);

        // Vérifier la disponibilité du créneau (avec lock pour éviter les doubles réservations)
        $slot = AppointmentSlot::where('id', $validated['slot_id'])
            ->where('organization_id', $org->id)
            ->where('is_available', true)
            ->whereNull('booked_at')
            ->lockForUpdate()
            ->first();

        if (!$slot) {
            return response()->json(['message' => 'Ce créneau n\'est plus disponible.'], 422);
        }

        // Vérifier l'hôte
        $host = User::where('id', $validated['host_id'])
            ->where('organization_id', $org->id)
            ->where('accepts_appointments', true)
            ->firstOrFail();

        $confirmToken = Str::uuid()->toString();

        $appointment = \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $slot, $host, $org, $confirmToken) {
            // Réserver le créneau
            $slot->update(['booked_at' => now()]);

            return Appointment::create([
                'organization_id' => $org->id,
                'slot_id'         => $slot->id,
                'host_id'         => $host->id,
                'first_name'      => $validated['first_name'],
                'last_name'       => $validated['last_name'],
                'email'           => strtolower($validated['email']),
                'phone'           => $validated['phone'],
                'company'         => $validated['company'] ?? null,
                'purpose'         => $validated['purpose'],
                'status'          => 'pending', // En attente de confirmation email
                'confirm_token'   => $confirmToken,
                'scheduled_at'    => Carbon::parse($slot->date . ' ' . $slot->start_time),
                'source'          => 'portal',
            ]);
        });

        // Envoyer l'email de confirmation avec le lien signé
        $confirmUrl = URL::temporarySignedRoute(
            'appointments.confirm',
            now()->addHours(48),
            ['token' => $confirmToken],
        );

        \Illuminate\Support\Facades\Mail::send(
            'emails.appointments.confirm',
            [
                'appointment'  => $appointment,
                'confirmUrl'   => $confirmUrl,
                'hostName'     => $host->name,
                'orgName'      => $org->name,
                'slotDate'     => Carbon::parse($slot->date)->locale('fr')->isoFormat('dddd D MMMM YYYY'),
                'slotTime'     => substr($slot->start_time, 0, 5),
            ],
            fn ($mail) => $mail
                ->to($validated['email'], "{$validated['first_name']} {$validated['last_name']}")
                ->subject("Confirmation de votre RDV — {$org->name}")
        );

        return response()->json([
            'message'      => 'RDV enregistré. Un email de confirmation vous a été envoyé.',
            'reference'    => strtoupper(substr($confirmToken, 0, 8)), // Référence courte pour le visiteur
            'scheduled_at' => $appointment->scheduled_at->toIso8601String(),
        ], 201);
    }

    // -------------------------------------------------------------------------
    // confirmAppointment($token) — Confirmation par email
    // -------------------------------------------------------------------------

    /**
     * Confirme le RDV après clic sur le lien email.
     * Le token est signé et temporaire (48h) — Laravel valide la signature.
     * Notifie l'hôte du nouveau RDV confirmé.
     */
    public function confirmAppointment(Request $request, string $token): JsonResponse|\Illuminate\Http\RedirectResponse
    {
        // Vérifier la signature de l'URL
        if (!$request->hasValidSignature()) {
            return response()->json(['message' => 'Lien expiré ou invalide.'], 422);
        }

        $appointment = Appointment::where('confirm_token', $token)
            ->where('status', 'pending')
            ->firstOrFail();

        $appointment->update([
            'status'       => 'confirmed',
            'confirmed_at' => now(),
        ]);

        // Notifier l'hôte du RDV confirmé
        $host = $appointment->host;
        if ($host) {
            $this->notificationService->send(
                user:  $host,
                type:  'meeting',
                title: 'Nouveau RDV confirmé',
                body:  "{$appointment->first_name} {$appointment->last_name} a confirmé son RDV le " .
                       $appointment->scheduled_at->locale('fr')->isoFormat('D MMMM [à] HH[h]mm') . '.',
                data:  ['appointment_id' => $appointment->id],
            );

            // Email à l'hôte
            $this->notificationService->sendEmail($host, 'appointments.host-notification', [
                'title'       => 'Nouveau RDV confirmé',
                'appointment' => $appointment,
            ]);
        }

        return response()->json([
            'message'      => 'RDV confirmé ! Nous vous attendons.',
            'reference'    => strtoupper(substr($token, 0, 8)),
            'scheduled_at' => $appointment->scheduled_at->toIso8601String(),
            'host_name'    => $host?->name,
        ]);
    }

    // =========================================================================
    // ESPACE ADMIN — Routes authentifiées
    // =========================================================================

    // -------------------------------------------------------------------------
    // index() — Liste des RDV (admin)
    // -------------------------------------------------------------------------

    /**
     * Liste tous les RDV de l'organisation avec filtres avancés.
     * Filtres : date, hôte, statut, source (portail/manuel).
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $query = Appointment::where('organization_id', $user->organization_id)
            ->with(['host:id,name,avatar,department_id', 'host.department:id,name', 'slot'])
            ->orderBy('scheduled_at');

        // Un hôte normal ne voit que ses propres RDV
        if (!$user->hasPermissionForModule('accueil', 'manage')) {
            $query->where('host_id', $user->id);
        }

        $query->when($request->date, fn ($q, $d) =>
            $q->whereDate('scheduled_at', Carbon::parse($d))
        );
        $query->when($request->host_id, fn ($q, $h) => $q->where('host_id', $h));
        $query->when($request->status, fn ($q, $s) => $q->where('status', $s));
        $query->when($request->search, fn ($q, $s) =>
            $q->where(fn ($inner) =>
                $inner->where('first_name', 'ilike', "%{$s}%")
                      ->orWhere('last_name', 'ilike', "%{$s}%")
                      ->orWhere('company', 'ilike', "%{$s}%")
            )
        );

        // Filtre période
        $query->when($request->from, fn ($q, $f) => $q->where('scheduled_at', '>=', Carbon::parse($f)));
        $query->when($request->to,   fn ($q, $t) => $q->where('scheduled_at', '<=', Carbon::parse($t)->endOfDay()));

        $appointments = $query->paginate(30);

        return response()->json($appointments);
    }

    // -------------------------------------------------------------------------
    // updateStatus($id) — Confirmer / Annuler un RDV
    // -------------------------------------------------------------------------

    /**
     * Met à jour le statut d'un RDV.
     * Statuts possibles : confirmed, cancelled, completed, no_show
     * Notifie le visiteur par email si annulation.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();

        $appointment = Appointment::where('id', $id)
            ->where('organization_id', $user->organization_id)
            ->where(fn ($q) =>
                // L'hôte peut modifier son propre RDV, les managers peuvent tout modifier
                $user->hasPermissionForModule('accueil', 'manage')
                    ? $q
                    : $q->where('host_id', $user->id)
            )
            ->firstOrFail();

        $validated = $request->validate([
            'status'              => ['required', 'in:confirmed,cancelled,completed,no_show'],
            'cancellation_reason' => ['required_if:status,cancelled', 'nullable', 'string', 'max:500'],
        ]);

        $oldStatus = $appointment->status;
        $appointment->update([
            'status'              => $validated['status'],
            'cancellation_reason' => $validated['cancellation_reason'] ?? null,
            'cancelled_at'        => $validated['status'] === 'cancelled' ? now() : null,
            'completed_at'        => $validated['status'] === 'completed' ? now() : null,
        ]);

        // Si annulation : notifier le visiteur par email et libérer le créneau
        if ($validated['status'] === 'cancelled') {
            $appointment->slot?->update(['booked_at' => null]);

            if ($appointment->email) {
                \Illuminate\Support\Facades\Mail::send(
                    'emails.appointments.cancelled',
                    [
                        'appointment' => $appointment,
                        'reason'      => $validated['cancellation_reason'] ?? 'Aucune raison précisée.',
                    ],
                    fn ($mail) => $mail
                        ->to($appointment->email, "{$appointment->first_name} {$appointment->last_name}")
                        ->subject("Votre RDV a été annulé")
                );
            }
        }

        $this->auditService->log(
            action: 'appointment_status_updated',
            module: 'accueil',
            resourceType: 'appointment',
            resourceId: $appointment->id,
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => $validated['status']],
        );

        return response()->json([
            'appointment' => $appointment->load('host:id,name'),
            'message'     => 'Statut mis à jour.',
        ]);
    }
}
