<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('parent_task_id')->nullable()->constrained('tasks')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['backlog', 'todo', 'in_progress', 'review', 'done', 'cancelled'])->default('todo');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->integer('position')->default(0);
            $table->integer('estimated_hours')->nullable();
            $table->integer('logged_hours')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->json('labels')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('organization_id');
            $table->index('project_id');
            $table->index('assigned_to');
            $table->index('parent_task_id');
            $table->index('status');
            $table->index('priority');
            $table->index('due_date');
            $table->index('position');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
