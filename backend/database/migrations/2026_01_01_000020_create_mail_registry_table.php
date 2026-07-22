<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mail_registry', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('reference')->unique();
            $table->enum('type', ['incoming', 'outgoing', 'internal'])->default('incoming');
            $table->enum('urgency', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->enum('status', ['received', 'registered', 'assigned', 'in_progress', 'replied', 'archived', 'closed'])->default('received');
            $table->string('subject');
            $table->text('body')->nullable();
            $table->string('sender_name')->nullable();
            $table->string('sender_email')->nullable();
            $table->string('sender_organization')->nullable();
            $table->string('recipient_name')->nullable();
            $table->string('recipient_email')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('due_date')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->index('organization_id');
            $table->index('type');
            $table->index('urgency');
            $table->index('status');
            $table->index('received_at');
            $table->index('assigned_to');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_registry');
    }
};
