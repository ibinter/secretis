/**
 * Rapports/Viewer.jsx — Visualiseur de rapport interactif SECRETIS ERP
 *
 * Affiche les données d'un rapport sous forme de graphiques et tableaux.
 * Filtres dynamiques, export PDF/Excel, impression native.
 */

import { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
    ArrowDownTrayIcon,
    PrinterIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    ChevronUpDownIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
import { format, subDays, startOfMonth } from 'date-fns';
import { useReport } from '@/hooks/useDashboard';
import axios from 'axios';

// ============================================================================
// CONSTANTES
// ============================================================================

const C = { navy: '#9333EA', blue: '#7e22ce', amber: '#F39C12', green: '#27AE60', red: '#E74C3C' };

const REPORT_TITLES = {
    mail: 'Registre Courrier', meetings: 'Réunions', tasks: 'Avancement des Tâches',
    visitors: 'Flux Visiteurs', leaves: 'Absences & Congés', rooms: 'Occupation Salles',
    supplies: 'Fournitures', global: 'Rapport Global d\'Activité', audit: 'Journal d\'Audit',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ label, value, color = C.navy, suffix = '' }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 text-center">
            <div className="text-2xl font-bold" style={{ color }}>
                {value ?? '—'}{suffix}
            </div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
    );
}

function DataTable({ headers, rows, maxRows = 100 }) {
    const [sortCol, setSortCol]   = useState(null);
    const [sortDir, setSortDir]   = useState('asc');
    const [search, setSearch]     = useState('');

    const filtered = useMemo(() => {
        let data = rows ?? [];
        if (search) {
            const q = search.toLowerCase();
            data = data.filter(row =>
                Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q))
            );
        }
        if (sortCol !== null) {
            data = [...data].sort((a, b) => {
                const va = a[headers[sortCol]] ?? '';
                const vb = b[headers[sortCol]] ?? '';
                return sortDir === 'asc'
                    ? String(va).localeCompare(String(vb), 'fr', { numeric: true })
                    : String(vb).localeCompare(String(va), 'fr', { numeric: true });
            });
        }
        return data.slice(0, maxRows);
    }, [rows, search, sortCol, sortDir, headers, maxRows]);

    const toggleSort = (i) => {
        if (sortCol === i) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(i); setSortDir('asc'); }
    };

    return (
        <div>
            <div className="mb-3">
                <input
                    type="search"
                    placeholder="Filtrer..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7e22ce]"
                />
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            {headers.map((h, i) => (
                                <th
                                    key={i}
                                    onClick={() => toggleSort(i)}
                                    className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                                >
                                    <span className="flex items-center gap-1">
                                        {h.replace(/_/g, ' ')}
                                        <ChevronUpDownIcon className="h-3 w-3 opacity-50" />
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filtered.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                {headers.map((h, j) => (
                                    <td key={j} className="py-2.5 px-4 text-gray-700 whitespace-nowrap">
                                        {row[h] ?? '—'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {!filtered.length && (
                            <tr>
                                <td colSpan={headers.length} className="py-8 text-center text-gray-400">
                                    Aucun résultat
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">{filtered.length} lignes affichées</p>
        </div>
    );
}

// ============================================================================
// RENDERERS PAR TYPE DE RAPPORT
// ============================================================================

function MailReportView({ data }) {
    const s = data?.stats ?? {};
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total" value={s.total} color={C.navy} />
                <StatCard label="Entrants" value={s.incoming} color={C.blue} />
                <StatCard label="Sortants" value={s.outgoing} color={C.amber} />
                <StatCard label="En retard" value={s.overdue} color={C.red} />
            </div>

            {/* AreaChart par jour */}
            {data?.by_day?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-[#9333EA] mb-4">Flux journalier</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={data.by_day}>
                            <defs>
                                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={C.blue} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={C.amber} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={C.amber} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="day" tickFormatter={d => d?.slice(5)} tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area type="monotone" dataKey="incoming" name="Entrant" stroke={C.blue} fill="url(#gIn)" strokeWidth={2} />
                            <Area type="monotone" dataKey="outgoing" name="Sortant" stroke={C.amber} fill="url(#gOut)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Tableau */}
            {data?.records?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-[#9333EA] mb-4">Registre détaillé</h3>
                    <DataTable
                        headers={['reference', 'type', 'subject', 'urgency', 'status', 'received_at', 'assigned_to']}
                        rows={data.records}
                    />
                </div>
            )}
        </div>
    );
}

function TaskReportView({ data }) {
    const s = data?.stats ?? {};
    const byDept = data?.by_department ?? [];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Total" value={s.total} color={C.navy} />
                <StatCard label="Terminées" value={s.done} color={C.green} />
                <StatCard label="En cours" value={s.in_progress} color={C.blue} />
                <StatCard label="Taux" value={s.completion_rate} color={C.amber} suffix="%" />
            </div>

            {byDept.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-[#9333EA] mb-4">Par service</h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={byDept} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="department" width={120} tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="total" name="Total" fill={C.navy} radius={[0, 4, 4, 0]} />
                            <Bar dataKey="done" name="Terminées" fill={C.green} radius={[0, 4, 4, 0]} />
                            <Bar dataKey="overdue" name="En retard" fill={C.red} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

function VisitorReportView({ data }) {
    const s = data?.stats ?? {};
    const PIE_COLORS = [C.navy, C.blue, C.amber, C.green, '#8E44AD', '#16A085'];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatCard label="Total visiteurs" value={s.total} color={C.navy} />
                <StatCard label="Partis" value={s.departed} color={C.green} />
                <StatCard label="Durée moy." value={s.avg_duration_minutes} color={C.blue} suffix=" min" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data?.by_day?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <h3 className="text-sm font-semibold text-[#9333EA] mb-4">Flux journalier</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.by_day}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis dataKey="day" tickFormatter={d => d?.slice(5)} tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                <Bar dataKey="total" name="Visiteurs" fill={C.blue} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {data?.by_department?.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 p-5">
                        <h3 className="text-sm font-semibold text-[#9333EA] mb-4">Par service</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={data.by_department} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="department">
                                    {data.by_department.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

function GenericReportView({ data }) {
    // Affichage générique JSON → statistiques + tableau
    const stats = data?.stats ?? {};
    const tables = Object.entries(data ?? {}).filter(([k]) => Array.isArray(data[k]) && k !== 'period');

    return (
        <div className="space-y-6">
            {Object.keys(stats).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(stats).map(([k, v]) => (
                        <StatCard key={k} label={k.replace(/_/g, ' ')} value={v} />
                    ))}
                </div>
            )}
            {tables.map(([key, rows]) => rows.length > 0 && (
                <div key={key} className="bg-white rounded-xl border border-gray-100 p-5">
                    <h3 className="text-sm font-semibold text-[#9333EA] mb-4 capitalize">
                        {key.replace(/_/g, ' ')}
                    </h3>
                    <DataTable headers={Object.keys(rows[0])} rows={rows} />
                </div>
            ))}
        </div>
    );
}

const REPORT_VIEWS = {
    mail:     MailReportView,
    tasks:    TaskReportView,
    visitors: VisitorReportView,
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function Viewer() {
    // Paramètres depuis l'URL
    const params = new URLSearchParams(window.location.search);
    const type   = params.get('type') ?? 'global';

    const [startDate, setStartDate] = useState(params.get('start_date') ?? format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate,   setEndDate]   = useState(params.get('end_date')   ?? format(new Date(), 'yyyy-MM-dd'));

    const { data: reportData, isLoading, refetch } = useReport(type, {
        start_date: startDate,
        end_date:   endDate,
    });

    const ReportView = REPORT_VIEWS[type] ?? GenericReportView;
    const title      = REPORT_TITLES[type] ?? 'Rapport';

    const handleExport = async (fmt) => {
        const res = await axios.get(`/api/v1/reports/${type}`, {
            params: { start_date: startDate, end_date: endDate, format: fmt },
            responseType: 'blob',
        });
        const ext  = fmt === 'pdf' ? 'pdf' : 'csv';
        const url  = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href  = url;
        link.download = `rapport-${type}-${startDate}.${ext}`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <>
            <Head title={title} />

            <div className="min-h-screen bg-gray-50">
                {/* Barre supérieure */}
                <div className="bg-white border-b border-gray-100 px-6 py-4 print:hidden">
                    <div className="max-w-screen-xl mx-auto flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <Link href="/rapports" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                                <ArrowLeftIcon className="h-4 w-4" />
                            </Link>
                            <div>
                                <h1 className="text-lg font-bold text-[#9333EA]">{title}</h1>
                                {reportData?.period && (
                                    <p className="text-xs text-gray-500">
                                        Du {reportData.period.start} au {reportData.period.end}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Filtres période */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                <FunnelIcon className="h-4 w-4 text-gray-400" />
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                    className="text-sm bg-transparent focus:outline-none text-gray-700" />
                                <span className="text-gray-400 text-sm">→</span>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                    className="text-sm bg-transparent focus:outline-none text-gray-700" />
                                <button onClick={() => refetch()}
                                    className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
                                    <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {/* Export — toujours visibles */}
                            <button onClick={() => handleExport('pdf')}
                                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                PDF
                            </button>
                            <button onClick={() => handleExport('excel')}
                                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                Excel
                            </button>
                            <button onClick={() => window.print()}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-300 transition-colors">
                                <PrinterIcon className="h-4 w-4" />
                                Imprimer
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contenu */}
                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                            <ArrowPathIcon className="h-10 w-10 animate-spin mb-3" />
                            <p>Génération du rapport…</p>
                        </div>
                    ) : (
                        <ReportView data={reportData} />
                    )}
                </div>
            </div>

            {/* CSS print */}
            <style>{`
                @media print {
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </>
    );
}
export { Viewer };
