<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class DemoOrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('🏢 Création de l\'organisation de démo...');

        // ── Organisation ────────────────────────────────────────────────────
        $orgId = DB::table('organizations')->insertGetId([
            'name'            => 'Cabinet Conseil DEMO SARL',
            'slug'            => 'cabinet-conseil-demo',
            'domain'          => 'demo.secretis.app',
            'email'           => 'contact@demo-cabinet.ci',
            'phone'           => '+225 27 22 00 11 22',
            'address'         => 'Plateau, Rue des Banques, Immeuble Alpha 2000',
            'city'            => 'Abidjan',
            'country'         => 'CI',
            'timezone'        => 'Africa/Abidjan',
            'locale'          => 'fr',
            'tax_number'      => 'CI-2024-TF-00123456',
            'settings'        => json_encode([
                'working_hours'   => ['start' => '08:00', 'end' => '17:30'],
                'working_days'    => ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
                'currency'        => 'XOF',
                'date_format'     => 'd/m/Y',
            ]),
            'modules_enabled' => json_encode(['agenda', 'courrier', 'documents', 'projets', 'rh', 'visiteurs', 'audit']),
            'is_active'       => true,
            'trial_ends_at'   => null,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // ── Licence Pro active ───────────────────────────────────────────────
        $planId = DB::table('plans')->where('slug', 'pro')->value('id') ?? 2;
        DB::table('licenses')->insert([
            'organization_id' => $orgId,
            'plan_id'         => $planId,
            'license_key'     => strtoupper(Str::random(8) . '-' . Str::random(8) . '-DEMO'),
            'status'          => 'active',
            'starts_at'       => now()->subMonth(),
            'expires_at'      => now()->addMonths(11),
            'max_users'       => 25,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // ── 5 Départements ───────────────────────────────────────────────────
        $depts = [];
        $deptDefs = [
            ['name' => 'Direction Générale',   'code' => 'DG',  'color' => '#6366f1'],
            ['name' => 'Secrétariat',           'code' => 'SEC', 'color' => '#0ea5e9'],
            ['name' => 'Ressources Humaines',   'code' => 'RH',  'color' => '#10b981'],
            ['name' => 'Commercial & Marketing','code' => 'COM', 'color' => '#f59e0b'],
            ['name' => 'Technique & IT',        'code' => 'IT',  'color' => '#ef4444'],
        ];
        foreach ($deptDefs as $i => $d) {
            $depts[] = DB::table('departments')->insertGetId([
                'organization_id' => $orgId,
                'name'            => $d['name'],
                'code'            => $d['code'],
                'color'           => $d['color'],
                'description'     => 'Département ' . $d['name'],
                'is_active'       => true,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }
        [$deptDG, $deptSEC, $deptRH, $deptCOM, $deptIT] = $depts;

        // ── 15 Utilisateurs ──────────────────────────────────────────────────
        $users = [];
        $userDefs = [
            // [prénom, nom, email, rôle, job_title, dept]
            ['Konan',    'Yao',         'directeur@demo-cabinet.ci',   'admin',    'Directeur Général',          $deptDG],
            ['Aya',      'Kouassi',     'daf@demo-cabinet.ci',         'manager',  'Directrice Administrative',  $deptDG],
            ['Séraphine','Bamba',       'secretaire1@demo-cabinet.ci', 'employee', 'Secrétaire de Direction',    $deptSEC],
            ['Adjoua',   'N\'Goran',    'secretaire2@demo-cabinet.ci', 'employee', 'Secrétaire Administrative',  $deptSEC],
            ['Mariam',   'Coulibaly',   'accueil@demo-cabinet.ci',     'employee', 'Hôtesse d\'Accueil',         $deptSEC],
            ['Ibrahim',  'Diallo',      'rh@demo-cabinet.ci',          'manager',  'Responsable RH',             $deptRH],
            ['Fatou',    'Traoré',      'rh2@demo-cabinet.ci',         'employee', 'Chargée RH',                 $deptRH],
            ['Koffi',    'Assouman',    'commercial1@demo-cabinet.ci', 'employee', 'Commercial Senior',          $deptCOM],
            ['Akossiwa', 'Mensah',      'commercial2@demo-cabinet.ci', 'employee', 'Chargée Marketing',          $deptCOM],
            ['Jean-Paul','Aka',         'commercial3@demo-cabinet.ci', 'employee', 'Commercial Junior',          $deptCOM],
            ['Christophe','Kouamé',     'it@demo-cabinet.ci',          'manager',  'Responsable IT',             $deptIT],
            ['Romaric',  'Ouattara',    'dev@demo-cabinet.ci',         'employee', 'Développeur',                $deptIT],
            ['Nathalie', 'Bogui',       'comptable@demo-cabinet.ci',   'employee', 'Comptable',                  $deptDG],
            ['Patrice',  'Djobo',       'manager@demo-cabinet.ci',     'manager',  'Chef de Projet',             $deptIT],
            ['Amina',    'Sanogo',      'stage@demo-cabinet.ci',       'employee', 'Stagiaire Marketing',        $deptCOM],
        ];

        $password = Hash::make('Demo@2024!');
        foreach ($userDefs as $i => $u) {
            $users[] = DB::table('users')->insertGetId([
                'organization_id'   => $orgId,
                'department_id'     => $u[5],
                'first_name'        => $u[0],
                'last_name'         => $u[1],
                'email'             => $u[2],
                'role'              => $u[3],
                'job_title'         => $u[4],
                'locale'            => 'fr',
                'timezone'          => 'Africa/Abidjan',
                'is_active'         => true,
                'email_verified_at' => now(),
                'password'          => $password,
                'last_login_at'     => now()->subHours(rand(1, 48)),
                'created_at'        => now()->subMonths(rand(1, 6)),
                'updated_at'        => now(),
            ]);
        }

        // ── 3 Salles de réunion ──────────────────────────────────────────────
        $roomDefs = [
            ['name' => 'Salle Présidence',   'capacity' => 20, 'floor' => '5ème étage', 'equipment' => ['Vidéoprojecteur', 'Tableau blanc', 'Visio-conférence', 'Climatisation']],
            ['name' => 'Salle Innovation',   'capacity' => 10, 'floor' => '3ème étage', 'equipment' => ['Écran TV', 'Tableau blanc', 'Wifi haut débit']],
            ['name' => 'Salle Brainstorming','capacity' => 6,  'floor' => '2ème étage', 'equipment' => ['Tableau blanc', 'Post-it géants', 'Wifi']],
        ];
        $rooms = [];
        foreach ($roomDefs as $r) {
            $rooms[] = DB::table('rooms')->insertGetId([
                'organization_id' => $orgId,
                'name'            => $r['name'],
                'capacity'        => $r['capacity'],
                'location'        => $r['floor'],
                'equipment'       => json_encode($r['equipment']),
                'is_available'    => true,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }

        // ── 10 Véhicules de service ──────────────────────────────────────────
        $vehicleDefs = [
            ['Toyota Land Cruiser',  'AA-001-CI', 'direction',  'available'],
            ['Toyota Hilux',         'AA-002-CI', 'commercial', 'in_use'],
            ['Mitsubishi Pajero',    'AA-003-CI', 'direction',  'available'],
            ['Peugeot 308',          'AA-004-CI', 'general',    'maintenance'],
            ['Renault Duster',       'AA-005-CI', 'rh',         'available'],
            ['Toyota Corolla',       'AA-006-CI', 'general',    'available'],
            ['Hyundai Tucson',       'AA-007-CI', 'commercial', 'in_use'],
            ['Ford Ranger',          'AA-008-CI', 'technique',  'available'],
            ['Nissan Navara',        'AA-009-CI', 'technique',  'available'],
            ['Mercedes Vito (Van)',  'AA-010-CI', 'general',    'available'],
        ];
        foreach ($vehicleDefs as $v) {
            DB::table('vehicles')->insert([
                'organization_id' => $orgId,
                'model'           => $v[0],
                'plate'           => $v[1],
                'category'        => $v[2],
                'status'          => $v[3],
                'mileage'         => rand(5000, 120000),
                'fuel_type'       => 'gasoline',
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);
        }

        // ── 50 Fournitures avec stocks ───────────────────────────────────────
        $supplies = [
            // [name, category, unit, qty, qty_min]
            ['Ramettes papier A4 80g',    'papeterie',     'ramette', 45,  10],
            ['Ramettes papier A3',         'papeterie',     'ramette', 8,   5],
            ['Stylos bille bleus (boîte)', 'papeterie',     'boîte',   12,  5],
            ['Stylos bille noirs (boîte)', 'papeterie',     'boîte',   3,   5],   // ALERTE
            ['Crayons de couleur',         'papeterie',     'boîte',   6,   3],
            ['Post-it (lot 4)',             'papeterie',     'lot',     20,  5],
            ['Trombones (boîte)',           'papeterie',     'boîte',   15,  5],
            ['Agrafeuses',                  'papeterie',     'unité',   8,   3],
            ['Agrafes (boîte 1000)',        'papeterie',     'boîte',   4,   5],   // ALERTE
            ['Scotch adhésif (lot)',        'papeterie',     'lot',     10,  3],
            ['Classeurs A4',               'classement',    'unité',   30,  10],
            ['Chemises cartonnées',        'classement',    'unité',   150, 50],
            ['Pochettes plastiques A4',    'classement',    'paquet',  25,  10],
            ['Étiquettes autocollantes',   'classement',    'paquet',  8,   5],
            ['Boîtes archives',             'classement',    'unité',   2,   10],  // ALERTE
            ['Cartouche toner HP noir',    'informatique',  'unité',   6,   3],
            ['Cartouche toner HP couleur', 'informatique',  'unité',   2,   3],   // ALERTE
            ['Clés USB 32Go',              'informatique',  'unité',   12,  5],
            ['Câbles HDMI 2m',             'informatique',  'unité',   5,   3],
            ['Câbles USB-C',               'informatique',  'unité',   8,   4],
            ['Souris optiques',            'informatique',  'unité',   4,   5],   // ALERTE
            ['Claviers AZERTY',            'informatique',  'unité',   3,   5],   // ALERTE
            ['Écrans 24 pouces',           'informatique',  'unité',   2,   1],
            ['Multiprises (6 prises)',     'informatique',  'unité',   10,  4],
            ['Câbles RJ45 5m',             'informatique',  'unité',   15,  5],
            ['Café moulu 250g',            'cuisine',       'paquet',  8,   5],
            ['Thé (boîte 100)',             'cuisine',       'boîte',   6,   3],
            ['Sucre en morceaux 1kg',      'cuisine',       'paquet',  4,   5],   // ALERTE
            ['Eau minérale 1.5L (carton)', 'cuisine',       'carton',  20,  10],
            ['Gobelets jetables (50)',     'cuisine',       'paquet',  12,  5],
            ['Savon liquide 1L',           'hygiène',       'bidon',   6,   3],
            ['Gel hydroalcoolique',        'hygiène',       'flacon',  15,  5],
            ['Papier toilette (lot 12)',   'hygiène',       'lot',     8,   5],
            ['Essuie-mains (lot 6)',       'hygiène',       'lot',     3,   5],   // ALERTE
            ['Sacs poubelle (lot 50)',     'hygiène',       'lot',     10,  4],
            ['Nettoyant bureaux',          'hygiène',       'flacon',  4,   3],
            ['Désinfectant surfaces',      'hygiène',       'flacon',  2,   3],   // ALERTE
            ['Enveloppes C4 (boîte 250)', 'messagerie',    'boîte',   5,   3],
            ['Enveloppes C5 (boîte 500)', 'messagerie',    'boîte',   4,   3],
            ['Enveloppes à bulles',        'messagerie',    'boîte',   3,   2],
            ['Ruban adhésif d\'emballage', 'messagerie',    'rouleau', 12,  5],
            ['Étiquettes expédition',      'messagerie',    'paquet',  8,   4],
            ['Marqueurs permanents',       'divers',        'boîte',   6,   3],
            ['Règles 30cm',                'divers',        'unité',   10,  5],
            ['Perforateurs',               'divers',        'unité',   5,   2],
            ['Calculatrices de bureau',    'divers',        'unité',   4,   2],
            ['Chemises à soufflets',       'divers',        'unité',   25,  10],
            ['Porte-documents A4',         'divers',        'unité',   8,   3],
            ['Bloc-notes A5',              'papeterie',     'unité',   18,  5],
            ['Agenda bureau 2026',         'papeterie',     'unité',   15,  5],
        ];

        $supplierUser = $users[0];
        foreach ($supplies as $s) {
            $isAlert = $s[3] <= $s[4];
            DB::table('supplies')->insert([
                'organization_id'  => $orgId,
                'name'             => $s[0],
                'category'         => $s[1],
                'unit'             => $s[2],
                'quantity'         => $s[3],
                'min_quantity'     => $s[4],
                'unit_price'       => rand(500, 25000),
                'location'         => 'Réserve principale',
                'is_active'        => true,
                'created_at'       => now(),
                'updated_at'       => now(),
            ]);
        }

        $this->command->info("  ✅ Organisation '{$orgId}' créée avec 15 users, 5 depts, 3 salles, 10 véhicules, 50 fournitures.");
        $this->command->info("  🔑 Mot de passe de tous les comptes démo : Demo@2024!");
        $this->command->info("  👤 Admin : directeur@demo-cabinet.ci / Demo@2024!");
    }
}
