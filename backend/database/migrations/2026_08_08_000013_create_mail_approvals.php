<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parapheur — circuit de visa avant départ d'un courrier.
 *
 * C'est la pièce manquante du parcours du secrétariat : « recevoir → viser →
 * répondre → archiver ». Le « répondre » a été ajouté (chaînage arrivée ↔
 * réponse) ; le VISA, lui, n'existait nulle part. Un courrier partait sans
 * qu'aucune trace n'atteste qui l'avait approuvé.
 *
 * ⚠️ Un moteur de workflow existe pour la GED (`document_workflow_*`), et l'idée
 * de le réutiliser a été examinée puis écartée : il est couplé au modèle
 * `Document` en huit endroits et ses trois tables sont VIDES — il n'a jamais
 * tourné. L'adapter aurait signifié refactoriser du code non éprouvé. Le visa
 * de courrier est par ailleurs un objet métier distinct, avec sa propre issue :
 * le « bon pour envoi ».
 *
 * Le circuit est SÉQUENTIEL : les visas s'obtiennent dans l'ordre hiérarchique.
 * Un visa parallèle n'aurait pas de sens ici — le chef de service vise avant le
 * directeur, pas en même temps.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('mail_approvals')) {
            return;
        }

        Schema::create('mail_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mail_id')->constrained('mail_registry')->cascadeOnDelete();

            // Rang dans le circuit : 1 vise avant 2.
            $table->unsignedSmallInteger('step_order');

            $table->foreignId('approver_id')->constrained('users')->cascadeOnDelete();
            // Ce au titre de quoi la personne vise : « Chef de service »,
            // « Directeur ». Figé à la soumission : un changement de poste
            // ultérieur ne doit pas réécrire l'histoire du visa.
            $table->string('approver_role')->nullable();

            // pending : pas encore son tour — in_progress : à viser maintenant
            // approved / rejected / sent_back : décision rendue
            // skipped : circuit interrompu en amont
            $table->string('status', 20)->default('pending');

            $table->text('comment')->nullable();
            $table->timestamp('acted_at')->nullable();

            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['mail_id', 'step_order']);
            // Sert la question la plus fréquente : « qu'ai-je à viser ? »
            $table->index(['approver_id', 'status']);
            $table->unique(['mail_id', 'step_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_approvals');
    }
};
