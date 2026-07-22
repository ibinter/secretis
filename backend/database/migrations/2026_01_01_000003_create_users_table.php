<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('avatar_path')->nullable();
            $table->string('role')->default('employee'); // superadmin, admin, manager, employee
            $table->json('permissions')->nullable();
            $table->string('job_title')->nullable();
            $table->string('locale', 10)->default('fr');
            $table->string('timezone')->default('Africa/Abidjan');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('organization_id');
            $table->index('department_id');
            $table->index('role');
            $table->index('is_active');
            $table->index('last_login_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
