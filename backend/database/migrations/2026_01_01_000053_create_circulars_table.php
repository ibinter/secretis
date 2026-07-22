<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('circulars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('reference')->nullable();
            $table->string('subject');
            $table->longText('body');
            $table->json('recipient_ids'); // user IDs or department IDs
            $table->enum('recipient_type', ['users', 'departments', 'all'])->default('all');
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->json('attachments')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('requires_acknowledgement')->default(false);
            $table->json('acknowledged_by')->nullable();
            $table->timestamps();

            $table->index('organization_id');
            $table->index('created_by');
            $table->index('status');
            $table->index('published_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circulars');
    }
};
