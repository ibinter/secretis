<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('visitors')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('visitors')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
                Schema::create('visitors', function (Blueprint $table) {
                    $table->id();
                    $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                    $table->string('first_name');
                    $table->string('last_name');
                    $table->string('email')->nullable();
                    $table->string('phone')->nullable();
                    $table->string('id_type')->nullable(); // passport, national_id, driver_license
                    $table->string('id_number')->nullable();
                    $table->string('company')->nullable();
                    $table->string('photo_path')->nullable();
                    $table->text('notes')->nullable();
                    $table->timestamps();

                    $table->index('organization_id');
                    $table->index(['organization_id', 'email']);
                });
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('visitors');
    }
};
