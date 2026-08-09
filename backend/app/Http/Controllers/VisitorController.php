<?php

namespace App\Http\Controllers;

use App\Http\Requests\VisitorCheckInRequest;
use App\Models\Organization;
use App\Models\VisitLog;
use App\Models\Visitor;
use App\Models\VisitorInvitation;
use App\Services\VisitorService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VisitorController extends Controller
{
    public function __construct(private readonly VisitorService $visitorService)
    {
    }

    // GET /visitors — liste des visiteurs (filtres : blacklist, frequents)
    public function index(Request $request)
    {
        $query = Visitor::where('organization_id', auth()->user()->organization_id)
            ->when($request->search, fn ($q) => $q->where(function ($sq) use ($request) {
                $sq->where('first_name', 'ilike', "%{$request->search}%")
                   ->orWhere('last_name', 'ilike', "%{$request->search}%")
                   ->orWhere('company', 'ilike', "%{$request->search}%");
            }))
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        if ($request->wantsJson() || $request->is('api/*') || $request->hasHeader('Authorization') || $request->bearerToken()) {
            return response()->json([
                'success' => true,
                'data'    => $query,
            ]);
        }

        return Inertia::render('Reception/Blacklist', [
            'visitors' => $query,
            'filters'  => $request->only(['search']),
        ]);
    }

    // GET /api/v1/visitors — API JSON response
    public function apiIndex(Request $request): JsonResponse
    {
        $query = Visitor::where('organization_id', auth()->user()->organization_id)
            ->when($request->search, fn ($q) => $q->where(function ($sq) use ($request) {
                $sq->where('first_name', 'ilike', "%{$request->search}%")
                   ->orWhere('last_name', 'ilike', "%{$request->search}%")
                   ->orWhere('company', 'ilike', "%{$request->search}%");
            }))
            ->orderByDesc('created_at')
            ->paginate(25)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'data'    => $query,
        ]);
    }


    // GET /reception — dashboard (visiteurs presents + stats jour)
    public function dashboard(): Response
    {
        $orgId = auth()->user()->organization_id;
        $today = now()->toDateString();

        $visitors = Visitor::where('organization_id', $orgId)
            ->whereNull('check_out_at')
            ->whereNotNull('check_in_at')
            ->orderBy('check_in_at')
            ->get();

        $present = $visitors->map(function ($v) {
            $hostName = $v->host_user_id
                ? \App\Models\User::where('id', $v->host_user_id)->value('name')
                : null;
            return [
                'id'          => $v->id,
                'check_in_at' => $v->check_in_at,
                'location'    => null,
                'floor'       => null,
                'visitor'     => [
                    'full_name'   => trim($v->first_name . ' ' . $v->last_name),
                    'photo_path'  => $v->photo_path,
                    'company'     => $v->company,
                    'visit_count' => 0,
                ],
                'host' => $hostName ? ['name' => $hostName] : null,
            ];
        });

        $todayTotal = Visitor::where('organization_id', $orgId)
            ->whereDate('check_in_at', $today)
            ->count();

        return Inertia::render('Reception/Dashboard', [
            'present'     => $present,
            'scheduled'   => [],
            'today_total' => $todayTotal,
            'pending_inv' => 0,
        ]);
    }

    // POST /visitors/check-in — enregistrer une arrivee
    public function checkIn(VisitorCheckInRequest $request): JsonResponse
    {
        $visitor = $this->visitorService->registerVisitor(
            array_merge($request->validated(), [
                'organization_id' => auth()->user()->organization_id,
            ])
        );

        // Alerte liste noire avant tout
        if ($visitor->is_blacklisted) {
            return response()->json([
                'blacklisted' => true,
                'reason'      => $visitor->blacklist_reason,
                'visitor'     => $visitor,
            ], 403);
        }

        $visit = $this->visitorService->checkIn($visitor, array_merge(
            $request->validated(),
            ['created_by' => auth()->id()]
        ));

        $badgeHtml = $this->visitorService->generateBadge($visit);

        return response()->json([
            'visit'    => $visit->load(['visitor', 'host']),
            'badge'    => $badgeHtml,
            'message'  => "Check-in enregistré — badge {$visitor->badge_number}",
        ], 201);
    }

    // POST /visits/{id}/check-out — enregistrer un depart
    public function checkOut(VisitLog $visit): JsonResponse
    {
        abort_unless(
            $visit->organization_id === auth()->user()->organization_id,
            403
        );

        $this->visitorService->checkOut($visit);

        return response()->json(['message' => 'Check-out enregistré avec succès.']);
    }

    // POST /visitor-invitations — creer une invitation (pour les employes)
    public function storeInvitation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'visitor_email'    => 'required|email',
            'visitor_name'     => 'required|string|max:150',
            'visit_date'       => 'required|date|after_or_equal:today',
            'visit_time_start' => 'required|date_format:H:i',
            'visit_time_end'   => 'required|date_format:H:i|after:visit_time_start',
            'purpose'          => 'nullable|string|max:255',
            'location'         => 'nullable|string|max:255',
        ]);

        $invitation = $this->visitorService->createInvitation(auth()->user(), $data);

        return response()->json([
            'invitation' => $invitation,
            'message'    => 'Invitation envoyée à ' . $invitation->visitor_email,
        ], 201);
    }

    // GET /visitor-invitations/{code} — valider un code d invitation (public)
    public function validateInvitation(string $code): JsonResponse
    {
        $invitation = $this->visitorService->validateInvitation($code);

        if (!$invitation) {
            return response()->json([
                'valid'   => false,
                'message' => 'Code invalide, expiré ou déjà utilisé.',
            ], 404);
        }

        return response()->json([
            'valid'      => true,
            'invitation' => $invitation,
        ]);
    }

    // GET /visits/today — redirige vers dashboard
    public function today(): Response
    {
        return $this->dashboard();
    }

    // GET /visits/report — rapport journalier
    public function report(Request $request): Response
    {
        $date = Carbon::parse($request->date ?? today());
        $org  = auth()->user()->organization;

        $report = $this->visitorService->getDailyReport($org, $date);

        // Données 30 derniers jours pour les graphiques
        $last30 = collect(range(0, 29))->map(function ($i) use ($org) {
            $d = today()->subDays($i);
            return [
                'date'  => $d->toDateString(),
                'count' => VisitLog::where('organization_id', $org->id)
                    ->whereDate('checked_in_at', $d)->count(),
            ];
        })->reverse()->values();

        return Inertia::render('Reception/Reports', [
            'report'  => $report,
            'last30'  => $last30,
            'date'    => $date->toDateString(),
        ]);
    }

    // POST /visitors/{id}/blacklist — mettre sur liste noire
    public function blacklist(Request $request, Visitor $visitor): JsonResponse
    {
        abort_unless(
            $visitor->organization_id === auth()->user()->organization_id,
            403
        );

        $data = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $this->visitorService->blacklist($visitor, $data['reason'], auth()->user());

        return response()->json(['message' => 'Visiteur ajouté à la liste noire.']);
    }

    // DELETE /visitors/{id}/blacklist — retirer de la liste noire
    public function unblacklist(Visitor $visitor): JsonResponse
    {
        abort_unless(
            $visitor->organization_id === auth()->user()->organization_id,
            403
        );

        $this->visitorService->unblacklist($visitor, auth()->user());

        return response()->json(['message' => 'Visiteur retiré de la liste noire.']);
    }

    // GET /reception/invitations — liste des invitations de l employe
    public function invitations(Request $request): Response
    {
        $invitations = VisitorInvitation::where('organization_id', auth()->user()->organization_id)
            ->where('invited_by', auth()->id())
            ->with('visitLog')
            ->orderByDesc('visit_date')
            ->paginate(20);

        return Inertia::render('Reception/Invitations', [
            'invitations' => $invitations,
        ]);
    }

    // GET /reception/kiosk — mode kiosque (sans auth complete)
    public function kiosk(): Response
    {
        $orgSlug = request()->route('org');
        $org = $orgSlug
            ? Organization::where('slug', $orgSlug)->firstOrFail()
            : (auth()->user()?->organization ?? Organization::firstOrFail());

        $hosts = \App\Models\User::where('organization_id', $org->id)
            ->select('id', 'name', 'email', 'photo')
            ->orderBy('name')
            ->get();

        return Inertia::render('Reception/Kiosk', [
            'organization' => $org,
            'hosts'        => $hosts,
        ]);
    }

    // GET /reception/log — journal des visites
    public function log(Request $request): Response
    {
        $query = VisitLog::where('organization_id', auth()->user()->organization_id)
            ->when($request->date, fn ($q) => $q->whereDate('checked_in_at', $request->date))
            ->when($request->host_id, fn ($q) => $q->where('host_id', $request->host_id))
            // `visitor_logs` n'a pas de colonne status : « présent » = pas encore reparti.
            ->when($request->status === 'checked_in', fn ($q) => $q->whereNull('checked_out_at'))
            ->when($request->status === 'checked_out', fn ($q) => $q->whereNotNull('checked_out_at'))
            ->orderByDesc('checked_in_at')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('Reception/VisitorLog', [
            'visits'  => $query,
            'filters' => $request->only(['date', 'host_id', 'status']),
            'hosts'   => \App\Models\User::where('organization_id', auth()->user()->organization_id)
                ->select('id', 'name')->orderBy('name')->get(),
        ]);
    }

    // ─── Alias attendus par web.php ───────────────────────────────────────────

    // GET /reception/reports → délègue vers report()
    public function reports(Request $request): Response
    {
        return $this->report($request);
    }

    // POST /reception/invitations → délègue vers storeInvitation()
    public function createInvitation(Request $request): JsonResponse
    {
        return $this->storeInvitation($request);
    }

    // POST /reception/visitors/{id}/blacklist → résout le visiteur depuis {id} puis délègue
    public function addToBlacklist(Request $request, $id): JsonResponse
    {
        $visitor = Visitor::findOrFail($id);
        return $this->blacklist($request, $visitor);
    }

    // ── Alias API (routes api.php → méthodes réelles) ─────────────────────────
    // Délèguent vers les vraies méthodes qui retournent bien du JsonResponse.
    // NB : `apiInvitations` n'a PAS d'alias : invitations() retourne de l'Inertia
    // (pas de wantsJson) → laissé au stub __call(). `apiBlacklist` non plus : il
    // n'existe aucune cible JSON de LISTAGE de la liste noire (blacklist() est une
    // mutation exigeant Visitor + reason, blacklistPage() retourne de l'Inertia).

    // POST /api/v1/visitors/check-in → checkIn (JsonResponse)
    public function apiCheckin(VisitorCheckInRequest $request): JsonResponse
    {
        return $this->checkIn($request);
    }

    // POST /api/v1/visitors/{id}/check-out → checkOut (JsonResponse)
    public function apiCheckout($id): JsonResponse
    {
        return $this->checkOut(VisitLog::findOrFail($id));
    }

    // POST /api/v1/visitors/invitations → createInvitation (JsonResponse)
    public function apiCreateInvitation(Request $request): JsonResponse
    {
        return $this->createInvitation($request);
    }

    // POST /api/v1/visitors/{id}/blacklist → addToBlacklist (JsonResponse)
    public function apiAddToBlacklist(Request $request, $id): JsonResponse
    {
        return $this->addToBlacklist($request, $id);
    }

    // DELETE /api/v1/visitors/{id}/blacklist → unblacklist (JsonResponse)
    public function apiRemoveFromBlacklist($id): JsonResponse
    {
        return $this->unblacklist(Visitor::findOrFail($id));
    }

    /**
     * Filet de sécurité : action non implémentée → page "Bientôt disponible"
     * au lieu d'une erreur 500. À retirer au fur et à mesure des implémentations.
     */
    public function __call($method, $parameters)
    {
        if (request()->expectsJson()) {
            return response()->json(['data' => [], 'stub' => static::class . '::' . $method]);
        }
        return \Inertia\Inertia::render('ComingSoon', ['module' => class_basename(static::class)]);
    }

    // Alias routes expected by web.php
    public function blacklistPage(\Illuminate\Http\Request $request)
    {
        $orgId    = \Illuminate\Support\Facades\Auth::user()->organization_id;
        $visitors = \App\Models\Visitor::where('organization_id', $orgId)
            ->where('is_blacklisted', true)
            ->orderBy('last_name') // la table visitors n'a pas de colonne `name`
            ->get();
        return \Inertia\Inertia::render('Reception/Blacklist', ['visitors' => $visitors]);
    }

    // POST /reception/visites/{visit}/incident — consigner un incident sur une visite
    public function reportIncident(Request $request, VisitLog $visit): JsonResponse
    {
        abort_unless($visit->organization_id === auth()->user()->organization_id, 403);

        $data = $request->validate([
            'note' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $stamp = now()->format('d/m/Y H:i') . ' — ' . auth()->user()->name;
        $visit->update([
            'notes' => trim(($visit->notes ? $visit->notes . "
" : '') . "[INCIDENT] {$stamp} : " . $data['note']),
        ]);

        return response()->json(['message' => 'Incident consigné.', 'visit' => $visit->fresh()]);
    }

    // GET /reception/log/export — journal des visites au format CSV
    public function exportLog(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        // Export fermé au palier Découverte et en lecture seule (section 3.3).
        app(\App\Services\LicenceGarde::class)->exiger('export');

        $orgId = auth()->user()->organization_id;

        $visits = VisitLog::where('organization_id', $orgId)
            ->when($request->date, fn ($q) => $q->whereDate('checked_in_at', $request->date))
            ->with(['visitor', 'host'])
            ->orderByDesc('checked_in_at')
            ->limit(5000)
            ->get();

        $csv = "Badge;Visiteur;Societe;Hote;Objet;Arrivee;Depart;Duree (min);Vehicule
";
        foreach ($visits as $v) {
            $in  = $v->checked_in_at ? \Carbon\Carbon::parse($v->checked_in_at) : null;
            $out = $v->checked_out_at ? \Carbon\Carbon::parse($v->checked_out_at) : null;
            $csv .= implode(';', array_map(
                fn ($x) => str_replace(';', ',', (string) $x),
                [
                    $v->badge_number,
                    trim(($v->visitor->first_name ?? '') . ' ' . ($v->visitor->last_name ?? '')),
                    $v->visitor->company ?? '',
                    $v->host->name ?? '',
                    $v->purpose,
                    $in?->format('d/m/Y H:i') ?? '',
                    $out?->format('d/m/Y H:i') ?? '',
                    ($in && $out) ? $out->diffInMinutes($in) : '',
                    $v->vehicle_plate ?? '',
                ]
            )) . "
";
        }

        return response("ï»¿" . $csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="journal-visites-' . now()->format('Y-m-d') . '.csv"',
        ]);
    }

    // GET /reception/reports/pdf — rapport journalier au format PDF
    public function reportPdf(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        $date = Carbon::parse($request->date ?? today());
        $org  = auth()->user()->organization;

        $report = $this->visitorService->getDailyReport($org, $date);

        $visits = VisitLog::where('organization_id', $org->id)
            ->whereDate('checked_in_at', $date)
            ->with(['visitor', 'host'])
            ->orderBy('checked_in_at')
            ->get();

        $pdf = app('dompdf.wrapper')
            ->loadView('reception.daily-report-pdf', compact('report', 'visits', 'org', 'date'))
            ->setPaper('a4', 'portrait');

        return response($pdf->output(), 200, [
            'Content-Type'        => 'application/pdf',
            'Content-Disposition' => 'inline; filename="rapport-visites-' . $date->format('Y-m-d') . '.pdf"',
        ]);
    }

    /**
     * GET /visites/scan/{visit} — vérification d'un badge visiteur par QR code.
     * Page publique volontairement minimale : elle sert au poste de garde à
     * confirmer qu'un badge est authentique et toujours valide.
     */
    public function scanBadge(int $id): \Illuminate\Http\Response
    {
        $visit = VisitLog::with(['visitor', 'host', 'organization'])->findOrFail($id);

        $valide = $visit->checked_out_at === null;
        $nom    = trim(($visit->visitor->first_name ?? '') . ' ' . ($visit->visitor->last_name ?? '')) ?: 'Visiteur';

        $html = view('visitor-scan', [
            'visit'  => $visit,
            'nom'    => $nom,
            'valide' => $valide,
        ])->render();

        return response($html, $valide ? 200 : 410);
    }
}
