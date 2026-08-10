<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Le workflow congés est à 2 niveaux (pending → approved_n1 → approved_hr),
 * implémenté dans LeaveService/LeaveController/Employee/LeaveRequest,
 * mais la contrainte CHECK n'autorisait que pending|approved|rejected|cancelled
 * → violation PostgreSQL (500) dès la 1re approbation N+1.
 * On élargit la contrainte pour accepter les statuts réellement utilisés.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('leave_requests')) {
            return;
        }

        // Supprime toute contrainte CHECK existante portant sur status.
        $constraints = DB::select("
            select c.conname
            from pg_constraint c
            join pg_class r on r.oid = c.conrelid
            where r.relname = 'leave_requests'
              and c.contype = 'c'
              and pg_get_constraintdef(c.oid) ilike '%status%'
        ");

        foreach ($constraints as $c) {
            DB::statement('ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS "' . $c->conname . '"');
        }

        DB::statement("
            ALTER TABLE leave_requests
            ADD CONSTRAINT leave_requests_status_check
            CHECK (status IN ('pending','approved_n1','approved_hr','approved','rejected','cancelled'))
        ");
    }

    public function down(): void
    {
        if (! Schema::hasTable('leave_requests')) {
            return;
        }

        DB::statement('ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_status_check');
        DB::statement("
            ALTER TABLE leave_requests
            ADD CONSTRAINT leave_requests_status_check
            CHECK (status IN ('pending','approved','rejected','cancelled'))
        ");
    }
};
