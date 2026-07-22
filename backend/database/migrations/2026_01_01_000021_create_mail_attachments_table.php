<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mail_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mail_registry_id')->constrained('mail_registry')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('mail_registry_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_attachments');
    }
};
