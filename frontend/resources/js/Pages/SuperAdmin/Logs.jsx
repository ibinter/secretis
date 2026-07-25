import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head } from '@inertiajs/react';

// ─── Constantes ───────────────────────────────────────────────────────────────

const LEVELS = ['debug', 'info', 'warning', 'error', 'critical'];

const LEVEL_STYLES = {
    debug:    { badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',    row: '' },
    info:     { badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',    row: '' },
    warning:  { badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', row: 'bg-yellow-50/30 dark:bg-yellow-900/10' },
    error:    { badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',        row: 'bg-red-50/50 dark:bg-red-900/10' },
    critical: { badge: 'bg-red-700 text-white',                                             row: 'bg-red-100 dark:bg-red-900/30' },
};

const POLL_INTERVAL_MS = 5_000; // 5 secondes pour les logs temps réel

// ─── Composants ───────────────────────────────────────────────────────────────

function LevelBadge({ level }) {
    const style = LEVEL_STYLES[level] ?? LEVEL_STYLES.debug;
    return (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${style.badge}`}>
            {level}
        </span>
    );
}

function LogEntry({ entry }) {
    const [expanded, setExpanded] = useState(false);
    const style = LEVEL_STYLES[entry.level] ?? LEVEL_STYLES.debug;

    return (
        <div
            className={`border-b border-gray-100 dark:border-gray-700/50 px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition ${style.row}`}
            onClick={() => setExpanded(e => !e)}
        >
            <div className="flex flex-wrap items-start gap-2">
                <span className="text-xs text-gray-400 font-mono whitespace-nowrap">{entry.timestamp}</span>
                <LevelBadge level={entry.level} />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 flex-1 font-mono truncate">
                    {entry.message}
                </span>
            </div>
            {expanded && entry.context && Object.keys(entry.context).length > 0 && (
                <pre className="mt-2 text-xs bg-gray-900 text-green-400 rounded-lg p-3 overflow-auto max-h-48 font-mono">
                    {JSON.stringify(entry.context, null, 2)}
                </pre>
            )}
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Logs() {
    const [logs, setLogs]               = useState([]);
    const [activeLevels, setActiveLevels] = useState(new Set(LEVELS));
    const [search, setSearch]           = useState('');
    const [autoScroll, setAutoScroll]   = useState(true);
    const [loading, setLoading]         = useState(true);
    const [lastUpdate, setLastUpdate]   = useState(null);
    const [cursor, setCursor]           = useState(null); // pour la pagination / streaming
    const bottomRef                     = useRef(null);
    const containerRef                  = useRef(null);

    // ── Fetch logs ────────────────────────────────────────────────────────────

    const fetchLogs = useCallback(async (reset = false) => {
        try {
            const params = new URLSearchParams();
            if (cursor && !reset) params.set('cursor', cursor);
            params.set('levels', [...activeLevels].join(','));
            if (search.trim()) params.set('search', search.trim());
            params.set('limit', '200');

            const res = await fetch(`/api/superadmin/logs?${params}`, {
                headers: { Accept: 'application/json' },
            });

            if (!res.ok) return;

            const data = await res.json();
            const newLogs = data.logs ?? [];

            setLogs(prev => reset ? newLogs : [...prev.slice(-500), ...newLogs]); // garde 500 max
            if (data.cursor) setCursor(data.cursor);
            setLastUpdate(new Date().toLocaleTimeString('fr-FR'));
        } catch (err) {
            console.error('Logs fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [activeLevels, cursor, search]);

    useEffect(() => {
        fetchLogs(true);
        const interval = setInterval(() => fetchLogs(false), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [activeLevels]); // Reset quand les niveaux changent

    // ── Auto-scroll ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (autoScroll && bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, autoScroll]);

    // ── Filtre local full-text (en complément du filtre serveur) ─────────────

    const filteredLogs = logs.filter(entry => {
        if (!activeLevels.has(entry.level)) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            return (
                entry.message?.toLowerCase().includes(q) ||
                JSON.stringify(entry.context ?? {}).toLowerCase().includes(q)
            );
        }
        return true;
    });

    // ── Export ────────────────────────────────────────────────────────────────

    const handleExport = () => {
        const lines = filteredLogs.map(e =>
            `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message} ${e.context ? JSON.stringify(e.context) : ''}`
        );
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `secretis-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Toggle niveau ─────────────────────────────────────────────────────────

    const toggleLevel = (level) => {
        setActiveLevels(prev => {
            const next = new Set(prev);
            next.has(level) ? next.delete(level) : next.add(level);
            return next;
        });
    };

    return (
        <>
            <Head title="Logs — SECRETIS" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">

                {/* ── Barre d'outils ───────────────────────────────────── */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-wrap items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Viewer de Logs</h1>
                        {lastUpdate && (
                            <p className="text-xs text-gray-400">Mise à jour : {lastUpdate}</p>
                        )}
                    </div>

                    {/* Filtres de niveau */}
                    <div className="flex gap-1.5 flex-wrap">
                        {LEVELS.map(level => {
                            const style  = LEVEL_STYLES[level];
                            const active = activeLevels.has(level);
                            return (
                                <button
                                    key={level}
                                    onClick={() => toggleLevel(level)}
                                    className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border-2 transition
                                        ${active ? `${style.badge} border-transparent` : 'bg-transparent border-gray-200 dark:border-gray-600 text-gray-400'}`}
                                >
                                    {level}
                                </button>
                            );
                        })}
                    </div>

                    {/* Recherche */}
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Recherche dans les logs…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5
                                       bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
                                       focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Auto-scroll */}
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoScroll}
                            onChange={e => setAutoScroll(e.target.checked)}
                            className="rounded"
                        />
                        Auto-scroll
                    </label>

                    {/* Effacer affichage */}
                    <button
                        onClick={() => { setLogs([]); setCursor(null); }}
                        className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg
                                   text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                        Effacer
                    </button>

                    {/* Export */}
                    <button
                        onClick={handleExport}
                        className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                    >
                        ↓ Exporter
                    </button>
                </div>

                {/* ── Compteur ─────────────────────────────────────────── */}
                <div className="px-6 py-2 flex items-center gap-4 text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                    <span>{filteredLogs.length} entrées affichées</span>
                    {LEVELS.map(lvl => {
                        const count = filteredLogs.filter(e => e.level === lvl).length;
                        return count > 0 ? (
                            <span key={lvl} className={`font-medium ${LEVEL_STYLES[lvl].badge.split(' ')[1]} px-1.5 rounded`}>
                                {lvl}: {count}
                            </span>
                        ) : null;
                    })}
                </div>

                {/* ── Zone de logs ──────────────────────────────────────── */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-y-auto font-mono text-xs bg-white dark:bg-gray-900"
                    style={{ minHeight: 0, maxHeight: 'calc(100vh - 160px)' }}
                >
                    {loading && (
                        <div className="text-center py-20 text-gray-400">Chargement des logs…</div>
                    )}

                    {!loading && filteredLogs.length === 0 && (
                        <div className="text-center py-20 text-gray-400">
                            Aucun log correspondant aux filtres.
                        </div>
                    )}

                    {filteredLogs.map((entry, i) => (
                        <LogEntry key={`${entry.timestamp}-${i}`} entry={entry} />
                    ))}

                    <div ref={bottomRef} />
                </div>
            </div>
        </>
    );
}
export { Logs };
