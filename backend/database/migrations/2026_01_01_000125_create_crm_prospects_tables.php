<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration 125 — Tables CRM Prospects IBIG SECRETIS
 *
 * Crée : prospects, prospect_interactions, demonstrations,
 *         commercial_offers, commercial_offer_lines, campaigns, campaign_recipients
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── prospects ──────────────────────────────────────────────────────────
        if (! Schema::hasTable('prospects')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('prospects', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete(); // si converti en client
                $table->string('first_name');
                $table->string('last_name');
                $table->string('company')->nullable();
                $table->string('function')->nullable();
                $table->string('email')->nullable();
                $table->string('phone')->nullable();
                $table->string('whatsapp')->nullable();
                $table->string('country', 5)->nullable();
                $table->string('sector')->nullable();
                $table->string('language', 5)->default('fr');
                $table->string('software')->nullable();          // SECRETIS, SECRETIS RH, etc.
                $table->string('source')->nullable();             // inbound, referral, linkedin, event, cold
                $table->string('stage')->default('new');          // pipeline stage
                $table->unsignedTinyInteger('score')->default(0); // BANT 0-100
                $table->json('bant')->nullable();                 // {budget, authority, need, timeline}
                $table->unsignedBigInteger('assigned_to')->nullable(); // user_id du commercial
                $table->text('notes')->nullable();
                $table->timestamp('next_action_at')->nullable();
                $table->string('next_action')->nullable();
                $table->timestamp('converted_at')->nullable();    // date de conversion en client
                $table->timestamps();
                $table->softDeletes();

                $table->index(['stage', 'assigned_to']);
                $table->index('email');
            });
        }

        // ── prospect_interactions ──────────────────────────────────────────────
        if (! Schema::hasTable('prospect_interactions')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('prospect_interactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('prospect_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // auteur
                $table->string('type');  // call, email, demo, offer, note, stage, meeting
                $table->text('description');
                $table->json('metadata')->nullable(); // ex: {from_stage, to_stage}
                $table->timestamps();

                $table->index(['prospect_id', 'created_at']);
            });
        }

        // ── demonstrations ─────────────────────────────────────────────────────
        if (! Schema::hasTable('demonstrations')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('demonstrations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('prospect_id')->constrained()->cascadeOnDelete();
                $table->foreignId('agent_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('software')->nullable();
                $table->string('status')->default('requested'); // requested|scheduled|confirmed|done|cancelled
                $table->timestamp('scheduled_at')->nullable();
                $table->string('timezone')->default('Africa/Abidjan');
                $table->unsignedSmallInteger('duration_min')->default(60);
                $table->string('mode')->default('visio');   // visio|presentiel
                $table->string('link')->nullable();          // lien visio
                $table->text('notes')->nullable();           // compte-rendu
                $table->timestamp('confirmed_at')->nullable();
                $table->timestamp('done_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['status', 'scheduled_at']);
            });
        }

        // ── commercial_offers ──────────────────────────────────────────────────
        if (! Schema::hasTable('commercial_offers')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('commercial_offers', function (Blueprint $table) {
                $table->id();
                $table->string('number')->unique(); // OFF-2026-001
                $table->foreignId('prospect_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete(); // si client existant
                $table->foreignId('created_by')->constrained('users');
                $table->string('software')->nullable();
                $table->string('plan')->nullable();
                $table->unsignedSmallInteger('users_count')->default(1);
                $table->unsignedSmallInteger('entities_count')->default(1);
                $table->string('period')->default('yearly'); // monthly|yearly
                $table->unsignedTinyInteger('discount_pct')->default(0);
                $table->unsignedBigInteger('amount_ht');
                $table->unsignedBigInteger('amount_ttc');
                $table->string('currency', 3)->default('XOF');
                $table->string('status')->default('draft'); // draft|sent|viewed|accepted|refused|expired
                $table->text('conditions')->nullable();
                $table->date('valid_until');
                $table->string('accept_token')->unique()->nullable(); // lien d'acceptation signé
                $table->timestamp('sent_at')->nullable();
                $table->timestamp('viewed_at')->nullable();
                $table->timestamp('accepted_at')->nullable();
                $table->timestamp('refused_at')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['status', 'valid_until']);
            });
        }

        // ── commercial_offer_lines ─────────────────────────────────────────────
        if (! Schema::hasTable('commercial_offer_lines')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('commercial_offer_lines', function (Blueprint $table) {
                $table->id();
                $table->foreignId('commercial_offer_id')->constrained()->cascadeOnDelete();
                $table->string('description');
                $table->unsignedBigInteger('unit_price');
                $table->unsignedSmallInteger('quantity')->default(1);
                $table->unsignedBigInteger('total');
                $table->unsignedTinyInteger('sort_order')->default(0);
                $table->timestamps();
            });
        }

        // ── campaigns ──────────────────────────────────────────────────────────
        if (! Schema::hasTable('campaigns')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('campaigns', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('type');     // email|whatsapp
                $table->string('target');   // all|stage:{stage}|software:{sw}|assigned:{user_id}
                $table->string('status')->default('draft'); // draft|scheduled|running|done|paused
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->text('message_template')->nullable();
                $table->string('subject')->nullable();        // pour email
                $table->unsignedInteger('min_interval_days')->default(7); // anti-spam
                $table->unsignedInteger('sent_count')->default(0);
                $table->unsignedInteger('open_count')->default(0);
                $table->unsignedInteger('click_count')->default(0);
                $table->unsignedInteger('conversion_count')->default(0);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('launched_at')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // ── campaign_recipients ────────────────────────────────────────────────
        if (! Schema::hasTable('campaign_recipients')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('campaign_recipients', function (Blueprint $table) {
                $table->id();
                $table->foreignId('campaign_id')->constrained()->cascadeOnDelete();
                $table->foreignId('prospect_id')->constrained()->cascadeOnDelete();
                $table->string('status')->default('pending'); // pending|sent|opened|clicked|converted|unsubscribed
                $table->timestamp('sent_at')->nullable();
                $table->timestamp('opened_at')->nullable();
                $table->timestamp('clicked_at')->nullable();
                $table->timestamp('converted_at')->nullable();
                $table->timestamps();

                $table->unique(['campaign_id', 'prospect_id']);
                $table->index(['campaign_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_recipients');
        Schema::dropIfExists('campaigns');
        Schema::dropIfExists('commercial_offer_lines');
        Schema::dropIfExists('commercial_offers');
        Schema::dropIfExists('demonstrations');
        Schema::dropIfExists('prospect_interactions');
        Schema::dropIfExists('prospects');
    }
};
