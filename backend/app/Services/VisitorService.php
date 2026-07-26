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
    public function registerVisitor(array $data): Visitor
    {
        $visitor = Visitor::where('organization_id', $data['organization_id'])
            ->where('id_number', $data['id_number'])
            ->first();

        if ($visitor) {
            $visitor->update([
                'full_name'  => $data['full_name'],
                'id_type'    => $data['id_type'],
                'company'    => $data['company']    ?? $visitor->company,
                'phone'      => $data['phone']      ?? $visitor->phone,
                'email'      => $data['email']      ?? $visitor->email,
                'photo_path' => $data['photo_path'] ?? $visitor->photo_path,
            ]);
            return $visitor;
        }

        return Visitor::create([
            'organization_id' => $data['organization_id'],
            'full_name'       => $data['full_name'],
            'id_type'         => $data['id_type'],
            'id_number'       => $data['id_number'],
            'company'         => $data['company']    ?? null,
            'phone'           => $data['phone']      ?? null,
            'email'           => $data['email']      ?? null,
            'photo_path'      => $data['photo_path'] ?? null,
            'badge_number'    => $this->generateBadgeNumber($data['organization_id']),
            'visit_count'     => 0,
        ]);
    }

    // Enregistrer l arrivee, generer le badge, notifier l hote
    public function checkIn(Visitor $visitor, array $visitData): VisitLog
    {
        if ($visitor->is_blacklisted) {
            throw new \RuntimeException(
                'Ce visiteur est sur liste noire : ' . $visitor->blacklist_reason
            );
        }

        return DB::transaction(function () use ($visitor, $visitData) {
            $visit = VisitLog::create([
                'organization_id'   => $visitor->organization_id,
                'visitor_id'        => $visitor->id,
                'host_user_id'      => $visitData['host_user_id'],
                'purpose'           => $visitData['purpose']          ?? 'reunion',
                'purpose_detail'    => $visitData['purpose_detail']   ?? null,
                'scheduled_at'      => $visitData['scheduled_at']     ?? null,
                'check_in_at'       => now(),
                'badge_issued'      => true,
                'location'          => $visitData['location']         ?? null,
                'equipment_brought' => $visitData['equipment_brought'] ?? null,
                'status'            => 'checked_in',
                'floor'             => $visitData['floor']            ?? null,
                'created_by'        => $visitData['created_by'],
                'access_zone_id'    => $visitData['access_zone_id']   ?? null,
                'parking_spot_id'   => $visitData['parking_spot_id']  ?? null,
            ]);

            if (!empty($visitData['parking_spot_id'])) {
                ParkingSpot::where('id', $visitData['parking_spot_id'])->update([
                    'is_available'       => false,
                    'current_visitor_id' => $visitor->id,
                ]);
            }

            $visitor->increment('visit_count');
            $visitor->update(['last_visit_at' => now()]);

            if (!empty($visitData['invitation_code'])) {
                VisitorInvitation::where('access_code', $visitData['invitation_code'])->update([
                    'is_used'     => true,
                    'used_at'     => now(),
                    'visit_log_id'=> $visit->id,
                ]);
            }

            NotifyHostVisitorArrived::dispatch($visit);
            broadcast(new VisitorCheckedIn($visit))->toOthers();

            return $visit->load(['visitor', 'host', 'accessZone']);
        });
    }

    // Enregistrer la sortie, liberer le badge et le parking
    public function checkOut(VisitLog $visit): void
    {
        DB::transaction(function () use ($visit) {
            $visit->update([
                'check_out_at'   => now(),
                'badge_returned' => true,
                'status'         => 'checked_out',
            ]);

            if ($visit->parking_spot_id) {
                ParkingSpot::where('id', $visit->parking_spot_id)->update([
                    'is_available'       => true,
                    'current_visitor_id' => null,
                ]);
            }

            broadcast(new \App\Events\VisitorCheckedOut($visit))->toOthers();
        });
    }

    // Creer une invitation avec code QR unique
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
            ->whereDate('check_in_at', $date)
            ->with(['visitor', 'host'])
            ->get();

        $checkedOut  = $visits->where('status', 'checked_out');
        $durations   = $checkedOut->map(fn ($v) => $v->check_out_at->diffInMinutes($v->check_in_at));
        $avgDuration = $durations->avg() ?? 0;

        $byHour = $visits->groupBy(fn ($v) => $v->check_in_at->format('H'))
            ->map->count()->sortKeys();

        $byPurpose = $visits->groupBy('purpose')->map->count();

        $topHosts = $visits->groupBy('host_user_id')
            ->map(fn ($g) => ['host' => optional($g->first()->host)->name ?? 'Inconnu', 'count' => $g->count()])
            ->sortByDesc('count')->take(10)->values();

        return [
            'date'                 => $date->toDateString(),
            'total_visits'         => $visits->count(),
            'checked_in'           => $visits->where('status', 'checked_in')->count(),
            'checked_out'          => $checkedOut->count(),
            'no_show'              => $visits->where('status', 'no_show')->count(),
            'cancelled'            => $visits->where('status', 'cancelled')->count(),
            'average_duration_min' => round($avgDuration),
            'peak_hours'           => $byHour,
            'by_purpose'           => $byPurpose,
            'top_hosts'            => $topHosts,
        ];
    }

    // Visiteurs presents depuis plus de 4 heures
    public function getOverstayingVisitors(): array
    {
        return VisitLog::where('status', 'checked_in')
            ->where('check_in_at', '<=', now()->subHours(4))
            ->with(['visitor', 'host', 'organization'])
            ->get()
            ->map(fn ($v) => [
                'visit'        => $v,
                'duration_min' => $v->check_in_at->diffInMinutes(now()),
            ])
            ->toArray();
    }

    // Generer le badge HTML/PNG du visiteur
    public function generateBadge(VisitLog $visit): string
    {
        $visit->load(['visitor', 'host', 'organization', 'accessZone']);

        $qrContent = route('visits.scan', ['id' => $visit->id]);
        $qrCode    = base64_encode(
            \QrCode::format('png')->size(150)->generate($qrContent)
        );

        $badgeColor = '#27AE60';
        if ($visit->accessZone) {
            $badgeColor = match ($visit->accessZone->access_level) {
                'confidential' => '#E74C3C',
                'restricted'   => '#F39C12',
                default        => '#27AE60',
            };
        }

        return view('visitor-badge', compact('visit', 'qrCode', 'badgeColor'))->render();
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
