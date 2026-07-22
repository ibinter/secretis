<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use App\Models\VisitorAppointment;
use App\Models\VisitorService;
use App\Notifications\VisitorAppointmentConfirmation;
use App\Notifications\VisitorAppointmentCancelled;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class VisitorPortalController extends Controller
{
    // ─── Constantes ────────────────────────────────────────────────────────────
    private const CACHE_TTL = 300; // 5 minutes

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/public/visitor/{slug}
    // Retourne les informations publiques de l'organisation + services
    // ─────────────────────────────────────────────────────────────────────────
    public function getOrganizationInfo(string $slug): JsonResponse
    {
        $cacheKey = "public_org_{$slug}";

        $data = Cache::remember($cacheKey, self::CACHE_TTL, function () use ($slug) {
            $org = Organization::where('slug', $slug)
                ->where('is_active', true)
                ->firstOrFail();

            $services = VisitorService::where('organization_id', $org->id)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get()
                ->map(fn ($s) => [
                    'id'               => $s->id,
                    'name'             => $s->name,
                    'description'      => $s->description,
                    'icon'             => $s->icon,
                    'duration_minutes' => $s->duration_minutes,
                ]);

            return [
                'organization' => [
                    'id'                   => $org->id,
                    'name'                 => $org->name,
                    'logo_url'             => $org->logo_url
                        ? Storage::url($org->logo_path) : null,
                    'description'          => $org->public_description,
                    'primary_color'        => $org->primary_color,
                    'secondary_color'      => $org->secondary_color,
                    'arrival_instructions' => $org->arrival_instructions,
                    'phone'                => $org->public_phone,
                    'address'              => $org->public_address,
                ],
                'services' => $services,
            ];
        });

        return response()->json($data);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/public/visitor/{slug}/hosts?service_id=
    // Liste des agents qui reçoivent des visites pour un service donné
    // ─────────────────────────────────────────────────────────────────────────
    public function getAvailableHosts(Request $request, string $slug): JsonResponse
    {
        $org = Organization::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $query = User::where('organization_id', $org->id)
            ->where('accepts_visitor_appointments', true)
            ->where('is_active', true);

        if ($request->filled('service_id')) {
            $query->whereHas('visitorServices', fn ($q) =>
                $q->where('visitor_services.id', $request->service_id)
            );
        }

        $hosts = $query->orderBy('last_name')->get()->map(fn ($user) => [
            'id'         => $user->id,
            'name'       => $user->full_name,
            'title'      => $user->job_title,
            'department' => $user->department?->name,
            'avatar_url' => $user->avatar_url,
        ]);

        return response()->json($hosts);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/public/visitor/{slug}/available-dates?host_id=&month=&year=
    // Dates ayant au moins un créneau libre dans le mois
    // ─────────────────────────────────────────────────────────────────────────
    public function getAvailableDates(Request $request, string $slug): JsonResponse
    {
        $request->validate([
            'host_id' => 'required|integer|exists:users,id',
            'month'   => 'required|integer|min:1|max:12',
            'year'    => 'required|integer|min:2024|max:2099',
        ]);

        $org = Organization::where('slug', $slug)->where('is_active', true)->firstOrFail();
        $host = User::where('id', $request->host_id)
            ->where('organization_id', $org->id)
            ->where('accepts_visitor_appointments', true)
            ->firstOrFail();

        $cacheKey = "available_dates_{$host->id}_{$request->year}_{$request->month}";
        $dates = Cache::remember($cacheKey, 60, function () use ($host, $request) {
            return $this->computeAvailableDates($host, (int) $request->year, (int) $request->month);
        });

        return response()->json($dates);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/public/visitor/{slug}/slots?host_id=&date=
    // Créneaux libres pour un agent à une date donnée
    // ─────────────────────────────────────────────────────────────────────────
    public function getAvailableSlots(Request $request, string $slug): JsonResponse
    {
        $request->validate([
            'host_id' => 'required|integer|exists:users,id',
            'date'    => 'required|date_format:Y-m-d|after_or_equal:today',
        ]);

        $org = Organization::where('slug', $slug)->where('is_active', true)->firstOrFail();
        $host = User::where('id', $request->host_id)
            ->where('organization_id', $org->id)
            ->where('accepts_visitor_appointments', true)
            ->firstOrFail();

        $date   = Carbon::parse($request->date);
        $slots  = $this->computeSlots($host, $date);

        return response()->json($slots);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/public/visitor/{slug}/book
    // Créer un rendez-vous + email de confirmation + QR code
    // ─────────────────────────────────────────────────────────────────────────
    public function bookAppointment(Request $request, string $slug): JsonResponse
    {
        $org = Organization::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $validated = $request->validate([
            'service_id'        => 'required|integer|exists:visitor_services,id',
            'host_id'           => 'required|integer|exists:users,id',
            'date'              => 'required|date_format:Y-m-d|after_or_equal:today',
            'slot'              => 'required|array',
            'slot.start'        => 'required|string',
            'slot.end'          => 'required|string',
            'visitor.first_name'=> 'required|string|max:100',
            'visitor.last_name' => 'required|string|max:100',
            'visitor.email'     => 'required|email|max:255',
            'visitor.phone'     => 'required|string|max:30',
            'visitor.company'   => 'nullable|string|max:150',
        ]);

        $host    = User::where('id', $validated['host_id'])
            ->where('organization_id', $org->id)
            ->where('accepts_visitor_appointments', true)
            ->firstOrFail();

        $service = VisitorService::where('id', $validated['service_id'])
            ->where('organization_id', $org->id)
            ->where('is_active', true)
            ->firstOrFail();

        // Vérifier que le créneau est toujours libre (protection race condition)
        $date      = Carbon::parse($validated['date']);
        $startTime = Carbon::parse($validated['date'] . ' ' . $validated['slot']['start']);
        $endTime   = Carbon::parse($validated['date'] . ' ' . $validated['slot']['end']);

        $conflict = VisitorAppointment::where('host_id', $host->id)
            ->where('date', $date->toDateString())
            ->where('status', '!=', 'cancelled')
            ->where(function ($q) use ($startTime, $endTime) {
                $q->whereBetween('start_time', [$startTime, $endTime->subMinute()])
                  ->orWhereBetween('end_time', [$startTime->addMinute(), $endTime]);
            })->exists();

        if ($conflict) {
            return response()->json([
                'message' => 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.',
            ], 409);
        }

        // Créer l'appointment
        $token = Str::uuid()->toString();
        $refCode = strtoupper(Str::random(8));

        $appointment = VisitorAppointment::create([
            'organization_id'   => $org->id,
            'service_id'        => $service->id,
            'host_id'           => $host->id,
            'date'              => $date->toDateString(),
            'start_time'        => $startTime,
            'end_time'          => $endTime,
            'visitor_first_name'=> $validated['visitor']['first_name'],
            'visitor_last_name' => $validated['visitor']['last_name'],
            'visitor_email'     => $validated['visitor']['email'],
            'visitor_phone'     => $validated['visitor']['phone'],
            'visitor_company'   => $validated['visitor']['company'] ?? null,
            'token'             => $token,
            'reference_code'    => $refCode,
            'status'            => 'confirmed',
        ]);

        // Générer le QR code
        $qrCodeUrl = $this->generateQrCode($token, $refCode, $org->id);

        // Invalider le cache des créneaux
        Cache::forget("available_dates_{$host->id}_{$date->year}_{$date->month}");

        // Envoyer l'email de confirmation
        $appointment->sendConfirmationNotification($qrCodeUrl);

        return response()->json([
            'token'             => $token,
            'reference_code'    => $refCode,
            'date'              => $date->toDateString(),
            'start_time'        => $startTime->format('H:i'),
            'end_time'          => $endTime->format('H:i'),
            'host_name'         => $host->full_name,
            'host_title'        => $host->job_title,
            'service_name'      => $service->name,
            'visitor_email'     => $validated['visitor']['email'],
            'qr_code_url'       => $qrCodeUrl,
            'organization'      => [
                'name'                 => $org->name,
                'logo_url'             => $org->logo_url,
                'primary_color'        => $org->primary_color,
                'secondary_color'      => $org->secondary_color,
                'arrival_instructions' => $org->arrival_instructions,
            ],
        ], 201);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/public/visitor/appointment/{token}
    // Détails publics d'un rendez-vous via son token
    // ─────────────────────────────────────────────────────────────────────────
    public function getAppointment(string $token): JsonResponse
    {
        $appointment = VisitorAppointment::where('token', $token)
            ->with(['organization', 'host', 'service'])
            ->firstOrFail();

        $org = $appointment->organization;

        return response()->json([
            'token'          => $appointment->token,
            'reference_code' => $appointment->reference_code,
            'date'           => $appointment->date,
            'start_time'     => Carbon::parse($appointment->start_time)->format('H:i'),
            'end_time'       => Carbon::parse($appointment->end_time)->format('H:i'),
            'host_name'      => $appointment->host->full_name,
            'host_title'     => $appointment->host->job_title,
            'service_name'   => $appointment->service->name,
            'visitor_email'  => $appointment->visitor_email,
            'status'         => $appointment->status,
            'qr_code_url'    => $appointment->qr_code_url,
            'organization'   => [
                'name'                 => $org->name,
                'logo_url'             => $org->logo_url,
                'primary_color'        => $org->primary_color,
                'secondary_color'      => $org->secondary_color,
                'arrival_instructions' => $org->arrival_instructions,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/public/visitor/appointment/{token}/cancel
    // Annuler un rendez-vous via token signé
    // ─────────────────────────────────────────────────────────────────────────
    public function cancelAppointment(Request $request, string $token): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $appointment = VisitorAppointment::where('token', $token)
            ->where('status', 'confirmed')
            ->with(['organization', 'host', 'service'])
            ->firstOrFail();

        // Refuser annulation moins de 1h avant
        $startTime = Carbon::parse($appointment->date . ' ' . $appointment->start_time);
        if ($startTime->diffInMinutes(now()) < 60 && now()->lt($startTime)) {
            return response()->json([
                'message' => 'Impossible d\'annuler un rendez-vous moins d\'1h avant l\'heure prévue.',
            ], 422);
        }

        $appointment->update([
            'status'            => 'cancelled',
            'cancellation_reason' => $request->reason,
            'cancelled_at'      => now(),
        ]);

        // Invalider le cache
        $date = Carbon::parse($appointment->date);
        Cache::forget("available_dates_{$appointment->host_id}_{$date->year}_{$date->month}");

        // Notification annulation
        $appointment->sendCancellationNotification($request->reason);

        return response()->json(['message' => 'Rendez-vous annulé avec succès.']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/public/visitor/appointment/{token}/ics
    // Télécharger le fichier ICS (calendrier)
    // ─────────────────────────────────────────────────────────────────────────
    public function downloadIcs(string $token)
    {
        $appointment = VisitorAppointment::where('token', $token)
            ->with(['organization', 'host', 'service'])
            ->firstOrFail();

        $start = Carbon::parse($appointment->date . ' ' . Carbon::parse($appointment->start_time)->format('H:i'));
        $end   = Carbon::parse($appointment->date . ' ' . Carbon::parse($appointment->end_time)->format('H:i'));
        $uid   = $appointment->reference_code . '@secretis.erp';
        $org   = $appointment->organization;

        $ics = implode("\r\n", [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//SECRETIS ERP//Visitor Appointment//FR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            'UID:' . $uid,
            'DTSTAMP:' . now()->format('Ymd\THis\Z'),
            'DTSTART:' . $start->format('Ymd\THis'),
            'DTEND:'   . $end->format('Ymd\THis'),
            'SUMMARY:RDV ' . $appointment->service->name . ' — ' . $org->name,
            'DESCRIPTION:Rendez-vous avec ' . $appointment->host->full_name
                . '\\nRéférence : ' . $appointment->reference_code
                . ($org->arrival_instructions ? '\\n\\n' . str_replace("\n", '\\n', $org->arrival_instructions) : ''),
            'LOCATION:' . ($org->public_address ?? $org->name),
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR',
        ]);

        return response($ics, 200, [
            'Content-Type'        => 'text/calendar; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"rdv-{$appointment->reference_code}.ics\"",
        ]);
    }

    // ─── Méthodes privées ─────────────────────────────────────────────────────

    /**
     * Calcule les dates disponibles d'un mois pour un hôte.
     * Une date est disponible si elle a au moins 1 créneau libre.
     */
    private function computeAvailableDates(User $host, int $year, int $month): array
    {
        $start = Carbon::create($year, $month, 1)->startOfDay();
        $end   = $start->copy()->endOfMonth();
        $today = Carbon::today();

        $available = [];

        for ($day = $start->copy(); $day->lte($end); $day->addDay()) {
            if ($day->lt($today) || $day->isWeekend()) continue;

            // Vérifier que l'hôte a une plage de travail ce jour
            $workSchedule = $this->getWorkSchedule($host, $day);
            if (!$workSchedule) continue;

            // Vérifier qu'il reste au moins 1 créneau
            $slots = $this->computeSlots($host, $day);
            if (!empty($slots)) {
                $available[] = $day->toDateString();
            }
        }

        return $available;
    }

    /**
     * Calcule les créneaux libres d'un hôte à une date donnée.
     */
    private function computeSlots(User $host, Carbon $date): array
    {
        $workSchedule = $this->getWorkSchedule($host, $date);
        if (!$workSchedule) return [];

        $duration = $host->appointment_duration_minutes ?? 30; // durée par défaut 30 min
        $buffer   = $host->appointment_buffer_minutes  ?? 0;   // pause entre RDV

        // Récupérer les RDV existants ce jour
        $booked = VisitorAppointment::where('host_id', $host->id)
            ->where('date', $date->toDateString())
            ->where('status', '!=', 'cancelled')
            ->get(['start_time', 'end_time']);

        $slots = [];
        $current = Carbon::parse($date->toDateString() . ' ' . $workSchedule['start']);
        $workEnd = Carbon::parse($date->toDateString() . ' ' . $workSchedule['end']);

        // Exclure la pause déjeuner si configurée
        $lunchStart = $workSchedule['lunch_start']
            ? Carbon::parse($date->toDateString() . ' ' . $workSchedule['lunch_start'])
            : null;
        $lunchEnd = $workSchedule['lunch_end']
            ? Carbon::parse($date->toDateString() . ' ' . $workSchedule['lunch_end'])
            : null;

        while ($current->copy()->addMinutes($duration)->lte($workEnd)) {
            $slotEnd = $current->copy()->addMinutes($duration);

            // Sauter la pause déjeuner
            if ($lunchStart && $lunchEnd) {
                if ($current->between($lunchStart, $lunchEnd->subMinute())
                    || $slotEnd->between($lunchStart->addMinute(), $lunchEnd)) {
                    $current = $lunchEnd->copy();
                    continue;
                }
            }

            // Vérifier conflit avec RDV existants
            $isBooked = $booked->contains(function ($b) use ($current, $slotEnd) {
                $bStart = Carbon::parse($b->start_time);
                $bEnd   = Carbon::parse($b->end_time);
                return $current->lt($bEnd) && $slotEnd->gt($bStart);
            });

            if (!$isBooked) {
                $slots[] = [
                    'start' => $current->format('H:i'),
                    'end'   => $slotEnd->format('H:i'),
                ];
            }

            $current->addMinutes($duration + $buffer);
        }

        return $slots;
    }

    /**
     * Retourne les horaires de travail d'un agent pour un jour donné.
     */
    private function getWorkSchedule(User $host, Carbon $date): ?array
    {
        $schedule = $host->workSchedule ?? $host->organization->defaultWorkSchedule ?? null;
        if (!$schedule) {
            // Horaires par défaut : 8h-17h avec pause 12h-13h
            return [
                'start'       => '08:00',
                'end'         => '17:00',
                'lunch_start' => '12:00',
                'lunch_end'   => '13:00',
            ];
        }

        $dayName = strtolower($date->format('l')); // monday, tuesday, …
        return $schedule[$dayName] ?? null;
    }

    /**
     * Génère et stocke un QR code SVG pour un rendez-vous.
     * Retourne l'URL publique du QR code.
     */
    private function generateQrCode(string $token, string $refCode, int $orgId): string
    {
        $content  = url("/rdv/confirmation/{$token}");
        $path     = "visitor-qrcodes/org-{$orgId}/{$refCode}.svg";

        try {
            $renderer = new ImageRenderer(
                new RendererStyle(300),
                new SvgImageBackEnd()
            );
            $writer = new Writer($renderer);
            $svg    = $writer->writeString($content);

            Storage::disk('public')->put($path, $svg);
            return Storage::disk('public')->url($path);
        } catch (\Exception $e) {
            \Log::warning('QR code generation failed', ['error' => $e->getMessage()]);
            return '';
        }
    }
}
