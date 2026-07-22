<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ─── Applications disponibles sur la marketplace ───────────────────────
        Schema::create('marketplace_apps', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('category'); // comptabilite, rh, communication, securite, productivite
            $table->string('developer_name');
            $table->string('icon_url')->nullable();
            $table->decimal('price_monthly', 10, 2)->default(0);
            $table->decimal('price_yearly', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('install_count')->default(0);
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->timestamps();

            $table->index('category');
            $table->index('is_active');
            $table->index('is_featured');
            $table->index('slug');
        });

        // ─── Fonctionnalités par application ──────────────────────────────────
        Schema::create('marketplace_app_features', function (Blueprint $table) {
            $table->id();
            $table->foreignId('app_id')->constrained('marketplace_apps')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('app_id');
        });

        // ─── Installations par organisation ───────────────────────────────────
        Schema::create('marketplace_installations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('app_id')->constrained('marketplace_apps')->cascadeOnDelete();
            $table->enum('status', ['active', 'suspended', 'cancelled'])->default('active');
            $table->timestamp('installed_at')->useCurrent();
            // config JSONB chiffrée (clés API, paramètres, webhooks)
            $table->text('config')->nullable(); // encrypted JSON
            $table->timestamps();

            $table->unique(['organization_id', 'app_id']);
            $table->index('organization_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_installations');
        Schema::dropIfExists('marketplace_app_features');
        Schema::dropIfExists('marketplace_apps');
    }
};
