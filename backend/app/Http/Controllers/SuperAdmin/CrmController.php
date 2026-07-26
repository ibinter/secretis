<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class CrmController extends Controller
{
    public function pipeline(Request $request): Response
    {
        $data = [];
        if (Schema::hasTable('crm_prospects')) {
            $data = DB::table('crm_prospects')
                ->select('stage', DB::raw('count(*) as total'))
                ->groupBy('stage')->get();
        }
        return Inertia::render('SuperAdmin/Crm/Pipeline', ['initialData' => $data]);
    }

    public function contacts(Request $request): Response
    {
        $contacts = Schema::hasTable('contacts')
            ? DB::table('contacts')->orderByDesc('created_at')->limit(100)->get()
            : collect();
        return Inertia::render('SuperAdmin/Crm/Contacts', ['contacts' => $contacts]);
    }

    public function analytics(Request $request): Response
    {
        return Inertia::render('SuperAdmin/Crm/Analytics');
    }
}
