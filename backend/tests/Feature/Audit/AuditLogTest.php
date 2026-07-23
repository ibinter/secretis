<?php

namespace Tests\Feature\Audit;

use App\Models\Organization;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * SECRETIS ERP — Tests du journal d'audit (section 27.2)
 */
class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private Organization  $org;
    private User          $adminUser;
    private AuditService  $auditService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->org       = Organization::factory()->create();
        $this->adminUser = User::factory()->create(['organization_id' => $this->org->id]);

        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $this->adminUser->assignRole($adminRole);

        $this->auditService = app(AuditService::class);
    }

    /** @test */
    public function it_logs_user_login(): void
    {
        $user = User::factory()->create(['organization_id' => $this->org->id]);

        $this->actingAs($user);
        $this->auditService->logLogin($user);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action'  => 'login',
            'module'  => 'auth',
            'result'  => 'success',
        ]);
    }

    /** @test */
    public function it_logs_document_creation(): void
    {
        $user = User::factory()->create(['organization_id' => $this->org->id]);
        $this->actingAs($user);

        $this->auditService->log('create', 'ged', [
            'resource_type'  => 'Document',
            'resource_id'    => 42,
            'resource_label' => 'Contrat prestataire 2025.pdf',
            'severity'       => 'info',
            'result'         => 'success',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id'       => $user->id,
            'action'        => 'create',
            'module'        => 'ged',
            'resource_type' => 'Document',
            'resource_id'   => '42',
        ]);
    }

    /** @test */
    public function it_logs_license_change_with_old_and_new_values(): void
    {
        $this->actingAs($this->adminUser);

        $oldPlan = ['plan' => 'starter', 'seats' => 5];
        $newPlan = ['plan' => 'business', 'seats' => 20];

        $this->auditService->logLicenseChange($this->org, $oldPlan, $newPlan, 'Passage en offre Business suite à la demande du directeur');

        $this->assertDatabaseHas('audit_logs', [
            'action'  => 'license_change',
            'module'  => 'licenses',
        ]);

        // Vérifier que les valeurs old/new sont bien sauvegardées
        $log = \DB::table('audit_logs')
            ->where('action', 'license_change')
            ->where('resource_id', $this->org->id)
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($oldPlan, json_decode($log->old_values, true));
        $notes = json_decode($log->new_values, true);
        $this->assertEquals('business', $notes['plan']);
    }

    /** @test */
    public function it_logs_support_session_actions(): void
    {
        $supportUser = User::factory()->create(['organization_id' => null]);
        $superRole   = Role::firstOrCreate(['name' => 'superadmin_ibig', 'guard_name' => 'web']);
        $supportUser->assignRole($superRole);

        // Simuler une session de support active
        $this->actingAs($supportUser);
        session(['support_session_id' => 999]);

        $this->auditService->log('update', 'users', [
            'resource_type' => 'User',
            'resource_id'   => 1,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'is_support_session' => true,
            'support_session_id' => 999,
            'action'             => 'update',
        ]);
    }

    /** @test */
    public function it_does_not_allow_ordinary_users_to_delete_audit_logs(): void
    {
        $user = User::factory()->create(['organization_id' => $this->org->id]);
        $role = Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'web']);
        $user->assignRole($role);

        // Créer une entrée de log
        \DB::table('audit_logs')->insert([
            'organization_id' => $this->org->id,
            'action'          => 'login',
            'module'          => 'auth',
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);
        $logId = \DB::table('audit_logs')->orderByDesc('id')->value('id');

        // Tentative de suppression via API
        $response = $this->actingAs($user)
            ->deleteJson("/api/v1/audit-logs/{$logId}");

        $response->assertStatus(403);

        // L'entrée existe encore en base
        $this->assertDatabaseHas('audit_logs', ['id' => $logId]);
    }

    /** @test */
    public function it_exports_audit_log_as_csv(): void
    {
        $this->actingAs($this->adminUser);

        // Créer quelques entrées
        \DB::table('audit_logs')->insert([
            ['organization_id' => $this->org->id, 'user_id' => $this->adminUser->id, 'action' => 'create', 'module' => 'ged', 'created_at' => now(), 'updated_at' => now()],
            ['organization_id' => $this->org->id, 'user_id' => $this->adminUser->id, 'action' => 'login',  'module' => 'auth', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get(route('audit-log.export'));

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();

        // Vérifier les en-têtes CSV
        $this->assertStringContainsString('Date/Heure', $content);
        $this->assertStringContainsString('Action', $content);
        $this->assertStringContainsString('Module', $content);

        // Vérifier qu'aucune donnée hors-org n'est présente
        $otherOrg  = Organization::factory()->create();
        $otherUser = User::factory()->create(['organization_id' => $otherOrg->id]);
        \DB::table('audit_logs')->insert([
            'organization_id' => $otherOrg->id,
            'user_id'         => $otherUser->id,
            'user_name'       => 'HORS_ORG_USER',
            'action'          => 'login',
            'module'          => 'auth',
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        // Récupérer l'export à nouveau et vérifier l'absence de l'autre org
        $exportContent = $this->actingAs($this->adminUser)
            ->get(route('audit-log.export'))
            ->streamedContent();

        $this->assertStringNotContainsString('HORS_ORG_USER', $exportContent);
    }

    /** @test */
    public function it_masks_sensitive_fields_in_audit_log(): void
    {
        $user = User::factory()->create(['organization_id' => $this->org->id]);
        $this->actingAs($user);

        $this->auditService->log('update', 'users', [
            'resource_type' => 'User',
            'resource_id'   => $user->id,
            'old_values'    => ['email' => 'old@test.com', 'password' => 'secret123'],
            'new_values'    => ['email' => 'new@test.com', 'password' => 'newsecret'],
        ]);

        $log = \DB::table('audit_logs')
            ->where('action', 'update')
            ->where('resource_id', $user->id)
            ->latest('id')
            ->first();

        $oldValues = json_decode($log->old_values, true);
        $newValues = json_decode($log->new_values, true);

        $this->assertEquals('[REDACTED]', $oldValues['password']);
        $this->assertEquals('[REDACTED]', $newValues['password']);
        $this->assertEquals('old@test.com', $oldValues['email']);
    }
}
