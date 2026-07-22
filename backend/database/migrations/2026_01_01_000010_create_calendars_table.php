<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('color', 7)->default('#1E3A5F');
            $table->enum('type', ['personal', 'team', 'organization', 'public'])->default('personal');
            $table->boolean('is_default')->default(false);
            $table->boolean('is_shared')->default(false);
            $table->json('shared_with')->nullable();
            $table->timestamps();

            $table->index('organization_id');
            $table->index('user_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendars');
    }
};
