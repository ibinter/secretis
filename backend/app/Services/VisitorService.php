<?php

namespace App\Services;

use App\Events\VisitorCheckedIn;
use App\Jobs\NotifyHostVisitorArrived;
use App\Models\Organization;
use App\Models\ParkingSpot;
use App\Models\User;
use App\Models\VisitLog;
use App\Models\Visitor;
use App\Models\VisitorInvitation;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VisitorService
{
    // Enregistrer ou retrouver un visiteur par N° de pièce
    /**
     * Retrouve ou crée un visiteur.
     * Colonnes réelles de `visitors` : first_name / last_name (pas full_name),
     * pas de badge_number ni visit_count (le badge vit sur visitor_logs).
     */
    public function registerVisitor(array $data): Visitor
    {
        $query = Visitor::where('organization_id', $data['organization_id']);

        // Dédoublonnage : par pièce d'identité si fournie, sinon par nom + téléphone/email.
        if (! empty($data['id_number'])) {
            $query->where('id_number', $data['id_number']);
        } else {
            $query->where('first_name', $data['first_name'] ?? '')
                  ->where('last_name', $data['last_name'] ?? '')
                  ->where(function ($q) use ($data) {
                      $q->where('phone', $data['phone'] ?? null)
                        ->orWhere('email', $data['email'] ?? null);
                  });
        }

        $visitor = $query->first();

        $attributes = array_filter([
            'first_name' => $data['first_name'] ?? null,
            'last_name'  => $data['last_name']  ?? null,
            'company'    => $data['company']    ?? null,
            'phone'      => $data['phone']      ?? null,
            'email'      => $data['email']      ?? null,
            'id_type'    => $data['id_type']    ?? null,
            'id_number'  => $data['id_number']  ?? null,
            'photo_path' => $data['photo_path'] ?? null,
        ], fn ($v) => $v !== null);

        if ($visitor) {
            $visitor->update($attributes);

            return $visitor;
        }

        return Visitor::create($attributes + [
            'organization_id' => $data['organization_id'],
            'type'            => $data['type']   ?? 'visitor',
            'status'          => 'active',
            'is_blacklisted'  => false,
        ]);
    }

    /**
     * Enregistre l'arrivée d'un visiteur.
     * Table réelle : `visitor_logs` (visitor_id, host_id, purpose, badge_number,
     * checked_in_at, checked_in_by, vehicle_plate, notes, appointment_id).
     */
    public function checkIn(Visitor $visitor, array $visitData): VisitLog
    {
        if ($visitor->is_blacklisted) {
            throw new \RuntimeException(
                'Ce visiteur est sur liste noire : ' . $visitor->blacklist_reason
            );
        }

        return DB::transaction(function () use ($visitor, $visitData) {
            $visit = VisitLog::create([
                'organization_id' => $visitor->organization_id,
                'visitor_id'      => $visitor->id,
                'host_id'         => $visitData['host_id'] ?? $visitData['host_user_id'] ?? null,
                'appointment_id'  => $visitData['appointment_id'] ?? null,
                'purpose'         => $visitData['purpose'] ?? 'Visite',
                'badge_number'    => $this->generateBadgeNumber($visitor->organization_id),
                'checked_in_at'   => now(),
                'checked_in_by'   => $visitData['created_by'] ?? null,
                'vehicle_plate'   => $visitData['vehicle_plate'] ?? null,
                'notes'           => $visitData['notes'] ?? null,
            ]);

            // Trace sur la fiche visiteur (colonnes réelles).
            $visitor->update(['check_in_at' => now(), 'status' => 'active']);

            return $visit;
        });
    }

    /**
     * Enregistre le départ d'un visiteur (colonnes réelles de `visitor_logs`).
     */
    public function checkOut(VisitLog $visit): void
    {
        DB::transaction(function () use ($visit) {
            $visit->update([
                'checked_out_at' => now(),
                'checked_out_by' => auth()->id(),
            ]);

            $visit->visitor?->update(['check_out_at' => now()]);

            try {
                broadcast(new \App\Events\VisitorCheckedOut($visit))->toOthers();
            } catch (\Throwable) {
                // La diffusion temps réel ne doit jamais bloquer un départ.
            }
        });
    }

    public function createInvitation(User $host, array $data): VisitorInvitation
    {
        $invitation = VisitorInvitation::create([
            'organization_id'  => $host->organization_id,
            'invited_by'       => $host->id,
            'visitor_email'    => $data['visitor_email'],
            'visitor_name'     => $data['visitor_name'],
            'visit_date'       => $data['visit_date'],
            'visit_time_start' => $data['visit_time_start'],
            'visit_time_end'   => $data['visit_time_end'],
            'purpose'          => $data['purpose'] ?? null,
            'access_code'      => Str::uuid(),
            'is_used'          => false,
            'expires_at'       => Carbon::parse($data['visit_date'] . ' ' . $data['visit_time_end']),
            'location'         => $data['location'] ?? null,
        ]);

        \Mail::to($invitation->visitor_email)
            ->send(new \App\Mail\VisitorInvitationMail($invitation, $host));

        return $invitation;
    }

    // Verifier le code d invitation (non expire, non utilise)
    public function validateInvitation(string $code): ?VisitorInvitation
    {
        return VisitorInvitation::where('access_code', $code)
            ->where('is_used', false)
            ->where('expires_at', '>', now())
            ->with(['invitedBy', 'organization'])
            ->first();
    }

    public function isBlacklisted(string $idNumber, int $organizationId): bool
    {
        return Visitor::where('organization_id', $organizationId)
            ->where('id_number', $idNumber)
            ->where('is_blacklisted', true)
            ->exists();
    }

    public function blacklist(Visitor $visitor, string $reason, User $by): void
    {
        $visitor->update([
            'is_blacklisted'   => true,
            'blacklist_reason' => $reason,
        ]);

        activity()->causedBy($by)->performedOn($visitor)
            ->withProperties(['reason' => $reason])
            ->log('visitor_blacklisted');
    }

    public function unblacklist(Visitor $visitor, User $by): void
    {
        $visitor->update(['is_blacklisted' => false, 'blacklist_reason' => null]);

        activity()->causedBy($by)->performedOn($visitor)->log('visitor_unblacklisted');
    }

    // Visiteurs du jour, temps moyens, pics d affluence
    public function getDailyReport(Organization $org, Carbon $date): array
    {
        $visits = VisitLog::where('organization_id', $org->id)
            ->whereDate('checked_in_at', $date)
            ->with(['visitor', 'host'])
            ->get();

        $checkedOut  = $visits->filter(fn ($v) => $v->checked_out_at !== null);
        $durations   = $checkedOut->map(fn ($v) => \Carbon\Carbon::parse($v->checked_out_at)->diffInMinutes(\Carbon\Carbon::parse($v->checked_in_at)));
        $avgDuration = $durations->avg() ?? 0;

        $byHour = $visits->groupBy(fn ($v) => \Carbon\Carbon::parse($v->checked_in_at)->format('H'))
            ->map->count()->sortKeys();

        $byPurpose = $visits->groupBy('purpose')->map->count();

        $topHosts = $visits->groupBy('host_id')
            ->map(fn ($g) => ['host' => optional($g->first()->host)->name ?? 'Inconnu', 'count' => $g->count()])
            ->sortByDesc('count')->take(10)->values();

        return [
            'date'                 => $date->toDateString(),
            'total_visits'         => $visits->count(),
            'checked_in'           => $visits->filter(fn ($v) => $v->checked_out_at === null)->count(),
            'checked_out'          => $checkedOut->count(),
            'no_show'              => 0, // pas de colonne status sur visitor_logs
            'cancelled'            => 0,
            'average_duration_min' => round($avgDuration),
            'peak_hours'           => $byHour,
            'by_purpose'           => $byPurpose,
            'top_hosts'            => $topHosts,
        ];
    }

    // Visiteurs presents depuis plus de 4 heures
    public function getOverstayingVisitors(): array
    {
        return VisitLog::whereNull('checked_out_at')
            ->where('checked_in_at', '<=', now()->subHours(4))
            ->with(['visitor', 'host', 'organization'])
            ->get()
            ->map(fn ($v) => [
                'visit'        => $v,
                'duration_min' => \Carbon\Carbon::parse($v->checked_in_at)->diffInMinutes(now()),
            ])
            ->toArray();
    }

    // Generer le badge HTML/PNG du visiteur
    public function generateBadge(VisitLog $visit): string
    {
        // `accessZone` n'existe pas (table access_zones absente) → non chargée.
        $visit->load(['visitor', 'host', 'organization']);

        $qrContent = route('visits.scan', ['id' => $visit->id]);

        // Le paquet QR (simplesoftwareio/simple-qrcode) n'est pas installé sur
        // toutes les instances : le badge doit rester imprimable sans le QR.
        $qrCode = null;
        if (class_exists(\SimpleSoftwareIO\QrCode\Facades\QrCode::class)) {
            try {
                $qrCode = base64_encode(
                    \SimpleSoftwareIO\QrCode\Facades\QrCode::format('png')->size(150)->generate($qrContent)
                );
            } catch (\Throwable $e) {
                Log::warning('QR du badge visiteur non généré', ['error' => $e->getMessage()]);
            }
        }

        // Couleur unique : les zones d'accès ne sont pas gérées (table access_zones absente).
        $badgeColor = '#27AE60';

        return view('visitor-badge', compact('visit', 'qrCode', 'badgeColor', 'qrContent'))->render();
    }

    private function generateBadgeNumber(int $organizationId): string
    {
        $prefix = strtoupper(substr(md5($organizationId), 0, 3));
        $seq    = str_pad(
            Visitor::where('organization_id', $organizationId)->count() + 1,
            5, '0', STR_PAD_LEFT
        );
        return "VIS-{$prefix}-{$seq}";
    }
}
