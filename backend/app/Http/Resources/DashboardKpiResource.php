<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * DashboardKpiResource — Transformation API des KPIs du tableau de bord
 *
 * Normalise les KPIs pour le frontend (KpiTile.jsx) en incluant :
 *  - Valeur actuelle + valeur de référence (période précédente)
 *  - Variation en pourcentage calculée côté serveur
 *  - Indicateur de tendance (up/down/stable)
 *  - Méta d'affichage (label, couleur, icône, format)
 *
 * Le tableau $this->resource est attendu sous la forme :
 * [
 *   'key'       => 'tasks_completed',
 *   'value'     => 42,
 *   'previous'  => 38,
 *   'label'     => 'Tâches terminées',
 *   'period'    => 'Ce mois',
 *   'format'    => 'number',  // number|percent|duration|currency
 *   'icon'      => 'check',
 *   'color'     => 'green',
 * ]
 */
class DashboardKpiResource extends JsonResource
{
    /**
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = is_array($this->resource) ? $this->resource : [];

        $value    = $data['value']    ?? 0;
        $previous = $data['previous'] ?? null;

        // Calcul de la variation
        $variation = null;
        $trend     = 'stable';

        if ($previous !== null && $previous != 0) {
            $variation = round((($value - $previous) / abs($previous)) * 100, 1);
            $trend     = $variation > 0 ? 'up' : ($variation < 0 ? 'down' : 'stable');
        } elseif ($previous === 0 && $value > 0) {
            $trend = 'up';
        }

        // Valeur formatée pour l'affichage
        $formatted = $this->formatValue($value, $data['format'] ?? 'number');

        return [
            'key'            => $data['key']    ?? 'unknown',
            'label'          => $data['label']  ?? '',
            'period'         => $data['period'] ?? 'Période courante',
            'value'          => $value,
            'value_formatted' => $formatted,
            'previous'       => $previous,
            'variation'      => $variation,       // null si pas de référence
            'trend'          => $trend,            // up|down|stable
            'trend_positive' => $this->isTrendPositive($data['key'] ?? '', $trend),

            // Affichage
            'icon'   => $data['icon']  ?? 'bar-chart',
            'color'  => $data['color'] ?? 'blue',
            'format' => $data['format'] ?? 'number',

            // Sous-métriques optionnelles (ex: taux de complétion)
            'sub_metrics' => $data['sub_metrics'] ?? [],

            // Lien vers la page détaillée
            'detail_url' => $data['detail_url'] ?? null,
        ];
    }

    /**
     * Formate la valeur selon son type pour l'affichage initial côté serveur.
     * Le frontend peut également reformater selon les préférences locales.
     */
    private function formatValue(mixed $value, string $format): string
    {
        return match ($format) {
            'percent'  => number_format((float) $value, 1) . '%',
            'currency' => number_format((float) $value, 0, ',', ' ') . ' F CFA',
            'duration' => $this->formatDuration((int) $value),
            'decimal'  => number_format((float) $value, 2, ',', ' '),
            default    => number_format((int) $value, 0, ',', ' '),
        };
    }

    /** Formate une durée en minutes en "Xh Ym" */
    private function formatDuration(int $minutes): string
    {
        if ($minutes < 60) {
            return "{$minutes}min";
        }
        $h = intdiv($minutes, 60);
        $m = $minutes % 60;
        return $m > 0 ? "{$h}h {$m}min" : "{$h}h";
    }

    /**
     * Détermine si la tendance est positive selon le contexte métier.
     * Pour certains KPIs (ex: courriers en retard), une hausse est négative.
     */
    private function isTrendPositive(string $key, string $trend): bool
    {
        // KPIs où une HAUSSE est mauvaise
        $negativeKeys = [
            'overdue_tasks',
            'overdue_mail',
            'pending_mail',
            'cancelled_meetings',
            'blocked_users',
        ];

        if ($trend === 'stable') {
            return true;
        }

        $isNegativeKpi = in_array($key, $negativeKeys, true);
        $isUp          = $trend === 'up';

        // Positif si : KPI normal + hausse, ou KPI négatif + baisse
        return $isNegativeKpi ? ! $isUp : $isUp;
    }
}
