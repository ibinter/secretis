<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DemoVisitorSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🚪 Création des visiteurs...');

        $org = DB::table('organizations')->where('slug', 'cabinet-conseil-demo')->first();
        if (! $org) {
            $this->command->error('Organisation démo introuvable.');
            return;
        }
        $orgId = $org->id;
        $users = DB::table('users')->where('organization_id', $orgId)->pluck('id')->toArray();
        $accueilUser = $users[4]; // Mariam Coulibaly, hôtesse d'accueil

        $now = Carbon::now();

        // ── 20 visiteurs du jour ─────────────────────────────────────────────
        $visitorDefs = [
            // [first, last, company, id_type, purpose, status: arrived/present/left, blacklist]
            ['Mamadou',   'Koné',       'SOTRA',              'national_id', 'Réunion partenariat',               'left',    false],
            ['Awa',       'Diakité',    'NSIA Assurances',    'passport',    'Entretien recrutement',             'left',    false],
            ['Jean-Marc', 'Ahoussou',   'MTN CI',             'national_id', 'Présentation commerciale',         'left',    false],
            ['Fatoumata', 'Bah',        'Orange CI',          'passport',    'Réunion technique',                'left',    false],
            ['Ibrahim',   'Touré',      'CFAO Group',         'national_id', 'Livraison matériel',               'left',    false],
            ['Cécile',    'Aka',        'Ernst & Young CI',   'passport',    'Audit comptable',                  'present', false],
            ['Kouadio',   'Yao',        'Cabinet Deloitte',   'national_id', 'Consultation documents',           'present', false],
            ['Aminata',   'Coulibaly',  'Université Cocody',  'national_id', 'Stage académique',                 'present', false],
            ['Patrick',   'N\'Guessan', 'Mairie du Plateau',  'national_id', 'Remise courrier officiel',         'left',    false],
            ['Sophie',    'Bamba',      'Chambre Commerce CI','passport',    'Réunion partenariat CGECI',        'left',    false],
            ['Alassane',  'Diallo',     'Particulier',        'national_id', 'RDV Directeur Général',            'arrived', false],
            ['Marcelline','Yobé',       'SODECI',             'national_id', 'Suivi contrat maintenance',        'arrived', false],
            ['Serge',     'Assemian',   'SIB Banque',         'national_id', 'Demande de renseignements',        'arrived', false],
            ['Diane',     'Kouyaté',    'Direction PME CI',   'passport',    'Présentation produit financier',   'present', false],
            ['Hervé',     'Gbagbo',     'Consultant indép.',  'national_id', 'Entretien prestation conseil',     'present', false],
            ['Yves',      'Kouassi',    'Sunu Assurances',    'national_id', 'Renouvellement contrat',           'left',    false],
            ['Clarisse',  'Mensah',     'AFD Côte d\'Ivoire', 'passport',    'Réunion financement projet',       'left',    false],
            ['Noël',      'Koffi',      'GIZ',                'passport',    'Suivi programme développement',    'left',    false],
            // 2 en liste noire
            ['Boukary',   'Sawadogo',   'Sans employeur',     'national_id', 'Tentative accès non autorisé',    'left',    true],
            ['Aristide',  'Dossou',     'Inconnu',            'national_id', 'Incident sécurité antérieur',      'left',    true],
        ];

        $visitorIds = [];
        foreach ($visitorDefs as $v) {
            $vid = DB::table('visitors')->insertGetId([
                'organization_id' => $orgId,
                'first_name'      => $v[0],
                'last_name'       => $v[1],
                'company'         => $v[2],
                'email'           => strtolower($v[0] . '.' . $v[1]) . '@exemple.ci',
                'phone'           => '+225 07 ' . rand(10, 99) . ' ' . rand(10, 99) . ' ' . rand(10, 99),
                'id_type'         => $v[3],
                'id_number'       => strtoupper(substr($v[1], 0, 2)) . rand(100000, 999999),
                'notes'           => $v[6] ? 'LISTE NOIRE : Comportement suspect signalé. Accès refusé.' : null,
                'created_at'      => now()->subDays(rand(0, 60)),
                'updated_at'      => now(),
            ]);
            $visitorIds[] = ['id' => $vid, 'data' => $v];
        }

        // Logs de visite pour aujourd'hui
        $checkinHour = 7;
        foreach ($visitorIds as $item) {
            $vid    = $item['id'];
            $v      = $item['data'];
            $isBlacklisted = $v[6];
            $status = $v[5];
            $hostId = $users[array_rand($users)];

            if ($isBlacklisted) {
                // Accès refusé, pas de log de visite
                continue;
            }

            $checkinHour++;
            $checkedIn = $now->copy()->setTime($checkinHour % 9 + 8, rand(0, 59));
            $checkedOut = null;
            if ($status === 'left') {
                $checkedOut = $checkedIn->copy()->addMinutes(rand(15, 120));
            }

            DB::table('visitor_logs')->insert([
                'organization_id' => $orgId,
                'visitor_id'      => $vid,
                'host_id'         => $hostId,
                'purpose'         => $v[4],
                'badge_number'    => 'B-' . str_pad($vid, 3, '0', STR_PAD_LEFT),
                'checked_in_at'   => $checkedIn,
                'checked_out_at'  => $checkedOut,
                'checked_in_by'   => $accueilUser,
                'checked_out_by'  => $checkedOut ? $accueilUser : null,
                'created_at'      => $checkedIn,
                'updated_at'      => now(),
            ]);
        }

        // ── 10 Rendez-vous planifiés ─────────────────────────────────────────
        $appointmentDefs = [
            ['Réunion stratégique annuelle',           1, '09:00', 90],
            ['Entretien recrutement Développeur Senior',1, '11:00', 45],
            ['Présentation offre CRM externe',         1, '14:30', 60],
            ['Visite inspection sécurité annuelle',    2, '08:00', 180],
            ['Réunion actionnaires Q4',                2, '10:00', 120],
            ['Formation RGPD - Données personnelles',  2, '14:00', 240],
            ['Entretien partenaire financement BEI',   3, '09:30', 90],
            ['Audit technique infrastructure',         4, '10:00', 300],
            ['Séminaire leadership management',        5, '09:00', 480],
            ['Réunion clôture exercice fiscal 2024',   7, '14:00', 120],
        ];

        foreach ($appointmentDefs as $i => $appt) {
            $appointDay  = $now->copy()->addDays($appt[1]);
            $scheduledAt = $appointDay->copy()->setTimeFromTimeString($appt[2]);
            $hostId      = $users[$i % count($users)];

            DB::table('visitor_appointments')->insert([
                'organization_id' => $orgId,
                'host_id'         => $hostId,
                'visitor_name'    => 'Invité ' . ($i + 1) . ' - ' . $appt[0],
                'visitor_email'   => 'invite' . ($i + 1) . '@exemple.ci',
                'visitor_company' => 'Entreprise Partenaire ' . chr(65 + $i),
                'purpose'         => $appt[0],
                'scheduled_at'    => $scheduledAt,
                'duration_minutes'=> $appt[3],
                'status'          => 'confirmed',
                'notes'           => null,
                'created_at'      => now()->subDays(rand(1, 7)),
                'updated_at'      => now(),
            ]);
        }

        $this->command->info('  ✅ 18 visiteurs (dont 2 liste noire), logs de passage, 10 RDV planifiés créés.');
    }
}
