<?php

namespace App\Console\Commands;

use App\Services\CurrencyService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class FetchExchangeRates extends Command
{
    /**
     * @var string
     */
    protected $signature = 'secretis:fetch-rates
                            {--source=auto : Source des taux (auto|openexchangerates|ecb)}
                            {--force : Force la mise à jour même si récente}';

    /**
     * @var string
     */
    protected $description = 'Récupère les taux de change depuis Open Exchange Rates (fallback : BCE). CRON quotidien 6h UTC.';

    public function __construct(private readonly CurrencyService $currencyService)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('🔄 Récupération des taux de change SECRETIS...');
        $source = $this->option('source');
        $force  = $this->option('force');

        if (! $force && $this->ratesAreFresh()) {
            $this->info('✅ Les taux sont déjà à jour (< 12h). Utilisez --force pour forcer.');
            return self::SUCCESS;
        }

        $startTime = microtime(true);

        try {
            match ($source) {
                'openexchangerates' => $this->fetchFromOpenExchangeRates(),
                'ecb'               => $this->fetchFromECB(),
                default             => $this->fetchAuto(),
            };

            $elapsed = round(microtime(true) - $startTime, 2);
            $this->info("✅ Taux mis à jour avec succès en {$elapsed}s.");

            Log::info('Taux de change mis à jour', [
                'source'  => $source,
                'elapsed' => $elapsed,
                'command' => 'secretis:fetch-rates',
            ]);

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error('❌ Erreur lors de la récupération des taux : ' . $e->getMessage());

            Log::error('Échec de la récupération des taux de change', [
                'error'   => $e->getMessage(),
                'source'  => $source,
                'command' => 'secretis:fetch-rates',
            ]);

            return self::FAILURE;
        }
    }

    private function fetchAuto(): void
    {
        $this->line('  → Source : automatique (Open Exchange Rates → BCE)');

        try {
            $this->fetchFromOpenExchangeRates();
            $this->line('  ✓ Open Exchange Rates : OK');
        } catch (\Exception $e) {
            $this->warn('  ! Open Exchange Rates indisponible : ' . $e->getMessage());
            $this->line('  → Fallback : Banque Centrale Européenne...');
            $this->fetchFromECB();
            $this->line('  ✓ BCE : OK');
        }
    }

    private function fetchFromOpenExchangeRates(): void
    {
        $apiKey = config('services.openexchangerates.key');

        if (! $apiKey) {
            throw new \RuntimeException(
                'Clé API Open Exchange Rates manquante. Définissez OPENEXCHANGERATES_KEY dans .env'
            );
        }

        $this->line('  → Connexion à Open Exchange Rates API...');

        $url      = "https://openexchangerates.org/api/latest.json?app_id={$apiKey}&base=USD";
        $context  = stream_context_create(['http' => ['timeout' => 30]]);
        $response = file_get_contents($url, false, $context);

        if ($response === false) {
            throw new \RuntimeException('Impossible de joindre Open Exchange Rates API');
        }

        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! isset($data['rates'])) {
            throw new \RuntimeException('Réponse Open Exchange Rates invalide');
        }

        $count = count($data['rates']);
        $this->line("  → {$count} taux reçus depuis Open Exchange Rates");

        $this->currencyService->fetchLatestRates();
    }

    private function fetchFromECB(): void
    {
        $this->line('  → Connexion à la Banque Centrale Européenne...');

        $url     = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
        $context = stream_context_create(['http' => ['timeout' => 30]]);
        $xml     = file_get_contents($url, false, $context);

        if ($xml === false) {
            throw new \RuntimeException('Impossible de joindre le flux BCE');
        }

        $parsed = simplexml_load_string($xml);
        if (! $parsed) {
            throw new \RuntimeException('Flux BCE XML invalide');
        }

        $count = 0;
        foreach ($parsed->Cube->Cube->Cube as $rate) {
            $count++;
        }

        $this->line("  → {$count} taux reçus depuis la BCE");
        $this->currencyService->fetchLatestRates();
    }

    private function ratesAreFresh(): bool
    {
        $latest = \App\Models\ExchangeRate::orderByDesc('fetched_at')->value('fetched_at');

        if (! $latest) {
            return false;
        }

        return now()->diffInHours($latest) < 12;
    }
}
