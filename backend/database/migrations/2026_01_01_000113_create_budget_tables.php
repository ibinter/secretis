<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // -----------------------------------------------------------------
        // 1. budgets
        // -----------------------------------------------------------------
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedBigInteger('fiscal_year_id')->nullable(); // FK vers fiscal_years si présente
            $table->enum('type', ['operationnel', 'investissement', 'projet', 'departement'])->default('operationnel');
            $table->enum('status', ['draft', 'approved', 'active', 'closed'])->default('draft');
            $table->decimal('total_amount', 18, 2)->default(0);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('organization_id');
            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'fiscal_year_id']);
        });

        // -----------------------------------------------------------------
        // 2. budget_lines
        // -----------------------------------------------------------------
        Schema::create('budget_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained()->cascadeOnDelete();
            $table->string('account_number', 20);          // Code SYSCOHADA (ex: 601, 7011…)
            $table->string('account_name');
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('project_id')->nullable();    // FK souple
            $table->text('description')->nullable();
            $table->decimal('q1_amount', 18, 2)->default(0);
            $table->decimal('q2_amount', 18, 2)->default(0);
            $table->decimal('q3_amount', 18, 2)->default(0);
            $table->decimal('q4_amount', 18, 2)->default(0);
            // annual_amount = q1+q2+q3+q4 — calculé par un virtualAs ou mis à jour en service
            $table->decimal('annual_amount', 18, 2)->default(0);
            $table->boolean('is_income')->default(false);  // true = produit, false = charge
            $table->enum('category', ['personnel', 'fonctionnement', 'investissement', 'impots', 'autres'])
                  ->default('fonctionnement');
            $table->timestamps();

            $table->index('budget_id');
            $table->index(['budget_id', 'account_number']);
            $table->index(['budget_id', 'department_id']);
            $table->index(['budget_id', 'category']);
        });

        // -----------------------------------------------------------------
        // 3. budget_revisions
        // -----------------------------------------------------------------
        Schema::create('budget_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('revision_number')->default(1);
            $table->text('reason');
            $table->jsonb('previous_lines');           // Snapshot JSON des lignes avant révision
            $table->foreignId('revised_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('revised_at')->nullable();
            $table->timestamps();

            $table->index('budget_id');
        });

        // -----------------------------------------------------------------
        // 4. budget_alerts
        // -----------------------------------------------------------------
        Schema::create('budget_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('budget_line_id')->constrained()->cascadeOnDelete();
            $table->enum('alert_type', ['threshold_50', 'threshold_80', 'threshold_100', 'exceeded'])
                  ->default('threshold_80');
            $table->unsignedTinyInteger('threshold_percent')->default(80);
            $table->jsonb('notification_user_ids')->default('[]');  // [user_id, ...]
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('organization_id');
            $table->index('budget_line_id');
            $table->index(['organization_id', 'is_active']);
        });

        // -----------------------------------------------------------------
        // 5. actuals_cache
        // -----------------------------------------------------------------
        Schema::create('actuals_cache', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('budget_id')->constrained()->cascadeOnDelete();
            $table->string('account_number', 20);
            $table->unsignedTinyInteger('period_month');  // 1–12
            $table->unsignedSmallInteger('period_year');
            $table->decimal('actual_amount', 18, 2)->default(0);
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->unique(['budget_id', 'account_number', 'period_month', 'period_year'], 'actuals_cache_unique');
            $table->index(['budget_id', 'account_number']);
            $table->index(['organization_id', 'period_year', 'period_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actuals_cache');
        Schema::dropIfExists('budget_alerts');
        Schema::dropIfExists('budget_revisions');
        Schema::dropIfExists('budget_lines');
        Schema::dropIfExists('budgets');
    }
};
