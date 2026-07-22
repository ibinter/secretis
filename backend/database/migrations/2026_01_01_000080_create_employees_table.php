<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('employee_number')->nullable();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('job_title');
            $table->string('contract_type')->nullable(); // CDI, CDD, consultant
            $table->date('hire_date');
            $table->date('termination_date')->nullable();
            $table->decimal('base_salary', 10, 2)->nullable();
            $table->string('bank_account')->nullable();
            $table->string('tax_id')->nullable();
            $table->string('social_security_number')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('nationality')->nullable();
            $table->string('address')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->enum('status', ['active', 'on_leave', 'terminated', 'suspended'])->default('active');
            $table->json('leave_balance')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'employee_number']);
            $table->index('organization_id');
            $table->index('department_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
