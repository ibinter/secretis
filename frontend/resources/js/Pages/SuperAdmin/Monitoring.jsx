/**
 * SuperAdmin/Monitoring.jsx — Supervision temps réel de la plateforme
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau (`/health/detailed` et
 * `/api/superadmin/monitoring/metrics` toutes les 30 s), mêmes états locaux.
 *
 * Corrections d'affichage :
 *   - imports `LineChart` / `Line` inutilisés supprimés ;
 *   - les tuiles KPI utilisaient des classes Tailwind construites
 *     dynamiquement (`text-${color}-600`) que le compilateur purge : la
 *     couleur ne s'affichait jamais. Remplacées par `StatCard` + tons
 *     sémantiques.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts';
import {
  Activity, Gauge, AlertTriangle, Layers, RefreshCw, X, ShieldCheck, Hourglass,
} from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, DataTable, EmptyState, Skeleton,
  cx, SURFACE, SURFACE_SUNK, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

const POLL_INTERVAL_MS = 30_000; // 30 secondes

/* ─── Sémantique d'état ────────────────────────────────────────────────────── */

const STATUS_META = {
  healthy:   { tone: 'success', label: 'Opérationnel' },
  degraded:  { tone: 'warning', label: 'Dégradé' },
  unhealthy: { tone: 'danger',  label: 'Hors service' },
  unknown:   { tone: 'neutral', label: 'Inconnu' },
};

const statusMeta = (s) => STATUS_META[s] ?? STATUS_META.unknown;

/* Axes et grilles neutres : lisibles en thème clair comme en thème sombre. */
const AXIS_COLOR = '#94A3B8';
const axisProps = {
  tick: { fontSize: 10, fill: AXIS_COLOR },
  tickLine: { stroke: AXIS_COLOR },
  axisLine: { stroke: AXIS_COLOR, strokeOpacity: 0.35 },
};

/* ─── Ligne de service ─────────────────────────────────────────────────────── */

function ServiceStatus({ name, status, latencyMs }) {
  const meta = statusMeta(status);
  return (
    <div className={cx('flex items-center justify-between gap-3 rounded-lg px-3 py-2.5', SURFACE_SUNK)}>
      <span className={cx('text-sm font-medium', TEXT_BODY)}>{name}</span>
      <div className="flex items-center gap-3">
        {latencyMs != null && (
          <span className={cx('text-xs', TEXT_MUTED, NUM)}>{latencyMs} ms</span>
        )}
        <Badge variant={meta.tone} dot>{meta.label}</Badge>
      </div>
    </div>
  );
}

/* ─── Détail d'erreur ──────────────────────────────────────────────────────── */

function ErrorDetailModal({ error, onClose }) {
  if (!error) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <div onClick={e => e.stopPropagation()} className="max-h-[85vh] w-full max-w-2xl overflow-y-auto">
        <Card
          padded={false}
          className="shadow-xl"
          title="Détail de l'erreur"
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
        >
          <div className="space-y-4 px-4 py-5 sm:px-6">
            {[
              ['Message', <span className="font-mono text-red-600 dark:text-red-400">{error.message}</span>],
              ['Route', error.route],
              ['Statut HTTP', <span className={cx('font-semibold', NUM)}>{error.status}</span>],
              ['Heure', error.time],
            ].map(([label, value]) => (
              <div key={label}>
                <p className={cx('text-xs font-medium uppercase tracking-wide', TEXT_MUTED)}>{label}</p>
                <p className={cx('mt-0.5 break-words text-sm', TEXT_BODY)}>{value}</p>
              </div>
            ))}

            {error.trace && (
              <div>
                <p className={cx('text-xs font-medium uppercase tracking-wide', TEXT_MUTED)}>Stack trace</p>
                <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-emerald-300">
                  {error.trace}
                </pre>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Page principale ──────────────────────────────────────────────────────── */

export default function Monitoring() {
  const [metrics, setMetrics]     = useState(null);
  const [health, setHealth]       = useState(null);
  const [timeline, setTimeline]   = useState([]);
  const [errors, setErrors]       = useState([]);
  const [slowRoutes, setSlowRoutes] = useState([]);
  const [trials, setTrials]       = useState([]);
  const [selectedError, setSelectedError] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

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
  const globalMeta   = statusMeta(globalStatus);
  const checks       = health?.checks ?? {};
  const detailed     = health?.detailed ?? {};

  const errorRate = parseFloat(metrics?.error_rate_pct);
  const queueSize = parseInt(metrics?.queue_pending, 10);

  const slowColumns = [
    { key: 'route', label: 'Route', className: cx('font-mono text-xs', TEXT_BODY) },
    {
      key: 'avg_ms',
      label: 'Moyenne',
      numeric: true,
      nowrap: true,
      render: (v) => (
        <span className={cx(
          'font-semibold',
          v > 1000 ? 'text-red-600 dark:text-red-400'
            : v > 500 ? 'text-amber-600 dark:text-amber-400'
            : 'text-emerald-600 dark:text-emerald-400',
        )}>
          {v} ms
        </span>
      ),
    },
    { key: 'total_calls', label: 'Appels', numeric: true, nowrap: true },
  ];

  return (
    <SuperAdminLayout title="Monitoring temps réel">
      <Head title="Monitoring — SECRETIS" />

      <PageHeader
        icon={Activity}
        title="Monitoring temps réel"
        subtitle={
          lastUpdate
            ? `Rafraîchissement toutes les 30 s · dernière mise à jour à ${lastUpdate}`
            : 'Rafraîchissement toutes les 30 secondes'
        }
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Monitoring' }]}
        meta={<Badge variant={globalMeta.tone} size="md" dot>{globalMeta.label}</Badge>}
        actions={
          <Button variant="secondary" icon={RefreshCw} onClick={fetchAll}>
            Actualiser
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Indicateurs ─────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Activity} tone="accent" label="Requêtes / min"
              value={metrics?.requests_per_minute ?? '—'}
            />
            <StatCard
              icon={Gauge} tone="info" label="Temps de réponse"
              value={metrics?.avg_response_ms ?? '—'} unit="ms"
            />
            <StatCard
              icon={AlertTriangle}
              tone={Number.isFinite(errorRate) && errorRate > 5 ? 'danger' : 'success'}
              label="Taux d'erreur"
              value={metrics?.error_rate_pct ?? '—'} unit="%"
            />
            <StatCard
              icon={Layers}
              tone={Number.isFinite(queueSize) && queueSize > 500 ? 'warning' : 'success'}
              label="Jobs en file"
              value={metrics?.queue_pending ?? '—'}
            />
          </section>

          {/* ── Timeline ────────────────────────────────────────────────────── */}
          <Card title="Activité des 60 dernières minutes" subtitle="Requêtes servies et erreurs rencontrées">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeline} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="monReqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#9333EA" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#9333EA" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="monErrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={AXIS_COLOR} strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="minute" {...axisProps} />
                  <YAxis {...axisProps} width={38} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(22,32,50,0.96)', border: '1px solid #1E3048',
                      borderRadius: 8, fontSize: 12, color: '#fff',
                    }}
                    labelStyle={{ color: '#94A3B8' }}
                    cursor={{ stroke: AXIS_COLOR, strokeOpacity: 0.3 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: AXIS_COLOR }} />
                  <Area type="monotone" dataKey="requests" stroke="#9333EA" fill="url(#monReqGrad)" name="Requêtes" strokeWidth={2} />
                  <Area type="monotone" dataKey="errors"   stroke="#EF4444" fill="url(#monErrGrad)" name="Erreurs"  strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState compact variant="no-data" title="Pas encore de données" description="La chronologie se remplit au fil des requêtes servies." />
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

            {/* ── Services ──────────────────────────────────────────────────── */}
            <Card title="État des services" icon={ShieldCheck}>
              <div className="space-y-2">
                <ServiceStatus name="Base de données"    status={checks.database?.status} latencyMs={checks.database?.latency_ms} />
                <ServiceStatus name="Redis"              status={checks.redis?.status}    latencyMs={checks.redis?.latency_ms} />
                <ServiceStatus name="Queue worker"       status={checks.queue?.status} />
                <ServiceStatus name="WebSocket (Reverb)" status={checks.reverb?.status} />
                <ServiceStatus name="Disque"             status={checks.disk?.status} />
              </div>

              {Object.keys(detailed).length > 0 && (
                <dl className={cx('mt-4 grid grid-cols-1 gap-x-6 gap-y-2 border-t pt-4 text-xs sm:grid-cols-2', BORDER, TEXT_MUTED)}>
                  {[
                    ['Organisations actives', detailed.active_organizations],
                    ['Mémoire PHP', `${detailed.memory_used_mb} Mo`],
                    ['PHP', detailed.php_version],
                    ['Laravel', detailed.laravel_version],
                    ['Taille base', `${detailed.database_size_mb} Mo`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <dt>{label}</dt>
                      <dd className={cx('font-medium', TEXT_TITLE, NUM)}>{value ?? '—'}</dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2">
                    <dt>Jobs échoués</dt>
                    <dd className={cx(
                      'font-medium', NUM,
                      detailed.failed_jobs_count > 0 ? 'text-red-600 dark:text-red-400' : TEXT_TITLE,
                    )}>
                      {detailed.failed_jobs_count ?? 0}
                    </dd>
                  </div>
                </dl>
              )}
            </Card>

            {/* ── Routes lentes ─────────────────────────────────────────────── */}
            <div className="space-y-3">
              <div>
                <h2 className={cx('text-base font-semibold', TEXT_TITLE)}>Routes les plus lentes</h2>
                <p className={cx('mt-0.5 text-sm', TEXT_MUTED)}>Cinq points de contention à surveiller en priorité.</p>
              </div>
              <DataTable
                columns={slowColumns}
                data={slowRoutes.slice(0, 5)}
                rowKey="route"
                compact
                pageSize={5}
                emptyMessage="Aucune mesure de latence disponible."
              />
            </div>
          </div>

          {/* ── Erreurs récentes ────────────────────────────────────────────── */}
          <Card
            title="Dernières erreurs"
            subtitle="Sélectionnez une ligne pour afficher la trace complète."
            icon={AlertTriangle}
          >
            {errors.length > 0 ? (
              <ul className="space-y-2">
                {errors.map((e, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setSelectedError(e)}
                      className={cx(
                        'w-full rounded-lg border border-red-200 p-3 text-left transition-colors',
                        'hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10',
                        FOCUS_RING,
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="truncate font-mono text-sm text-red-700 dark:text-red-300">{e.message}</span>
                        <span className={cx('whitespace-nowrap text-xs', TEXT_FAINT, NUM)}>{e.time}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={cx('text-xs', TEXT_MUTED)}>{e.route}</span>
                        <Badge variant="danger">HTTP {e.status}</Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={ShieldCheck}
                title="Aucune erreur récente"
                description="Aucune exception n'a été journalisée sur la période observée."
              />
            )}
          </Card>

          {/* ── Organisations en essai ──────────────────────────────────────── */}
          {trials.length > 0 && (
            <Card
              title="Organisations en période d'essai"
              subtitle={`${trials.length} organisation${trials.length > 1 ? 's' : ''} en cours d'évaluation`}
              icon={Hourglass}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {trials.map((org) => (
                  <div
                    key={org.id}
                    className={cx(SURFACE, 'rounded-lg border border-amber-200 p-3 dark:border-amber-500/30')}
                  >
                    <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{org.name}</p>
                    <p className={cx('mt-0.5 text-xs', TEXT_MUTED)}>
                      Expire le <span className={cx('font-medium', TEXT_BODY, NUM)}>{org.trial_ends_at}</span>
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      )}

      <ErrorDetailModal error={selectedError} onClose={() => setSelectedError(null)} />
    </SuperAdminLayout>
  );
}

export { Monitoring };
