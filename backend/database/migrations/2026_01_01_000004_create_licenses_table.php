<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('licenses')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('licenses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('plan_id'); // starter, pro, enterprise
                $table->string('plan_name');
                $table->decimal('price', 10, 2)->default(0);
                $table->string('billing_cycle')->default('monthly'); // monthly, yearly
                $table->enum('status', ['trial', 'active', 'suspended', 'expired', 'cancelled'])->default('trial');
                $table->integer('max_users')->default(5);
                $table->json('features')->nullable();
                $table->json('modules')->nullable();
                $table->timestamp('starts_at');
                $table->timestamp('ends_at');
                $table->timestamp('grace_until')->nullable();
                $table->foreignId('activated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('suspended_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('suspension_reason')->nullable();
                $table->string('external_ref')->nullable();
                $table->timestamps();

                $table->index('organization_id');
                $table->index('status');
                $table->index('ends_at');
                $table->index('grace_until');
                $table->index('plan_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('licenses');
    }
};
