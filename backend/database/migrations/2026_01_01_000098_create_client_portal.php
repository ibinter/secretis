<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Clients portail (comptes séparés des users SECRETIS) ─────────────
        if (! Schema::hasTable('portal_clients')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('portal_clients', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('email')->unique();
                $table->string('phone')->nullable();
                $table->string('company')->nullable();
                $table->string('password');             // hash bcrypt
                $table->boolean('is_active')->default(true);
                $table->timestamp('last_login_at')->nullable();
                $table->string('remember_token', 100)->nullable();
                $table->timestamps();

                $table->index('organization_id');
                $table->index('email');
                $table->index('is_active');
            });
        }

        // ─── Documents partagés avec les clients ──────────────────────────────
        if (! Schema::hasTable('portal_shared_documents')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('portal_shared_documents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('portal_client_id')->constrained('portal_clients')->cascadeOnDelete();
                $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
                $table->string('title');
                $table->timestamp('expires_at')->nullable();
                $table->boolean('can_download')->default(false);
                $table->boolean('can_comment')->default(false);
                $table->unsignedInteger('view_count')->default(0);
                $table->timestamps();

                $table->index('organization_id');
                $table->index('portal_client_id');
                $table->index('document_id');
            });
        }

        // ─── Messages entre client et organisation ────────────────────────────
        if (! Schema::hasTable('portal_messages')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('portal_messages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('portal_client_id')->constrained('portal_clients')->cascadeOnDelete();
                $table->enum('direction', ['from_client', 'from_org']);
                $table->string('subject');
                $table->longText('body');
                $table->boolean('is_read')->default(false);
                $table->foreignId('replied_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index('organization_id');
                $table->index('portal_client_id');
                $table->index('direction');
                $table->index('is_read');
            });
        }

        // ─── Accès factures pour paiement en ligne ────────────────────────────
        if (! Schema::hasTable('portal_invoices_access')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('portal_invoices_access', function (Blueprint $table) {
                $table->id();
                $table->foreignId('portal_client_id')->constrained('portal_clients')->cascadeOnDelete();
                $table->unsignedBigInteger('invoice_id'); // FK vers la table factures (compta)
                $table->boolean('can_pay_online')->default(true);
                $table->timestamps();

                $table->unique(['portal_client_id', 'invoice_id']);
                $table->index('portal_client_id');
                $table->index('invoice_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('portal_invoices_access');
        Schema::dropIfExists('portal_messages');
        Schema::dropIfExists('portal_shared_documents');
        Schema::dropIfExists('portal_clients');
    }
};
