<?php

namespace App\Services;

use App\Models\CorrectiveAction;
use App\Models\CustomerComplaint;
use App\Models\Nonconformity;
use App\Models\Organization;
use App\Models\QualityAudit;
use App\Models\QualityDocument;
use App\Models\QualityIndicator;
use App\Models\QualityIndicatorValue;
use App\Models\QualityProcess;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * QualityService — Logique métier du module Qualité ISO 9001
 *
 * Couvre :
 *  - Cycle de vie des non-conformités (création → clôture)
 *  - Analyse des causes (5 Pourquoi, Ishikawa/5M)
 *  - Actions correctives et suivi d'efficacité
 *  - KPIs et tableau de bord qualité
 *  - Indicateurs qualité (définition + saisie des valeurs)
 *  - Planification et suivi des audits
 *  - Alertes expiration des documents (CRON)
 *  - Rapport mensuel qualité
 */
class QualityService
{
    // =========================================================================
    // NON-CONFORMITÉS
    // =========================================================================

    /**
     * Crée une non-conformité avec génération automatique de la référence NC-YYYY-XXXX.
     */
    public function createNonconformity(array $data): Nonconformity
    {
        return DB::transaction(function () use ($data) {
            $orgId = $data['organization_id'];
            $year  = now()->year;

            // Séquence auto par organisation et année
            $seq = Nonconformity::where('organization_id', $orgId)
                ->whereYear('created_at', $year)
                ->count() + 1;

            $reference = sprintf('NC-%d-%04d', $year, $seq);

            $nc = Nonconformity::create([
                'organization_id' => $orgId,
                'reference'       => $reference,
                'title'           => $data['title'],
                'description'     => $data['description'],
                'source'          => $data['source'] ?? 'internal_detection',
                'severity'        => $data['severity'] ?? 'mineure',
                'status'          => 'ouvert',
                'detected_by'     => $data['detected_by'] ?? null,
                'detected_at'     => $data['detected_at'] ?? now(),
                'process_id'      => $data['process_id'] ?? null,
                'product_service' => $data['product_service'] ?? null,
                'immediate_action'=> $data['immediate_action'] ?? null,
                'due_date'        => $data['due_date'] ?? null,
                'cost_of_nonconformity' => $data['cost_of_nonconformity'] ?? null,
            ]);

            // Notifier le responsable du processus
            if ($nc->process_id) {
                $process = QualityProcess::find($nc->process_id);
                if ($process && $process->owner_user_id) {
                    $this->notifyProcessOwner($nc, $process->ownerUser);
                }
            }

            // Vérifier la récurrence
            $this->checkRecurrence($nc);

            Log::info('NC créée', ['reference' => $reference, 'org' => $orgId]);

            return $nc;
        });
    }

    /**
     * Enregistre l'analyse des causes (5 Pourquoi ou Ishikawa).
     *
     * Pour 5 Pourquoi, $analysis contient :
     *   ['why1' => '...', 'why2' => '...', ..., 'why5' => '...', 'root_conclusion' => '...']
     *
     * Pour Ishikawa (5M), $analysis contient :
     *   ['matiere' => ['cause1', ...], 'methode' => [...], 'milieu' => [...],
     *    'main_oeuvre' => [...], 'materiel' => [...], 'management' => [...]]
     */
    public function analyzeRootCause(Nonconformity $nc, string $method, array $analysis): void
    {
        DB::transaction(function () use ($nc, $method, $analysis) {
            // Extraire la cause racine textuelle selon la méthode
            $rootCauseText = match ($method) {
                '5pourquoi' => $analysis['root_conclusion'] ?? ($analysis['why5'] ?? ''),
                'ishikawa'  => $this->summarizeIshikawa($analysis),
                '5M'        => $this->summarizeIshikawa($analysis),
                default     => $analysis['conclusion'] ?? '',
            };

            $nc->update([
                'root_cause'        => $rootCauseText,
                'root_cause_method' => $method,
                'root_cause_detail' => $analysis,
                'status'            => 'analyse',
            ]);
        });
    }

    /**
     * Ajoute une action corrective à une non-conformité.
     */
    public function createCorrectiveAction(Nonconformity $nc, array $data): CorrectiveAction
    {
        return DB::transaction(function () use ($nc, $data) {
            $action = CorrectiveAction::create([
                'nonconformity_id'    => $nc->id,
                'organization_id'     => $nc->organization_id,
                'description'         => $data['description'],
                'responsible_user_id' => $data['responsible_user_id'] ?? null,
                'due_date'            => $data['due_date'] ?? null,
                'status'              => 'planned',
                'notes'               => $data['notes'] ?? null,
            ]);

            // Mettre à jour le statut NC si besoin
            if ($nc->status === 'analyse') {
                $nc->update(['status' => 'action_corrective']);
            }

            // Mettre à jour le résumé JSONB embarqué
            $this->syncCorrectiveActionsSummary($nc);

            return $action;
        });
    }

    /**
     * Vérifie l'efficacité d'une action corrective et gère la clôture de la NC.
     *
     * Si rating >= 3 (efficace), la NC passe en "clos".
     * Si rating < 3 (non efficace), la NC repasse en "action_corrective" pour nouvelle action.
     */
    public function verifyNonconformity(Nonconformity $nc, User $verifier, int $rating): void
    {
        DB::transaction(function () use ($nc, $verifier, $rating) {
            $effective = $rating >= 3;

            $nc->update([
                'status'      => $effective ? 'clos' : 'action_corrective',
                'verified_by' => $verifier->id,
                'verified_at' => now(),
                'closed_at'   => $effective ? now() : null,
            ]);

            if (!$effective) {
                // Incrémente le compteur de récurrence
                $nc->increment('recurrence_count');

                Log::warning('NC non clôturée — action corrective insuffisante', [
                    'nc_id' => $nc->id,
                    'ref'   => $nc->reference,
                    'rating'=> $rating,
                ]);
            }
        });
    }

    // =========================================================================
    // TABLEAU DE BORD
    // =========================================================================

    /**
     * KPIs qualité pour le tableau de bord.
     */
    public function getQualityDashboard(Organization $org): array
    {
        $orgId = $org->id;
        $now   = now();

        // NC ouvertes (hors "clos")
        $openNc = Nonconformity::where('organization_id', $orgId)
            ->whereNotIn('status', ['clos'])
            ->count();

        // NC en retard (due_date dépassée et non clôturées)
        $overdueNc = Nonconformity::where('organization_id', $orgId)
            ->whereNotIn('status', ['clos'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', $now->toDateString())
            ->count();

        // Délai moyen de clôture (en jours) sur les 6 derniers mois
        $avgClosureTime = Nonconformity::where('organization_id', $orgId)
            ->where('status', 'clos')
            ->whereNotNull('closed_at')
            ->where('closed_at', '>=', $now->copy()->subMonths(6))
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (closed_at - detected_at)) / 86400) as avg_days')
            ->value('avg_days');

        // Taux de récurrence
        $totalClosed = Nonconformity::where('organization_id', $orgId)
            ->where('status', 'clos')
            ->count();

        $recurringNc = Nonconformity::where('organization_id', $orgId)
            ->where('recurrence_count', '>', 0)
            ->count();

        $recurrenceRate = $totalClosed > 0
            ? round(($recurringNc / $totalClosed) * 100, 1)
            : 0;

        // Taux de clôture dans les délais
        $closedInTime = Nonconformity::where('organization_id', $orgId)
            ->where('status', 'clos')
            ->whereNotNull('due_date')
            ->whereRaw('closed_at::date <= due_date')
            ->count();

        $totalWithDueDate = Nonconformity::where('organization_id', $orgId)
            ->where('status', 'clos')
            ->whereNotNull('due_date')
            ->count();

        $closureOnTimeRate = $totalWithDueDate > 0
            ? round(($closedInTime / $totalWithDueDate) * 100, 1)
            : 100;

        // Satisfaction client moyenne (réclamations des 3 derniers mois)
        $avgSatisfaction = CustomerComplaint::where('organization_id', $orgId)
            ->where('status', 'clos')
            ->whereNotNull('satisfaction_rating')
            ->where('closed_at', '>=', $now->copy()->subMonths(3))
            ->avg('satisfaction_rating');

        // Évolution NC par mois (12 derniers mois)
        $monthlyNc = $this->getMonthlyNcTrend($orgId, 12);

        // NC par processus (top 5)
        $ncByProcess = Nonconformity::where('nonconformities.organization_id', $orgId)
            ->whereNotNull('process_id')
            ->join('quality_processes', 'quality_processes.id', '=', 'nonconformities.process_id')
            ->selectRaw('quality_processes.name as process_name, quality_processes.code as process_code, COUNT(*) as nc_count')
            ->groupBy('quality_processes.id', 'quality_processes.name', 'quality_processes.code')
            ->orderByDesc('nc_count')
            ->limit(5)
            ->get();

        // NC par source
        $ncBySource = Nonconformity::where('organization_id', $orgId)
            ->selectRaw('source, COUNT(*) as count')
            ->groupBy('source')
            ->get();

        // NC par sévérité
        $ncBySeverity = Nonconformity::where('organization_id', $orgId)
            ->whereNotIn('status', ['clos'])
            ->selectRaw('severity, COUNT(*) as count')
            ->groupBy('severity')
            ->get();

        // Indicateurs qualité avec statut feux tricolores
        $indicators = $this->getIndicatorsWithStatus($orgId);

        return [
            'kpis' => [
                'open_nc'              => $openNc,
                'overdue_nc'           => $overdueNc,
                'avg_closure_days'     => round($avgClosureTime ?? 0, 1),
                'recurrence_rate'      => $recurrenceRate,
                'closure_on_time_rate' => $closureOnTimeRate,
                'avg_satisfaction'     => round($avgSatisfaction ?? 0, 1),
                'total_closed'         => $totalClosed,
            ],
            'monthly_trend'  => $monthlyNc,
            'nc_by_process'  => $ncByProcess,
            'nc_by_source'   => $ncBySource,
            'nc_by_severity' => $ncBySeverity,
            'indicators'     => $indicators,
        ];
    }

    // =========================================================================
    // INDICATEURS QUALITÉ
    // =========================================================================

    /**
     * Enregistre la valeur d'un indicateur pour une période.
     */
    public function recordIndicatorValue(
        QualityIndicator $indicator,
        int $year,
        int $month,
        float $value,
        ?string $comment = null,
        ?int $recordedBy = null,
    ): QualityIndicatorValue {
        return QualityIndicatorValue::updateOrCreate(
            [
                'indicator_id' => $indicator->id,
                'period_year'  => $year,
                'period_month' => $month,
            ],
            [
                'organization_id' => $indicator->organization_id,
                'value'           => $value,
                'comment'         => $comment,
                'recorded_by'     => $recordedBy,
                'recorded_at'     => now(),
            ]
        );
    }

    /**
     * Retourne les indicateurs avec leur statut RAG (Red/Amber/Green).
     */
    public function getIndicatorsWithStatus(int $orgId): array
    {
        $indicators = QualityIndicator::where('organization_id', $orgId)
            ->where('is_active', true)
            ->with(['latestValue'])
            ->get();

        return $indicators->map(function (QualityIndicator $ind) {
            $latestValue = $ind->latestValue?->value;
            $status      = $this->computeIndicatorStatus($ind, $latestValue);

            return [
                'id'              => $ind->id,
                'code'            => $ind->code,
                'name'            => $ind->name,
                'unit'            => $ind->unit,
                'target_value'    => $ind->target_value,
                'alert_threshold' => $ind->alert_threshold,
                'current_value'   => $latestValue,
                'status'          => $status, // green / orange / red
                'period'          => $ind->latestValue
                    ? "{$ind->latestValue->period_month}/{$ind->latestValue->period_year}"
                    : null,
            ];
        })->toArray();
    }

    // =========================================================================
    // AUDITS
    // =========================================================================

    /**
     * Planifie un audit qualité avec génération de référence AQ-YYYY-XXX.
     */
    public function planAudit(array $data): QualityAudit
    {
        $orgId = $data['organization_id'];
        $year  = now()->year;

        $seq = QualityAudit::where('organization_id', $orgId)
            ->whereYear('created_at', $year)
            ->count() + 1;

        return QualityAudit::create([
            'organization_id'  => $orgId,
            'reference'        => sprintf('AQ-%d-%03d', $year, $seq),
            'title'            => $data['title'],
            'audit_type'       => $data['audit_type'] ?? 'interne',
            'scope'            => $data['scope'] ?? null,
            'auditor_name'     => $data['auditor_name'] ?? null,
            'auditor_user_id'  => $data['auditor_user_id'] ?? null,
            'audit_date_start' => $data['audit_date_start'] ?? null,
            'audit_date_end'   => $data['audit_date_end'] ?? null,
            'status'           => 'planifie',
            'next_audit_date'  => $data['next_audit_date'] ?? null,
            'created_by'       => $data['created_by'] ?? null,
        ]);
    }

    /**
     * Questions d'audit par clause ISO 9001:2015.
     *
     * @param  string $isoClause  Ex: "8.3", "9.1", "4.1"
     * @return array              Liste de questions
     */
    public function getAuditChecklist(string $isoClause): array
    {
        $checklists = [
            '4.1' => [
                'L\'organisation a-t-elle déterminé les enjeux internes et externes pertinents ?',
                'Ces enjeux sont-ils surveillés et revus ?',
                'L\'organisation comprend-elle les besoins des parties intéressées ?',
            ],
            '4.2' => [
                'Les parties intéressées pertinentes ont-elles été identifiées ?',
                'Les exigences de ces parties sont-elles connues et surveillées ?',
            ],
            '4.3' => [
                'Le domaine d\'application du SMQ est-il documenté ?',
                'Les exclusions éventuelles sont-elles justifiées ?',
            ],
            '4.4' => [
                'Les processus nécessaires au SMQ sont-ils déterminés ?',
                'Les interactions entre processus sont-elles maîtrisées ?',
                'Les ressources nécessaires à chaque processus sont-elles disponibles ?',
            ],
            '5.1' => [
                'La direction démontre-t-elle son leadership en matière de qualité ?',
                'La politique qualité est-elle compatible avec le contexte de l\'organisation ?',
                'Les objectifs qualité sont-ils établis et communiqués ?',
            ],
            '5.2' => [
                'La politique qualité est-elle documentée et communiquée ?',
                'La politique qualité est-elle disponible pour les parties intéressées ?',
            ],
            '6.1' => [
                'Les risques et opportunités ont-ils été déterminés ?',
                'Des actions pour traiter les risques sont-elles planifiées ?',
            ],
            '6.2' => [
                'Les objectifs qualité sont-ils mesurables et cohérents avec la politique ?',
                'Un plan de réalisation des objectifs est-il établi ?',
            ],
            '7.1' => [
                'Les ressources humaines sont-elles disponibles et compétentes ?',
                'L\'infrastructure nécessaire est-elle déterminée et maintenue ?',
                'L\'environnement de travail est-il maîtrisé ?',
            ],
            '7.2' => [
                'Les compétences requises pour chaque poste sont-elles définies ?',
                'Des actions de formation sont-elles entreprises si nécessaire ?',
                'Des preuves de compétences sont-elles conservées ?',
            ],
            '7.3' => [
                'Le personnel est-il sensibilisé à la politique et aux objectifs qualité ?',
                'Le personnel comprend-il sa contribution au SMQ ?',
            ],
            '7.5' => [
                'Les informations documentées requises par la norme sont-elles disponibles ?',
                'Les informations documentées d\'origine externe sont-elles maîtrisées ?',
                'Un processus de création et mise à jour des documents est-il en place ?',
            ],
            '8.1' => [
                'Les processus opérationnels sont-ils planifiés et maîtrisés ?',
                'Des critères pour la maîtrise des processus sont-ils établis ?',
            ],
            '8.2' => [
                'Les exigences des clients sont-elles déterminées et revues ?',
                'Les modifications des exigences sont-elles communiquées ?',
            ],
            '8.3' => [
                'Un processus de conception et développement est-il établi ?',
                'Les revues, vérifications et validations sont-elles effectuées ?',
                'Les sorties de conception satisfont-elles aux exigences d\'entrée ?',
            ],
            '8.4' => [
                'Les processus, produits et services fournis en externe sont-ils maîtrisés ?',
                'Les prestataires externes sont-ils évalués et sélectionnés ?',
            ],
            '8.5' => [
                'La production est-elle réalisée dans des conditions maîtrisées ?',
                'L\'identification et la traçabilité des produits sont-elles assurées ?',
                'La propriété du client est-elle préservée ?',
            ],
            '8.6' => [
                'Des vérifications sont-elles effectuées pour s\'assurer de la conformité ?',
                'Les preuves de conformité sont-elles conservées ?',
            ],
            '8.7' => [
                'Les éléments de sortie non conformes sont-ils identifiés et maîtrisés ?',
                'Des enregistrements de NC sont-ils maintenus ?',
                'Des dérogations sont-elles accordées si nécessaire ?',
            ],
            '9.1' => [
                'Des méthodes de surveillance, de mesure et d\'évaluation sont-elles en place ?',
                'La satisfaction du client est-elle surveillée ?',
                'Des audits internes sont-ils planifiés et réalisés ?',
            ],
            '9.2' => [
                'Le programme d\'audit interne est-il planifié ?',
                'Les auditeurs sont-ils objectifs et impartiaux ?',
                'Les résultats d\'audit sont-ils communiqués à la direction ?',
            ],
            '9.3' => [
                'La revue de direction est-elle réalisée à intervalles planifiés ?',
                'Tous les éléments d\'entrée requis sont-ils couverts ?',
                'Les décisions et actions sont-elles documentées ?',
            ],
            '10.1' => [
                'Des opportunités d\'amélioration sont-elles déterminées ?',
                'Des actions sont-elles entreprises pour améliorer les produits/services ?',
            ],
            '10.2' => [
                'Les non-conformités sont-elles traitées et corrigées ?',
                'Des actions correctives sont-elles mises en œuvre ?',
                'L\'efficacité des actions correctives est-elle évaluée ?',
            ],
            '10.3' => [
                'L\'organisation améliore-t-elle en continu son SMQ ?',
                'Les résultats d\'analyse et d\'évaluation sont-ils utilisés pour l\'amélioration ?',
            ],
        ];

        return $checklists[$isoClause] ?? [
            "Vérifier la conformité à la clause {$isoClause} de la norme ISO 9001:2015.",
        ];
    }

    // =========================================================================
    // RAPPORT QUALITÉ
    // =====================================================================

    /**
     * Génère le rapport mensuel qualité pour une organisation.
     */
    public function generateQualityReport(Organization $org, Carbon $period): array
    {
        $orgId     = $org->id;
        $startDate = $period->copy()->startOfMonth();
        $endDate   = $period->copy()->endOfMonth();

        // NC du mois
        $ncThisMonth = Nonconformity::where('organization_id', $orgId)
            ->whereBetween('detected_at', [$startDate, $endDate])
            ->get();

        // NC clôturées dans le mois
        $ncClosedThisMonth = Nonconformity::where('organization_id', $orgId)
            ->whereBetween('closed_at', [$startDate, $endDate])
            ->where('status', 'clos')
            ->count();

        // Réclamations du mois
        $complaintsThisMonth = CustomerComplaint::where('organization_id', $orgId)
            ->whereBetween('received_at', [$startDate, $endDate])
            ->get();

        // Audits du mois
        $auditsThisMonth = QualityAudit::where('organization_id', $orgId)
            ->whereBetween('audit_date_start', [$startDate, $endDate])
            ->get();

        // Documents expirés ou à réviser
        $expiringDocs = QualityDocument::where('organization_id', $orgId)
            ->whereIn('status', ['approuve'])
            ->where('review_date', '<=', $endDate->copy()->addDays(30)->toDateString())
            ->get();

        // Indicateurs du mois
        $indicatorValues = QualityIndicatorValue::where('organization_id', $orgId)
            ->where('period_year', $period->year)
            ->where('period_month', $period->month)
            ->with('indicator')
            ->get();

        return [
            'period'               => $period->format('F Y'),
            'period_start'         => $startDate->toDateString(),
            'period_end'           => $endDate->toDateString(),
            'nc_opened'            => $ncThisMonth->count(),
            'nc_closed'            => $ncClosedThisMonth,
            'nc_by_severity'       => $ncThisMonth->groupBy('severity')->map->count(),
            'nc_by_source'         => $ncThisMonth->groupBy('source')->map->count(),
            'complaints_received'  => $complaintsThisMonth->count(),
            'complaints_closed'    => $complaintsThisMonth->where('status', 'clos')->count(),
            'avg_satisfaction'     => $complaintsThisMonth->whereNotNull('satisfaction_rating')->avg('satisfaction_rating'),
            'audits_conducted'     => $auditsThisMonth->count(),
            'expiring_documents'   => $expiringDocs->count(),
            'indicator_values'     => $indicatorValues->map(fn($v) => [
                'code'         => $v->indicator->code,
                'name'         => $v->indicator->name,
                'value'        => $v->value,
                'target'       => $v->indicator->target_value,
                'unit'         => $v->indicator->unit,
                'status'       => $this->computeIndicatorStatus($v->indicator, $v->value),
            ]),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    // =========================================================================
    // CRON — ALERTES DOCUMENTS
    // =========================================================================

    /**
     * Vérifie les documents dont la date de révision approche et envoie des alertes.
     * À appeler via un scheduler Laravel (daily).
     */
    public function checkDocumentExpiry(): void
    {
        $threshold = now()->addDays(30)->toDateString();

        $documents = QualityDocument::whereIn('status', ['approuve'])
            ->whereNotNull('review_date')
            ->where('review_date', '<=', $threshold)
            ->with(['process.ownerUser', 'approvedByUser'])
            ->get();

        foreach ($documents as $doc) {
            $daysLeft = now()->diffInDays($doc->review_date, false);

            Log::info('Document qualité à réviser', [
                'reference' => $doc->reference,
                'title'     => $doc->title,
                'days_left' => $daysLeft,
            ]);

            // Notifier le responsable du processus ou l'approbateur
            $recipient = $doc->process?->ownerUser ?? $doc->approvedByUser;
            if ($recipient) {
                // Notification à implémenter via Notification::send()
                // Notification::send($recipient, new QualityDocumentExpiryNotification($doc, $daysLeft));
            }
        }
    }

    // =========================================================================
    // HELPERS PRIVÉS
    // =========================================================================

    private function notifyProcessOwner(Nonconformity $nc, ?User $owner): void
    {
        if (!$owner) {
            return;
        }
        // Notification::send($owner, new NonconformityCreatedNotification($nc));
        Log::info('Notification NC envoyée', ['user_id' => $owner->id, 'nc' => $nc->reference]);
    }

    private function checkRecurrence(Nonconformity $nc): void
    {
        if (!$nc->process_id) {
            return;
        }

        $previousSimilar = Nonconformity::where('organization_id', $nc->organization_id)
            ->where('process_id', $nc->process_id)
            ->where('id', '<>', $nc->id)
            ->where('status', 'clos')
            ->whereRaw("LOWER(title) ILIKE ?", ['%' . strtolower(substr($nc->title, 0, 20)) . '%'])
            ->where('closed_at', '>=', now()->subMonths(12))
            ->exists();

        if ($previousSimilar) {
            $nc->increment('recurrence_count');
            Log::warning('NC récurrente détectée', ['reference' => $nc->reference]);
        }
    }

    private function syncCorrectiveActionsSummary(Nonconformity $nc): void
    {
        $actions = CorrectiveAction::where('nonconformity_id', $nc->id)
            ->get(['id', 'description', 'status', 'due_date', 'responsible_user_id', 'effectiveness_rating'])
            ->toArray();

        $nc->update(['corrective_actions' => $actions]);
    }

    private function summarizeIshikawa(array $analysis): string
    {
        $parts = [];
        $labels = [
            'matiere'    => 'Matière',
            'methode'    => 'Méthode',
            'milieu'     => 'Milieu',
            'main_oeuvre'=> "Main-d'œuvre",
            'materiel'   => 'Matériel',
            'management' => 'Management',
        ];

        foreach ($labels as $key => $label) {
            $causes = $analysis[$key] ?? [];
            if (!empty($causes)) {
                $parts[] = $label . ' : ' . implode(', ', array_filter($causes));
            }
        }

        return implode(' | ', $parts);
    }

    private function computeIndicatorStatus(QualityIndicator $ind, ?float $value): string
    {
        if ($value === null || $ind->target_value === null) {
            return 'grey';
        }

        // Si une valeur cible basse est meilleure (ex: délai, taux NC)
        // La logique est inversée selon le type d'indicateur
        // Convention : target_value = valeur souhaitée, alert_threshold = seuil d'alerte
        $threshold = $ind->alert_threshold ?? ($ind->target_value * 0.9);

        // Pour les indicateurs où "plus c'est haut mieux c'est" (satisfaction, taux de conformité)
        // On considère que si value >= target c'est vert, entre threshold et target c'est orange, < threshold rouge
        if ($value >= $ind->target_value) {
            return 'green';
        } elseif ($value >= $threshold) {
            return 'orange';
        } else {
            return 'red';
        }
    }

    private function getMonthlyNcTrend(int $orgId, int $months): array
    {
        $trend = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $date  = now()->subMonths($i);
            $label = $date->format('M Y');

            $opened = Nonconformity::where('organization_id', $orgId)
                ->whereYear('detected_at', $date->year)
                ->whereMonth('detected_at', $date->month)
                ->count();

            $closed = Nonconformity::where('organization_id', $orgId)
                ->where('status', 'clos')
                ->whereYear('closed_at', $date->year)
                ->whereMonth('closed_at', $date->month)
                ->count();

            $trend[] = ['month' => $label, 'opened' => $opened, 'closed' => $closed];
        }

        return $trend;
    }
}
