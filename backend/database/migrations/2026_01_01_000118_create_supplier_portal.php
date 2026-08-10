<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── FOURNISSEURS ───────────────────────────────────────────────────
        if (! Schema::hasTable('suppliers')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('suppliers', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id')->index();
                $table->string('supplier_number', 20)->unique(); // FOURN-0001
                $table->string('company_name');
                $table->string('legal_form', 50)->nullable(); // SARL, SA, GIE, EI…
                // ATTENTION : `->default()` entoure la valeur de guillemets simples
                // SANS echapper ceux qu'elle contient. « Cote d'Ivoire » produisait
                // donc `default 'Cote d'Ivoire'` — erreur de syntaxe PostgreSQL qui
                // faisait echouer TOUTE la migration, et avec elle les tables
                // suppliers, rfqs, quotations et goods_receipts.
                //
                // NB : un defaut par pays est discutable pour un produit multi-pays.
                // Conserve tel quel : on corrige une erreur de syntaxe, pas un choix
                // fonctionnel.
                $table->string('country', 100)->default(DB::raw("'Côte d''Ivoire'"));
                $table->string('city', 100)->nullable();
                $table->string('address')->nullable();
                $table->string('contact_name')->nullable();
                $table->string('email')->nullable();
                $table->string('phone', 30)->nullable();
                $table->string('website')->nullable();
                $table->string('tax_number', 50)->nullable();   // NIF
                $table->string('rccm', 50)->nullable();          // Registre Commerce
                $table->string('bank_name', 100)->nullable();
                $table->string('bank_iban', 50)->nullable();
                $table->string('bank_swift', 20)->nullable();
                $table->enum('category', ['materiel', 'services', 'consommables', 'travaux', 'it', 'autre'])
                      ->default('services');
                $table->enum('status', ['prospect', 'actif', 'suspendu', 'blackliste'])
                      ->default('prospect');
                $table->unsignedTinyInteger('rating')->default(3); // 1-5
                $table->unsignedSmallInteger('payment_terms_days')->default(30); // 30/45/60/90
                $table->string('currency_code', 3)->default('XOF');
                $table->text('notes')->nullable();
                // Accès portail fournisseur
                $table->boolean('portal_access')->default(false);
                $table->string('portal_email')->nullable();
                $table->string('portal_password_hash')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['organization_id', 'status']);
                $table->index(['organization_id', 'category']);
            });
        }

        // ─── DEMANDES D'ACHAT ───────────────────────────────────────────────
        if (! Schema::hasTable('purchase_requests')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('purchase_requests', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id')->index();
                $table->string('pr_number', 25)->unique(); // DA-2026-00001
                $table->string('title');
                $table->text('description')->nullable();
                $table->unsignedBigInteger('requestor_user_id');
                $table->unsignedBigInteger('department_id')->nullable();
                $table->enum('priority', ['normale', 'urgente', 'tres_urgente'])->default('normale');
                $table->enum('status', ['brouillon', 'soumis', 'approuve', 'refuse', 'annule', 'converti'])
                      ->default('brouillon');
                $table->decimal('total_estimated_xof', 15, 2)->default(0);
                $table->jsonb('items')->nullable();
                // [{description, qty, unit, unit_price_est, total_est}]
                $table->text('justification')->nullable();
                $table->date('needed_by_date')->nullable();
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->text('refusal_reason')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['organization_id', 'status']);
                $table->index(['organization_id', 'requestor_user_id']);
            });
        }

        // ─── APPELS D'OFFRES ────────────────────────────────────────────────
        if (! Schema::hasTable('rfqs')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('rfqs')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
                Schema::create('rfqs', function (Blueprint $table) {
                    $table->id();
                    $table->unsignedBigInteger('organization_id')->index();
                    $table->string('rfq_number', 25)->unique(); // AO-2026-00001
                    $table->string('title');
                    $table->text('description')->nullable();
                    $table->unsignedBigInteger('purchase_request_id')->nullable();
                    $table->jsonb('items')->nullable();
                    // [{description, qty, unit, specifications}]
                    $table->dateTime('closing_date');
                    $table->enum('status', ['brouillon', 'publie', 'clos', 'annule'])->default('brouillon');
                    $table->unsignedBigInteger('selected_quotation_id')->nullable();
                    $table->jsonb('evaluation_criteria')->nullable();
                    // [{name, weight, type: technique|financier}]
                    $table->text('notes')->nullable();
                    $table->unsignedBigInteger('created_by');
                    $table->timestamps();
                    $table->softDeletes();

                    $table->index(['organization_id', 'status']);
                });
            }
        }

        // ─── FOURNISSEURS INVITÉS À UN AO ───────────────────────────────────
        if (! Schema::hasTable('rfq_suppliers')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('rfq_suppliers')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
                Schema::create('rfq_suppliers', function (Blueprint $table) {
                    $table->id();
                    $table->unsignedBigInteger('rfq_id');
                    $table->unsignedBigInteger('supplier_id');
                    $table->timestamp('invited_at')->nullable();
                    $table->timestamp('responded_at')->nullable();
                    $table->enum('status', ['invite', 'repondu', 'refuse', 'selectionne', 'elimine'])
                          ->default('invite');
                    $table->timestamps();

                    $table->unique(['rfq_id', 'supplier_id']);
                    $table->index('rfq_id');
                    $table->index('supplier_id');
                });
            }
        }

        // ─── DEVIS / OFFRES ─────────────────────────────────────────────────
        if (! Schema::hasTable('quotations')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('quotations')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
                Schema::create('quotations', function (Blueprint $table) {
                    $table->id();
                    $table->unsignedBigInteger('rfq_id');
                    $table->unsignedBigInteger('supplier_id');
                    $table->unsignedBigInteger('organization_id')->index();
                    $table->string('quotation_number', 25)->unique(); // DEV-2026-00001
                    $table->jsonb('items')->nullable();
                    // [{description, qty, unit, unit_price, total, delivery_days}]
                    $table->decimal('total_amount_xof', 15, 2)->default(0);
                    $table->string('currency_code', 3)->default('XOF');
                    $table->unsignedSmallInteger('validity_days')->default(30);
                    $table->unsignedSmallInteger('delivery_days')->nullable();
                    $table->string('payment_terms', 100)->nullable();
                    $table->decimal('technical_score', 5, 2)->default(0);   // 0-100
                    $table->decimal('financial_score', 5, 2)->default(0);   // 0-100
                    $table->decimal('total_score', 5, 2)->default(0);        // 0-100
                    $table->enum('status', ['soumis', 'evalue', 'selectionne', 'rejete'])->default('soumis');
                    $table->text('notes')->nullable();
                    $table->string('file_path')->nullable(); // PDF devis
                    $table->timestamp('submitted_at')->nullable();
                    $table->timestamps();

                    $table->index(['rfq_id', 'status']);
                    $table->index(['supplier_id']);
                });
            }
        }

        // ─── BONS DE COMMANDE ───────────────────────────────────────────────
        if (! Schema::hasTable('purchase_orders')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('purchase_orders', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('organization_id')->index();
                $table->string('po_number', 25)->unique(); // BC-2026-00001
                $table->unsignedBigInteger('supplier_id');
                $table->unsignedBigInteger('rfq_id')->nullable();
                $table->unsignedBigInteger('quotation_id')->nullable();
                $table->unsignedBigInteger('purchase_request_id')->nullable();
                $table->enum('status', [
                    'brouillon', 'approuve', 'envoye', 'accuse',
                    'livre_partiel', 'livre', 'facture', 'clos', 'annule'
                ])->default('brouillon');
                $table->jsonb('items')->nullable();
                // [{description, qty, unit, unit_price, total, tax_rate}]
                $table->decimal('total_amount_xof', 15, 2)->default(0);
                $table->string('currency_code', 3)->default('XOF');
                $table->unsignedSmallInteger('payment_terms_days')->default(30);
                $table->text('delivery_address')->nullable();
                $table->date('expected_delivery_date')->nullable();
                $table->date('actual_delivery_date')->nullable();
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->unsignedBigInteger('created_by');
                $table->string('invoice_path')->nullable(); // Facture fournisseur
                $table->timestamps();
                $table->softDeletes();

                $table->index(['organization_id', 'status']);
                $table->index(['supplier_id']);
            });
        }

        // ─── BONS DE RÉCEPTION ──────────────────────────────────────────────
        if (! Schema::hasTable('goods_receipts')) {
            // Création protégée : cette table est créée par PLUSIEURS migrations
            // du dépôt. Sans ce test, rejouer les migrations sur une base
            // neuve échouait dès la seconde création (« relation already
            // exists ») — c'est pourquoi le dépôt ne savait pas reconstruire sa
            // propre base. Le premier créateur fait foi ; les écarts de schéma
            // entre versions sont traités par les migrations d'ajout de
            // colonnes qui suivent.
            if (! Schema::hasTable('goods_receipts')) {
                // Création idempotente. La production porte des migrations
                // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
                // tables avant d'échouer, puis ont été marquées comme jouées. Les
                // rejouer pour créer ce qui manque exige que chaque création sache
                // ne rien faire quand la table est déjà là.
                Schema::create('goods_receipts', function (Blueprint $table) {
                    $table->id();
                    $table->unsignedBigInteger('purchase_order_id');
                    $table->unsignedBigInteger('organization_id')->index();
                    $table->string('receipt_number', 25)->unique(); // BR-2026-00001
                    $table->unsignedBigInteger('received_by');
                    $table->date('received_date');
                    $table->jsonb('items_received')->nullable();
                    // [{po_item_ref, description, qty_ordered, qty_received, qty_rejected, rejection_reason}]
                    $table->enum('status', ['partiel', 'complet', 'rejete'])->default('complet');
                    $table->text('notes')->nullable();
                    $table->string('signature_path')->nullable();
                    $table->timestamps();

                    $table->index('purchase_order_id');
                });
            }
        }

        // ─── ÉVALUATIONS FOURNISSEURS ────────────────────────────────────────
        if (! Schema::hasTable('supplier_evaluations')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('supplier_evaluations', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('supplier_id');
                $table->unsignedBigInteger('organization_id')->index();
                $table->unsignedBigInteger('purchase_order_id')->nullable();
                $table->date('evaluation_date');
                $table->unsignedBigInteger('evaluator_user_id');
                $table->unsignedTinyInteger('quality_score');      // 1-5
                $table->unsignedTinyInteger('delivery_score');     // 1-5
                $table->unsignedTinyInteger('price_score');        // 1-5
                $table->unsignedTinyInteger('communication_score'); // 1-5
                $table->decimal('overall_score', 4, 2)->default(0); // calculé
                $table->text('comments')->nullable();
                $table->boolean('recommend')->default(true);
                $table->timestamps();

                $table->index(['supplier_id', 'organization_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_evaluations');
        Schema::dropIfExists('goods_receipts');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('rfq_suppliers');
        Schema::dropIfExists('rfqs');
        Schema::dropIfExists('purchase_requests');
        Schema::dropIfExists('suppliers');
    }
};
