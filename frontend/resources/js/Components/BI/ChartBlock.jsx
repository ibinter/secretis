/**
 * ChartBlock — Composant chart universel pour le Report Builder
 * Supporte : LineChart, BarChart, AreaChart, PieChart, ScatterChart, RadarChart, KpiCard, DataTable
 */
import React, { useState, useRef } from 'react';
import {
    LineChart, Line,
    BarChart, Bar,
    AreaChart, Area,
    PieChart, Pie, Cell, Legend, Tooltip,
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts';
import { toPng } from 'html-to-image';
import {
    TrendingUp, BarChart2, PieChart as PieIcon, Activity,
    Table, Maximize2, Download, RefreshCw, ChevronDown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Palette de couleurs SECRETIS
// ---------------------------------------------------------------------------
const PALETTE = [
    '#1d4ed8', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
    '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0f766e',
];

const CHART_ICONS = {
    line:    TrendingUp,
    bar:     BarChart2,
    area:    Activity,
    pie:     PieIcon,
    scatter: Activity,
    radar:   Activity,
    kpi:     TrendingUp,
    table:   Table,
};

const CHART_TYPES = ['line', 'bar', 'area', 'pie', 'scatter', 'radar', 'kpi', 'table'];

// ---------------------------------------------------------------------------
// Sous-composant : KPI Card
// ---------------------------------------------------------------------------
function KpiCard({ title, data, color = '#1d4ed8' }) {
    const value = Array.isArray(data) ? (data[data.length - 1]?.total ?? data[data.length - 1]?.value ?? '—') : data;
    const prev  = Array.isArray(data) && data.length >= 2 ? (data[data.length - 2]?.total ?? 0) : null;
    const change = prev !== null && prev !== 0 ? ((value - prev) / prev * 100).toFixed(1) : null;

    return (
        <div className="flex flex-col items-start h-full justify-center px-4 py-6">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
            <span className="text-4xl font-bold mt-2" style={{ color }}>{value}</span>
            {change !== null && (
                <span className={`text-xs mt-1 font-medium ${parseFloat(change) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {parseFloat(change) >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs période préc.
                </span>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sous-composant : Data Table
// ---------------------------------------------------------------------------
function DataTable({ data }) {
    if (!Array.isArray(data) || data.length === 0) return <p className="text-sm text-slate-400 p-4">Aucune donnée.</p>;
    const headers = Object.keys(data[0]);
    return (
        <div className="overflow-auto h-full">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-purple-700 text-white">
                        {headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium">{h.replace(/_/g, ' ')}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            {headers.map(h => <td key={h} className="px-3 py-1.5 border-b border-slate-100">{row[h] ?? '—'}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Composant principal : ChartBlock
// ---------------------------------------------------------------------------
export default function ChartBlock({
    type    = 'line',
    data    = [],
    title   = 'Graphique',
    color   = '#1d4ed8',
    period,
    onChangeType,
    onRemove,
    draggable = false,
    className = '',
}) {
    const [chartType, setChartType]   = useState(type);
    const [menuOpen, setMenuOpen]     = useState(false);
    const [enlarged, setEnlarged]     = useState(false);
    const containerRef                = useRef(null);

    const Icon = CHART_ICONS[chartType] ?? TrendingUp;

    // Détecter les clés disponibles dans la data
    const keys = Array.isArray(data) && data.length > 0
        ? Object.keys(data[0]).filter(k => k !== 'period' && k !== 'day' && k !== 'hour' && k !== 'week' && k !== 'month' && k !== 'name' && k !== 'label')
        : ['total'];

    const xKey = Array.isArray(data) && data.length > 0
        ? (['period', 'day', 'week', 'month', 'hour', 'name', 'label'].find(k => k in data[0]) ?? Object.keys(data[0])[0])
        : 'period';

    // Exporter en PNG
    const handleExportImage = async () => {
        if (!containerRef.current) return;
        const dataUrl = await toPng(containerRef.current);
        const link = document.createElement('a');
        link.download = `${title.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
    };

    const handleChangeType = (t) => {
        setChartType(t);
        setMenuOpen(false);
        onChangeType?.(t);
    };

    // ---------------------------------------------------------------------------
    // Rendu du graphique selon le type
    // ---------------------------------------------------------------------------
    const renderChart = () => {
        const commonProps = { data, margin: { top: 5, right: 16, left: 0, bottom: 5 } };

        switch (chartType) {
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            {keys.map((k, i) => (
                                <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            {keys.map((k, i) => (
                                <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'area':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart {...commonProps}>
                            <defs>
                                {keys.map((k, i) => (
                                    <linearGradient key={k} id={`grad_${k}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Legend />
                            {keys.map((k, i) => (
                                <Area key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} fill={`url(#grad_${k})`} strokeWidth={2} />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );

            case 'pie': {
                const pieData = Array.isArray(data)
                    ? data.map((d) => ({ name: d[xKey] ?? d.name ?? 'N/A', value: d[keys[0]] ?? 0 }))
                    : [];
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="70%" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                                {pieData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                );
            }

            case 'scatter':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart {...commonProps}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey={keys[0]} name={keys[0]} tick={{ fontSize: 10 }} />
                            <YAxis dataKey={keys[1] ?? keys[0]} name={keys[1] ?? keys[0]} tick={{ fontSize: 10 }} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter data={data} fill={color} />
                        </ScatterChart>
                    </ResponsiveContainer>
                );

            case 'radar': {
                const radarData = Array.isArray(data)
                    ? data.slice(0, 8).map(d => ({ subject: d[xKey] ?? 'N/A', value: d[keys[0]] ?? 0 }))
                    : [];
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                            <PolarRadiusAxis tick={{ fontSize: 8 }} />
                            <Radar name={title} dataKey="value" stroke={color} fill={color} fillOpacity={0.4} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                );
            }

            case 'kpi':
                return <KpiCard title={title} data={data} color={color} />;

            case 'table':
                return <DataTable data={data} />;

            default:
                return <p className="text-sm text-slate-400">Type non reconnu.</p>;
        }
    };

    // ---------------------------------------------------------------------------
    // Layout
    // ---------------------------------------------------------------------------
    const heightClass = enlarged ? 'fixed inset-4 z-50 shadow-2xl' : 'relative';

    return (
        <div
            ref={containerRef}
            className={`bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden ${heightClass} ${className}`}
            style={enlarged ? { background: 'white' } : {}}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50 select-none" style={draggable ? { cursor: 'grab' } : {}}>
                <div className="flex items-center gap-2">
                    <Icon size={14} className="text-purple-700" />
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{title}</span>
                    {period && <span className="text-xs text-slate-400 hidden sm:inline">({period})</span>}
                </div>

                <div className="flex items-center gap-1">
                    {/* Changer type */}
                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen(o => !o)}
                            className="p-1.5 rounded hover:bg-slate-200 text-slate-500"
                            title="Changer le type"
                        >
                            <ChevronDown size={13} />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[130px]">
                                {CHART_TYPES.map(t => {
                                    const I = CHART_ICONS[t];
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => handleChangeType(t)}
                                            className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-purple-50 ${chartType === t ? 'text-purple-700 font-semibold' : 'text-slate-700'}`}
                                        >
                                            <I size={12} /> {t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Exporter */}
                    <button onClick={handleExportImage} className="p-1.5 rounded hover:bg-slate-200 text-slate-500" title="Exporter en image">
                        <Download size={13} />
                    </button>

                    {/* Agrandir / Réduire */}
                    <button onClick={() => setEnlarged(e => !e)} className="p-1.5 rounded hover:bg-slate-200 text-slate-500" title={enlarged ? 'Réduire' : 'Agrandir'}>
                        <Maximize2 size={13} />
                    </button>

                    {/* Supprimer */}
                    {onRemove && (
                        <button onClick={onRemove} className="p-1.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600" title="Supprimer">
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Corps du graphique */}
            <div className="flex-1 min-h-0 p-2">
                {renderChart()}
            </div>
        </div>
    );
}
export { ChartBlock };
