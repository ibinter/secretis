<?php

declare(strict_types=1);

namespace App\Services;

use App\Jobs\ProcessImportJob;
use App\Models\ImportJob;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv as CsvWriter;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * ImportService — Wizard d'import universel CSV/XLSX.
 *
 * Limites : 10 MB, 10 000 lignes.
 * Modules supportés : events | tasks | visitors | hr | contacts | accounting
 */
class ImportService
{
    private const MAX_FILE_SIZE_MB = 10;
    private const MAX_ROWS         = 10_000;
    private const MAX_ERRORS_SHOWN = 100;

    // =========================================================================
    // Définition des champs importables par module
    // =========================================================================

    /**
     * @return array<array{field:string,label:string,required:bool,type:string,format?:string}>
     */
    public function getAvailableFields(string $module): array
    {
        return match ($module) {
            'events' => [
                ['field' => 'title',       'label' => 'Titre',       'required' => true,  'type' => 'string'],
                ['field' => 'start_date',  'label' => 'Date début',  'required' => true,  'type' => 'datetime', 'format' => 'DD/MM/YYYY HH:mm'],
                ['field' => 'end_date',    'label' => 'Date fin',    'required' => false, 'type' => 'datetime', 'format' => 'DD/MM/YYYY HH:mm'],
                ['field' => 'location',    'label' => 'Lieu',        'required' => false, 'type' => 'string'],
                ['field' => 'description', 'label' => 'Description', 'required' => false, 'type' => 'text'],
                ['field' => 'status',      'label' => 'Statut',      'required' => false, 'type' => 'enum', 'values' => ['confirmed','tentative','cancelled']],
                ['field' => 'category',    'label' => 'Catégorie',   'required' => false, 'type' => 'string'],
            ],

            'tasks' => [
                ['field' => 'title',      'label' => 'Titre',       'required' => true,  'type' => 'string'],
                ['field' => 'status',     'label' => 'Statut',      'required' => false, 'type' => 'enum', 'values' => ['todo','in_progress','done']],
                ['field' => 'priority',   'label' => 'Priorité',    'required' => false, 'type' => 'enum', 'values' => ['low','medium','high','urgent']],
                ['field' => 'due_date',   'label' => 'Échéance',    'required' => false, 'type' => 'date', 'format' => 'DD/MM/YYYY'],
                ['field' => 'assignee_email','label'=>'Email assigné','required'=>false,  'type' => 'email'],
                ['field' => 'description','label' => 'Description', 'required' => false, 'type' => 'text'],
                ['field' => 'estimated_hours','label'=>'Heures estimées','required'=>false,'type'=>'number'],
            ],

            'visitors' => [
                ['field' => 'full_name',  'label' => 'Nom complet',  'required' => true,  'type' => 'string'],
                ['field' => 'company',    'label' => 'Entreprise',   'required' => false, 'type' => 'string'],
                ['field' => 'purpose',    'label' => 'Motif',        'required' => false, 'type' => 'string'],
                ['field' => 'host_email', 'label' => 'Email hôte',  'required' => false, 'type' => 'email'],
                ['field' => 'check_in_at','label' => 'Date arrivée','required' => false, 'type' => 'datetime', 'format' => 'DD/MM/YYYY HH:mm'],
                ['field' => 'phone',      'label' => 'Téléphone',    'required' => false, 'type' => 'string'],
            ],

            'hr' => [
                ['field' => 'first_name',     'label' => 'Prénom',          'required' => true,  'type' => 'string'],
                ['field' => 'last_name',       'label' => 'Nom',             'required' => true,  'type' => 'string'],
                ['field' => 'email',           'label' => 'Email',           'required' => true,  'type' => 'email'],
                ['field' => 'employee_number', 'label' => 'Matricule',       'required' => false, 'type' => 'string'],
                ['field' => 'department',      'label' => 'Département',     'required' => false, 'type' => 'string'],
                ['field' => 'position',        'label' => 'Poste',           'required' => false, 'type' => 'string'],
                ['field' => 'contract_type',   'label' => 'Type contrat',    'required' => false, 'type' => 'enum', 'values' => ['CDI','CDD','Stage','Freelance']],
                ['field' => 'hire_date',       'label' => 'Date embauche',   'required' => false, 'type' => 'date', 'format' => 'DD/MM/YYYY'],
                ['field' => 'salary',          'label' => 'Salaire (FCFA)',  'required' => false, 'type' => 'number'],
                ['field' => 'phone',           'label' => 'Téléphone',       'required' => false, 'type' => 'string'],
            ],

            'contacts' => [
                ['field' => 'full_name', 'label' => 'Nom complet',  'required' => true,  'type' => 'string'],
                ['field' => 'email',     'label' => 'Email',         'required' => false, 'type' => 'email'],
                ['field' => 'phone',     'label' => 'Téléphone',     'required' => false, 'type' => 'string'],
                ['field' => 'company',   'label' => 'Entreprise',    'required' => false, 'type' => 'string'],
                ['field' => 'position',  'label' => 'Fonction',      'required' => false, 'type' => 'string'],
                ['field' => 'address',   'label' => 'Adresse',       'required' => false, 'type' => 'string'],
                ['field' => 'city',      'label' => 'Ville',         'required' => false, 'type' => 'string'],
                ['field' => 'country',   'label' => 'Pays',          'required' => false, 'type' => 'string'],
                ['field' => 'notes',     'label' => 'Notes',         'required' => false, 'type' => 'text'],
            ],

            'accounting' => [
                ['field' => 'invoice_number','label' => 'N° facture',   'required' => true,  'type' => 'string'],
                ['field' => 'client_name',   'label' => 'Client',        'required' => true,  'type' => 'string'],
                ['field' => 'amount',        'label' => 'Montant HT',    'required' => true,  'type' => 'number'],
                ['field' => 'tax_rate',      'label' => 'Taux TVA (%)',  'required' => false, 'type' => 'number'],
                ['field' => 'issue_date',    'label' => 'Date émission', 'required' => true,  'type' => 'date', 'format' => 'DD/MM/YYYY'],
                ['field' => 'due_date',      'label' => 'Échéance',      'required' => false, 'type' => 'date', 'format' => 'DD/MM/YYYY'],
                ['field' => 'status',        'label' => 'Statut',        'required' => false, 'type' => 'enum', 'values' => ['draft','sent','paid','overdue']],
                ['field' => 'currency',      'label' => 'Devise',        'required' => false, 'type' => 'string'],
                ['field' => 'description',   'label' => 'Description',   'required' => false, 'type' => 'text'],
            ],

            default => [],
        };
    }

    // =========================================================================
    // Upload & détection
    // =========================================================================

    /**
     * Valide, stocke le fichier et crée le job en statut 'mapping'.
     *
     * @throws \InvalidArgumentException
     */
    public function upload(UploadedFile $file, string $module, int $organizationId): ImportJob
    {
        // Validation basique
        $maxBytes = self::MAX_FILE_SIZE_MB * 1024 * 1024;

        if ($file->getSize() > $maxBytes) {
            throw new \InvalidArgumentException(
                "Le fichier dépasse la limite de " . self::MAX_FILE_SIZE_MB . " MB."
            );
        }

        $allowedMimes = [
            'text/csv',
            'application/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        $extension = strtolower($file->getClientOriginalExtension());
        if (! in_array($extension, ['csv', 'xlsx'])) {
            throw new \InvalidArgumentException("Format non supporté. Acceptés : CSV, XLSX.");
        }

        // Stockage privé
        $storedPath = $file->store("imports/{$organizationId}", 'private');

        // Compter les lignes
        $totalRows = $this->countRows($storedPath, $extension);

        if ($totalRows > self::MAX_ROWS) {
            Storage::disk('private')->delete($storedPath);
            throw new \InvalidArgumentException(
                "Le fichier contient {$totalRows} lignes. Maximum autorisé : " . self::MAX_ROWS . "."
            );
        }

        $job = ImportJob::create([
            'organization_id'  => $organizationId,
            'user_id'          => auth()->id(),
            'module'           => $module,
            'file_path'        => $storedPath,
            'original_filename'=> $file->getClientOriginalName(),
            'file_type'        => $extension,
            'status'           => 'mapping',
            'total_rows'       => max(0, $totalRows - 1), // Exclure l'en-tête
        ]);

        return $job;
    }

    /**
     * Lit la première ligne et retourne les noms de colonnes du fichier.
     */
    public function detectColumns(ImportJob $job): array
    {
        $spreadsheet = $this->loadSpreadsheet($job->file_path);
        $sheet       = $spreadsheet->getActiveSheet();
        $headers     = [];

        foreach ($sheet->getRowIterator(1, 1) as $row) {
            foreach ($row->getCellIterator() as $cell) {
                $val = trim((string) $cell->getValue());
                if ($val !== '') {
                    $headers[] = $val;
                }
            }
        }

        return $headers;
    }

    /**
     * Auto-détection intelligente du mapping colonnes → champs SECRETIS.
     *
     * @return array<string, string> clé = colonne fichier, valeur = field SECRETIS
     */
    public function autoDetectMapping(ImportJob $job): array
    {
        $headers = $this->detectColumns($job);
        $fields  = $this->getAvailableFields($job->module);
        $mapping = [];

        // Dictionnaire de correspondances (insensible à la casse, accents)
        $aliases = [
            'nom'               => 'full_name',
            'nom complet'       => 'full_name',
            'name'              => 'full_name',
            'full name'         => 'full_name',
            'prénom'            => 'first_name',
            'first name'        => 'first_name',
            'email'             => 'email',
            'e-mail'            => 'email',
            'courriel'          => 'email',
            'téléphone'         => 'phone',
            'telephone'         => 'phone',
            'phone'             => 'phone',
            'entreprise'        => 'company',
            'société'           => 'company',
            'company'           => 'company',
            'titre'             => 'title',
            'title'             => 'title',
            'date début'        => 'start_date',
            'start date'        => 'start_date',
            'date fin'          => 'end_date',
            'end date'          => 'end_date',
            'échéance'          => 'due_date',
            'due date'          => 'due_date',
            'statut'            => 'status',
            'status'            => 'status',
            'priorité'          => 'priority',
            'priority'          => 'priority',
            'lieu'              => 'location',
            'location'          => 'location',
            'description'       => 'description',
            'département'       => 'department',
            'department'        => 'department',
            'poste'             => 'position',
            'fonction'          => 'position',
            'position'          => 'position',
            'matricule'         => 'employee_number',
            'salaire'           => 'salary',
            'date embauche'     => 'hire_date',
            'hire date'         => 'hire_date',
            'motif'             => 'purpose',
            'purpose'           => 'purpose',
            'n° facture'        => 'invoice_number',
            'invoice number'    => 'invoice_number',
            'montant ht'        => 'amount',
            'amount'            => 'amount',
        ];

        $fieldNames = array_column($fields, 'field');

        foreach ($headers as $header) {
            $normalized = mb_strtolower(trim($header));

            // Correspondance directe par alias
            if (isset($aliases[$normalized])) {
                $target = $aliases[$normalized];
                if (in_array($target, $fieldNames)) {
                    $mapping[$header] = $target;
                    continue;
                }
            }

            // Correspondance par field exact
            if (in_array($normalized, $fieldNames)) {
                $mapping[$header] = $normalized;
                continue;
            }

            // Pas de mapping trouvé → null (ignoré)
            $mapping[$header] = null;
        }

        return $mapping;
    }

    // =========================================================================
    // Validation
    // =========================================================================

    /**
     * Valide chaque ligne selon les règles du module.
     *
     * @return array{valid_rows:int, error_rows:int, errors:array}
     */
    public function validate(ImportJob $job, array $columnMapping, array $options = []): array
    {
        $skipHeader     = $options['skip_header'] ?? true;
        $fields         = $this->getAvailableFields($job->module);
        $fieldMap       = array_column($fields, null, 'field');
        $errors         = [];
        $validRows      = 0;
        $errorRows      = 0;

        $spreadsheet = $this->loadSpreadsheet($job->file_path);
        $sheet       = $spreadsheet->getActiveSheet();
        $startRow    = $skipHeader ? 2 : 1;

        foreach ($sheet->getRowIterator($startRow) as $row) {
            $rowIndex = $row->getRowIndex();
            $cells    = [];

            foreach ($row->getCellIterator() as $cell) {
                $cells[] = $cell->getValue();
            }

            // Ignorer les lignes vides
            if (array_filter($cells, fn($v) => $v !== null && $v !== '') === []) {
                continue;
            }

            // Construire le record mappé
            $record      = [];
            $fileHeaders = array_keys($columnMapping);

            foreach ($fileHeaders as $colIdx => $fileHeader) {
                $targetField = $columnMapping[$fileHeader] ?? null;
                if ($targetField) {
                    $record[$targetField] = $cells[$colIdx] ?? null;
                }
            }

            // Valider le record
            $rowErrors = $this->validateRecord($record, $fieldMap, $rowIndex);

            if (empty($rowErrors)) {
                $validRows++;
            } else {
                $errorRows++;
                // Max 100 erreurs stockées
                if (count($errors) < self::MAX_ERRORS_SHOWN) {
                    array_push($errors, ...$rowErrors);
                }
            }
        }

        // Mettre à jour le job
        $job->update([
            'status'            => 'mapping',
            'valid_rows'        => $validRows,
            'error_rows'        => $errorRows,
            'validation_errors' => $errors,
            'column_mapping'    => $columnMapping,
            'import_options'    => $options,
        ]);

        return [
            'valid_rows'  => $validRows,
            'error_rows'  => $errorRows,
            'errors'      => $errors,
        ];
    }

    /**
     * Lance l'import réel (asynchrone).
     */
    public function import(ImportJob $job): void
    {
        $job->update(['status' => 'importing']);
        dispatch(new ProcessImportJob($job));
    }

    /**
     * Effectue l'import synchrone ligne par ligne (appelé par ProcessImportJob).
     */
    public function processImport(ImportJob $job): void
    {
        $options        = $job->import_options ?? [];
        $columnMapping  = $job->column_mapping ?? [];
        $skipHeader     = $options['skip_header']     ?? true;
        $updateExisting = $options['update_existing'] ?? false;

        $spreadsheet = $this->loadSpreadsheet($job->file_path);
        $sheet       = $spreadsheet->getActiveSheet();
        $startRow    = $skipHeader ? 2 : 1;

        $imported = 0;
        $skipped  = 0;
        $errors   = 0;
        $batch    = [];
        $fileHeaders = array_keys($columnMapping);

        foreach ($sheet->getRowIterator($startRow) as $row) {
            $cells = [];
            foreach ($row->getCellIterator() as $cell) {
                $cells[] = $cell->getValue();
            }

            if (array_filter($cells, fn($v) => $v !== null && $v !== '') === []) {
                continue;
            }

            $record = [];
            foreach ($fileHeaders as $colIdx => $fileHeader) {
                $targetField = $columnMapping[$fileHeader] ?? null;
                if ($targetField) {
                    $record[$targetField] = $cells[$colIdx] ?? null;
                }
            }

            // Caster les types
            $record = $this->castRecord($record, $this->getAvailableFields($job->module));
            $record['organization_id'] = $job->organization_id;

            $batch[] = $record;

            // Flush par chunks de 100
            if (count($batch) >= 100) {
                ['imported' => $i, 'skipped' => $s, 'errors' => $e] =
                    $this->flushBatch($batch, $job->module, $updateExisting);
                $imported += $i;
                $skipped  += $s;
                $errors   += $e;
                $batch     = [];

                // Mise à jour du compteur en cours
                $job->update(['imported_rows' => $imported]);
            }
        }

        // Dernier batch
        if (! empty($batch)) {
            ['imported' => $i, 'skipped' => $s, 'errors' => $e] =
                $this->flushBatch($batch, $job->module, $updateExisting);
            $imported += $i;
            $skipped  += $s;
            $errors   += $e;
        }

        $job->update([
            'status'        => 'completed',
            'imported_rows' => $imported,
            'skipped_rows'  => $skipped,
            'error_rows'    => $errors,
            'import_summary'=> [
                'imported'   => $imported,
                'skipped'    => $skipped,
                'errors'     => $errors,
                'completed_at' => now()->toIso8601String(),
            ],
        ]);
    }

    // =========================================================================
    // Template téléchargeable
    // =========================================================================

    /**
     * Génère un fichier modèle XLSX/CSV avec en-têtes et exemples.
     */
    public function downloadTemplate(string $module, string $format = 'xlsx'): StreamedResponse
    {
        $fields = $this->getAvailableFields($module);

        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Modèle ' . ucfirst($module));

        // En-têtes
        foreach ($fields as $idx => $field) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($idx + 1);
            $label     = $field['label'];
            if ($field['required']) {
                $label .= ' *';
            }
            $sheet->setCellValue($colLetter . '1', $label);
            $sheet->getStyle($colLetter . '1')->getFont()->setBold(true);
            $sheet->getColumnDimension($colLetter)->setWidth(20);
        }

        // Ligne d'exemple
        $examples = $this->getExampleRow($module);
        foreach ($fields as $idx => $field) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($idx + 1);
            $sheet->setCellValue($colLetter . '2', $examples[$field['field']] ?? '');
        }

        $filename = "modele-import-{$module}." . ($format === 'csv' ? 'csv' : 'xlsx');

        return response()->streamDownload(function () use ($spreadsheet, $format) {
            if ($format === 'csv') {
                $writer = new CsvWriter($spreadsheet);
                $writer->setDelimiter(';');
                $writer->setUseBOM(true);
            } else {
                $writer = new XlsxWriter($spreadsheet);
            }
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => $format === 'csv'
                ? 'text/csv; charset=UTF-8'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    // =========================================================================
    // Helpers privés
    // =========================================================================

    private function loadSpreadsheet(string $storagePath): \PhpOffice\PhpSpreadsheet\Spreadsheet
    {
        $fullPath = Storage::disk('private')->path($storagePath);
        return IOFactory::load($fullPath);
    }

    private function countRows(string $storagePath, string $ext): int
    {
        try {
            $spreadsheet = $this->loadSpreadsheet($storagePath);
            return $spreadsheet->getActiveSheet()->getHighestRow();
        } catch (\Throwable) {
            return 0;
        }
    }

    private function validateRecord(array $record, array $fieldMap, int $rowIndex): array
    {
        $errors = [];

        foreach ($fieldMap as $field => $def) {
            $value = $record[$field] ?? null;

            // Champ requis
            if ($def['required'] && ($value === null || $value === '')) {
                $errors[] = [
                    'row'     => $rowIndex,
                    'field'   => $field,
                    'value'   => $value,
                    'message' => "Le champ « {$def['label']} » est obligatoire.",
                ];
                continue;
            }

            if ($value === null || $value === '') {
                continue;
            }

            // Validation par type
            match ($def['type'] ?? 'string') {
                'email'    => filter_var($value, FILTER_VALIDATE_EMAIL) === false
                                ? $errors[] = ['row' => $rowIndex, 'field' => $field, 'value' => $value,
                                               'message' => "Email invalide : « {$value} »."]
                                : null,
                'number'   => ! is_numeric($value)
                                ? $errors[] = ['row' => $rowIndex, 'field' => $field, 'value' => $value,
                                               'message' => "Valeur numérique attendue, reçu : « {$value} »."]
                                : null,
                'date',
                'datetime' => ! $this->isValidDate($value)
                                ? $errors[] = ['row' => $rowIndex, 'field' => $field, 'value' => $value,
                                               'message' => "Date invalide : « {$value} ». Format attendu : {$def['format'] ?? 'DD/MM/YYYY'}."]
                                : null,
                'enum'     => isset($def['values']) && ! in_array($value, $def['values'])
                                ? $errors[] = ['row' => $rowIndex, 'field' => $field, 'value' => $value,
                                               'message' => "Valeur « {$value} » non acceptée. Valeurs : " . implode(', ', $def['values']) . "."]
                                : null,
                default    => null,
            };
        }

        return $errors;
    }

    private function castRecord(array $record, array $fields): array
    {
        $fieldMap = array_column($fields, null, 'field');

        foreach ($record as $key => $value) {
            $def = $fieldMap[$key] ?? null;
            if (! $def || $value === null || $value === '') {
                continue;
            }

            $record[$key] = match ($def['type'] ?? 'string') {
                'number'   => (float) $value,
                'date',
                'datetime' => $this->parseDate($value)?->toDateTimeString(),
                'boolean'  => filter_var($value, FILTER_VALIDATE_BOOLEAN),
                default    => (string) $value,
            };
        }

        return $record;
    }

    private function flushBatch(array $batch, string $module, bool $updateExisting): array
    {
        $imported = 0;
        $skipped  = 0;
        $errors   = 0;

        $tableMap = [
            'events'     => 'events',
            'tasks'      => 'tasks',
            'visitors'   => 'visitors',
            'hr'         => 'employees',
            'contacts'   => 'contacts',
            'accounting' => 'invoices',
        ];

        $table = $tableMap[$module] ?? $module;

        try {
            DB::beginTransaction();

            foreach ($batch as $record) {
                try {
                    if ($updateExisting) {
                        // Upsert basé sur les clés uniques du module
                        $uniqueKey = $this->getUniqueKey($module);
                        if ($uniqueKey && isset($record[$uniqueKey])) {
                            $existing = DB::table($table)
                                ->where('organization_id', $record['organization_id'])
                                ->where($uniqueKey, $record[$uniqueKey])
                                ->first();

                            if ($existing) {
                                DB::table($table)->where('id', $existing->id)->update($record);
                                $skipped++;
                                continue;
                            }
                        }
                    }

                    $record['created_at'] = now();
                    $record['updated_at'] = now();
                    DB::table($table)->insert($record);
                    $imported++;

                } catch (\Throwable $e) {
                    $errors++;
                    Log::warning("ImportService: échec insertion ligne", ['error' => $e->getMessage()]);
                }
            }

            DB::commit();

        } catch (\Throwable $e) {
            DB::rollBack();
            $errors += count($batch);
            Log::error("ImportService: rollback batch", ['error' => $e->getMessage()]);
        }

        return ['imported' => $imported, 'skipped' => $skipped, 'errors' => $errors];
    }

    private function getUniqueKey(string $module): ?string
    {
        return match ($module) {
            'hr'         => 'email',
            'contacts'   => 'email',
            'accounting' => 'invoice_number',
            default      => null,
        };
    }

    private function isValidDate(mixed $value): bool
    {
        if (! $value) {
            return false;
        }

        foreach (['d/m/Y', 'd/m/Y H:i', 'Y-m-d', 'Y-m-d H:i:s', 'd-m-Y', 'n/j/Y'] as $fmt) {
            $dt = \DateTime::createFromFormat($fmt, (string) $value);
            if ($dt !== false) {
                return true;
            }
        }

        return false;
    }

    private function parseDate(mixed $value): ?Carbon
    {
        if (! $value) {
            return null;
        }

        foreach (['d/m/Y H:i', 'd/m/Y', 'Y-m-d H:i:s', 'Y-m-d', 'd-m-Y'] as $fmt) {
            $dt = \DateTime::createFromFormat($fmt, (string) $value);
            if ($dt !== false) {
                return Carbon::instance($dt);
            }
        }

        return null;
    }

    private function getExampleRow(string $module): array
    {
        return match ($module) {
            'events'     => ['title' => 'Réunion mensuelle', 'start_date' => '15/08/2026 09:00', 'end_date' => '15/08/2026 11:00', 'location' => 'Salle A'],
            'tasks'      => ['title' => 'Rédiger le rapport', 'status' => 'todo', 'priority' => 'high', 'due_date' => '31/08/2026'],
            'visitors'   => ['full_name' => 'Jean Dupont', 'company' => 'ABC Corp', 'purpose' => 'Réunion commerciale'],
            'hr'         => ['first_name' => 'Marie', 'last_name' => 'Martin', 'email' => 'marie.martin@exemple.com', 'department' => 'Informatique', 'contract_type' => 'CDI'],
            'contacts'   => ['full_name' => 'Paul Bernard', 'email' => 'paul@exemple.com', 'phone' => '+225 07 00 00 00', 'company' => 'XYZ SARL'],
            'accounting' => ['invoice_number' => 'FAC-2026-001', 'client_name' => 'Client A', 'amount' => '150000', 'issue_date' => '01/08/2026'],
            default      => [],
        };
    }
}
