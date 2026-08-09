<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('email_logs')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('email_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

                // Type d'email : welcome | expiring_7 | expiring_3 | expiring_1 |
                //                expired | receipt | demo | offer |
                //                ticket_created | ticket_resolved | suspended | suspicious_login
                $table->string('type', 50);

                $table->string('email');
                $table->string('subject');

                $table->enum('status', ['queued', 'sent', 'failed', 'bounced'])->default('queued');

                // Clé d'idempotence pour éviter les doublons (UNIQUE)
                $table->string('idempotency_key')->unique()->nullable();

                // Payload métier utile (license_id, ticket_id, payment_id…)
                $table->json('metadata')->nullable();

                $table->timestamp('sent_at')->nullable();
                $table->string('error_message')->nullable();
                $table->timestamps();

                // Index de recherche courants
                $table->index(['organization_id', 'type'], 'email_logs_org_type_idx');
                $table->index(['user_id', 'type', 'created_at'], 'email_logs_user_type_date_idx');
                $table->index(['type', 'status'], 'email_logs_type_status_idx');
                $table->index('created_at', 'email_logs_created_at_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('email_logs');
    }
};
