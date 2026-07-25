/**
 * KpiTile.jsx — Tuile KPI réutilisable avec sparkline, tendance et skeleton
 *
 * Props :
 *   label        {string}   Libellé du KPI
 *   value        {number}   Valeur principale
 *   icon         {node}     Icône HeroIcons
 *   color        {'blue'|'navy'|'amber'|'red'|'green'|'gray'}
 *   trend        {number}   % de variation vs période précédente (optionnel)
 *   sparkline    {array}    [{value: number}] pour la mini courbe (optionnel)
 *   critical     {number}   Seuil critique (passe en rouge si value >= critical)
 *   loading      {boolean}
 *   onClick      {function} (optionnel)
 *   suffix       {string}   Unité affichée après la valeur (ex: 'h', '%')
 */

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

// Palette SECRETIS
const COLORS = {
    navy:  { bg: 'bg-[#9333EA]',  text: 'text-[#9333EA]',  border: 'border-[#9333EA]',  light: 'bg-purple-50',  spark: '#9333EA' },
    blue:  { bg: 'bg-[#7e22ce]',  text: 'text-[#7e22ce]',  border: 'border-[#7e22ce]',  light: 'bg-purple-50',  spark: '#7e22ce' },
    amber: { bg: 'bg-[#F39C12]',  text: 'text-[#F39C12]',  border: 'border-[#F39C12]',  light: 'bg-amber-50', spark: '#F39C12' },
    red:   { bg: 'bg-red-600',    text: 'text-red-600',    border: 'border-red-600',    light: 'bg-red-50',   spark: '#dc2626' },
    green: { bg: 'bg-emerald-600',text: 'text-emerald-600',border: 'border-emerald-600',light: 'bg-emerald-50',spark: '#059669'},
    gray:  { bg: 'bg-slate-500',  text: 'text-slate-500',  border: 'border-slate-500',  light: 'bg-slate-50', spark: '#64748b' },
};

// ============================================================================

function SkeletonTile() {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
            <div className="flex items-start justify-between mb-3">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-9 w-9 bg-gray-200 rounded-lg" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
    );
}

// ============================================================================

export default function KpiTile({
    label,
    value,
    icon: Icon,
    color = 'blue',
    trend,
    sparkline,
    critical,
    loading = false,
    onClick,
    suffix = '',
}) {
    if (loading) return <SkeletonTile />;

    // Basculer en rouge si seuil critique dépassé
    const isCritical = critical !== undefined && value >= critical;
    const effectiveColor = isCritical ? 'red' : color;
    const palette = COLORS[effectiveColor] ?? COLORS.blue;

    // Indicateur tendance
    const trendUp    = typeof trend === 'number' && trend > 0;
    const trendDown  = typeof trend === 'number' && trend < 0;
    const trendFlat  = typeof trend === 'number' && trend === 0;

    const trendColor = trendUp
        ? 'text-emerald-600'
        : trendDown
        ? 'text-red-500'
        : 'text-gray-400';

    const TrendIcon = trendUp
        ? ArrowTrendingUpIcon
        : trendDown
        ? ArrowTrendingDownIcon
        : MinusIcon;

    const formattedValue = typeof value === 'number'
        ? value.toLocaleString('fr-FR')
        : value ?? '—';

    return (
        <div
            onClick={onClick}
            className={clsx(
                'bg-white rounded-xl border shadow-sm p-5 transition-all duration-200',
                isCritical
                    ? 'border-red-200 ring-1 ring-red-200'
                    : 'border-gray-100 hover:border-purple-100',
                onClick && 'cursor-pointer hover:shadow-md active:scale-[0.98]',
            )}
        >
            {/* En-tête */}
            <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 leading-tight">{label}</span>
                {Icon && (
                    <div className={clsx('p-2 rounded-lg', palette.light)}>
                        <Icon className={clsx('h-5 w-5', palette.text)} />
                    </div>
                )}
            </div>

            {/* Valeur principale */}
            <div className={clsx('text-3xl font-bold tracking-tight', palette.text)}>
                {formattedValue}
                {suffix && (
                    <span className="text-lg font-semibold ml-1 opacity-70">{suffix}</span>
                )}
            </div>

            {/* Tendance */}
            {typeof trend === 'number' && (
                <div className={clsx('flex items-center gap-1 mt-1.5 text-xs font-medium', trendColor)}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    <span>
                        {Math.abs(trend)}% vs période préc.
                    </span>
                </div>
            )}

            {/* Mini sparkline */}
            {sparkline && sparkline.length > 1 && (
                <div className="mt-3 -mx-1">
                    <ResponsiveContainer width="100%" height={40}>
                        <LineChart data={sparkline}>
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={palette.spark}
                                strokeWidth={2}
                                dot={false}
                            />
                            <Tooltip
                                contentStyle={{ fontSize: 11, padding: '2px 6px' }}
                                itemStyle={{ color: palette.spark }}
                                formatter={(v) => [v, '']}
                                labelFormatter={() => ''}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Indicateur critique */}
            {isCritical && (
                <div className="mt-2 flex items-center gap-1 text-xs text-red-600 font-semibold">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    Seuil critique dépassé
                </div>
            )}
        </div>
    );
}
export { KpiTile };
