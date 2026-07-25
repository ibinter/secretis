import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

// ─── Données mock santé système ───────────────────────────────────────────────
const MOCK_HEALTH = {
  database: { status: 'ok',      latency_ms: 12,  message: 'Connecté (12ms)' },
  redis:    { status: 'ok',      latency_ms: 3,   message: 'Connecté (3ms) — 48MB utilisés', used_mb: 48 },
  queue:    { status: 'warning', pending: 23,     message: '23 en attente, 2 en erreur', failed: 2 },
  reverb:   { status: 'ok',                        message: 'Reverb actif sur localhost:8080' },
  s3:       { status: 'ok',                        message: 'S3 accessible' },
  smtp:     { status: 'ok',                        message: 'SMTP configuré et accessible' },
  ai:       { status: 'ok',                        message: 'IA accessible (api.openai.com)' },
};

const MOCK_CRONS = [
  { command: 'schedule:run',               description: 'Scheduler Laravel',            last_run: '2026-07-21 14:25:00', status: 'ok',      next_run: '14:30' },
  { command: 'licenses:check-expiry',      description: 'Vérification licences',        last_run: '2026-07-21 14:00:00', status: 'ok',      next_run: '15:00' },
  { command: 'queue:work --timeout=60',    description: 'Worker queue principal',       last_run: '2026-07-21 14:28:00', status: 'ok',      next_run: '14:33' },
  { command: 'backup:run',                 description: 'Sauvegarde base de données',   last_run: '2026-07-21 03:00:00', status: 'ok',      next_run: '03:00+1' },
  { command: 'horizon:snapshot',           description: 'Snapshot Horizon',             last_run: '2026-07-21 14:20:00', status: 'ok',      next_run: '14:35' },
  { command: 'telescope:prune',            description: 'Nettoyage Telescope',          last_run: '2026-07-20 00:00:00', status: 'warning', next_run: '00:00+1' },
  { command: 'notifications:send-reminders',description: 'Envoi rappels',              last_run: '2026-07-21 08:00:00', status: 'ok',      next_run: '09:00' },
];

const MOCK_QUEUE_STATS = {
  queues: {
    default:       { pending: 12, failed: 1, processed: 4823 },
    emails:        { pending: 5,  failed: 0, processed: 2341 },
    notifications: { pending: 6,  failed: 1, processed: 1205 },
    reports:       { pending: 0,  failed: 0, processed: 89   },
    heavy:         { pending: 0,  failed: 0, processed: 34   },
  },
  total_pending: 23,
  total_failed:  2,
  recent_failed: [
    { id: 1, queue: 'notifications', class: 'SendPushNotificationJob', failed_at: '2026-07-21 13:45:22', exception: 'Connection refused: Firebase API unreachable' },
    { id: 2, queue: 'default',       class: 'ProcessReportJob',        failed_at: '2026-07-21 12:30:11', exception: 'Memory limit exceeded: report too large' },
  ],
};

const MOCK_LOGS = [
  { timestamp: '2026-07-21 14:28:11', level: 'INFO',    message: 'Queue worker started successfully on queue: default' },
  { timestamp: '2026-07-21 14:25:03', level: 'INFO',    message: 'Scheduled task completed: licenses:check-expiry' },
  { timestamp: '2026-07-21 13:45:22', level: 'ERROR',   message: 'SendPushNotificationJob: Connection refused [Firebase API]' },
  { timestamp: '2026-07-21 13:30:00', level: 'INFO',    message: 'SuperAdmin accessed organization #3 dashboard' },
  { timestamp: '2026-07-21 12:30:11', level: 'ERROR',   message: 'ProcessReportJob failed: Memory limit exceeded' },
  { timestamp: '2026-07-21 12:00:05', level: 'INFO',    message: 'Backup completed successfully: 142MB written to S3' },
  { timestamp: '2026-07-21 11:45:00', level: 'WARNING', message: 'Redis memory usage above 80%: 48MB / 60MB' },
  { timestamp: '2026-07-21 10:30:22', level: 'INFO',    message: 'Organization #7 license expired, status set to expired' },
  { timestamp: '2026-07-21 09:15:44', level: 'INFO',    message: 'CRON notifications:send-reminders executed, 12 emails sent' },
  { timestamp: '2026-07-21 08:00:01', level: 'INFO',    message: 'Daily health check passed — all systems operational' },
];

// ─── Icônes SVG ──────────────────────────────────────────────────────────────
const Icons = {
  DB:       () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>,
  Cache:    () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>,
  Queue:    () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
  Wifi:     () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>,
  Cloud:    () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>,
  Mail:     () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  AI:       () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  Refresh:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Check:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Alert:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  X:        () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Clock:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Search:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Trash:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
};

// ─── Feux tricolores (indicateur statut) ──────────────────────────────────────
function StatusLight({ status }) {
  const config = {
    ok:      { color: 'bg-green-500',  ring: 'ring-green-200',  pulse: true,  label: 'OK' },
    warning: { color: 'bg-yellow-400', ring: 'ring-yellow-200', pulse: false, label: 'Attention' },
    error:   { color: 'bg-red-500',    ring: 'ring-red-200',    pulse: true,  label: 'Erreur' },
    unknown: { color: 'bg-gray-400',   ring: 'ring-gray-200',   pulse: false, label: 'Inconnu' },
  }[status] || { color: 'bg-gray-400', ring: '', pulse: false, label: status };

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <div className={`w-4 h-4 rounded-full ${config.color} ring-4 ${config.ring} ${config.pulse && status === 'ok' ? 'animate-pulse' : ''}`} />
    </div>
  );
}

// ─── Carte indicateur ─────────────────────────────────────────────────────────
function HealthCard({ icon: Icon, label, data, loading }) {
  const statusColor = {
    ok:      'border-green-100 bg-green-50/30',
    warning: 'border-yellow-100 bg-yellow-50/30',
    error:   'border-red-100 bg-red-50/30',
    unknown: 'border-gray-100 bg-gray-50/30',
  }[data?.status] || 'border-gray-100 bg-gray-50/30';

  return (
    <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 transition-all duration-300 ${statusColor}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        data?.status === 'ok'      ? 'bg-green-100 text-green-600' :
        data?.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
        data?.status === 'error'   ? 'bg-red-100 text-red-600' :
                                     'bg-gray-100 text-gray-500'
      }`}>
        <Icon />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {loading ? (
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3 mt-1" />
        ) : (
          <p className="text-xs text-gray-500 truncate mt-0.5">{data?.message || '...'}</p>
        )}
        {data?.latency_ms && (
          <span className="inline-flex items-center text-xs text-gray-400 mt-0.5">
            <Icons.Clock /> &nbsp;{data.latency_ms}ms
          </span>
        )}
      </div>

      <StatusLight status={loading ? 'unknown' : (data?.status || 'unknown')} />
    </div>
  );
}

// ─── Graphique queue simple (barres SVG) ─────────────────────────────────────
function QueueChart({ stats }) {
  if (!stats) return null;
  const queues   = Object.entries(stats.queues || {});
  const maxVal   = Math.max(1, ...queues.map(([, v]) => Math.max(v.pending, v.failed)));

  return (
    <div className="space-y-3">
      {queues.map(([name, data]) => (
        <div key={name} className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-500 w-24 truncate">{name}</span>
          <div className="flex-1 flex gap-1 h-6 items-end">
            {/* Pending */}
            <div className="relative flex-1 bg-gray-100 rounded-md overflow-hidden h-full">
              <div
                className="absolute bottom-0 left-0 right-0 bg-indigo-400 rounded-md transition-all duration-500"
                style={{ height: `${(data.pending / maxVal) * 100}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                {data.pending}
              </span>
            </div>
            {/* Failed */}
            <div className="relative w-12 bg-gray-100 rounded-md overflow-hidden h-full">
              <div
                className="absolute bottom-0 left-0 right-0 bg-red-400 rounded-md transition-all duration-500"
                style={{ height: `${(data.failed / Math.max(1, ...queues.map(([,v]) => v.failed))) * 100}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-red-700">
                {data.failed}
              </span>
            </div>
          </div>
          <span className="text-xs text-gray-400 w-16 text-right">{data.processed.toLocaleString()} ok</span>
        </div>
      ))}
      <div className="flex items-center gap-4 pt-1 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-indigo-400 inline-block"></span>En attente</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block"></span>Échoués</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300 inline-block"></span>Traités</span>
      </div>
    </div>
  );
}

// ─── Tableau CRON ─────────────────────────────────────────────────────────────
function CronTable({ crons, loading }) {
  const statusBadge = (status) => {
    const map = {
      ok:      'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      error:   'bg-red-100 text-red-700',
      unknown: 'bg-gray-100 text-gray-500',
    };
    const labels = { ok: 'OK', warning: 'Retard', error: 'Erreur', unknown: 'Inconnu' };
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] || map.unknown}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-100">
            <th className="pb-3 text-xs font-semibold text-gray-500 pr-4">Description</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 pr-4">Commande</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 pr-4">Dernière exéc.</th>
            <th className="pb-3 text-xs font-semibold text-gray-500 pr-4">Statut</th>
            <th className="pb-3 text-xs font-semibold text-gray-500">Prochaine</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {(loading ? Array(5).fill(null) : crons).map((cron, i) => (
            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
              {loading ? (
                <td colSpan={5} className="py-3">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
                </td>
              ) : (
                <>
                  <td className="py-3 pr-4 font-medium text-gray-800">{cron.description}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-500 max-w-[220px] truncate">{cron.command}</td>
                  <td className="py-3 pr-4 text-xs text-gray-500 flex items-center gap-1">
                    <Icons.Clock />
                    {cron.last_run ? new Date(cron.last_run).toLocaleString('fr-FR') : '—'}
                  </td>
                  <td className="py-3 pr-4">{statusBadge(cron.status)}</td>
                  <td className="py-3 text-xs text-gray-400">{cron.next_run}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Viewer de logs ───────────────────────────────────────────────────────────
function LogViewer({ logs, loading }) {
  const [search, setSearch]     = useState('');
  const [levelFilter, setLevel] = useState('');
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.message.toLowerCase().includes(search.toLowerCase());
    const matchLevel  = !levelFilter || l.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const levelColor = {
    ERROR:   'text-red-600 bg-red-50',
    WARNING: 'text-yellow-700 bg-yellow-50',
    INFO:    'text-purple-600 bg-purple-50',
    DEBUG:   'text-gray-500 bg-gray-50',
  };

  return (
    <div className="space-y-3">
      {/* Filtres */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans les logs..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <Icons.Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <span className="absolute left-3 top-2.5 text-gray-400 pointer-events-none"><Icons.Search /></span>
        </div>
        <select
          value={levelFilter}
          onChange={e => setLevel(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="">Tous niveaux</option>
          <option value="ERROR">Erreur</option>
          <option value="WARNING">Avertissement</option>
          <option value="INFO">Info</option>
        </select>
      </div>

      {/* Log console */}
      <div
        ref={logRef}
        className="bg-gray-950 rounded-xl p-4 font-mono text-xs h-64 overflow-y-auto space-y-1"
      >
        {loading ? (
          Array(8).fill(null).map((_, i) => (
            <div key={i} className="h-4 bg-gray-800 rounded animate-pulse w-full" />
          ))
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun log correspondant</p>
        ) : (
          filtered.map((log, i) => (
            <div key={i} className="flex gap-3 items-start group hover:bg-gray-900 px-1 rounded">
              <span className="text-gray-600 shrink-0">{log.timestamp}</span>
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-bold ${
                log.level === 'ERROR'   ? 'bg-red-900 text-red-300' :
                log.level === 'WARNING' ? 'bg-yellow-900 text-yellow-300' :
                                          'bg-gray-800 text-gray-400'
              }`}>
                {log.level}
              </span>
              <span className={
                log.level === 'ERROR'   ? 'text-red-300' :
                log.level === 'WARNING' ? 'text-yellow-300' :
                                          'text-gray-300'
              }>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SystemHealth() {
  const [health, setHealth]           = useState(MOCK_HEALTH);
  const [queueStats, setQueueStats]   = useState(MOCK_QUEUE_STATS);
  const [cronStatus, setCronStatus]   = useState(MOCK_CRONS);
  const [logs, setLogs]               = useState(MOCK_LOGS);
  const [loading, setLoading]         = useState(false);
  const [logType, setLogType]         = useState('laravel');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [actionLoading, setActionLoading] = useState(null);
  const [globalStatus, setGlobalStatus]   = useState('ok');

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [healthResp, queueResp, cronResp] = await Promise.allSettled([
        axios.get('/superadmin/system/health'),
        axios.get('/superadmin/system/queue-stats'),
        axios.get('/superadmin/system/cron-status'),
      ]);

      if (healthResp.status === 'fulfilled') {
        setHealth(healthResp.value.data.health);
        setGlobalStatus(healthResp.value.data.global);
      }
      if (queueResp.status === 'fulfilled') {
        setQueueStats(queueResp.value.data);
      }
      if (cronResp.status === 'fulfilled') {
        setCronStatus(cronResp.value.data.crons);
      }

      setLastRefresh(new Date());
    } catch (e) {
      console.error('Health check failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const resp = await axios.get(`/superadmin/system/logs/${logType}`);
      setLogs(resp.data.lines || []);
    } catch (e) {
      console.error('Log fetch failed', e);
    }
  }, [logType]);

  // Auto-refresh toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  useEffect(() => {
    refreshLogs();
  }, [logType, refreshLogs]);

  const handleAction = async (action, label) => {
    if (!confirm(`Confirmer : ${label} ?`)) return;
    setActionLoading(action);
    try {
      await axios.post(`/superadmin/system/${action}`);
      alert(`${label} effectué avec succès.`);
      if (action === 'clear-cache') refreshAll();
    } catch (e) {
      alert(`Erreur : ${e.response?.data?.message || e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const indicators = [
    { key: 'database', label: 'Base de données',    icon: Icons.DB },
    { key: 'redis',    label: 'Redis Cache',         icon: Icons.Cache },
    { key: 'queue',    label: 'File d\'attente',     icon: Icons.Queue },
    { key: 'reverb',   label: 'Reverb WebSocket',   icon: Icons.Wifi },
    { key: 's3',       label: 'Stockage S3',         icon: Icons.Cloud },
    { key: 'smtp',     label: 'Email SMTP',          icon: Icons.Mail },
  ];

  return (
    <>
      <Head title="Santé Système — SuperAdmin SECRETIS" />

      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Santé du Système</h1>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                globalStatus === 'ok'      ? 'bg-green-100 text-green-700' :
                globalStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                             'bg-red-100 text-red-700'
              }`}>
                {globalStatus === 'ok' ? '● Tous systèmes opérationnels' :
                 globalStatus === 'warning' ? '● Attention requise' : '● Incident en cours'}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Dernière vérification : {lastRefresh.toLocaleTimeString('fr-FR')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAction('clear-cache', 'Vider tous les caches')}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors"
            >
              <Icons.Trash />
              Vider cache
            </button>
            <button
              onClick={() => handleAction('restart-queues', 'Redémarrer les queues')}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 disabled:opacity-50 transition-colors"
            >
              <Icons.Queue />
              Redémarrer queues
            </button>
            <button
              onClick={refreshAll}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <span className={loading ? 'animate-spin' : ''}><Icons.Refresh /></span>
              {loading ? 'Vérification...' : 'Actualiser'}
            </button>
          </div>
        </div>

        {/* Grille indicateurs */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {indicators.map(ind => (
            <HealthCard
              key={ind.key}
              icon={ind.icon}
              label={ind.label}
              data={health?.[ind.key]}
              loading={loading}
            />
          ))}
        </div>

        {/* Queues & CRON */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Graphique queues */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900">Files d'attente</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="font-semibold text-indigo-600">{queueStats?.total_pending || 0}</span> en attente ·{' '}
                  <span className="font-semibold text-red-600">{queueStats?.total_failed || 0}</span> en erreur
                </p>
              </div>
            </div>
            <QueueChart stats={queueStats} />

            {/* Jobs récents en erreur */}
            {queueStats?.recent_failed?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50">
                <p className="text-xs font-semibold text-gray-500 mb-2">Jobs échoués récents</p>
                <div className="space-y-2">
                  {queueStats.recent_failed.map(job => (
                    <div key={job.id} className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-mono font-semibold text-red-800 truncate">{job.class}</p>
                        <span className="text-xs text-gray-400 shrink-0">{job.queue}</span>
                      </div>
                      <p className="text-xs text-red-600 mt-1 truncate">{job.exception}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tableau CRON */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900">Tâches planifiées (CRON)</h2>
                <p className="text-sm text-gray-500 mt-0.5">{cronStatus?.length || 0} tâches configurées</p>
              </div>
              <button
                onClick={() => handleAction('force-cron', 'Forcer l\'exécution CRON')}
                disabled={!!actionLoading}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-600 disabled:opacity-50"
              >
                Forcer CRON
              </button>
            </div>
            <CronTable crons={cronStatus || []} loading={loading} />
          </div>
        </div>

        {/* Log viewer */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">Logs Système</h2>
              <p className="text-sm text-gray-500 mt-0.5">100 dernières entrées</p>
            </div>
            <div className="flex gap-2">
              {['laravel', 'queue', 'reverb'].map(type => (
                <button
                  key={type}
                  onClick={() => setLogType(type)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    logType === type
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <LogViewer logs={logs} loading={loading} />
        </div>
      </div>
    </>
  );
}
export { SystemHealth };
