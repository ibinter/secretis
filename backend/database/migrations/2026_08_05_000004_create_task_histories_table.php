<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('task_histories')) {
            Schema::create('task_histories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('from_status')->nullable();
                $table->string('to_status')->nullable();
                $table->text('comment')->nullable();
                $table->timestamps();
                $table->index('task_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_histories');
    }
};
