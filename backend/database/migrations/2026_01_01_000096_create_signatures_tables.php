<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ---------------------------------------------------------------
        // 1. Demandes de signature
        // ---------------------------------------------------------------
        if (! Schema::hasTable('signature_requests')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('signature_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('document_id')->constrained()->cascadeOnDelete();
                $table->string('title');
                $table->text('message')->nullable();
                $table->enum('status', [
                    'draft',
                    'pending',
                    'partially_signed',
                    'completed',
                    'cancelled',
                    'expired',
                ])->default('draft');
                $table->enum('signing_order', ['parallel', 'sequential'])->default('parallel');
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->timestamps();

                $table->index('organization_id');
                $table->index('document_id');
                $table->index('created_by');
                $table->index('status');
            });
        }

        // ---------------------------------------------------------------
        // 2. Signataires par demande
        // ---------------------------------------------------------------
        if (! Schema::hasTable('signature_request_signers')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('signature_request_signers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('request_id')->constrained('signature_requests')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('name');
                $table->string('email');
                $table->unsignedSmallInteger('order')->default(1); // ordre de signature
                $table->enum('status', [
                    'pending',
                    'signed',
                    'declined',
                    'bounced',
                ])->default('pending');
                $table->timestamp('signed_at')->nullable();
                $table->text('decline_reason')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->uuid('token')->unique(); // token unique pour le lien de signature
                $table->timestamps();

                $table->index('request_id');
                $table->index('user_id');
                $table->index('token');
                $table->index('status');
            });
        }

        // ---------------------------------------------------------------
        // 3. Signatures effectuées sur les documents
        // ---------------------------------------------------------------
        if (! Schema::hasTable('document_signatures')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('document_signatures', function (Blueprint $table) {
                $table->id();
                $table->foreignId('request_id')->constrained('signature_requests')->cascadeOnDelete();
                $table->foreignId('signer_id')->constrained('signature_request_signers')->cascadeOnDelete();
                $table->foreignId('document_id')->constrained()->cascadeOnDelete();
                // coordonnées SVG du tracé + hash du contenu de signature
                $table->jsonb('signature_data');
                // chemin vers l'image PNG générée
                $table->string('signature_image_path')->nullable();
                // données du certificat cryptographique
                $table->jsonb('certificate_data')->nullable();
                $table->timestamp('signed_at');
                $table->string('ip_address', 45)->nullable();
                $table->timestamps();

                $table->index('request_id');
                $table->index('signer_id');
                $table->index('document_id');
            });
        }

        // ---------------------------------------------------------------
        // 4. Piste d'audit de signature
        // ---------------------------------------------------------------
        if (! Schema::hasTable('signature_audit_trail')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('signature_audit_trail', function (Blueprint $table) {
                $table->id();
                $table->foreignId('request_id')->constrained('signature_requests')->cascadeOnDelete();
                $table->string('event_type'); // created, sent, viewed, signed, declined, completed, cancelled, reminder_sent
                $table->string('actor_email')->nullable();
                $table->string('actor_ip', 45)->nullable();
                $table->jsonb('data')->nullable(); // métadonnées de l'événement
                $table->timestamp('created_at')->useCurrent();

                $table->index('request_id');
                $table->index('event_type');
                $table->index('created_at');
            });
        }

        // ---------------------------------------------------------------
        // 5. Colonnes OCR sur la table documents (si elle n'existe pas encore)
        // ---------------------------------------------------------------
        if (Schema::hasTable('documents') && !Schema::hasColumn('documents', 'text_content')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->text('text_content')->nullable()->after('tags');
                $table->enum('ocr_status', ['none', 'pending', 'processing', 'done', 'failed'])
                      ->default('none')->after('text_content');
                $table->json('ocr_data')->nullable()->after('ocr_status'); // données structurées extraites
                // Index GIN PostgreSQL pour la recherche full-text
                // Note: créé séparément via statement()
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('signature_audit_trail');
        Schema::dropIfExists('document_signatures');
        Schema::dropIfExists('signature_request_signers');
        Schema::dropIfExists('signature_requests');

        if (Schema::hasColumn('documents', 'text_content')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->dropColumn(['text_content', 'ocr_status', 'ocr_data']);
            });
        }
    }
};
