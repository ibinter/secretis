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
        \Illuminate\Support\Facades\RateLimiter::hit($key, 3600);

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
    // PORTAIL PUBLIC — Endpoints alignés sur le frontend VisitorPortal.jsx
    // Préfixe : /api/public/visitor/{slug}
    // Assistant "wizard" en 5 étapes : service → hôte → date → créneau → infos
    // =========================================================================

    /**
     * Résout une organisation publiquement exposée (non suspendue) depuis son slug,
     * en s'assurant que la prise de RDV en ligne est activée.
     */
    private function resolvePublicOrg(string $slug): \App\Models\Organization
    {
        $org = \App\Models\Organization::where('slug', strtolower(trim($slug)))
            ->where('status', '!=', 'suspended')
            ->firstOrFail();

        abort_unless(
            (bool) $org->getSetting('appointment_portal_enabled', false),
            403,
            'La prise de RDV en ligne n\'est pas disponible pour cette organisation.'
        );

        return $org;
    }

    /**
     * Liste des services proposés au portail, lue depuis les settings de l'org.
     * Aucune table dédiée : settings['appointment_services'] = [{id,name,...}].
     * Fallback : un service générique unique.
     */
    private function portalServices(\App\Models\Organization $org): array
    {
        $services = $org->getSetting('appointment_services', []);

        if (!is_array($services) || empty($services)) {
            return [[
                'id'               => 'default',
                'name'             => 'Rendez-vous',
                'description'      => 'Prise de rendez-vous standard.',
                'duration_minutes' => 30,
                'icon'             => '📅',
            ]];
        }

        return array_values(array_map(fn ($s, $i) => [
            'id'               => $s['id'] ?? $i,
            'name'             => $s['name'] ?? 'Service',
            'description'      => $s['description'] ?? null,
            'duration_minutes' => $s['duration_minutes'] ?? 30,
            'icon'             => $s['icon'] ?? '📅',
        ], $services, array_keys($services)));
    }

    // GET /api/public/visitor/{slug}
    // GET /rdv/{slug} — page Inertia publique du portail visiteur
    public function portalPage(string $slug): \Inertia\Response
    {
        return \Inertia\Inertia::render('Public/VisitorPortal', ['slug' => $slug]);
    }

    // GET /rdv/confirmation/{token} — page Inertia de confirmation
    public function confirmationPage(string $token): \Inertia\Response
    {
        return \Inertia\Inertia::render('Public/AppointmentConfirmation', ['token' => $token]);
    }

    // GET /reception/rendez-vous — écran d'administration des RDV (interne, authentifié)
    public function adminPage(): \Inertia\Response
    {
        return \Inertia\Inertia::render('Reception/Appointments');
    }

    public function portalConfig(Request $request, string $slug): JsonResponse
    {
        $org = $this->resolvePublicOrg($slug);

        return response()->json([
            'organization' => [
                'name'                 => $org->name,
                'logo_url'             => $org->getSetting('logo_url'),
                'primary_color'        => $org->getSetting('primary_color', '#2563EB'),
                'secondary_color'      => $org->getSetting('secondary_color', '#1E40AF'),
                'address'              => $org->address,
                'arrival_instructions' => $org->getSetting('arrival_instructions'),
            ],
            'services' => $this->portalServices($org),
        ]);
    }

    // GET /api/public/visitor/{slug}/hosts?service_id=
    public function hosts(Request $request, string $slug): JsonResponse
    {
        $org = $this->resolvePublicOrg($slug);

        $hosts = User::where('organization_id', $org->id)
            ->where('status', 'active')
            ->where('accepts_appointments', true)
            ->with('department:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'job_title', 'avatar', 'department_id'])
            ->map(fn ($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'title'      => $u->job_title,
                'department' => $u->department?->name,
                'avatar_url' => $u->avatar,
            ]);

        return response()->json($hosts);
    }

    // GET /api/public/visitor/{slug}/available-dates?host_id=&month=&year=
    public function availableDates(Request $request, string $slug): JsonResponse
    {
        $org = $this->resolvePublicOrg($slug);

        $hostId = (int) $request->query('host_id');
        $month  = (int) ($request->query('month') ?: now()->month);
        $year   = (int) ($request->query('year') ?: now()->year);

        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end   = (clone $start)->endOfMonth();

        // Ne jamais exposer de dates passées.
        if ($start->lt(now()->startOfDay())) {
            $start = now()->startOfDay();
        }

        $dates = AppointmentSlot::where('organization_id', $org->id)
            ->where('host_id', $hostId)
            ->bookable()
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->orderBy('date')
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->unique()
            ->values();

        return response()->json($dates);
    }

    // GET /api/public/visitor/{slug}/slots?host_id=&date=
    public function slots(Request $request, string $slug): JsonResponse
    {
        $org = $this->resolvePublicOrg($slug);

        $hostId = (int) $request->query('host_id');
        $date   = $request->query('date')
            ? Carbon::parse($request->query('date'))->toDateString()
            : now()->toDateString();

        $slots = AppointmentSlot::where('organization_id', $org->id)
            ->where('host_id', $hostId)
            ->where('date', $date)
            ->bookable()
            ->orderBy('start_time')
            ->get(['id', 'start_time', 'end_time'])
            ->map(fn ($s) => [
                'id'    => $s->id,
                'start' => substr((string) $s->start_time, 0, 5),
                'end'   => substr((string) $s->end_time, 0, 5),
            ]);

        return response()->json($slots);
    }

    // POST /api/public/visitor/{slug}/book
    public function book(Request $request, string $slug): JsonResponse
    {
        // Rate limiting : 5 prises de RDV max par IP par heure.
        $rlKey = 'appointment-book:' . $request->ip();
        if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($rlKey, 5)) {
            return response()->json(['message' => 'Trop de demandes. Réessayez dans une heure.'], 429);
        }
        \Illuminate\Support\Facades\RateLimiter::hit($rlKey, 3600);

        $org = $this->resolvePublicOrg($slug);

        $validated = $request->validate([
            'service_id'         => ['nullable'],
            'host_id'            => ['required', 'integer'],
            'date'               => ['required', 'date'],
            'slot'               => ['required', 'array'],
            'slot.id'            => ['required', 'integer'],
            'visitor'            => ['required', 'array'],
            'visitor.first_name' => ['required', 'string', 'max:150'],
            'visitor.last_name'  => ['required', 'string', 'max:150'],
            'visitor.email'      => ['required', 'email', 'max:255'],
            'visitor.phone'      => ['required', 'string', 'max:30'],
            'visitor.company'    => ['nullable', 'string', 'max:255'],
        ]);

        $host = User::where('id', $validated['host_id'])
            ->where('organization_id', $org->id)
            ->where('accepts_appointments', true)
            ->firstOrFail();

        $serviceName = collect($this->portalServices($org))
            ->firstWhere('id', $validated['service_id'] ?? 'default')['name'] ?? 'Rendez-vous';

        $confirmToken = Str::uuid()->toString();

        $appointment = \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $org, $host, $serviceName, $confirmToken) {
            // Verrou pessimiste pour éviter la double réservation du créneau.
            $slot = AppointmentSlot::where('id', $validated['slot']['id'])
                ->where('organization_id', $org->id)
                ->where('host_id', $host->id)
                ->bookable()
                ->lockForUpdate()
                ->first();

            if (!$slot) {
                abort(422, 'Ce créneau n\'est plus disponible.');
            }

            $slot->update(['booked_at' => now()]);

            return Appointment::create([
                'organization_id' => $org->id,
                'slot_id'         => $slot->id,
                'host_id'         => $host->id,
                'first_name'      => $validated['visitor']['first_name'],
                'last_name'       => $validated['visitor']['last_name'],
                'email'           => strtolower($validated['visitor']['email']),
                'phone'           => $validated['visitor']['phone'],
                'company'         => $validated['visitor']['company'] ?? null,
                'service'         => $serviceName,
                'purpose'         => $serviceName,
                'status'          => 'confirmed',
                'confirmed_at'    => now(),
                'source'          => 'portal',
                'confirm_token'   => $confirmToken,
                'scheduled_at'    => Carbon::parse($slot->date->toDateString() . ' ' . $slot->start_time),
            ]);
        });

        // Notifications best-effort — ne jamais faire échouer la prise de RDV.
        try {
            if (\Illuminate\Support\Facades\View::exists('emails.appointments.confirm')) {
                \Illuminate\Support\Facades\Mail::send(
                    'emails.appointments.confirm',
                    ['appointment' => $appointment, 'orgName' => $org->name, 'hostName' => $host->name],
                    fn ($mail) => $mail
                        ->to($appointment->email, "{$appointment->first_name} {$appointment->last_name}")
                        ->subject("Confirmation de votre RDV — {$org->name}")
                );
            }
            $this->notificationService->send(
                user:  $host,
                type:  'meeting',
                title: 'Nouveau RDV en ligne',
                body:  "{$appointment->first_name} {$appointment->last_name} a réservé un RDV le " .
                       $appointment->scheduled_at->locale('fr')->isoFormat('D MMMM [à] HH[h]mm') . '.',
                data:  ['appointment_id' => $appointment->id],
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Appointment notification failed: ' . $e->getMessage());
        }

        return response()->json($this->publicAppointmentPayload($appointment->fresh(['host', 'slot']), $org), 201);
    }

    // GET /api/public/visitor/appointment/{token}
    public function showByToken(string $token): JsonResponse
    {
        $appointment = Appointment::where('confirm_token', $token)
            ->with(['host', 'slot', 'organization'])
            ->firstOrFail();

        return response()->json(
            $this->publicAppointmentPayload($appointment, $appointment->organization)
        );
    }

    // POST /api/public/visitor/appointment/{token}/cancel
    public function cancelByToken(Request $request, string $token): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $appointment = Appointment::where('confirm_token', $token)
            ->whereIn('status', ['pending', 'confirmed'])
            ->firstOrFail();

        \Illuminate\Support\Facades\DB::transaction(function () use ($appointment, $validated) {
            $appointment->slot?->update(['booked_at' => null]);
            $appointment->update([
                'status'              => 'cancelled',
                'cancelled_at'        => now(),
                'cancellation_reason' => $validated['reason'] ?? 'Annulé par le visiteur.',
            ]);
        });

        return response()->json(['message' => 'Rendez-vous annulé.']);
    }

    // GET /api/public/visitor/appointment/{token}/ics
    public function ics(string $token): \Symfony\Component\HttpFoundation\Response
    {
        $appointment = Appointment::where('confirm_token', $token)
            ->with(['organization', 'host'])
            ->firstOrFail();

        $start = $appointment->scheduled_at->copy();
        $end   = $appointment->slot
            ? Carbon::parse($appointment->slot->date->toDateString() . ' ' . $appointment->slot->end_time)
            : $start->copy()->addMinutes(30);

        $fmt = fn (Carbon $d) => $d->utc()->format('Ymd\THis\Z');
        $esc = fn ($s) => str_replace([',', ';', "\n"], ['\,', '\;', '\n'], (string) $s);

        $ics = implode("\r\n", [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SECRETIS ERP//Appointments//FR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            'UID:' . $appointment->confirm_token . '@secretis',
            'DTSTAMP:' . $fmt(now()),
            'DTSTART:' . $fmt($start),
            'DTEND:' . $fmt($end),
            'SUMMARY:' . $esc('RDV — ' . $appointment->organization->name),
            'DESCRIPTION:' . $esc('Rendez-vous avec ' . ($appointment->host->name ?? '')),
            'LOCATION:' . $esc($appointment->organization->address ?? ''),
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR',
        ]);

        return response($ics, 200, [
            'Content-Type'        => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="rendez-vous.ics"',
        ]);
    }

    /**
     * Charge utile publique d'un RDV, alignée sur AppointmentConfirmation.jsx.
     */
    private function publicAppointmentPayload(Appointment $a, ?\App\Models\Organization $org): array
    {
        return [
            'token'          => $a->confirm_token,
            'reference_code' => $a->reference_code,
            'status'         => $a->status,
            'date'           => $a->scheduled_at?->toDateString(),
            'start_time'     => $a->slot ? substr((string) $a->slot->start_time, 0, 5) : $a->scheduled_at?->format('H:i'),
            'end_time'       => $a->slot ? substr((string) $a->slot->end_time, 0, 5) : null,
            'scheduled_at'   => $a->scheduled_at?->toIso8601String(),
            'service_name'   => $a->service,
            'host_name'      => $a->host?->name,
            'host_title'     => $a->host?->job_title,
            'visitor_email'  => $a->email,
            'qr_code_url'    => null, // Généré côté frontend ou via un futur endpoint QR.
            'organization'   => $org ? [
                'name'                 => $org->name,
                'logo_url'             => $org->getSetting('logo_url'),
                'primary_color'        => $org->getSetting('primary_color', '#2563EB'),
                'arrival_instructions' => $org->getSetting('arrival_instructions'),
            ] : null,
        ];
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

            if ($appointment->email && \Illuminate\Support\Facades\View::exists('emails.appointments.cancelled')) {
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
