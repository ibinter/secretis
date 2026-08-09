<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('document_templates')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('document_templates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('category')->nullable();
                $table->string('file_path')->nullable();
                $table->longText('content')->nullable();
                $table->json('variables')->nullable(); // template variables list
                $table->enum('access_level', ['public', 'organization', 'department', 'private'])->default('organization');
                $table->boolean('is_active')->default(true);
                $table->integer('usage_count')->default(0);
                $table->timestamps();

                $table->index('organization_id');
                $table->index('category');
                $table->index('is_active');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('document_templates');
    }
};
