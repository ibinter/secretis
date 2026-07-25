<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('events') && Schema::hasTable('rooms')) {
            Schema::table('events', function (Blueprint $table) {
                $table->foreign('room_id')->references('id')->on('rooms')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['room_id']);
        });
    }
};
