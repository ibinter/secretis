<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->nullable();
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->integer('capacity')->default(1);
            $table->json('equipment')->nullable(); // ['projector', 'whiteboard', 'video_conf', ...]
            $table->json('photos')->nullable();
            $table->json('availability_hours')->nullable(); // {'monday': {'start': '08:00', 'end': '18:00'}, ...}
            $table->boolean('requires_approval')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'code']);
            $table->index('organization_id');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
