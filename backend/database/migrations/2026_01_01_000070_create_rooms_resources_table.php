<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('rooms_resources')) {
            // Création idempotente. La production porte des migrations
            // APPLIQUÉES A MOITIÉ : certaines ont créé une partie de leurs
            // tables avant d'échouer, puis ont été marquées comme jouées. Les
            // rejouer pour créer ce qui manque exige que chaque création sache
            // ne rien faire quand la table est déjà là.
            Schema::create('rooms_resources', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('code')->nullable();
                $table->enum('category', ['equipment', 'supplies', 'vehicle', 'other'])->default('equipment');
                $table->text('description')->nullable();
                $table->string('brand')->nullable();
                $table->string('model')->nullable();
                $table->string('serial_number')->nullable();
                $table->integer('quantity')->default(1);
                $table->integer('available_quantity')->default(1);
                $table->decimal('purchase_price', 10, 2)->nullable();
                $table->string('location')->nullable();
                $table->json('photos')->nullable();
                $table->json('specifications')->nullable();
                $table->enum('condition', ['excellent', 'good', 'fair', 'poor', 'out_of_service'])->default('good');
                $table->boolean('requires_approval')->default(false);
                $table->boolean('is_active')->default(true);
                $table->date('purchase_date')->nullable();
                $table->date('warranty_expires_at')->nullable();
                $table->timestamps();

                $table->unique(['organization_id', 'code']);
                $table->index('organization_id');
                $table->index('category');
                $table->index('is_active');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms_resources');
    }
};
