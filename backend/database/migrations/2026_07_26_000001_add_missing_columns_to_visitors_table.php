<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table("visitors", function (Blueprint $table) {
            if (!Schema::hasColumn("visitors", "check_in_at")) {
                $table->timestamp("check_in_at")->nullable();
            }
            if (!Schema::hasColumn("visitors", "check_out_at")) {
                $table->timestamp("check_out_at")->nullable();
            }
            if (!Schema::hasColumn("visitors", "deleted_at")) {
                $table->softDeletes();
            }
            if (!Schema::hasColumn("visitors", "type")) {
                $table->string("type")->nullable()->default("walk_in");
            }
            if (!Schema::hasColumn("visitors", "status")) {
                $table->string("status")->nullable()->default("checked_in");
            }
            if (!Schema::hasColumn("visitors", "host_user_id")) {
                $table->foreignId("host_user_id")->nullable()->constrained("users")->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table("visitors", function (Blueprint $table) {
            $table->dropColumn(["check_in_at", "check_out_at", "deleted_at", "type", "status"]);
            $table->dropConstrainedForeignId("host_user_id");
        });
    }
};
