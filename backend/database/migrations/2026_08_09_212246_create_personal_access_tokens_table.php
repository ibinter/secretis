<?php

/*
 * MIGRATION DE PAQUET, PUBLIEE TARDIVEMENT.
 *
 * Ces tables existent en production depuis toujours, mais AUCUNE MIGRATION DU
 * DEPOT NE LES CREAIT : elles venaient de `vendor:publish`, dont le resultat
 * n'avait jamais ete versionne. Une installation neuve se retrouvait donc sans
 * roles, sans permissions et sans jetons d'API — c'est-a-dire sans
 * authentification ni autorisation, alors que toutes les migrations passaient.
 *
 * Les creations sont protegees par `hasTable` : la production a deja ces
 * tables, et cette migration ne doit pas tenter de les recreer.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->text('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable()->index();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
