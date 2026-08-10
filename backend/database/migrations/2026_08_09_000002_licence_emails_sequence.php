<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Journal des e-mails de la séquence d'essai et d'expiration.
 * Cahier IBIG SOFT v1.1, sections 5.4, 8.6 et 8.8.
 *
 * POURQUOI UNE TABLE PLUTÔT QUE LE CACHE
 * --------------------------------------
 * Le code existant (App\Jobs\SendTrialExpiryReminders) traçait ses envois dans
 * le cache, avec une clé qui expire à minuit. Deux conséquences :
 *   — un `cache:clear` en cours de journée fait repartir les envois à zéro ;
 *   — la règle « J+7 est une relance UNIQUE » (section 8.6) est intenable,
 *     puisque plus rien ne s'en souvient le lendemain.
 * La contrainte d'unicité (license_id, jalon) porte donc ici les deux règles à
 * la fois : idempotence d'une journée, et unicité définitive de la relance.
 *
 * Ce n'est pas `license_transitions` : ce journal-là décrit des changements
 * d'état, pas des envois, et il est délibérément non modifiable. Un envoi qui
 * échoue doit pouvoir être « déréservé » pour être retenté — impossible dans
 * une table qui refuse DELETE.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('licence_emails')) {
            return;
        }

        Schema::create('licence_emails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('license_id')->constrained('licenses')->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('solution', 32)->default('secretis');

            // Jalon de la séquence : J+1, J-3, J-1, J0, J+7 (section 5.4),
            // J+60 et J+83 (section 8.8). Volontairement stocké tel qu'il est
            // écrit dans le cahier : un lecteur du journal retrouve la section.
            $table->string('jalon', 8);

            $table->string('destinataire');
            $table->string('sujet');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('envoye_le')->useCurrent();

            // Le cœur de l'idempotence. Une licence ne reçoit jamais deux fois
            // le même jalon, quel que soit le nombre d'exécutions.
            $table->unique(['license_id', 'jalon'], 'licence_emails_unique_jalon');
            $table->index(['organization_id', 'envoye_le']);
        });

        DB::statement(
            "ALTER TABLE licence_emails ADD CONSTRAINT licence_emails_jalon_valide
             CHECK (jalon IN ('J+1','J-3','J-1','J0','J+7','J+60','J+83'))"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('licence_emails');
    }
};
