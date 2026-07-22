<?php

namespace App\Http\Controllers;

use App\Services\CurrencyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurrencyController extends Controller
{
    public function __construct(private readonly CurrencyService $currencyService)
    {
    }

    /**
     * GET /currencies
     * Liste des devises actives avec leurs métadonnées.
     */
    public function index(Request $request): JsonResponse
    {
        $currencies = $this->currencyService->getSupportedCurrencies();

        $baseCurrency = $request->get('base', 'XOF');
        $includeRates = $request->boolean('include_rates', false);

        $data = $currencies->map(function ($currency) use ($baseCurrency, $includeRates) {
            $item = [
                'code'               => $currency->code,
                'name'               => $currency->name,
                'name_en'            => $currency->name_en,
                'symbol'             => $currency->symbol,
                'decimal_places'     => $currency->decimal_places,
                'symbol_position'    => $currency->symbol_position,
                'decimal_separator'  => $currency->decimal_separator,
                'thousands_separator'=> $currency->thousands_separator,
                'region'             => $currency->region,
                'is_default_for_region' => $currency->is_default_for_region,
                'countries'          => $currency->countries,
            ];

            if ($includeRates && $currency->code !== $baseCurrency) {
                try {
                    $item['rate_from_base'] = $this->currencyService->getRate($baseCurrency, $currency->code);
                    $item['rate_to_base']   = $this->currencyService->getRate($currency->code, $baseCurrency);
                } catch (\Exception $e) {
                    $item['rate_from_base'] = null;
                    $item['rate_to_base']   = null;
                }
            }

            return $item;
        });

        return response()->json([
            'data' => $data->groupBy('region'),
            'meta' => [
                'total'         => $currencies->count(),
                'base_currency' => $baseCurrency,
                'updated_at'    => \App\Models\ExchangeRate::orderByDesc('fetched_at')->value('fetched_at'),
            ],
        ]);
    }

    /**
     * GET /currencies/rates?from=XOF&to=EUR
     * Taux de change entre deux devises.
     */
    public function rates(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|string|size:3|exists:currencies,code',
            'to'   => 'required|string|size:3|exists:currencies,code',
        ]);

        $from = strtoupper($request->get('from'));
        $to   = strtoupper($request->get('to'));

        try {
            $rate        = $this->currencyService->getRate($from, $to);
            $inverseRate = $this->currencyService->getRate($to, $from);

            $latestRecord = \App\Models\ExchangeRate::where('from_currency', $from)
                ->where('to_currency', $to)
                ->orderByDesc('fetched_at')
                ->first();

            return response()->json([
                'from'          => $from,
                'to'            => $to,
                'rate'          => $rate,
                'inverse_rate'  => $inverseRate,
                'source'        => $latestRecord?->source ?? 'cache',
                'fetched_at'    => $latestRecord?->fetched_at,
                'variation_pct' => $latestRecord?->variation_pct,
                'example'       => [
                    'amount'    => 10000,
                    'from'      => $this->currencyService->format(10000, $from),
                    'to'        => $this->currencyService->format(
                        $this->currencyService->convert(10000, $from, $to),
                        $to
                    ),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Taux de change indisponible',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /currencies/convert?amount=50000&from=XOF&to=EUR
     * Convertit un montant d'une devise à une autre.
     */
    public function convert(Request $request): JsonResponse
    {
        $request->validate([
            'amount' => 'required|numeric|min:0',
            'from'   => 'required|string|size:3|exists:currencies,code',
            'to'     => 'required|string|size:3|exists:currencies,code',
        ]);

        $amount = (float) $request->get('amount');
        $from   = strtoupper($request->get('from'));
        $to     = strtoupper($request->get('to'));

        try {
            $converted = $this->currencyService->convert($amount, $from, $to);
            $rate      = $this->currencyService->getRate($from, $to);

            return response()->json([
                'original'       => [
                    'amount'    => $amount,
                    'currency'  => $from,
                    'formatted' => $this->currencyService->format($amount, $from),
                ],
                'converted'      => [
                    'amount'    => $converted,
                    'currency'  => $to,
                    'formatted' => $this->currencyService->format($converted, $to),
                ],
                'rate'           => $rate,
                'rate_label'     => "1 {$from} = {$rate} {$to}",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Conversion impossible',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * GET /currencies/historical?from=XOF&to=EUR&date=2025-01-15
     */
    public function historical(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'required|string|size:3',
            'to'   => 'required|string|size:3',
            'date' => 'required|date|before_or_equal:today',
        ]);

        $from = strtoupper($request->get('from'));
        $to   = strtoupper($request->get('to'));
        $date = \Carbon\Carbon::parse($request->get('date'));

        try {
            $rate = $this->currencyService->getHistoricalRate($from, $to, $date);

            return response()->json([
                'from'  => $from,
                'to'    => $to,
                'date'  => $date->toDateString(),
                'rate'  => $rate,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Taux historique indisponible',
                'message' => $e->getMessage(),
            ], 404);
        }
    }

    /**
     * GET /currencies/{code}
     * Détail d'une devise.
     */
    public function show(string $code): JsonResponse
    {
        $currency = \App\Models\Currency::where('code', strtoupper($code))->firstOrFail();

        $recentRates = \App\Models\ExchangeRate::where('from_currency', $currency->code)
            ->orderByDesc('fetched_at')
            ->limit(10)
            ->get(['to_currency', 'rate', 'source', 'fetched_at', 'variation_pct']);

        return response()->json([
            'currency'     => $currency,
            'recent_rates' => $recentRates,
        ]);
    }
}
