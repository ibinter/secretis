<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
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

    public function down(): void
    {
        Schema::dropIfExists('licenses');
    }
};
