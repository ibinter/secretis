import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';

// ─── Mock services Docker ─────────────────────────────────────────────────────
const MOCK_SERVICES = [
  { name: 'app',       label: 'Laravel App',  status: 'running', cpu: 12.4, ram: 384, uptime: '29j 14h' },
  { name: 'nginx',     label: 'Nginx',        status: 'running', cpu: 0.8,  ram: 32,  uptime: '29j 14h' },
  { name: 'postgres',  label: 'PostgreSQL',   status: 'running', cpu: 5.2,  ram: 512, uptime: '29j 14h' },
  { name: 'redis',     label: 'Redis',        status: 'running', cpu: 0.4,  ram: 48,  uptime: '29j 14h' },
  { name: 'reverb',    label: 'Reverb WS',    status: 'running', cpu: 2.1,  ram: 96,  uptime: '29j 14h' },
  { name: 'queue',     label: 'Queue Worker', status: 'degraded',cpu: 8.7,  ram: 128, uptime: '2h 33m' },
  { name: 'scheduler', label: 'Scheduler',    status: 'running', cpu: 0.1,  ram: 32,  uptime: '29j 14h' },
  { name: 'minio',     label: 'MinIO',        status: 'running', cpu: 1.3,  ram: 160, uptime: '29j 14h' },
];

const MOCK_SYSTEM = { cpu_pct: 28.5, ram_used_gb: 5.8, ram_total_gb: 16, disk_used_gb: 124, disk_total_gb: 500 };

const MOCK_ALERTS = [
  { name: 'HighCPU', severity: 'warning',  summary: 'CPU > 80% sur queue_worker', fired_at: '2026-07-22T09:12:00Z' },
  { name: 'MemoryPressure', severity: 'critical', summary: 'RAM système > 90%', fired_at: '2026-07-22T08:45:00Z' },
];

const MOCK_ERRORS = [
  { level: 'error',   message: 'SQLSTATE[HY000]: General error: 1205 Lock wait timeout',  timestamp: '2026-07-22T10:31:00Z', context: 'App\\Jobs\\ProcessPayment' },
  { level: 'warning', message: 'Redis connection refused — falling back to database cache', timestamp: '2026-07-22T09:55:00Z', context: 'App\\Services\\CacheService' },
  { level: 'error',   message: 'Mail: Connection could not be established with host smtp.mailgun.org', timestamp: '2026-07-22T08:10:00Z', context: 'App\\Notifications\\LicenseExpiry' },
];

// Uptime 30 derniers jours (mock : tableau de statuts par jour)
const UPTIME_30 = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  status: i === 14 ? 'incident' : i === 22 ? 'degraded' : 'up',
}));

// ─── Dot de statut ────────────────────────────────────────────────────────────
function StatusDot({ status, animate = true }) {
  const cfg = {
    running:  'bg-green-500',
    degraded: 'bg-amber-400',
    stopped:  'bg-red-500',
    up:       'bg-green-500',
    incident: 'bg-red-500',
  };
  return (
    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block ${cfg[status] || 'bg-gray-300'} ${animate ? 'animate-pulse' : ''}`} />
  );
}

function ServiceStatus({ status }) {
  const cfg = {
    running:  { label: 'Running',  cls: 'bg-green-100 text-green-700' },
    degraded: { label: 'Dégradé', cls: 'bg-amber-100 text-amber-700' },
    stopped:  { label: 'Arrêté',  cls: 'bg-red-100 text-red-700' },
  };
  const s = cfg[status] || cfg.running;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

// ─── Jauge horizontal ─────────────────────────────────────────────────────────
function Gauge({ value, max, unit, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : (color || 'bg-purple-500');
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-20 text-right flex-shrink-0">{value}{unit} / {max}{unit}</span>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function PlatformMonitoring() {
  const [services, setServices] = useState(MOCK_SERVICES);
  const [system, setSystem]     = useState(MOCK_SYSTEM);
  const [alerts, setAlerts]     = useState(MOCK_ALERTS);
  const [errors, setErrors]     = useState(MOCK_ERRORS);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Simuler rafraîchissement auto toutes les 30 secondes (en prod : polling API ou WebSocket)
  useEffect(() => {
    const timer = setInterval(() => { setLastRefresh(new Date()); }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const overallStatus = services.every(s => s.status === 'running') ? 'operational'
    : services.some(s => s.status === 'stopped') ? 'incident'
    : 'degraded';

  const uptimePct = (() => {
    const up = UPTIME_30.filter(d => d.status === 'up').length;
    return ((up / UPTIME_30.length) * 100).toFixed(2);
  })();

  return (
    <>
      <Head title="Monitoring — SuperAdmin IBIG Soft" />
      <div className="min-h-screen bg-gray-50">

        {/* Header */}
        <header className="bg-purple-900 text-white shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.visit('/superadmin/saas-dashboard')} className="text-purple-200 hover:text-white text-sm">← Dashboard</button>
              <span className="text-purple-400">/</span>
              <h1 className="text-lg font-bold">Monitoring plateforme</h1>
              <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg ${overallStatus === 'operational' ? 'bg-green-500/20 text-green-200' : overallStatus === 'degraded' ? 'bg-amber-500/20 text-amber-200' : 'bg-red-500/20 text-red-200'}`}>
                <StatusDot status={overallStatus === 'operational' ? 'running' : overallStatus === 'degraded' ? 'degraded' : 'stopped'} />
                {overallStatus === 'operational' ? 'Tous systèmes opérationnels' : overallStatus === 'degraded' ? 'Service dégradé' : 'Incident en cours'}
              </div>
              <span className="text-purple-300 text-xs">Mis à jour : {lastRefresh.toLocaleTimeString('fr-FR')}</span>
            </div>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

          {/* Alertes Prometheus actives */}
          {alerts.length > 0 && (
            <section className="space-y-2">
              {alerts.map((alert, i) => (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${alert.severity === 'critical' ? 'text-red-800' : 'text-amber-800'}`}>
                      [{alert.severity.toUpperCase()}] {alert.name}
                    </p>
                    <p className={`text-xs mt-0.5 ${alert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{alert.summary}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{new Date(alert.fired_at).toLocaleTimeString('fr-FR')}</span>
                </div>
              ))}
            </section>
          )}

          {/* Métriques système */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
                CPU
              </h3>
              <div className="text-3xl font-black text-gray-900 mb-3">{system.cpu_pct}%</div>
              <Gauge value={system.cpu_pct} max={100} unit="%" color="bg-purple-500" />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                RAM
              </h3>
              <div className="text-3xl font-black text-gray-900 mb-3">{system.ram_used_gb} Go</div>
              <Gauge value={system.ram_used_gb} max={system.ram_total_gb} unit=" Go" color="bg-purple-500" />
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                Disque
              </h3>
              <div className="text-3xl font-black text-gray-900 mb-3">{system.disk_used_gb} Go</div>
              <Gauge value={system.disk_used_gb} max={system.disk_total_gb} unit=" Go" color="bg-teal-500" />
            </div>
          </div>

          {/* Services Docker */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Services Docker</h2>
              <p className="text-xs text-gray-400 mt-0.5">8 conteneurs — Stack SECRETIS ERP</p>
            </div>
            <div className="divide-y divide-gray-50">
              {services.map(svc => (
                <div key={svc.name} className="flex items-center gap-4 px-6 py-4">
                  <StatusDot status={svc.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{svc.label}</span>
                      <code className="text-xs text-gray-400 font-mono">{svc.name}</code>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Uptime : {svc.uptime}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-6 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">CPU</div>
                      <div className={`text-sm font-semibold ${svc.cpu > 50 ? 'text-red-600' : svc.cpu > 20 ? 'text-amber-600' : 'text-gray-700'}`}>{svc.cpu}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">RAM</div>
                      <div className="text-sm font-semibold text-gray-700">{svc.ram} Mo</div>
                    </div>
                  </div>
                  <ServiceStatus status={svc.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Uptime 30 jours + Dernières erreurs */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Uptime */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Uptime — 30 derniers jours</h2>
                <span className="text-lg font-black text-green-700">{uptimePct}%</span>
              </div>
              <div className="flex items-end gap-1">
                {UPTIME_30.map((d, i) => {
                  const colors = { up: 'bg-green-400 hover:bg-green-500', degraded: 'bg-amber-400 hover:bg-amber-500', incident: 'bg-red-500 hover:bg-red-600' };
                  return (
                    <div key={i} title={`J-${30 - d.day + 1} : ${d.status}`}
                      className={`flex-1 rounded-sm cursor-pointer transition-colors ${colors[d.status]} ${d.status === 'up' ? 'h-8' : d.status === 'degraded' ? 'h-5' : 'h-3'}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Il y a 30 jours</span><span>Aujourd'hui</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-green-400 rounded-sm inline-block" /><span>Opérationnel</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-400 rounded-sm inline-block" /><span>Dégradé</span></div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded-sm inline-block" /><span>Incident</span></div>
              </div>
            </div>

            {/* Dernières erreurs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Dernières erreurs applicatives</h2>
              <div className="space-y-3">
                {errors.map((err, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${err.level === 'error' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold ${err.level === 'error' ? 'text-red-700' : 'text-amber-700'}`}>{err.level.toUpperCase()}</p>
                      <span className="text-xs text-gray-400 flex-shrink-0">{new Date(err.timestamp).toLocaleTimeString('fr-FR')}</span>
                    </div>
                    <p className="text-xs text-gray-700 mt-1 font-medium">{err.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{err.context}</p>
                  </div>
                ))}
              </div>
              <a href="/superadmin/logs" className="block text-center text-xs text-purple-700 font-semibold hover:underline mt-4">
                Voir tous les logs →
              </a>
            </div>
          </div>

        </main>
      </div>
    </>
  );
}
export { PlatformMonitoring };
