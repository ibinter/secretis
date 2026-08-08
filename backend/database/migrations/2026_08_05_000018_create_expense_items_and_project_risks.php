<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * 1) expense_items — lignes d'une note de frais (modèle ExpenseItem existant,
 *    table absente) → 500 sur la liste des congés/notes de frais.
 * 2) project_risks — ProjectController expose déjà risks()/storeRisk() et charge
 *    la relation `risks`, sans table ni modèle → 500 sur la fiche projet.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('expense_items')) {
            Schema::create('expense_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('expense_report_id')->constrained('expense_reports')->cascadeOnDelete();
                $table->string('category', 100)->nullable();
                $table->string('description', 500)->nullable();
                $table->decimal('amount', 15, 2)->default(0);
                $table->string('receipt_path')->nullable();
                $table->date('expense_date')->nullable();
                $table->timestamps();

                $table->index('expense_report_id');
            });
        }

        if (! Schema::hasTable('project_risks')) {
            Schema::create('project_risks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
                $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('probability', 10)->default('low'); // low|medium|high
                $table->string('impact', 10)->default('low');      // low|medium|high
                $table->text('mitigation')->nullable();
                $table->string('status', 20)->default('open');     // open|mitigated|closed
                $table->timestamps();

                $table->index(['project_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('project_risks');
        Schema::dropIfExists('expense_items');
    }
};
