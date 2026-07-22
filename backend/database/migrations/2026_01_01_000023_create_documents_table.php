<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('folder_id')->nullable()->constrained('document_folders')->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('file_name')->nullable();
            $table->string('file_path')->nullable();
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->enum('access_level', ['public', 'organization', 'department', 'private'])->default('organization');
            $table->json('allowed_departments')->nullable();
            $table->json('allowed_users')->nullable();
            $table->integer('current_version')->default(1);
            $table->json('tags')->nullable();
            $table->boolean('is_template')->default(false);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('organization_id');
            $table->index('folder_id');
            $table->index('created_by');
            $table->index('access_level');
            $table->index('is_template');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
