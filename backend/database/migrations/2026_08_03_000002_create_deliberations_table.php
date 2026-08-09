<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('deliberations')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('deliberations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id');
                $table->unsignedBigInteger('meeting_id')->nullable();
                $table->string('reference')->nullable();
                $table->string('title');
                $table->text('body')->nullable();
                $table->text('decision')->nullable();
                $table->text('action_required')->nullable();
                $table->unsignedBigInteger('responsible_id')->nullable();
                $table->date('deadline')->nullable();
                $table->enum('status', ['pending', 'in_progress', 'done', 'cancelled'])->default('pending');
                $table->string('category')->nullable();
                $table->unsignedSmallInteger('position')->default(0);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
                $table->foreign('meeting_id')->references('id')->on('meetings')->nullOnDelete();
                $table->foreign('responsible_id')->references('id')->on('users')->nullOnDelete();
                $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

                $table->index(['organization_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('deliberations');
    }
};
