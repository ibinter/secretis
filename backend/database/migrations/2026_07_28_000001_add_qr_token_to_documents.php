<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        Schema::table("documents", function (Blueprint $table) {
            $table->string("qr_token", 64)->nullable()->unique()->after("status");
        });

        // Générer des tokens pour les documents existants
        \DB::table("documents")->whereNull("qr_token")->orderBy("id")->chunk(200, function ($rows) {
            foreach ($rows as $row) {
                \DB::table("documents")->where("id", $row->id)->update(["qr_token" => Str::random(32)]);
            }
        });
    }

    public function down(): void
    {
        Schema::table("documents", function (Blueprint $table) {
            $table->dropColumn("qr_token");
        });
    }
};
