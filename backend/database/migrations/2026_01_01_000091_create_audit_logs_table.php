<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('audit_logs')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('audit_logs')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
                Schema::create('audit_logs', function (Blueprint $table) {
                    $table->id();
                    $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
                    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                    $table->string('event'); // created, updated, deleted, login, logout, etc.
                    $table->string('auditable_type')->nullable();
                    $table->unsignedBigInteger('auditable_id')->nullable();
                    $table->json('old_values')->nullable();
                    $table->json('new_values')->nullable();
                    $table->string('url')->nullable();
                    $table->string('ip_address', 45)->nullable();
                    $table->string('user_agent')->nullable();
                    $table->json('tags')->nullable();
                    // Insert-only table: no updated_at
                    $table->timestamp('created_at')->useCurrent();

                    $table->index('organization_id');
                    $table->index('user_id');
                    $table->index('event');
                    $table->index(['auditable_type', 'auditable_id']);
                    $table->index('created_at');
                });
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
