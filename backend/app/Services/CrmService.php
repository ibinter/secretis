<?php

namespace App\Services;

use App\Models\Crm\CrmActivity;
use App\Models\Crm\CrmContact;
use App\Models\Crm\CrmDeal;
use App\Models\Crm\CrmEmailLog;
use App\Models\Crm\CrmEmailSequence;
use App\Models\Crm\CrmEmailTemplate;
use App\Models\Crm\CrmPipelineStage;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * CrmService — Logique métier du CRM SuperAdmin IBIG Soft
 *
 * Gère l'intégralité du pipeline de vente IBIG Soft :
 *  - Création et qualification des leads (BANT)
 *  - Déplacement des deals dans le pipeline
 *  - Prévisions de revenus
 *  - Analytiques commerciales
 *  - Envoi d'emails depuis templates
 *  - Séquences email automatisées
 */
class CrmService
{
    // =========================================================================
    // DEALS
    // =========================================================================

    /**
     * Crée un deal et calcule le score de qualification BANT du contact.
     */
    public function createDeal(array $data): CrmDeal
    {
        return DB::transaction(function () use ($data) {
            // Récupérer ou créer le stage par défaut (premier stage)
            if (empty($data['stage_id'])) {
                $firstStage = CrmPipelineStage::orderBy('order')->first();
                $data['stage_id'] = $firstStage?->id;
            }

            // Récupérer la probabilité du stage si non précisée
            if (empty($data['probability'])) {
                $stage = CrmPipelineStage::find($data['stage_id']);
                $data['probability'] = $stage?->probability_percent ?? 0;
            }

            $deal = CrmDeal::create($data);

            // Recalculer le score BANT du contact
            $contact = CrmContact::find($data['contact_id']);
            if ($contact) {
                $score = $this->qualifyLead($contact);
                $contact->update(['bant_score' => $score]);
            }

            // Logger l'activité
            CrmActivity::create([
                'contact_id' => $data['contact_id'],
                'deal_id'    => $deal->id,
                'type'       => 'note',
                'subject'    => "Deal créé : {$deal->title}",
                'notes'      => "Valeur : " . number_format($deal->value, 0, ',', ' ') . " XOF — Plan : " . strtoupper($deal->plan ?? 'N/A'),
                'completed_at' => now(),
                'created_by'   => Auth::id() ?? 1,
            ]);

            return $deal->load('contact', 'stage');
        });
    }

    /**
     * Déplace un deal vers un nouveau stage.
     * Log l'activité et déclenche la séquence email configurée si elle existe.
     */
    public function moveDeal(CrmDeal $deal, int $newStageId): void
    {
        $oldStage = $deal->stage;
        $newStage = CrmPipelineStage::findOrFail($newStageId);

        DB::transaction(function () use ($deal, $newStage, $oldStage) {
            // Mettre à jour la probabilité du deal selon le nouveau stage
            $deal->update([
                'stage_id'    => $newStage->id,
                'probability' => $deal->probability ?? $newStage->probability_percent,
                'close_date_actual' => ($newStage->is_closed_won || $newStage->is_closed_lost) ? now() : $deal->close_date_actual,
            ]);

            // Mettre à jour le statut du contact si deal gagné/perdu
            if ($newStage->is_closed_won) {
                $deal->contact->update(['status' => 'won']);
            } elseif ($newStage->is_closed_lost) {
                $deal->contact->update(['status' => 'lost']);
            }

            // Logger le mouvement
            CrmActivity::create([
                'contact_id'   => $deal->contact_id,
                'deal_id'      => $deal->id,
                'type'         => 'note',
                'subject'      => "Deal déplacé : {$oldStage?->name} → {$newStage->name}",
                'notes'        => "Probabilité mise à jour : {$newStage->probability_percent}%",
                'completed_at' => now(),
                'created_by'   => Auth::id() ?? 1,
            ]);
        });

        // Déclencher les séquences email liées au changement de stage
        $this->triggerSequence('deal_stage_change', $deal->contact_id, [
            'stage_id' => $newStageId,
            'deal_id'  => $deal->id,
        ]);
    }

    // =========================================================================
    // PIPELINE & PRÉVISIONS
    // =========================================================================

    /**
     * Retourne toutes les deals groupées par stage avec totaux.
     *
     * @return array{stages: array, totals: array}
     */
    public function getPipelineData(): array
    {
        $stages = CrmPipelineStage::orderBy('order')
            ->with(['deals' => function ($q) {
                $q->with('contact', 'assignedUser')
                  ->whereHas('stage', fn($s) => $s->where('is_closed_lost', false))
                  ->orderByDesc('value');
            }])
            ->get();

        $totalPipeline = 0;
        $totalDeals    = 0;

        $result = $stages->map(function (CrmPipelineStage $stage) use (&$totalPipeline, &$totalDeals) {
            $stageValue = $stage->deals->sum('value');
            $totalPipeline += $stageValue;
            $totalDeals    += $stage->deals->count();

            return [
                'id'                  => $stage->id,
                'name'                => $stage->name,
                'order'               => $stage->order,
                'color'               => $stage->color,
                'probability_percent' => $stage->probability_percent,
                'is_closed_won'       => $stage->is_closed_won,
                'is_closed_lost'      => $stage->is_closed_lost,
                'deals_count'         => $stage->deals->count(),
                'total_value'         => $stageValue,
                'deals'               => $stage->deals->map(fn($deal) => $this->formatDeal($deal)),
            ];
        });

        return [
            'stages'         => $result,
            'total_pipeline' => $totalPipeline,
            'total_deals'    => $totalDeals,
        ];
    }

    /**
     * Calcule la prévision de revenus pondérée par probabilité.
     *
     * @return array{months: array, total_forecast: int, best_case: int, worst_case: int}
     */
    public function getForecast(int $months = 3): array
    {
        $start = Carbon::now()->startOfMonth();
        $end   = Carbon::now()->addMonths($months)->endOfMonth();

        $deals = CrmDeal::with('stage')
            ->whereHas('stage', fn($q) => $q->where('is_closed_lost', false))
            ->whereBetween('close_date_expected', [$start, $end])
            ->get();

        $monthlyData = [];

        for ($i = 0; $i < $months; $i++) {
            $monthStart = Carbon::now()->addMonths($i)->startOfMonth();
            $monthEnd   = Carbon::now()->addMonths($i)->endOfMonth();

            $monthDeals = $deals->filter(function ($deal) use ($monthStart, $monthEnd) {
                $closeDate = Carbon::parse($deal->close_date_expected);
                return $closeDate->between($monthStart, $monthEnd);
            });

            $weightedValue = $monthDeals->sum(function ($deal) {
                $prob = $deal->probability ?? $deal->stage?->probability_percent ?? 0;
                return $deal->value * ($prob / 100);
            });

            $monthlyData[] = [
                'month'          => $monthStart->format('Y-m'),
                'label'          => $monthStart->locale('fr')->isoFormat('MMMM Y'),
                'deals_count'    => $monthDeals->count(),
                'total_value'    => $monthDeals->sum('value'),
                'forecast_value' => (int) $weightedValue,
                'deals'          => $monthDeals->values()->map(fn($d) => $this->formatDeal($d)),
            ];
        }

        $totalForecast = array_sum(array_column($monthlyData, 'forecast_value'));
        $totalValue    = array_sum(array_column($monthlyData, 'total_value'));

        return [
            'months'         => $monthlyData,
            'total_forecast' => $totalForecast,
            'best_case'      => $totalValue,
            'worst_case'     => (int) ($totalForecast * 0.5),
        ];
    }

    // =========================================================================
    // ANALYTIQUES
    // =========================================================================

    /**
     * Analytiques commerciales complètes pour la période donnée.
     *
     * @return array{
     *   total_pipeline: int,
     *   mrr_current: int,
     *   mrr_forecast: int,
     *   conversion_rates: array,
     *   avg_time_per_stage: array,
     *   deals_won: int,
     *   deals_lost: int,
     *   top_sources: array,
     *   new_leads_by_week: array,
     *   deals_by_month: array
     * }
     */
    public function getSalesAnalytics(Carbon $start, Carbon $end): array
    {
        // Total pipeline (deals ouverts)
        $openDeals = CrmDeal::whereHas('stage', fn($q) => $q->where('is_closed_won', false)->where('is_closed_lost', false))
            ->whereBetween('created_at', [$start, $end]);

        $totalPipeline = $openDeals->sum('value');

        // MRR actuel (clients actifs × valeur mensuelle plan)
        $planMrr = [
            'starter'    => 25000,
            'pro'        => 75000,
            'enterprise' => 150000,
        ];

        $wonDeals = CrmDeal::whereHas('stage', fn($q) => $q->where('is_closed_won', true))
            ->whereNotNull('plan')
            ->get();

        $mrrCurrent = $wonDeals->sum(fn($d) => $planMrr[$d->plan] ?? 0);

        // Deals gagnés / perdus dans la période
        $dealsWon  = CrmDeal::whereHas('stage', fn($q) => $q->where('is_closed_won', true))
            ->whereBetween('close_date_actual', [$start, $end])
            ->count();

        $dealsLost = CrmDeal::whereHas('stage', fn($q) => $q->where('is_closed_lost', true))
            ->whereBetween('close_date_actual', [$start, $end])
            ->count();

        // Taux de conversion par stage
        $stages = CrmPipelineStage::orderBy('order')->withCount('deals')->get();
        $conversionRates = [];
        $prevCount = null;

        foreach ($stages as $stage) {
            $rate = ($prevCount && $prevCount > 0)
                ? round(($stage->deals_count / $prevCount) * 100, 1)
                : 100;
            $conversionRates[] = [
                'stage'      => $stage->name,
                'count'      => $stage->deals_count,
                'conversion' => $rate,
            ];
            $prevCount = $stage->deals_count;
        }

        // Sources de leads
        $topSources = CrmContact::select('source', DB::raw('COUNT(*) as count'))
            ->whereBetween('created_at', [$start, $end])
            ->groupBy('source')
            ->orderByDesc('count')
            ->limit(6)
            ->get()
            ->map(fn($s) => ['source' => $s->source, 'count' => $s->count]);

        // Nouveaux leads par semaine (8 dernières semaines)
        $newLeadsByWeek = [];
        for ($i = 7; $i >= 0; $i--) {
            $weekStart = Carbon::now()->subWeeks($i)->startOfWeek();
            $weekEnd   = Carbon::now()->subWeeks($i)->endOfWeek();
            $newLeadsByWeek[] = [
                'week'  => $weekStart->format('d/m'),
                'count' => CrmContact::whereBetween('created_at', [$weekStart, $weekEnd])->count(),
            ];
        }

        // Deals gagnés/perdus par mois (6 derniers mois)
        $dealsByMonth = [];
        for ($i = 5; $i >= 0; $i--) {
            $mStart = Carbon::now()->subMonths($i)->startOfMonth();
            $mEnd   = Carbon::now()->subMonths($i)->endOfMonth();
            $dealsByMonth[] = [
                'month' => $mStart->locale('fr')->isoFormat('MMM'),
                'won'   => CrmDeal::whereHas('stage', fn($q) => $q->where('is_closed_won', true))
                    ->whereBetween('close_date_actual', [$mStart, $mEnd])->count(),
                'lost'  => CrmDeal::whereHas('stage', fn($q) => $q->where('is_closed_lost', true))
                    ->whereBetween('close_date_actual', [$mStart, $mEnd])->count(),
            ];
        }

        // Top 10 deals en cours
        $topDeals = CrmDeal::with('contact', 'stage')
            ->whereHas('stage', fn($q) => $q->where('is_closed_won', false)->where('is_closed_lost', false))
            ->orderByDesc('value')
            ->limit(10)
            ->get()
            ->map(fn($d) => $this->formatDeal($d));

        // Temps moyen de conversion (lead → won), en jours
        $avgConversionDays = CrmDeal::whereHas('stage', fn($q) => $q->where('is_closed_won', true))
            ->whereNotNull('close_date_actual')
            ->get()
            ->avg(fn($d) => Carbon::parse($d->created_at)->diffInDays(Carbon::parse($d->close_date_actual)));

        return [
            'total_pipeline'       => $totalPipeline,
            'mrr_current'          => $mrrCurrent,
            'mrr_forecast'         => (int) ($mrrCurrent * 1.15), // +15% projection
            'conversion_rates'     => $conversionRates,
            'deals_won'            => $dealsWon,
            'deals_lost'           => $dealsLost,
            'top_sources'          => $topSources,
            'new_leads_by_week'    => $newLeadsByWeek,
            'deals_by_month'       => $dealsByMonth,
            'top_deals'            => $topDeals,
            'avg_conversion_days'  => round($avgConversionDays ?? 0),
        ];
    }

    // =========================================================================
    // EMAILS
    // =========================================================================

    /**
     * Envoie un email depuis un template en remplaçant les variables.
     */
    public function sendEmailFromTemplate(CrmContact $contact, int $templateId, array $variables = []): void
    {
        $template = CrmEmailTemplate::findOrFail($templateId);

        // Variables par défaut
        $defaults = [
            '{{contact_name}}' => $contact->contact_name,
            '{{company}}'      => $contact->company_name,
            '{{plan}}'         => $variables['plan'] ?? 'Pro',
            '{{trial_days}}'   => $variables['trial_days'] ?? '14',
            '{{email}}'        => $contact->email,
            '{{country}}'      => $contact->country ?? '',
        ];

        $vars = array_merge($defaults, $variables);

        $subject  = str_replace(array_keys($vars), array_values($vars), $template->subject);
        $bodyHtml = str_replace(array_keys($vars), array_values($vars), $template->body_html);
        $bodyText = str_replace(array_keys($vars), array_values($vars), $template->body_text ?? strip_tags($bodyHtml));

        // Créer le log avant envoi
        $log = CrmEmailLog::create([
            'contact_id'  => $contact->id,
            'template_id' => $templateId,
            'subject'     => $subject,
            'to_email'    => $contact->email,
            'sent_at'     => null,
        ]);

        try {
            Mail::html($bodyHtml, function ($message) use ($contact, $subject) {
                $message->to($contact->email, $contact->contact_name)
                    ->subject($subject)
                    ->from(config('mail.from.address'), config('mail.from.name', 'IBIG Soft'));
            });

            $log->update(['sent_at' => now()]);

            // Mettre à jour last_contact_at
            $contact->update(['last_contact_at' => now()]);

        } catch (\Throwable $e) {
            Log::error('CRM email send failed', [
                'contact_id'  => $contact->id,
                'template_id' => $templateId,
                'error'       => $e->getMessage(),
            ]);
            $log->update(['bounced_at' => now(), 'bounce_reason' => $e->getMessage()]);
            throw $e;
        }
    }

    /**
     * Déclenche une séquence email pour un contact selon le trigger.
     */
    public function triggerSequence(string $trigger, int $contactId, array $context = []): void
    {
        $sequences = CrmEmailSequence::where('trigger', $trigger)
            ->where('is_active', true)
            ->get();

        $contact = CrmContact::find($contactId);
        if (! $contact) {
            return;
        }

        foreach ($sequences as $sequence) {
            $steps = $sequence->steps ?? [];

            foreach ($steps as $step) {
                $delayDays  = (int) ($step['delay_days'] ?? 0);
                $templateId = (int) ($step['template_id'] ?? 0);

                if (! $templateId) {
                    continue;
                }

                if ($delayDays === 0) {
                    // Envoi immédiat
                    try {
                        $this->sendEmailFromTemplate($contact, $templateId, $context);
                    } catch (\Throwable $e) {
                        Log::warning("CRM sequence step failed (immediate)", [
                            'sequence_id' => $sequence->id,
                            'template_id' => $templateId,
                            'error'       => $e->getMessage(),
                        ]);
                    }
                } else {
                    // À planifier via un job Laravel
                    dispatch(function () use ($contact, $templateId, $context) {
                        app(CrmService::class)->sendEmailFromTemplate($contact, $templateId, $context);
                    })->delay(now()->addDays($delayDays));
                }
            }
        }
    }

    // =========================================================================
    // QUALIFICATION BANT
    // =========================================================================

    /**
     * Calcule le score de qualification BANT (0-100).
     *
     * Budget  (0-25) : annual_revenue renseigné et suffisant
     * Authority (0-25) : contact_name est un décideur présumé
     * Need     (0-25) : employee_count + sector cohérents
     * Timeline (0-25) : deal avec close_date_expected proche
     */
    public function qualifyLead(CrmContact $contact): int
    {
        $score = 0;

        // ── Budget (0-25) ─────────────────────────────────────────────────────
        if ($contact->annual_revenue) {
            if ($contact->annual_revenue >= 100_000_000) {
                $score += 25; // Grand compte
            } elseif ($contact->annual_revenue >= 10_000_000) {
                $score += 18;
            } elseif ($contact->annual_revenue >= 1_000_000) {
                $score += 10;
            } else {
                $score += 5;
            }
        }

        // ── Authority (0-25) ──────────────────────────────────────────────────
        $decisionKeywords = ['directeur', 'director', 'dg', 'pdg', 'ceo', 'cto', 'daf', 'cfo', 'responsable', 'manager', 'chef', 'head'];
        $contactLower = strtolower($contact->contact_name . ' ' . ($contact->notes ?? ''));
        $authorityScore = 5; // Minimum : le contact existe

        foreach ($decisionKeywords as $keyword) {
            if (str_contains($contactLower, $keyword)) {
                $authorityScore = 20;
                break;
            }
        }

        $score += $authorityScore;

        // ── Need (0-25) ───────────────────────────────────────────────────────
        if ($contact->employee_count) {
            if ($contact->employee_count >= 50) {
                $score += 20;
            } elseif ($contact->employee_count >= 10) {
                $score += 15;
            } elseif ($contact->employee_count >= 3) {
                $score += 10;
            } else {
                $score += 5;
            }
        }

        if ($contact->sector) {
            $score += 5; // Secteur renseigné
        }

        // ── Timeline (0-25) ───────────────────────────────────────────────────
        $openDeal = $contact->deals()
            ->whereHas('stage', fn($q) => $q->where('is_closed_won', false)->where('is_closed_lost', false))
            ->whereNotNull('close_date_expected')
            ->orderBy('close_date_expected')
            ->first();

        if ($openDeal) {
            $daysToClose = now()->diffInDays(Carbon::parse($openDeal->close_date_expected), false);
            if ($daysToClose <= 30) {
                $score += 25;
            } elseif ($daysToClose <= 90) {
                $score += 15;
            } elseif ($daysToClose <= 180) {
                $score += 10;
            } else {
                $score += 5;
            }
        }

        return min(100, max(0, $score));
    }

    // =========================================================================
    // RAPPELS & ALERTES
    // =========================================================================

    /**
     * Retourne les deals sans activité depuis plus de N jours.
     */
    public function getStaleDealContacts(int $days = 7): \Illuminate\Database\Eloquent\Collection
    {
        $threshold = now()->subDays($days);

        return CrmContact::whereHas('deals', function ($q) {
            $q->whereHas('stage', fn($s) => $s->where('is_closed_won', false)->where('is_closed_lost', false));
        })
        ->where(function ($q) use ($threshold) {
            $q->whereNull('last_contact_at')
              ->orWhere('last_contact_at', '<', $threshold);
        })
        ->with(['deals.stage', 'assignedUser'])
        ->get();
    }

    /**
     * Retourne les activités planifiées pour aujourd'hui.
     */
    public function getTodayActivities(): \Illuminate\Database\Eloquent\Collection
    {
        return CrmActivity::with('contact', 'deal')
            ->whereNull('completed_at')
            ->whereDate('scheduled_at', today())
            ->orderBy('scheduled_at')
            ->get();
    }

    // =========================================================================
    // CONVERSION PROSPECT → CLIENT
    // =========================================================================

    /**
     * Convertit un contact CRM en organisation SECRETIS.
     * Crée l'organisation et lie le deal au compte créé.
     */
    public function convertToClient(CrmContact $contact, array $licenseData): \App\Models\Organization
    {
        return DB::transaction(function () use ($contact, $licenseData) {
            $organization = \App\Models\Organization::create([
                'name'          => $contact->company_name,
                'email'         => $contact->email,
                'country'       => $contact->country ?? 'CI',
                'timezone'      => $licenseData['timezone'] ?? 'Africa/Abidjan',
                'status'        => 'trial',
                'trial_ends_at' => now()->addDays(14),
                'settings'      => [
                    'enabled_modules' => ['agenda', 'courrier', 'taches', 'contacts', 'reunions', 'documents'],
                    'language'        => 'fr',
                    'crm_source'      => 'converted_from_crm',
                    'crm_contact_id'  => $contact->id,
                ],
            ]);

            // Mettre à jour le contact CRM
            $contact->update([
                'type'   => 'client',
                'status' => 'won',
            ]);

            // Logger l'activité
            CrmActivity::create([
                'contact_id'   => $contact->id,
                'type'         => 'note',
                'subject'      => "Converti en client SECRETIS",
                'notes'        => "Organisation créée : {$organization->name} (ID: {$organization->id})",
                'completed_at' => now(),
                'created_by'   => Auth::id() ?? 1,
            ]);

            return $organization;
        });
    }

    // =========================================================================
    // HELPERS PRIVÉS
    // =========================================================================

    private function formatDeal(CrmDeal $deal): array
    {
        return [
            'id'                   => $deal->id,
            'title'                => $deal->title,
            'value'                => $deal->value,
            'value_formatted'      => number_format($deal->value, 0, ',', ' ') . ' XOF',
            'plan'                 => $deal->plan,
            'users_count'          => $deal->users_count,
            'probability'          => $deal->probability ?? $deal->stage?->probability_percent,
            'close_date_expected'  => $deal->close_date_expected,
            'stage'                => $deal->stage ? [
                'id'    => $deal->stage->id,
                'name'  => $deal->stage->name,
                'color' => $deal->stage->color,
            ] : null,
            'contact' => $deal->contact ? [
                'id'           => $deal->contact->id,
                'company_name' => $deal->contact->company_name,
                'contact_name' => $deal->contact->contact_name,
                'country'      => $deal->contact->country,
                'bant_score'   => $deal->contact->bant_score,
            ] : null,
            'assigned_to' => $deal->assigned_to,
        ];
    }
}
