<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('name')->nullable(); // null for direct messages
            $table->enum('type', ['direct', 'group', 'channel'])->default('direct');
            $table->string('avatar_path')->nullable();
            $table->foreignId('last_message_id')->nullable(); // set after messages table exists
            $table->timestamp('last_activity_at')->nullable();
            $table->boolean('is_archived')->default(false);
            $table->timestamps();

            $table->index('organization_id');
            $table->index('created_by');
            $table->index('type');
            $table->index('last_activity_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversations');
    }
};
