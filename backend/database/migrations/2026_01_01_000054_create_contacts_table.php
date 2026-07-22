<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('mobile')->nullable();
            $table->string('company')->nullable();
            $table->string('job_title')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country', 2)->nullable();
            $table->string('website')->nullable();
            $table->string('avatar_path')->nullable();
            $table->enum('type', ['person', 'organization', 'supplier', 'partner', 'other'])->default('person');
            $table->json('tags')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('organization_id');
            $table->index('type');
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
