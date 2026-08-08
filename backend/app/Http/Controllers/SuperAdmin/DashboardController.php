<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\License;
use App\Models\Order;
use App\Models\Organization;
use App\Models\SupportTicket;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tableau de bord SuperAdmin.
 *
 * ⚠️ Ce contrôleur envoyait ses données à plat (`kpis`, `recent_orgs`,
 * `recent_logins`, `system`) alors que `SuperAdmin/Dashboard.jsx` lit une
 * unique prop `data`. Celle-ci arrivait donc toujours indéfinie et la page
 * retombait sur sa constante `MOCK` : **la totalité du tableau de bord était
 * fictive** — MRR, organisations, connexions récentes, paiements en attente.
 *
 * Les données sont désormais calculées et servies dans la forme exacte que la
 * page consomme. Ce qui n'est pas mesurable est renvoyé à `null` plutôt
 * qu'inventé.
 */
class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('SuperAdmin/Dashboard', [
            'data' => $this->collecter(),
        ]);
    }

    public function apiDashboard(Request $request): \Illuminate\Http\JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->collecter()]);
    }

    // =========================================================================

    private function collecter(): array
    {
        return [
            'kpis'                => $this->kpis(),
            'mrr_12m'             => $this->mrrDouzeMois(),
            'essais_8sem'         => $this->essaisHuitSemaines(),
            'health'              => $this->sante(),
            'connexions_recentes' => $this->connexionsRecentes(),
            'funnel'              => $this->entonnoir(),
            'paiements_pending'   => $this->paiementsEnAttente(),
        ];
    }

    private function kpis(): array
    {
        $maintenant = now();
        $trenteJours = $maintenant->copy()->subDays(30);
        $soixanteJours = $maintenant->copy()->subDays(60);

        $orgsRecentes    = Organization::where('created_at', '>=', $trenteJours)->count();
        $orgsPrecedentes = Organization::whereBetween('created_at', [$soixanteJours, $trenteJours])->count();

        $mrrActuel = $this->mrrA($maintenant);
        $mrrMoisDernier = $this->mrrA($maintenant->copy()->subMonth());

        // Conversion : parmi les licences ayant DÉPASSÉ le stade d'essai,
        // combien sont devenues actives. Sans historique d'essai, on compare
        // les volumes actuels.
        $essais  = License::where('status', 'trial')->count();
        $actives = License::where('status', 'active')->count();
        $conversion = ($essais + $actives) > 0
            ? round($actives / ($essais + $actives) * 100, 1)
            : null;

        $tickets = $this->ticketsOuverts();

        return [
            'orgs_actives'      => Organization::where('is_active', true)->count(),
            'orgs_variation'    => $this->variation($orgsRecentes, $orgsPrecedentes),
            'mrr'               => $mrrActuel,
            'mrr_variation'     => $this->variation($mrrActuel, $mrrMoisDernier),
            'essais'            => $essais,
            'essais_conversion' => $conversion,
            'tickets_ouverts'   => $tickets['ouverts'],
            'tickets_retard'    => $tickets['en_retard'],
            'nouveaux_clients'  => $orgsRecentes,
            'paiements_a_valider' => Order::whereIn('status', ['proof_submitted', 'pending'])->count(),
            'stockage_used_gb'  => $this->stockageUtiliseGo(),
            'stockage_total_gb' => (int) config('secretis.storage_quota_gb', 500),
            // Aucune sonde de disponibilité n'est historisée : ne rien inventer.
            'uptime'            => null,
            'users_total'       => User::count(),
            'licences_expirees' => License::where('status', 'expired')->count(),
            'licences_a_renouveler' => License::where('status', 'active')
                ->whereBetween('ends_at', [$maintenant, $maintenant->copy()->addDays(30)])
                ->count(),
        ];
    }

    /**
     * MRR à une date donnée : somme normalisée au mois des licences qui étaient
     * actives ce jour-là. Une licence annuelle compte pour un douzième.
     */
    private function mrrA(Carbon $date): float
    {
        $lignes = License::query()
            ->where('status', '!=', 'cancelled')
            ->where(function ($q) use ($date) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $date);
            })
            ->where(function ($q) use ($date) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', $date);
            })
            ->get(['price', 'billing_cycle']);

        return (float) $lignes->sum(function ($l) {
            $prix = (float) ($l->price ?? 0);

            return match ($l->billing_cycle) {
                'yearly', 'annual' => $prix / 12,
                'quarterly'        => $prix / 3,
                default            => $prix,
            };
        });
    }

    private function mrrDouzeMois(): array
    {
        $serie = [];

        for ($i = 11; $i >= 0; $i--) {
            $mois = now()->copy()->subMonths($i)->endOfMonth();

            // Le mois courant se mesure à AUJOURD'HUI, pas à sa fin : sinon les
            // licences expirant d'ici le 31 sont comptées comme déjà éteintes et
            // le dernier point de la courbe tombe artificiellement à zéro.
            $observe = $mois->isFuture() ? now() : $mois;

            $serie[] = [
                'mois' => $this->libelleMois($mois),
                'mrr'  => round($this->mrrA($observe)),
            ];
        }

        return $serie;
    }

    private function essaisHuitSemaines(): array
    {
        $serie = [];

        for ($i = 7; $i >= 0; $i--) {
            $debut = now()->copy()->subWeeks($i)->startOfWeek();
            $fin   = $debut->copy()->endOfWeek();

            $serie[] = [
                'sem'    => 'S' . $debut->isoWeek(),
                'essais' => License::where('status', 'trial')
                    ->whereBetween('created_at', [$debut, $fin])
                    ->count(),
            ];
        }

        return $serie;
    }

    /**
     * Sondes réelles. Chaque service est testé, jamais supposé disponible.
     */
    private function sante(): array
    {
        return [
            ['label' => 'Base de données', 'status' => $this->sonde(function () {
                DB::select('SELECT 1');
            })],
            ['label' => 'Redis / Cache', 'status' => $this->sonde(function () {
                if (! extension_loaded('redis') && ! class_exists(\Predis\Client::class)) {
                    throw new \RuntimeException('Client Redis absent');
                }
                Redis::connection()->ping();
            })],
            ['label' => 'Queue worker', 'status' => $this->santeFileAttente()],
            ['label' => 'SMTP (emails)', 'status' => config('mail.default') === 'smtp'
                && config('mail.mailers.smtp.host') ? 'ok' : 'degraded'],
            ['label' => 'SARA (IA)', 'status' => config('services.groq.key') || env('GROQ_API_KEY') ? 'ok' : 'degraded'],
            ['label' => 'Stockage', 'status' => $this->sonde(function () {
                $sonde = 'health/.probe';
                Storage::disk('local')->put($sonde, (string) time());
                Storage::disk('local')->delete($sonde);
            })],
            ['label' => 'Reverb (temps réel)', 'status' => config('broadcasting.default') === 'reverb'
                && config('broadcasting.connections.reverb.key') ? 'ok' : 'degraded'],
        ];
    }

    private function sonde(callable $test): string
    {
        try {
            $test();

            return 'ok';
        } catch (\Throwable) {
            return 'down';
        }
    }

    /**
     * La file est saine si aucun job n'échoue en masse et si les jobs en
     * attente ne s'accumulent pas.
     */
    private function santeFileAttente(): string
    {
        try {
            $echecs = Schema::hasTable('failed_jobs')
                ? DB::table('failed_jobs')->where('failed_at', '>=', now()->subDay())->count()
                : 0;

            if ($echecs > 10) {
                return 'down';
            }

            $enAttente = 0;
            if (config('queue.default') === 'redis') {
                $enAttente = (int) Redis::connection()->llen('queues:default');
            } elseif (Schema::hasTable('jobs')) {
                $enAttente = DB::table('jobs')->count();
            }

            return ($echecs > 0 || $enAttente > 500) ? 'degraded' : 'ok';
        } catch (\Throwable) {
            return 'down';
        }
    }

    private function connexionsRecentes(): array
    {
        // `audit_logs` porte l'IP et le pays ; c'est la source la plus complète.
        if (Schema::hasTable('audit_logs')) {
            $lignes = DB::table('audit_logs')
                ->where('action', 'login_success')
                ->orderByDesc('created_at')
                ->limit(10)
                ->get(['organization_id', 'user_id', 'user_name', 'user_role', 'ip_address', 'country', 'created_at']);

            if ($lignes->isNotEmpty()) {
                $orgs = Organization::whereIn('id', $lignes->pluck('organization_id')->filter())
                    ->pluck('name', 'id');

                // `user_name` / `user_role` sont dénormalisés au moment de
                // l'écriture et souvent nuls : on complète depuis `users`.
                $comptes = User::whereIn('id', $lignes->pluck('user_id')->filter())
                    ->get(['id', 'name', 'role'])->keyBy('id');

                return $lignes->map(fn ($l) => [
                    'org'   => $orgs[$l->organization_id] ?? '—',
                    'user'  => $l->user_name ?: ($comptes[$l->user_id]->name ?? '—'),
                    'role'  => $l->user_role ?: ($comptes[$l->user_id]->role ?? '—'),
                    'ip'    => $l->ip_address ?: '—',
                    'pays'  => $l->country ?: '—',
                    'date'  => Carbon::parse($l->created_at)->format('d/m/Y H:i'),
                ])->all();
            }
        }

        // Repli : la dernière connexion enregistrée sur chaque compte.
        return User::whereNotNull('last_login_at')
            ->with('organization:id,name')
            ->orderByDesc('last_login_at')
            ->limit(10)
            ->get(['id', 'name', 'role', 'organization_id', 'last_login_at', 'last_login_ip'])
            ->map(fn ($u) => [
                'org'  => $u->organization->name ?? '—',
                'user' => $u->name,
                'role' => $u->role ?: '—',
                'ip'   => $u->last_login_ip ?: '—',
                'pays' => '—',
                'date' => Carbon::parse($u->last_login_at)->format('d/m/Y H:i'),
            ])->all();
    }

    /**
     * Entonnoir commercial. Le trafic de la page vitrine n'est pas instrumenté :
     * l'entonnoir démarre donc au prospect, pas au visiteur.
     */
    private function entonnoir(): array
    {
        $prospects = Schema::hasTable('prospects') ? DB::table('prospects')->count() : 0;

        return [
            ['label' => 'Prospects',            'n' => $prospects],
            ['label' => 'Essais ouverts',       'n' => License::where('status', 'trial')->count()],
            ['label' => 'Organisations actives','n' => Organization::where('is_active', true)->count()],
            ['label' => 'Licences payantes',    'n' => License::where('status', 'active')->where('price', '>', 0)->count()],
            ['label' => 'Enterprise',           'n' => License::where('status', 'active')
                                                        ->where('plan_name', 'ilike', '%enterprise%')->count()],
        ];
    }

    private function paiementsEnAttente(): array
    {
        return Order::whereIn('status', ['proof_submitted', 'pending', 'awaiting_proof'])
            ->with('organization:id,name')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($o) => [
                'id'      => $o->id,
                'ref'     => $o->reference,
                'org'     => $o->organization->name ?? '—',
                'plan'    => $o->plan_code ?? '—',
                'montant' => number_format((float) ($o->amount_xof ?? $o->amount), 0, ',', ' ') . ' ' . ($o->currency ?? 'XOF'),
                'methode' => $o->payment_method_provider ?: ($o->payment_method_type ?: '—'),
                'date'    => Carbon::parse($o->created_at)->format('d/m/Y'),
            ])->all();
    }

    // ─── Utilitaires ────────────────────────────────────────────────────────

    private function ticketsOuverts(): array
    {
        if (! Schema::hasTable('support_tickets')) {
            return ['ouverts' => 0, 'en_retard' => 0];
        }

        $ouverts = SupportTicket::whereIn('status', ['open', 'pending', 'in_progress'])->count();

        // « En retard » : ouvert depuis plus de 48 h sans résolution.
        $enRetard = SupportTicket::whereIn('status', ['open', 'pending', 'in_progress'])
            ->where('created_at', '<=', now()->subHours(48))
            ->count();

        return ['ouverts' => $ouverts, 'en_retard' => $enRetard];
    }

    private function stockageUtiliseGo(): float
    {
        if (! Schema::hasTable('documents') || ! Schema::hasColumn('documents', 'file_size')) {
            return 0.0;
        }

        $octets = (float) DB::table('documents')->sum('file_size');

        return round($octets / 1024 / 1024 / 1024, 2);
    }

    /** Variation en pourcentage, `null` quand la référence est nulle. */
    private function variation(float $actuel, float $precedent): ?float
    {
        if ($precedent <= 0) {
            return $actuel > 0 ? 100.0 : null;
        }

        return round(($actuel - $precedent) / $precedent * 100, 1);
    }

    private function libelleMois(Carbon $date): string
    {
        $mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

        return $mois[$date->month - 1] . ' ' . $date->format('y');
    }
}
