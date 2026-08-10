<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Table notifications deja creee par Laravel 11 - ajouter colonnes manquantes si besoin
        if (!Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->morphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }

        // Ajouter colonnes SECRETIS si absentes
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                if (!Schema::hasColumn('notifications', 'organization_id')) {
                    $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
                }
                if (!Schema::hasColumn('notifications', 'is_read')) {
                    $table->boolean('is_read')->default(false);
                }
                if (!Schema::hasColumn('notifications', 'priority')) {
                    $table->string('priority')->default('normal');
                }
                if (!Schema::hasColumn('notifications', 'link')) {
                    $table->string('link')->nullable();
                }
                if (!Schema::hasColumn('notifications', 'icon')) {
                    $table->string('icon')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('notifications')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->dropColumn(['organization_id', 'is_read', 'priority', 'link', 'icon']);
            });
        }
    }
};
