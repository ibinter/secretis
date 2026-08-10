<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Workflow de congés à deux niveaux (N+1 puis RH).
 * LeaveService/LeaveController/Employee/LeaveRequest l'implémentent déjà
 * (statuts approved_n1 / approved_hr, autorisés par la migration 000007),
 * mais les colonnes traçant QUI a approuvé et QUAND n'existaient pas
 * → « column approver_n1_id does not exist » = impossible d'approuver un congé.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('leave_requests')) {
            return;
        }

        Schema::table('leave_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('leave_requests', 'approver_n1_id')) {
                $table->foreignId('approver_n1_id')->nullable()->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('leave_requests', 'approved_n1_at')) {
                $table->timestamp('approved_n1_at')->nullable();
            }
            if (! Schema::hasColumn('leave_requests', 'approver_hr_id')) {
                $table->foreignId('approver_hr_id')->nullable()->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('leave_requests', 'approved_hr_at')) {
                $table->timestamp('approved_hr_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('leave_requests')) {
            return;
        }

        Schema::table('leave_requests', function (Blueprint $table) {
            foreach (['approver_n1_id', 'approved_n1_at', 'approver_hr_id', 'approved_hr_at'] as $col) {
                if (Schema::hasColumn('leave_requests', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
