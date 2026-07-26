<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('  > SuperAdminSeeder : creation compte SuperAdmin IBIG Soft...');

        // ── 1. Organisation interne IBIG Soft (id=1) ─────────────────────────
        $orgExists = DB::table('organizations')->where('slug', 'ibig-soft')->exists();

        if (! $orgExists) {
            DB::table('organizations')->insert([
                'id'              => 1,
                'name'            => 'IBIG Soft',
                'slug'            => 'ibig-soft',
                'domain'          => 'ibigsoft.com',
                'email'           => 'contact@ibigsoft.com',
                'phone'           => '+225 27 22 00 00 00',
                'address'         => 'Plateau, Abidjan, Côte d\'Ivoire',
                'city'            => 'Abidjan',
                'country'         => 'CI',
                'timezone'        => 'Africa/Abidjan',
                'locale'          => 'fr',
                'type'            => 'internal',   // organisation interne éditeur
                'settings'        => json_encode([
                    'currency'      => 'XOF',
                    'date_format'   => 'd/m/Y',
                    'working_hours' => ['start' => '08:00', 'end' => '18:00'],
                    'working_days'  => ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'],
                ]),
                'modules_enabled' => json_encode(['*']),  // tous les modules
                'is_active'       => true,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]);

            $this->command->info('    Organisation IBIG Soft creee (id=1).');
        } else {
            $this->command->info('    Organisation IBIG Soft deja existante — ignoree.');
        }

        // ── 2. Compte Super Admin ─────────────────────────────────────────────
        $email    = env('SUPERADMIN_EMAIL', 'superadmin@ibigsoft.com');
        $password = env('SUPERADMIN_PASSWORD');

        $passwordGenerated = false;
        if (empty($password)) {
            $password          = Str::password(20, true, true, true, false);
            $passwordGenerated = true;
        }

        $orgId = DB::table('organizations')->where('slug', 'ibig-soft')->value('id') ?? 1;

        $userExists = DB::table('users')->where('email', $email)->exists();

        if (! $userExists) {
            $userId = DB::table('users')->insertGetId([
                'organization_id'   => $orgId,
                'first_name'        => 'Super',
                'last_name'         => 'Admin',
                'email'             => $email,
                'password'          => Hash::make($password),
                'role'              => 'superadmin',
                'job_title'         => 'Super Administrateur IBIG Soft',
                'locale'            => 'fr',
                'timezone'          => 'Africa/Abidjan',
                'is_active'         => true,
                'email_verified_at' => now(),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);

            // ── 3. Assignation du rôle Spatie ─────────────────────────────────
            $role = Role::where('name', 'superadmin_ibig')->where('guard_name', 'web')->first();
            if ($role) {
                // Spatie via la table pivot model_has_roles
                DB::table('model_has_roles')->insertOrIgnore([
                    'role_id'    => $role->id,
                    'model_type' => config('auth.providers.users.model', 'App\\Models\\User'),
                    'model_id'   => $userId,
                ]);
            }

            // ── 4. Log de création ────────────────────────────────────────────
            Log::channel('stack')->info('[SuperAdminSeeder] Compte SuperAdmin créé', [
                'email'      => $email,
                'user_id'    => $userId,
                'org_id'     => $orgId,
                'auto_pwd'   => $passwordGenerated,
            ]);

            $this->command->info("    OK : SuperAdmin cree (email={$email}).");

            if ($passwordGenerated) {
                $this->command->warn("    ATTENTION : mot de passe genere automatiquement : {$password}");
                $this->command->warn("    Conservez-le precieusement ! Il ne sera plus affiche.");
            }
        } else {
            $this->command->info("    SuperAdmin {$email} deja existant — ignoree.");
        }
    }
}
