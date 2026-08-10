<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('projects')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('projects')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
                Schema::create('projects', function (Blueprint $table) {
                    $table->id();
                    $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                    $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                    $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
                    $table->string('name');
                    $table->string('code')->nullable();
                    $table->text('description')->nullable();
                    $table->string('color', 7)->nullable();
                    $table->enum('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled'])->default('planning');
                    $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');
                    $table->timestamp('start_date')->nullable();
                    $table->timestamp('end_date')->nullable();
                    $table->decimal('budget', 15, 2)->nullable();
                    $table->integer('progress')->default(0);
                    $table->json('members')->nullable();
                    $table->json('settings')->nullable();
                    $table->timestamps();
                    $table->softDeletes();

                    $table->unique(['organization_id', 'code']);
                    $table->index('organization_id');
                    $table->index('manager_id');
                    $table->index('status');
                });
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
