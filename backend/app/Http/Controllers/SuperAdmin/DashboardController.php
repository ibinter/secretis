<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\Organization;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $now = now();

        $kpis = [
            'orgs_actives'         => Organization::where('is_active', true)->count(),
            'orgs_variation'       => Organization::where('created_at', '>=', $now->copy()->subDays(30))->count(),
            'essais'               => License::where('status', 'trial')->count(),
            'essais_conversion'    => 0,
            'mrr'                  => (float) License::where('status', 'active')->where('billing_cycle', 'monthly')->sum('price'),
            'mrr_variation'        => 0,
            'tickets_ouverts'      => class_exists(SupportTicket::class) ? SupportTicket::whereIn('status', ['open', 'pending'])->count() : 0,
            'tickets_retard'       => 0,
            'nouveaux_clients'     => Organization::where('created_at', '>=', $now->copy()->subDays(30))->count(),
            'paiements_a_valider'  => 0,
            'stockage_used_gb'     => 0,
            'stockage_total_gb'    => 500,
            'uptime'               => 99.9,
            'users_total'          => User::count(),
            'licences_expirees'    => License::where('status', 'expired')->count(),
            'licences_a_renouveler'=> License::where('status', 'active')->whereBetween('ends_at', [$now, $now->copy()->addDays(30)])->count(),
        ];

        $recentOrgs = Organization::orderByDesc('created_at')->limit(8)
            ->get(['id', 'name', 'email', 'status', 'is_active', 'created_at']);

        $recentLogins = User::orderByDesc('last_login_at')->whereNotNull('last_login_at')->limit(8)
            ->get(['id', 'name', 'email', 'role', 'last_login_at']);

        return Inertia::render('SuperAdmin/Dashboard', [
            'kpis'          => $kpis,
            'recent_orgs'   => $recentOrgs,
            'recent_logins' => $recentLogins,
            'system'        => [
                'smtp'  => config('mail.default') === 'smtp',
                'ia'    => (bool) env('GROQ_API_KEY'),
                'queue' => true,
            ],
        ]);
    }

    public function apiDashboard(Request $request): \Illuminate\Http\JsonResponse
    {
        $now = now();

        $data = [
            'kpis' => [
                'orgs_actives'          => Organization::where('is_active', true)->count(),
                'orgs_variation'        => Organization::where('created_at', '>=', $now->copy()->subDays(30))->count(),
                'essais'                => License::where('status', 'trial')->count(),
                'mrr'                   => (float) License::where('status', 'active')->where('billing_cycle', 'monthly')->sum('price'),
                'tickets_ouverts'       => class_exists(SupportTicket::class) ? SupportTicket::whereIn('status', ['open', 'pending'])->count() : 0,
                'users_total'           => User::count(),
                'licences_expirees'     => License::where('status', 'expired')->count(),
                'licences_a_renouveler' => License::where('status', 'active')->whereBetween('ends_at', [$now, $now->copy()->addDays(30)])->count(),
            ],
            'recent_orgs'   => Organization::orderByDesc('created_at')->limit(8)->get(['id', 'name', 'email', 'status', 'is_active', 'created_at']),
            'recent_logins' => User::orderByDesc('last_login_at')->whereNotNull('last_login_at')->limit(8)->get(['id', 'name', 'email', 'role', 'last_login_at']),
            'system'        => [
                'smtp'  => config('mail.default') === 'smtp',
                'ia'    => (bool) env('GROQ_API_KEY'),
                'queue' => true,
            ],
        ];

        return response()->json(['success' => true, 'data' => $data]);
    }
}
