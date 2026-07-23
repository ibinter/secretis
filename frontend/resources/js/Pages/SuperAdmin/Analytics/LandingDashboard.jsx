import { useState, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import SuperAdminLayout from '@/Layouts/SuperAdminLayout';
import { format, subDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const PERIOD_PRESETS = [
    { label: '7 jours',   days: 7  },
    { label: '30 jours',  days: 30 },
    { label: '90 jours',  days: 90 },
    { label: 'Personnalisé', days: null },
];

// ---------------------------------------------------------------------------
// Composants utilitaires
// ---------------------------------------------------------------------------

function KpiCard({ title, value, subtitle, icon, trend }) {
    const trendColor = trend > 0 ? 'text-green-600 dark:text-green-400'
        : trend < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 flex flex-col gap-2 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
                <span className="text-2xl">{icon}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
            </div>
            {subtitle && (
                <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>
            )}
            {trend !== undefined && (
                <div className={`text-xs font-medium ${trendColor}`}>
                    {trend > 0 ? '▲' : trend < 0 ? '▼' : '—'} {Math.abs(trend)}% vs période précédente
                </div>
            )}
        </div>
    );
}

function SectionTitle({ children }) {
    return (
        <h2 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3 mt-6">
            {children}
        </h2>
    );
}

function DataTable({ columns, rows, emptyMessage = 'Aucune donnée' }) {
    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key}
                                className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length}
                                className="px-4 py-6 text-center text-gray-400 dark:text-gray-500">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : rows.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            {columns.map((col) => (
                                <td key={col.key} className="px-4 py-2 text-gray-800 dark:text-gray-200">
                                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Funnel de conversion
// ---------------------------------------------------------------------------

function ConversionFunnel({ steps = [] }) {
    const max = steps[0]?.count || 1;
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

    return (
        <div className="flex flex-col gap-2">
            {steps.map((step, i) => (
                <div key={step.step} className="flex items-center gap-3">
                    <div className="w-28 text-right text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
                        {step.step}
                    </div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-7 relative overflow-hidden">
                        <div
                            className="h-7 rounded-full flex items-center pl-3 transition-all duration-700"
                            style={{
                                width: `${(step.count / max) * 100}%`,
                                backgroundColor: colors[i] ?? '#6366f1',
                                minWidth: step.count > 0 ? '4rem' : 0,
                            }}
                        >
                            <span className="text-white text-xs font-semibold whitespace-nowrap">
                                {step.count.toLocaleString('fr-FR')}
                            </span>
                        </div>
                    </div>
                    <div className="w-16 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        {step.rate} %
                    </div>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default function LandingDashboard({ initialData = {}, flash = {} }) {
    const [period, setPeriod]     = useState({ preset: 30, from: null, to: null });
    const [data, setData]         = useState(initialData);
    const [loading, setLoading]   = useState(false);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo]     = useState('');

    const fetchData = useCallback(async (p) => {
        setLoading(true);
        try {
            const params = p.preset
                ? { days: p.preset }
                : { from: p.from, to: p.to };

            const res = await fetch(
                `/superadmin/analytics/landing/data?${new URLSearchParams(params)}`,
                { headers: { Accept: 'application/json' } }
            );
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error('Analytics fetch error', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(period);
    }, [period, fetchData]);

    function handlePreset(days) {
        if (days === null) return; // personnalisé : géré séparément
        setPeriod({ preset: days, from: null, to: null });
    }

    function handleCustomPeriod() {
        if (customFrom && customTo) {
            setPeriod({ preset: null, from: customFrom, to: customTo });
        }
    }

    // Données formatées pour les graphiques
    const byDayData = (data.by_day ?? []).map((d) => ({
        date:     d.date ? format(parseISO(d.date), 'dd MMM', { locale: fr }) : d.date,
        Visites:  d.views ?? 0,
        Sessions: d.sessions ?? 0,
    }));

    const sourceData = (data.top_sources ?? []).map((s) => ({
        name:   s.utm_source || 'Direct',
        Visites: s.visits ?? 0,
    }));

    const deviceData = Object.entries(data.by_device ?? {}).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
    }));

    const topPagesColumns = [
        { key: 'page',     label: 'Page' },
        { key: 'views',    label: 'Pages vues' },
        { key: 'sessions', label: 'Sessions uniques' },
    ];

    const topCountriesColumns = [
        { key: 'country', label: 'Pays' },
        { key: 'visits',  label: 'Visites' },
    ];

    const conversionRate = data.unique_sessions > 0
        ? ((data.trial_signups / data.unique_sessions) * 100).toFixed(1)
        : '0.0';

    return (
        <SuperAdminLayout>
            <Head title="Analytics — Landing Page | SECRETIS" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

                {/* En-tête */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Analytics — Landing Page
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Suivi des visites, conversions et comportements de la page commerciale.
                        </p>
                    </div>

                    {/* Sélecteur de période */}
                    <div className="flex flex-wrap gap-2 items-center">
                        {PERIOD_PRESETS.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => preset.days ? handlePreset(preset.days) : null}
                                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                                    (period.preset === preset.days && preset.days !== null)
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}

                        {/* Période personnalisée */}
                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                            />
                            <span className="text-gray-400">→</span>
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                            />
                            <button
                                onClick={handleCustomPeriod}
                                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="text-center py-4 text-indigo-600 text-sm">Chargement…</div>
                )}

                {/* KPI Cards */}
                <SectionTitle>Indicateurs clés</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                    <KpiCard title="Visites totales"     value={data.page_views?.total ?? 0}    icon="👁️" />
                    <KpiCard title="Sessions uniques"    value={data.unique_sessions ?? 0}       icon="👤" />
                    <KpiCard title="Demandes de démo"    value={data.demo_requests ?? 0}         icon="📅" />
                    <KpiCard title="Inscriptions essai"  value={data.trial_signups ?? 0}         icon="🚀" />
                    <KpiCard title="Taux de conversion"  value={`${conversionRate} %`}           icon="📈" />
                    <KpiCard title="Sessions SARA"        value={data.sara_conversations ?? 0}   icon="🤖" />
                    <KpiCard title="Clics WhatsApp"      value={data.whatsapp_clicks ?? 0}       icon="📲" />
                    <KpiCard title="Installs PWA"        value={data.pwa_installs ?? 0}          icon="📱" />
                    <KpiCard title="Clics partenaires"   value={data.partner_clicks ?? 0}        icon="🤝" />
                </div>

                {/* Graphique visites / jour */}
                <SectionTitle>Évolution des visites (30 derniers jours)</SectionTitle>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={byDayData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="Visites"  stroke="#6366f1" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="Sessions" stroke="#10b981" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Sources de trafic + Appareils */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">

                    <div>
                        <SectionTitle>Sources de trafic (UTM)</SectionTitle>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={sourceData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                                    <Tooltip />
                                    <Bar dataKey="Visites" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div>
                        <SectionTitle>Appareils utilisés</SectionTitle>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={deviceData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                        label={({ name, percent }) =>
                                            `${name} ${(percent * 100).toFixed(0)}%`
                                        }
                                    >
                                        {deviceData.map((_, idx) => (
                                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Funnel de conversion */}
                <SectionTitle>Funnel de conversion</SectionTitle>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                    <ConversionFunnel steps={data.conversion_funnel ?? []} />
                </div>

                {/* Top pages + Top pays */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
                    <div>
                        <SectionTitle>Top pages par vues</SectionTitle>
                        <DataTable
                            columns={topPagesColumns}
                            rows={data.page_views?.by_page ?? []}
                            emptyMessage="Aucune donnée de page"
                        />
                    </div>
                    <div>
                        <SectionTitle>Top pays</SectionTitle>
                        <DataTable
                            columns={topCountriesColumns}
                            rows={data.by_country ?? []}
                            emptyMessage="Aucune donnée géographique"
                        />
                    </div>
                </div>

            </div>
        </SuperAdminLayout>
    );
}
