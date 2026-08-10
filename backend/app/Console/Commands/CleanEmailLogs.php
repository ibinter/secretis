<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\EmailLog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CleanEmailLogs extends Command
{
    protected $signature = 'secretis:clean-email-logs
                            {--days=90 : Supprimer les logs plus anciens que N jours}';

    protected $description = 'Supprime les logs d\'emails de plus de N jours (RGPD / maintenance)';

    public function handle(): int
    {
        $days      = (int) $this->option('days');
        $threshold = now()->subDays($days);

        $this->info("🧹 Nettoyage des logs d'emails antérieurs au {$threshold->format('d/m/Y')}...");

        $count = EmailLog::where('created_at', '<', $threshold)->count();

        if ($count === 0) {
            $this->info('Aucun log à supprimer.');
            return self::SUCCESS;
        }

        $this->info("  {$count} log(s) seront supprimés.");

        if (!$this->confirm("Confirmer la suppression de {$count} logs d'emails ?", true)) {
            $this->warn('Suppression annulée.');
            return self::SUCCESS;
        }

        // Suppression par chunks pour éviter les timeouts
        $deleted = 0;
        EmailLog::where('created_at', '<', $threshold)
            ->chunkById(500, function ($logs) use (&$deleted): void {
                $ids = $logs->pluck('id');
                EmailLog::whereIn('id', $ids)->delete();
                $deleted += $ids->count();
            });

        $this->info("✅ {$deleted} logs supprimés avec succès.");
        Log::info("[CleanEmailLogs] {$deleted} logs d'emails supprimés (seuil: {$days} jours).");

        return self::SUCCESS;
    }
}
