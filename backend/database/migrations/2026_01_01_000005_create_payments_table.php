<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payments')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('license_id')->nullable()->constrained()->nullOnDelete();
                $table->string('idempotency_key')->unique();
                $table->decimal('amount', 10, 2);
                $table->string('currency', 3)->default('XOF');
                $table->enum('method', ['mobile_money', 'bank_transfer', 'card', 'cash', 'other'])->default('mobile_money');
                $table->enum('status', ['pending', 'validated', 'rejected', 'refunded'])->default('pending');
                $table->string('proof_path')->nullable();
                $table->string('reference')->nullable();
                $table->text('notes')->nullable();
                $table->json('metadata')->nullable();
                $table->foreignId('validated_by_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('validated_at')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->timestamps();

                $table->index('organization_id');
                $table->index('license_id');
                $table->index('status');
                $table->index('paid_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
