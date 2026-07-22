<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DemoAgendaSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('📅 Création des événements agenda...');

        $org   = DB::table('organizations')->where('slug', 'cabinet-conseil-demo')->first();
        if (! $org) {
            $this->command->error('Organisation démo introuvable. Exécutez DemoOrganizationSeeder d\'abord.');
            return;
        }
        $orgId = $org->id;
        $users = DB::table('users')->where('organization_id', $orgId)->pluck('id')->toArray();
        $rooms = DB::table('rooms')->where('organization_id', $orgId)->pluck('id')->toArray();

        // Calendrier principal de l'organisation
        $calId = DB::table('calendars')->insertGetId([
            'organization_id' => $orgId,
            'name'            => 'Agenda Cabinet Conseil DEMO',
            'color'           => '#6366f1',
            'is_default'      => true,
            'created_by'      => $users[0],
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $now    = Carbon::now();
        $colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        $types  = ['meeting', 'meeting', 'meeting', 'reminder', 'other'];

        // ── 30 Événements sur 2 semaines ────────────────────────────────────
        $eventDefs = [
            // PASSÉS (aujourd'hui - 7j)
            ['Réunion hebdomadaire Direction',           -7,  '09:00', 120, 'meeting',  0, 0],
            ['Point commercial mensuel',                 -6,  '14:00', 90,  'meeting',  1, 1],
            ['Formation sécurité incendie',              -5,  '10:00', 180, 'other',    2, null],
            ['Entretien client GIC Agro',                -4,  '11:30', 60,  'meeting',  1, null],
            ['Revue de projet Digitalisation',           -3,  '15:00', 90,  'meeting',  0, 2],
            ['Déjeuner équipe commerciale',              -2,  '12:00', 90,  'other',    1, null],
            ['Brief communication interne',             -1,  '08:30', 30,  'meeting',  2, null],

            // AUJOURD'HUI
            ['Réunion comité de direction (CODIR)',       0,  '09:00', 120, 'meeting',  0, 0],
            ['Accueil délégation partenaire',             0,  '11:00', 60,  'meeting',  1, null],
            ['Point projet CRM',                         0,  '14:30', 60,  'meeting',  2, 2],
            ['Formation interne Excel avancé',            0,  '15:30', 90,  'other',    2, null],
            ['Rappel : Rapport mensuel à soumettre',     0,  '17:00', 30,  'reminder', 0, null],

            // DEMAIN
            ['Entretien annuel - Koffi Assouman',        1,  '09:00', 60,  'meeting',  2, null],
            ['Réunion technique déploiement',             1,  '10:30', 90,  'meeting',  2, 2],
            ['Visite client Bureau National Douanes',     1,  '14:00', 120, 'meeting',  1, null],
            ['Réunion bilan RH Q3',                      1,  '16:00', 60,  'meeting',  1, 1],

            // CETTE SEMAINE
            ['Conseil d\'administration trimestriel',    3,  '08:30', 240, 'meeting',  0, 0],
            ['Séminaire commercial 2 jours (J1)',        4,  '09:00', 480, 'other',    1, null],
            ['Séminaire commercial 2 jours (J2)',        5,  '09:00', 480, 'other',    1, null],
            ['Présentation budget 2026',                 5,  '14:00', 90,  'meeting',  0, 0],
            ['Démo SECRETIS ERP client prospect',        5,  '16:00', 60,  'meeting',  2, null],

            // SEMAINE PROCHAINE
            ['Réunion hebdomadaire Direction',           7,  '09:00', 120, 'meeting',  0, 0],
            ['Atelier planification stratégique',        7,  '14:00', 180, 'meeting',  0, 0],
            ['Entretien embauche développeur',            8,  '10:00', 45,  'meeting',  2, null],
            ['Point avancement projet RH Digital',       8,  '14:30', 60,  'meeting',  2, 2],
            ['Formation cybersécurité (tous)',           9,  '09:00', 240, 'other',    2, null],
            ['Réunion fournisseur matériel IT',          9,  '15:00', 60,  'meeting',  2, null],
            ['Bilan mensuel marketing',                  10, '10:00', 90,  'meeting',  1, null],
            ['Réunion bilans RH - Congés',              11, '09:30', 60,  'meeting',  1, 1],
            ['Clôture dossiers fin de mois',            13, '16:00', 60,  'reminder', 0, null],
        ];

        $eventIds = [];
        foreach ($eventDefs as $i => $e) {
            $day     = $now->copy()->addDays($e[1]);
            $starts  = $day->copy()->setTimeFromTimeString($e[2]);
            $ends    = $starts->copy()->addMinutes($e[3]);
            $creator = $users[$e[5] % count($users)];
            $roomId  = $e[6] !== null ? ($rooms[$e[6]] ?? null) : null;

            $eventIds[] = DB::table('events')->insertGetId([
                'organization_id' => $orgId,
                'calendar_id'     => $calId,
                'created_by'      => $creator,
                'title'           => $e[0],
                'description'     => 'Événement de démonstration : ' . $e[0],
                'location'        => $roomId ? null : 'Bureau principal',
                'color'           => $colors[$i % count($colors)],
                'type'            => $e[4],
                'starts_at'       => $starts,
                'ends_at'         => $ends,
                'all_day'         => false,
                'room_id'         => $roomId,
                'is_cancelled'    => false,
                'created_at'      => now()->subDays(rand(1, 14)),
                'updated_at'      => now(),
            ]);
        }

        // ── Participants variés ──────────────────────────────────────────────
        $participantStatuses = ['accepted', 'declined', 'tentative', 'pending'];
        foreach ($eventIds as $eventId) {
            $nbParticipants = rand(2, 6);
            $shuffled = collect($users)->shuffle()->take($nbParticipants);
            foreach ($shuffled as $userId) {
                DB::table('event_participants')->insertOrIgnore([
                    'event_id'   => $eventId,
                    'user_id'    => $userId,
                    'status'     => $participantStatuses[array_rand($participantStatuses)],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // ── 10 Réservations de salles ────────────────────────────────────────
        $reservationPurposes = [
            'Réunion CODIR mensuel',
            'Entretien recrutement',
            'Formation interne',
            'Réunion client',
            'Atelier stratégique',
            'Présentation commerciale',
            'Réunion technique',
            'Brainstorming projet',
            'Accueil délégation',
            'Revue de performance',
        ];
        foreach ($rooms as $idx => $roomId) {
            for ($r = 0; $r < 3; $r++) {
                $day    = $now->copy()->addDays(rand(-3, 10));
                $hour   = rand(8, 16);
                $starts = $day->copy()->setTime($hour, 0);
                $ends   = $starts->copy()->addHours(rand(1, 3));
                $userId = $users[array_rand($users)];

                DB::table('room_reservations')->insert([
                    'organization_id' => $orgId,
                    'room_id'         => $roomId,
                    'reserved_by'     => $userId,
                    'event_id'        => $eventIds[array_rand($eventIds)],
                    'title'           => $reservationPurposes[($idx * 3 + $r) % count($reservationPurposes)],
                    'starts_at'       => $starts,
                    'ends_at'         => $ends,
                    'attendees_count' => rand(2, 12),
                    'status'          => ['confirmed', 'pending', 'confirmed', 'confirmed'][rand(0, 3)],
                    'notes'           => null,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]);
            }
        }

        $this->command->info('  ✅ 30 événements, participants, 10 réservations salles créés.');
    }
}
