<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body')->nullable();
            $table->enum('type', ['text', 'file', 'image', 'system'])->default('text');
            $table->json('attachments')->nullable();
            $table->foreignId('reply_to_id')->nullable()->constrained('messages')->nullOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->boolean('is_edited')->default(false);
            $table->timestamp('edited_at')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();

            $table->index('conversation_id');
            $table->index('user_id');
            $table->index('read_at');
            $table->index('created_at');
        });

        // Update conversations to add FK for last_message_id after messages table exists
        Schema::table('conversations', function (Blueprint $table) {
            $table->foreign('last_message_id')->references('id')->on('messages')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropForeign(['last_message_id']);
        });
        Schema::dropIfExists('messages');
    }
};
