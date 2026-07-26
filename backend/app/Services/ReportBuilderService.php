<?php

declare(strict_types=1);

namespace App\Services;

use App\Jobs\GenerateReportJob;
use App\Models\CustomReport;
use App\Models\CustomReportRun;
use App\Models\Employee;
use App\Models\Event;
use App\Models\Invoice;
use App\Models\Task;
use App\Models\Vehicle;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * ReportBuilderService — Moteur du Report Builder drag-and-drop.
 *
 * Responsabilités :
 *   - Décrire les modules disponibles (colonnes + filtres)
 *   - Construire dynamiquement les requêtes Eloquent
 *   - Prévisualiser (N premières lignes)
 *   - Déclencher l'export asynchrone (queue)
 */
class ReportBuilderService
{
    // =========================================================================
    // Configuration des modules disponibles
    // =========================================================================

    /**
     * Retourne la définition de tous les modules supportés.
     * Chaque colonne : field, label, type (string|number|datetime|date|enum|boolean), sortable?, values?
     */
    public function getAvailableModules(): array
    {
        return [
            'events' => [
                'label' => 'Agenda & Événements',
                'icon'  => 'calendar',
                'columns' => [
                    ['field' => 'title',              'label' => 'Titre',           'type' => 'string',   'sortable' => true],
                    ['field' => 'start_date',          'label' => 'Date début',      'type' => 'datetime', 'sortable' => true],
                    ['field' => 'end_date',            'label' => 'Date fin',        'type' => 'datetime'],
                    ['field' => 'location',            'label' => 'Lieu',            'type' => 'string'],
                    ['field' => 'status',              'label' => 'Statut',          'type' => 'enum',
                        'values' => ['confirmed', 'tentative', 'cancelled']],
                    ['field' => 'creator_name',        'label' => 'Créé par',        'type' => 'string'],
                    ['field' => 'participants_count',  'label' => 'Nb participants', 'type' => 'number',   'sortable' => true],
                    ['field' => 'category',            'label' => 'Catégorie',       'type' => 'string'],
                    ['field' => 'is_recurring',        'label' => 'Récurrent',       'type' => 'boolean'],
                    ['field' => 'created_at',          'label' => 'Date création',   'type' => 'datetime', 'sortable' => true],
                ],
                'filters' => ['date_range', 'status', 'creator', 'category'],
            ],

            'tasks' => [
                'label' => 'Tâches',
                'icon'  => 'clipboard',
                'columns' => [
                    ['field' => 'title',              'label' => 'Titre',          'type' => 'string',  'sortable' => true],
                    ['field' => 'status',             'label' => 'Statut',         'type' => 'enum',
                        'values' => ['todo', 'in_progress', 'review', 'done', 'cancelled']],
                    ['field' => 'priority',           'label' => 'Priorité',       'type' => 'enum',
                        'values' => ['low', 'medium', 'high', 'urgent']],
                    ['field' => 'assignee_name',      'label' => 'Assigné à',      'type' => 'string'],
                    ['field' => 'due_date',           'label' => 'Échéance',       'type' => 'date',    'sortable' => true],
                    ['field' => 'project_name',       'label' => 'Projet',         'type' => 'string'],
                    ['field' => 'completion_percent', 'label' => '% complété',     'type' => 'number',  'sortable' => true],
                    ['field' => 'estimated_hours',    'label' => 'Heures estimées','type' => 'number'],
                    ['field' => 'actual_hours',       'label' => 'Heures réelles', 'type' => 'number'],
                    ['field' => 'created_at',         'label' => 'Créé le',        'type' => 'datetime','sortable' => true],
                ],
                'filters' => ['date_range', 'status', 'priority', 'assignee', 'project'],
            ],

            'visitors' => [
                'label' => 'Visiteurs',
                'icon'  => 'users',
                'columns' => [
                    ['field' => 'full_name',        'label' => 'Nom complet',    'type' => 'string',   'sortable' => true],
                    ['field' => 'company',          'label' => 'Entreprise',     'type' => 'string'],
                    ['field' => 'purpose',          'label' => 'Motif',          'type' => 'string'],
                    ['field' => 'host_name',        'label' => 'Hôte',           'type' => 'string'],
                    ['field' => 'check_in_at',      'label' => 'Arrivée',        'type' => 'datetime', 'sortable' => true],
                    ['field' => 'check_out_at',     'label' => 'Départ',         'type' => 'datetime'],
                    ['field' => 'duration_minutes', 'label' => 'Durée (min)',    'type' => 'number',   'sortable' => true],
                    ['field' => 'badge_number',     'label' => 'N° badge',       'type' => 'string'],
                    ['field' => 'status',           'label' => 'Statut',         'type' => 'enum',
                        'values' => ['pending', 'checked_in', 'checked_out', 'no_show']],
                ],
                'filters' => ['date_range', 'host', 'purpose', 'status'],
            ],

            'hr' => [
                'label' => 'RH & Employés',
                'icon'  => 'identification',
                'columns' => [
                    ['field' => 'full_name',        'label' => 'Nom complet',    'type' => 'string',  'sortable' => true],
                    ['field' => 'employee_number',  'label' => 'Matricule',      'type' => 'string'],
                    ['field' => 'department',       'label' => 'Département',    'type' => 'string'],
                    ['field' => 'position',         'label' => 'Poste',          'type' => 'string'],
                    ['field' => 'contract_type',    'label' => 'Type contrat',   'type' => 'enum',
                        'values' => ['CDI', 'CDD', 'Stage', 'Freelance']],
                    ['field' => 'hire_date',        'label' => 'Date embauche',  'type' => 'date',    'sortable' => true],
                    ['field' => 'salary',           'label' => 'Salaire (FCFA)', 'type' => 'number'],
                    ['field' => 'status',           'label' => 'Statut',         'type' => 'enum',
                        'values' => ['active', 'on_leave', 'terminated']],
                    ['field' => 'leave_days_left',  'label' => 'Congés restants','type' => 'number'],
                ],
                'filters' => ['department', 'contract_type', 'status', 'hire_date_range'],
            ],

            'accounting' => [
                'label' => 'Comptabilité',
                'icon'  => 'banknotes',
                'columns' => [
                    ['field' => 'invoice_number', 'label' => 'N° facture',   'type' => 'string'],
                    ['field' => 'client_name',    'label' => 'Client',        'type' => 'string', 'sortable' => true],
                    ['field' => 'amount',         'label' => 'Montant HT',    'type' => 'number', 'sortable' => true],
                    ['field' => 'tax_amount',     'label' => 'TVA',           'type' => 'number'],
                    ['field' => 'total_amount',   'label' => 'TTC',           'type' => 'number', 'sortable' => true],
                    ['field' => 'status',         'label' => 'Statut',        'type' => 'enum',
                        'values' => ['draft', 'sent', 'paid', 'overdue', 'cancelled']],
                    ['field' => 'issue_date',     'label' => 'Date émission', 'type' => 'date',   'sortable' => true],
                    ['field' => 'due_date',       'label' => 'Échéance',      'type' => 'date',   'sortable' => true],
                    ['field' => 'currency',       'label' => 'Devise',        'type' => 'string'],
                ],
                'filters' => ['date_range', 'status', 'client', 'amount_range'],
            ],

            'fleet' => [
                'label' => 'Flotte',
                'icon'  => 'truck',
                'columns' => [
                    ['field' => 'license_plate',      'label' => 'Immatriculation', 'type' => 'string'],
                    ['field' => 'brand',              'label' => 'Marque',           'type' => 'string', 'sortable' => true],
                    ['field' => 'model',              'label' => 'Modèle',           'type' => 'string'],
                    ['field' => 'year',               'label' => 'Année',            'type' => 'number', 'sortable' => true],
                    ['field' => 'fuel_type',          'label' => 'Carburant',        'type' => 'enum',
                        'values' => ['essence', 'diesel', 'electrique', 'hybride']],
                    ['field' => 'mileage',            'label' => 'Kilométrage',      'type' => 'number', 'sortable' => true],
                    ['field' => 'status',             'label' => 'Statut',           'type' => 'enum',
                        'values' => ['available', 'in_use', 'maintenance', 'retired']],
                    ['field' => 'assigned_driver',    'label' => 'Conducteur',       'type' => 'string'],
                    ['field' => 'next_maintenance_at','label' => 'Prochaine révision','type' => 'date'],
                    ['field' => 'insurance_expiry',   'label' => 'Expiration assurance','type' => 'date'],
                ],
                'filters' => ['status', 'fuel_type', 'assigned_driver', 'mileage_range'],
            ],

            'documents' => [
                'label' => 'Documents GED',
                'icon'  => 'document',
                'columns' => [
                    ['field' => 'title',       'label' => 'Titre',         'type' => 'string',   'sortable' => true],
                    ['field' => 'category',    'label' => 'Catégorie',     'type' => 'string'],
                    ['field' => 'file_type',   'label' => 'Type fichier',  'type' => 'string'],
                    ['field' => 'file_size',   'label' => 'Taille (Ko)',   'type' => 'number'],
                    ['field' => 'owner_name',  'label' => 'Propriétaire',  'type' => 'string'],
                    ['field' => 'status',      'label' => 'Statut',        'type' => 'enum',
                        'values' => ['draft', 'review', 'approved', 'archived']],
                    ['field' => 'version',     'label' => 'Version',       'type' => 'string'],
                    ['field' => 'created_at',  'label' => 'Créé le',       'type' => 'datetime', 'sortable' => true],
                    ['field' => 'updated_at',  'label' => 'Modifié le',    'type' => 'datetime', 'sortable' => true],
                ],
                'filters' => ['date_range', 'category', 'status', 'owner'],
            ],
        ];
    }

    // =========================================================================
    // Prévisualisation
    // =========================================================================

    /**
     * Retourne les N premières lignes pour l'aperçu temps-réel du Builder.
     *
     * @return array{data: array, total: int, columns: array}
     */
    public function preview(CustomReport $report, int $limit = 10): array
    {
        $query = $this->buildQuery($report);

        $total = (clone $query)->count();
        $rows  = $query->limit($limit)->get();

        return [
            'data'    => $this->formatRows($rows, $report->columns),
            'total'   => $total,
            'columns' => $report->columns,
        ];
    }

    // =========================================================================
    // Déclenchement asynchrone
    // =========================================================================

    /**
     * Crée un CustomReportRun et dispatch le job de génération.
     */
    public function run(CustomReport $report, string $format = 'excel'): CustomReportRun
    {
        $run = CustomReportRun::create([
            'report_id' => $report->id,
            'run_by'    => auth()->id(),
            'format'    => $format,
            'status'    => 'pending',
            'expires_at'=> now()->addHours(24),
        ]);

        dispatch(new GenerateReportJob($run));

        return $run;
    }

    // =========================================================================
    // Construction de la requête dynamique
    // =========================================================================

    /**
     * Construit un Builder Eloquent à partir de la configuration du rapport.
     */
    public function buildQuery(CustomReport $report): Builder
    {
        $modelMap = [
            'events'     => Event::class,
            'tasks'      => Task::class,
            'hr'         => Employee::class,
            'accounting' => Invoice::class,
            'fleet'      => Vehicle::class,
        ];

        $modelClass = $modelMap[$report->module] ?? null;

        if ($modelClass === null) {
            // Pour les modules sans modèle dédié (visitors, documents),
            // on utilise une requête DB brute mappée plus bas
            return $this->buildRawQuery($report);
        }

        /** @var Builder $query */
        $query = $modelClass::query()
            ->where('organization_id', $report->organization_id);

        // Sélection des colonnes
        $this->applyColumnSelect($query, $report->module, $report->columns);

        // Filtres
        foreach (($report->filters ?? []) as $filter) {
            $this->applyFilter($query, $filter);
        }

        // Tri
        foreach (($report->sort ?? []) as $sort) {
            if (! empty($sort['field'])) {
                $query->orderBy($sort['field'], $sort['direction'] ?? 'asc');
            }
        }

        return $query;
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    /**
     * Requête brute pour modules sans Eloquent Model direct (visitors, documents).
     */
    private function buildRawQuery(CustomReport $report): Builder
    {
        $tableMap = [
            'visitors'  => 'visitors',
            'documents' => 'documents',
        ];

        $table = $tableMap[$report->module] ?? $report->module;

        $query = \Illuminate\Support\Facades\DB::table($table)
            ->where('organization_id', $report->organization_id);

        // Filtres
        foreach (($report->filters ?? []) as $filter) {
            $this->applyFilterRaw($query, $filter);
        }

        // Tri
        foreach (($report->sort ?? []) as $sort) {
            if (! empty($sort['field'])) {
                $query->orderBy($sort['field'], $sort['direction'] ?? 'asc');
            }
        }

        // Cast Builder via wrap
        return \App\Models\Event::query()->fromSub($query, $table);
    }

    private function applyColumnSelect(Builder $query, string $module, array $columns): void
    {
        $visible = array_filter($columns, fn($c) => ($c['visible'] ?? true));
        if (empty($visible)) {
            return;
        }

        $fields = array_map(fn($c) => $c['field'], $visible);
        // Toujours inclure id et organization_id pour la sécurité
        $fields = array_unique(array_merge(['id'], $fields));
        $query->select($fields);
    }

    private function applyFilter(Builder $query, array $filter): void
    {
        $field    = $filter['field']    ?? null;
        $operator = $filter['operator'] ?? '=';
        $value    = $filter['value']    ?? null;

        if (! $field || $value === null || $value === '') {
            return;
        }

        match ($operator) {
            '='        => $query->where($field, $value),
            '!='       => $query->where($field, '!=', $value),
            '>'        => $query->where($field, '>', $value),
            '>='       => $query->where($field, '>=', $value),
            '<'        => $query->where($field, '<', $value),
            '<='       => $query->where($field, '<=', $value),
            'contains' => $query->where($field, 'LIKE', "%{$value}%"),
            'starts'   => $query->where($field, 'LIKE', "{$value}%"),
            'between'  => is_array($value) && count($value) === 2
                            ? $query->whereBetween($field, $value)
                            : null,
            'in'       => is_array($value) ? $query->whereIn($field, $value) : null,
            'null'     => $query->whereNull($field),
            'not_null' => $query->whereNotNull($field),
            default    => $query->where($field, $value),
        };
    }

    private function applyFilterRaw(\Illuminate\Database\Query\Builder $query, array $filter): void
    {
        $field    = $filter['field']    ?? null;
        $operator = $filter['operator'] ?? '=';
        $value    = $filter['value']    ?? null;

        if (! $field || $value === null) {
            return;
        }

        match ($operator) {
            'contains' => $query->where($field, 'LIKE', "%{$value}%"),
            'between'  => is_array($value) ? $query->whereBetween($field, $value) : null,
            default    => $query->where($field, $operator, $value),
        };
    }

    /**
     * Formate les lignes selon les types de colonnes.
     */
    private function formatRows($rows, array $columns): array
    {
        $columnMap = [];
        foreach ($columns as $col) {
            $columnMap[$col['field']] = $col;
        }

        return $rows->map(function ($row) use ($columnMap) {
            $item = is_object($row) ? (array) $row->getAttributes() : (array) $row;
            $formatted = [];

            foreach ($item as $key => $value) {
                $col = $columnMap[$key] ?? null;
                if ($col === null) {
                    $formatted[$key] = $value;
                    continue;
                }

                $formatted[$key] = match ($col['type'] ?? 'string') {
                    'datetime' => $value ? \Carbon\Carbon::parse($value)->format('d/m/Y H:i') : null,
                    'date'     => $value ? \Carbon\Carbon::parse($value)->format('d/m/Y') : null,
                    'number'   => $value !== null ? (float) $value : null,
                    'boolean'  => (bool) $value,
                    default    => $value,
                };
            }

            return $formatted;
        })->all();
    }
}
