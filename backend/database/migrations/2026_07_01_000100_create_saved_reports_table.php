<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('saved_reports')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('saved_reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->text('description')->nullable();
                $table->jsonb('config')->default('{}');
                $table->boolean('is_public')->default(false);
                $table->string('schedule', 100)->nullable()->comment('Expression CRON — null = pas de planification');
                $table->timestamp('last_run_at')->nullable();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->index('organization_id');
                $table->index(['organization_id', 'is_public']);
                $table->index(['organization_id', 'schedule']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_reports');
    }
};
