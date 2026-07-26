<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ImportJob;
use App\Services\ImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * ProcessImportJob — Exécute l'import asynchrone ligne par ligne.
 *
 * Queue : imports | Timeout : 10 min | Tentatives : 2
 */
class ProcessImportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;
    public int $tries   = 2;

    public function __construct(private readonly ImportJob $importJob)
    {
        $this->onQueue('imports');
    }

    public function handle(ImportService $service): void
    {
        $job = $this->importJob->fresh();

        Log::info("ProcessImportJob started", [
            'import_job_id' => $job->id,
            'module'        => $job->module,
            'total_rows'    => $job->total_rows,
        ]);

        try {
            $service->processImport($job);

            Log::info("ProcessImportJob completed", [
                'import_job_id' => $job->id,
                'imported_rows' => $job->fresh()->imported_rows,
            ]);

        } catch (\Throwable $e) {
            $job->update([
                'status'        => 'failed',
                'import_summary'=> ['error' => $e->getMessage()],
            ]);

            Log::error("ProcessImportJob failed", [
                'import_job_id' => $job->id,
                'error'         => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
