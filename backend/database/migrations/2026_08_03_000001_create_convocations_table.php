<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('convocations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id');
            $table->unsignedBigInteger('meeting_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('sent_by')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->enum('status', ['pending', 'sent', 'delivered', 'accepted', 'declined'])
                  ->default('pending');
            $table->timestamp('response_at')->nullable();
            $table->text('response_note')->nullable();
            $table->string('pdf_path')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
            $table->foreign('meeting_id')->references('id')->on('meetings')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('sent_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(['meeting_id', 'user_id']);
            $table->index(['organization_id', 'meeting_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('convocations');
    }
};
