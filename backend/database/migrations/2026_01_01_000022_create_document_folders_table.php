<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_folders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('document_folders')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->nullable();
            $table->text('description')->nullable();
            $table->enum('access_level', ['public', 'organization', 'department', 'private'])->default('organization');
            $table->json('allowed_departments')->nullable();
            $table->json('allowed_users')->nullable();
            $table->string('color', 7)->nullable();
            $table->string('icon')->nullable();
            $table->integer('position')->default(0);
            $table->timestamps();

            $table->index('organization_id');
            $table->index('parent_id');
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_folders');
    }
};
