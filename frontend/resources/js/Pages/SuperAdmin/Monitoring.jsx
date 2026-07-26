import React, { useState, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';

// ─── Constantes ───────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 30_000; // 30 secondes

const STATUS_COLORS = {
    healthy:   { bg: 'bg-green-500',  text: 'text-green-700',  ring: 'ring-green-400' },
    degraded:  { bg: 'bg-yellow-400', text: 'text-yellow-700', ring: 'ring-yellow-400' },
    unhealthy: { bg: 'bg-red-500',    text: 'text-red-700',    ring: 'ring-red-500' },
    unknown:   { bg: 'bg-gray-400',   text: 'text-gray-600',   ring: 'ring-gray-400' },
};

// ─── Composants UI ────────────────────────────────────────────────────────────

function LedIndicator({ status }) {
    const c = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
    return (
        <span className={`inline-block w-3 h-3 rounded-full ${c.bg} ring-2 ${c.ring} ring-offset-1`} />
    );
}

function KpiCard({ label, value, unit = '', trend = null, color = 'indigo' }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
            <div className="flex items-end gap-1">
                <span className={`text-3xl font-bold text-${color}-600 dark:text-${color}-400`}>{value}</span>
                {unit && <span className="text-sm text-gray-500 mb-1">{unit}</span>}
            </div>
            {trend !== null && (
                <span className={`text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs heure précédente
                </span>
            )}
        </div>
    );
}

function ServiceStatus({ name, status, latencyMs }) {
    const c = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <div className="flex items-center gap-2">
                <LedIndicator status={status} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{name}</span>
            </div>
            <div className="flex items-center gap-3">
                {latencyMs != null && (
                    <span className="text-xs text-gray-500">{latencyMs} ms</span>
                )}
                <span className={`text-xs font-semibold ${c.text}`}>{status}</span>
            </div>
        </div>
    );
}

function ErrorRow({ error, onClick }) {
    return (
        <div
            className="border border-red-100 dark:border-red-900 rounded-xl p-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            onClick={() => onClick(error)}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-mono text-red-700 dark:text-red-400 truncate">{error.message}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{error.time}</span>
            </div>
            <div className="flex gap-2 mt-1">
                <span className="text-xs text-gray-500">{error.route}</span>
                <span className="text-xs font-bold text-red-500">HTTP {error.status}</span>
            </div>
        </div>
    );
}

function ErrorDetailModal({ error, onClose }) {
    if (!error) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between">
                    <h3 className="font-bold text-gray-800 dark:text-white">Détail de l'erreur</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>
                <div className="p-5 space-y-3">
                    <div><span className="text-xs text-gray-400">Message</span>
                        <p className="text-sm font-mono text-red-600">{error.message}</p></div>
                    <div><span className="text-xs text-gray-400">Route</span>
                        <p className="text-sm">{error.route}</p></div>
                    <div><span className="text-xs text-gray-400">Status HTTP</span>
                        <p className="text-sm font-bold">{error.status}</p></div>
                    <div><span className="text-xs text-gray-400">Heure</span>
                        <p className="text-sm">{error.time}</p></div>
                    {error.trace && (
                        <div>
                            <span className="text-xs text-gray-400">Stack trace</span>
                            <pre className="text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-auto max-h-60 mt-1">{error.trace}</pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Monitoring() {
    const [metrics, setMetrics]         = useState(null);
    const [health, setHealth]           = useState(null);
    const [timeline, setTimeline]       = useState([]);
    const [errors, setErrors]           = useState([]);
    const [slowRoutes, setSlowRoutes]   = useState([]);
    const [trials, setTrials]           = useState([]);
    const [selectedError, setSelectedError] = useState(null);
    const [loading, setLoading]         = useState(true);
    const [lastUpdate, setLastUpdate]   = useState(null);

    const fetchAll = useCallback(async () => {
        try {
            const [healthRes, metricsRes] = await Promise.all([
                fetch('/health/detailed', { headers: { Accept: 'application/json' } }),
                fetch('/api/superadmin/monitoring/metrics', { headers: { Accept: 'application/json' } }),
            ]);

            if (healthRes.ok) {
                const h = await healthRes.json();
                setHealth(h);
            }

            if (metricsRes.ok) {
                const m = await metricsRes.json();
                setMetrics(m.summary ?? null);
                setTimeline(m.timeline ?? []);
                setErrors(m.recent_errors ?? []);
                setSlowRoutes(m.slow_routes ?? []);
                setTrials(m.trial_organizations ?? []);
            }

            setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
        } catch (err) {
            console.error('Monitoring fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchAll]);

    const globalStatus = health?.status ?? 'unknown';
    const checks       = health?.checks ?? {};
    const detailed     = health?.detailed ?? {};

    return (
        <>
            <Head title="Monitoring — SECRETIS" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 space-y-6">

                {/* ── En-tête ───────────────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Monitoring Temps Réel
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Rafraîchissement toutes les 30 s
                            {lastUpdate && ` · Dernière mise à jour : ${lastUpdate}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <LedIndicator status={globalStatus} />
                        <span className={`font-semibold text-sm ${STATUS_COLORS[globalStatus]?.text ?? 'text-gray-600'}`}>
                            {globalStatus.toUpperCase()}
                        </span>
                        <button
                            onClick={fetchAll}
                            className="ml-4 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                        >
                            Actualiser
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="text-center py-20 text-gray-400">Chargement des métriques…</div>
                )}

                {!loading && (
                    <>
                        {/* ── KPIs ───────────────────────────────────────── */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <KpiCard
                                label="Requêtes / min"
                                value={metrics?.requests_per_minute ?? '—'}
                                color="indigo"
                            />
                            <KpiCard
                                label="Temps de réponse"
                                value={metrics?.avg_response_ms ?? '—'}
                                unit="ms"
                                color="blue"
                            />
                            <KpiCard
                                label="Taux d'erreur"
                                value={metrics?.error_rate_pct ?? '—'}
                                unit="%"
                                color={parseFloat(metrics?.error_rate_pct) > 5 ? 'red' : 'green'}
                            />
                            <KpiCard
                                label="Jobs en queue"
                                value={metrics?.queue_pending ?? '—'}
                                color={parseInt(metrics?.queue_pending) > 500 ? 'orange' : 'emerald'}
                            />
                        </div>

                        {/* ── Graphique timeline (60 dernières minutes) ───── */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                                Activité des 60 dernières minutes
                            </h2>
                            {timeline.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <AreaChart data={timeline} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                                        <defs>
                                            <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="minute" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Legend />
                                        <Area type="monotone" dataKey="requests" stroke="#6366f1" fill="url(#reqGrad)" name="Requêtes" strokeWidth={2} />
                                        <Area type="monotone" dataKey="errors"   stroke="#ef4444" fill="url(#errGrad)" name="Erreurs"   strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-sm text-gray-400 text-center py-10">Pas encore de données timeline.</p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* ── Services ─────────────────────────────────── */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">État des services</h2>
                                <div className="space-y-2">
                                    <ServiceStatus name="Base de données"     status={checks.database?.status}  latencyMs={checks.database?.latency_ms} />
                                    <ServiceStatus name="Redis"               status={checks.redis?.status}     latencyMs={checks.redis?.latency_ms} />
                                    <ServiceStatus name="Queue Worker"        status={checks.queue?.status}     />
                                    <ServiceStatus name="WebSocket (Reverb)"  status={checks.reverb?.status}    />
                                    <ServiceStatus name="Disque"              status={checks.disk?.status}      />
                                </div>

                                {/* Infos détaillées */}
                                {Object.keys(detailed).length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2 text-xs text-gray-500">
                                        <span>Organisations actives : <strong>{detailed.active_organizations}</strong></span>
                                        <span>Mémoire PHP : <strong>{detailed.memory_used_mb} Mo</strong></span>
                                        <span>PHP : <strong>{detailed.php_version}</strong></span>
                                        <span>Laravel : <strong>{detailed.laravel_version}</strong></span>
                                        <span>Jobs échoués : <strong className={detailed.failed_jobs_count > 0 ? 'text-red-500' : ''}>{detailed.failed_jobs_count}</strong></span>
                                        <span>Taille DB : <strong>{detailed.database_size_mb} Mo</strong></span>
                                    </div>
                                )}
                            </div>

                            {/* ── Routes lentes ────────────────────────────── */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top 5 routes les plus lentes</h2>
                                {slowRoutes.length > 0 ? (
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                                <th className="text-left pb-2">Route</th>
                                                <th className="text-right pb-2">Moy (ms)</th>
                                                <th className="text-right pb-2">Appels</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {slowRoutes.slice(0, 5).map((r, i) => (
                                                <tr key={i} className="border-b border-gray-50 dark:border-gray-700/50">
                                                    <td className="py-2 font-mono text-gray-700 dark:text-gray-300 truncate max-w-[180px]">{r.route}</td>
                                                    <td className={`py-2 text-right font-bold ${r.avg_ms > 1000 ? 'text-red-500' : r.avg_ms > 500 ? 'text-yellow-500' : 'text-green-600'}`}>
                                                        {r.avg_ms}
                                                    </td>
                                                    <td className="py-2 text-right text-gray-500">{r.total_calls}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-sm text-gray-400 text-center py-6">Aucune donnée disponible.</p>
                                )}
                            </div>
                        </div>

                        {/* ── Erreurs récentes ──────────────────────────────── */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                                10 dernières erreurs <span className="text-xs text-gray-400 ml-1">(cliquez pour le stack trace)</span>
                            </h2>
                            {errors.length > 0 ? (
                                <div className="space-y-2">
                                    {errors.map((e, i) => (
                                        <ErrorRow key={i} error={e} onClick={setSelectedError} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-green-600 text-center py-6">✅ Aucune erreur récente.</p>
                            )}
                        </div>

                        {/* ── Organisations en trial ────────────────────────── */}
                        {trials.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
                                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                                    Organisations en période d'essai ({trials.length})
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {trials.map((org) => (
                                        <div key={org.id} className="border border-yellow-200 dark:border-yellow-800 rounded-xl p-3">
                                            <p className="text-sm font-medium text-gray-800 dark:text-white">{org.name}</p>
                                            <p className="text-xs text-gray-500">Expire le : <strong>{org.trial_ends_at}</strong></p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Modal erreur ────────────────────────────────────────── */}
            <ErrorDetailModal error={selectedError} onClose={() => setSelectedError(null)} />
        </>
    );
}
export { Monitoring };
