<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('departments')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('departments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('parent_id')->nullable()->constrained('departments')->nullOnDelete();
                $table->string('name');
                $table->string('code')->nullable();
                $table->string('description')->nullable();
                $table->unsignedBigInteger('manager_id')->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('position')->default(0);
                $table->timestamps();

                $table->unique(['organization_id', 'code']);
                $table->index('organization_id');
                $table->index('parent_id');
                $table->index('manager_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
