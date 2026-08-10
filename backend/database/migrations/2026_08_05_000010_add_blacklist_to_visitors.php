<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Liste noire visiteurs : VisitorService::blacklist() et VisitorController
 * écrivent/lisent is_blacklisted et blacklist_reason, absentes de la table
 * → /reception/blacklist renvoyait une 500.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('visitors')) {
            return;
        }

        Schema::table('visitors', function (Blueprint $table) {
            if (! Schema::hasColumn('visitors', 'is_blacklisted')) {
                $table->boolean('is_blacklisted')->default(false);
            }
            if (! Schema::hasColumn('visitors', 'blacklist_reason')) {
                $table->text('blacklist_reason')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('visitors')) {
            return;
        }

        Schema::table('visitors', function (Blueprint $table) {
            foreach (['is_blacklisted', 'blacklist_reason'] as $col) {
                if (Schema::hasColumn('visitors', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
