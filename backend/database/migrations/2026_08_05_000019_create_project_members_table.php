<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Membres d'un projet. ProjectService charge `members.user` et compte
 * `$project->members` alors qu'aucune relation ni table n'existait
 * (la colonne JSON `projects.members` ne peut pas servir de relation Eloquent).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('project_members')) {
            return;
        }

        Schema::create('project_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 50)->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_members');
    }
};
