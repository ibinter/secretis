<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->jsonb('config')->default('{}');
            $table->boolean('is_public')->default(false);
            $table->string('schedule', 100)->nullable()->comment('Expression CRON — null = pas de planification');
            $table->timestamp('last_run_at')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index('organization_id');
            $table->index(['organization_id', 'is_public']);
            $table->index(['organization_id', 'schedule']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_reports');
    }
};
