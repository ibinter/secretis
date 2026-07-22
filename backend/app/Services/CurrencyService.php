<?php

namespace App\Services;

use App\Models\Currency;
use App\Models\ExchangeRate;
use App\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class CurrencyService
{
    private const CACHE_TTL = 3600; // 1 heure
    private const CACHE_PREFIX = 'currency_rate:';

    /**
     * Convertit un montant d'une devise à une autre.
     */
    public function convert(float $amount, string $from, string $to): float
    {
        if ($from === $to) {
            return $amount;
        }

        $rate = $this->getRate($from, $to);
        return round($amount * $rate, $this->getDecimalPlaces($to));
    }

    /**
     * Formate un montant selon la devise et la locale.
     * Ex: 15000 XOF → "15 000 FCFA", 1234.56 USD → "$1,234.56"
     */
    public function format(float $amount, string $currencyCode, string $locale = 'fr'): string
    {
        $currency = $this->getCurrency($currencyCode);

        if (! $currency) {
            return number_format($amount, 2) . ' ' . $currencyCode;
        }

        $decimals      = $currency->decimal_places;
        $decSep        = $currency->decimal_separator;
        $thousandsSep  = $currency->thousands_separator;
        $symbol        = $currency->symbol;
        $symbolPos     = $currency->symbol_position;

        $formatted = number_format($amount, $decimals, $decSep, $thousandsSep);

        return $symbolPos === 'before'
            ? $symbol . $formatted
            : $formatted . ' ' . $symbol;
    }

    /**
     * Retourne le taux de change depuis Redis ou la base de données.
     * Cache TTL : 1 heure.
     */
    public function getRate(string $from, string $to): float
    {
        if ($from === $to) {
            return 1.0;
        }

        $cacheKey = self::CACHE_PREFIX . $from . '_' . $to;

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($from, $to) {
            return $this->getRateFromDatabase($from, $to);
        });
    }

    /**
     * Retourne le taux historique à une date donnée.
     */
    public function getHistoricalRate(string $from, string $to, Carbon $date): float
    {
        if ($from === $to) {
            return 1.0;
        }

        $rate = ExchangeRate::where('from_currency', $from)
            ->where('to_currency', $to)
            ->where('fetched_at', '<=', $date->endOfDay())
            ->orderByDesc('fetched_at')
            ->first();

        if ($rate) {
            return (float) $rate->rate;
        }

        // Essaie le taux inverse
        $inverseRate = ExchangeRate::where('from_currency', $to)
            ->where('to_currency', $from)
            ->where('fetched_at', '<=', $date->endOfDay())
            ->orderByDesc('fetched_at')
            ->first();

        if ($inverseRate && $inverseRate->rate > 0) {
            return round(1 / $inverseRate->rate, 8);
        }

        // Conversion croisée via USD
        if ($from !== 'USD' && $to !== 'USD') {
            $fromUsd = $this->getHistoricalRate($from, 'USD', $date);
            $usdTo   = $this->getHistoricalRate('USD', $to, $date);
            if ($fromUsd > 0 && $usdTo > 0) {
                return round($fromUsd * $usdTo, 8);
            }
        }

        throw new \RuntimeException("Taux historique introuvable pour {$from}/{$to} au {$date->toDateString()}");
    }

    /**
     * Récupère les derniers taux depuis l'API Open Exchange Rates
     * ou en fallback depuis la BCE.
     */
    public function fetchLatestRates(): void
    {
        try {
            $this->fetchFromOpenExchangeRates();
        } catch (\Exception $e) {
            Log::warning('Open Exchange Rates indisponible, fallback BCE', ['error' => $e->getMessage()]);
            try {
                $this->fetchFromECB();
            } catch (\Exception $ecbError) {
                Log::error('Impossible de récupérer les taux de change', [
                    'primary_error' => $e->getMessage(),
                    'fallback_error' => $ecbError->getMessage(),
                ]);
                throw $ecbError;
            }
        }

        // Invalide le cache Redis
        $this->clearRatesCache();
    }

    /**
     * Retourne toutes les devises actives.
     */
    public function getSupportedCurrencies(): Collection
    {
        return Cache::remember('supported_currencies', 3600, function () {
            return Currency::where('is_active', true)
                ->orderBy('region')
                ->orderBy('code')
                ->get();
        });
    }

    /**
     * Retourne la devise principale d'une organisation.
     */
    public function getOrganizationCurrency(Organization $org): string
    {
        return $org->organizationCurrency?->primary_currency
            ?? config('app.default_currency', 'XOF');
    }

    /**
     * Retourne la devise de rapport d'une organisation.
     */
    public function getOrganizationReportingCurrency(Organization $org): string
    {
        return $org->organizationCurrency?->reporting_currency
            ?? $this->getOrganizationCurrency($org);
    }

    /**
     * Convertit un montant vers la devise de rapport de l'organisation.
     */
    public function convertToReporting(float $amount, string $from, Organization $org, ?Carbon $date = null): float
    {
        $to = $this->getOrganizationReportingCurrency($org);

        if ($from === $to) {
            return $amount;
        }

        $rate = $date
            ? $this->getHistoricalRate($from, $to, $date)
            : $this->getRate($from, $to);

        return round($amount * $rate, $this->getDecimalPlaces($to));
    }

    /**
     * Retourne les taux récents pour affichage.
     */
    public function getRecentRates(string $baseCurrency = 'XOF'): array
    {
        $currencies = $this->getSupportedCurrencies();
        $rates      = [];

        foreach ($currencies as $currency) {
            if ($currency->code === $baseCurrency) {
                continue;
            }

            try {
                $rates[$currency->code] = [
                    'rate'     => $this->getRate($baseCurrency, $currency->code),
                    'symbol'   => $currency->symbol,
                    'name'     => $currency->name,
                    'region'   => $currency->region,
                    'decimals' => $currency->decimal_places,
                ];
            } catch (\Exception $e) {
                // Devise sans taux disponible
            }
        }

        return $rates;
    }

    // -------------------------------------------------------------------------
    // Méthodes privées
    // -------------------------------------------------------------------------

    private function getRateFromDatabase(string $from, string $to): float
    {
        // Taux direct
        $rate = ExchangeRate::where('from_currency', $from)
            ->where('to_currency', $to)
            ->orderByDesc('fetched_at')
            ->first();

        if ($rate) {
            return (float) $rate->rate;
        }

        // Taux inverse
        $inverseRate = ExchangeRate::where('from_currency', $to)
            ->where('to_currency', $from)
            ->orderByDesc('fetched_at')
            ->first();

        if ($inverseRate && (float) $inverseRate->rate > 0) {
            return round(1 / (float) $inverseRate->rate, 8);
        }

        // Conversion croisée via USD
        if ($from !== 'USD' && $to !== 'USD') {
            $fromUsd = $this->getRateFromDatabase($from, 'USD');
            $usdTo   = $this->getRateFromDatabase('USD', $to);
            if ($fromUsd > 0 && $usdTo > 0) {
                return round($fromUsd * $usdTo, 8);
            }
        }

        // XOF/XAF sont parités (taux fixe 1:1 dans la zone CEMAC/UEMOA)
        if (($from === 'XOF' && $to === 'XAF') || ($from === 'XAF' && $to === 'XOF')) {
            return 1.0;
        }

        throw new \RuntimeException("Taux de change introuvable pour {$from}/{$to}");
    }

    private function fetchFromOpenExchangeRates(): void
    {
        $apiKey  = config('services.openexchangerates.key');
        $baseUrl = 'https://openexchangerates.org/api/latest.json';

        if (! $apiKey) {
            throw new \RuntimeException('Clé API Open Exchange Rates non configurée');
        }

        $response = file_get_contents("{$baseUrl}?app_id={$apiKey}&base=USD");
        $data     = json_decode($response, true);

        if (! isset($data['rates'])) {
            throw new \RuntimeException('Réponse Open Exchange Rates invalide');
        }

        $this->storeRates($data['rates'], 'openexchangerates', 'USD');
    }

    private function fetchFromECB(): void
    {
        $url      = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
        $response = file_get_contents($url);

        if ($response === false) {
            throw new \RuntimeException('Impossible de récupérer le flux BCE');
        }

        $xml   = simplexml_load_string($response);
        $rates = [];

        foreach ($xml->Cube->Cube->Cube as $rate) {
            $rates[(string) $rate['currency']] = (float) $rate['rate'];
        }

        $this->storeRates($rates, 'ecb', 'EUR');
    }

    private function storeRates(array $rates, string $source, string $base): void
    {
        $now         = now();
        $activeCodes = $this->getSupportedCurrencies()->pluck('code')->toArray();

        foreach ($rates as $toCurrency => $rate) {
            if (! in_array($toCurrency, $activeCodes)) {
                continue;
            }

            if ($rate <= 0) {
                continue;
            }

            // Récupère le taux précédent pour calculer la variation
            $previousRate = ExchangeRate::where('from_currency', $base)
                ->where('to_currency', $toCurrency)
                ->orderByDesc('fetched_at')
                ->value('rate');

            $variationPct = null;
            if ($previousRate && $previousRate > 0) {
                $variationPct = round((($rate - $previousRate) / $previousRate) * 100, 4);

                if (abs($variationPct) > 5) {
                    Log::warning('Variation importante du taux de change', [
                        'pair'         => "{$base}/{$toCurrency}",
                        'old_rate'     => $previousRate,
                        'new_rate'     => $rate,
                        'variation'    => $variationPct . '%',
                        'source'       => $source,
                    ]);
                }
            }

            ExchangeRate::create([
                'from_currency' => $base,
                'to_currency'   => $toCurrency,
                'rate'          => $rate,
                'inverse_rate'  => round(1 / $rate, 8),
                'source'        => $source,
                'fetched_at'    => $now,
                'valid_from'    => $now,
                'variation_pct' => $variationPct,
            ]);

            // Stocke aussi le taux inverse
            ExchangeRate::create([
                'from_currency' => $toCurrency,
                'to_currency'   => $base,
                'rate'          => round(1 / $rate, 8),
                'inverse_rate'  => $rate,
                'source'        => $source,
                'fetched_at'    => $now,
                'valid_from'    => $now,
                'variation_pct' => $variationPct ? -$variationPct : null,
            ]);
        }
    }

    private function clearRatesCache(): void
    {
        $currencies = $this->getSupportedCurrencies()->pluck('code');

        foreach ($currencies as $from) {
            foreach ($currencies as $to) {
                if ($from !== $to) {
                    Cache::forget(self::CACHE_PREFIX . $from . '_' . $to);
                }
            }
        }

        Cache::forget('supported_currencies');
    }

    private function getCurrency(string $code): ?Currency
    {
        return Cache::remember("currency:{$code}", 3600, function () use ($code) {
            return Currency::where('code', $code)->first();
        });
    }

    private function getDecimalPlaces(string $currencyCode): int
    {
        return $this->getCurrency($currencyCode)?->decimal_places ?? 2;
    }
}
