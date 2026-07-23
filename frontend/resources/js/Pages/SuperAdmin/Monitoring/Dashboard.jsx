import React, { useState, useEffect, useCallback } from 'react'
import { Head } from '@inertiajs/react'
import {
  Database, Cpu, HardDrive, Mail, Brain, Radio, Layers,
  RefreshCw, CheckCircle, AlertTriangle, XCircle, PlayCircle,
  Calendar, Clock, Save, Activity,
} from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────────────────────

const POLL_MS = 30_000

const SERVICE_META = {
  database: { label: 'Base de données', icon: Database },
  redis:    { label: 'Redis',           icon: Cpu },
  queue:    { label: 'Queue Worker',    icon: Layers },
  storage:  { label: 'Stockage',        icon: HardDrive },
  smtp:     { label: 'SMTP / Emails',   icon: Mail },
  ai_sara:  { label: 'IA SARA',         icon: Brain },
  reverb:   { label: 'WebSocket Reverb',icon: Radio },
}

const STATUS_STYLE = {
  ok:       { label: 'Opérationnel', icon: CheckCircle,  color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-950/20',  border: 'border-green-200 dark:border-green-900' },
  degraded: { label: 'Dégradé',      icon: AlertTriangle,color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20',border: 'border-orange-200 dark:border-orange-900' },
  down:     { label: 'Hors service', icon: XCircle,      color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-950/20',      border: 'border-red-200 dark:border-red-900' },
  unknown:  { label: 'Inconnu',      icon: Activity,     color: 'text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-800',        border: 'border-gray-200 dark:border-gray-700' },
}

// ── Composants ────────────────────────────────────────────────────────────────

function GlobalBanner({ status }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.unknown
  const Icon  = style.icon
  const text  = {
    ok:      'Tous les services fonctionnent normalement.',
    degraded:'Certains services rencontrent des problèmes. Voir les détails ci-dessous.',
    down:    'Des services critiques sont hors ligne. Intervention requise.',
    unknown: 'Statut des services en cours de vérification…',
  }[status] ?? ''

  return (
    <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${style.bg} ${style.border}`}>
      <Icon size={20} className={style.color} />
      <div>
        <span className={`font-semibold text-sm ${style.color}`}>{style.label}</span>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{text}</p>
      </div>
    </div>
  )
}

function ServiceCard({ serviceKey, data }) {
  const meta  = SERVICE_META[serviceKey] ?? { label: serviceKey, icon: Activity }
  const style = STATUS_STYLE[data?.status] ?? STATUS_STYLE.unknown
  const Icon  = meta.icon
  const StatusIcon = style.icon

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-2 ${style.bg} ${style.border}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className={style.color} />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{meta.label}</span>
        </div>
        <StatusIcon size={16} className={style.color} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{data?.message ?? '—'}</p>
      {data?.latency_ms != null && (
        <span className="text-xs font-mono text-gray-400">{data.latency_ms} ms</span>
      )}
    </div>
  )
}

function MetricCard({ label, value, unit = '', icon: Icon, warn = false, danger = false }) {
  const color = danger ? 'text-red-500' : warn ? 'text-orange-500' : 'text-[#1A3A5C] dark:text-blue-300'
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {Icon && <Icon size={13} />}
        {label}
      </div>
      <div className="flex items-end gap-1 mt-1">
        <span className={`text-3xl font-bold tabular-nums ${color}`}>{value ?? '—'}</span>
        {unit && <span className="text-sm text-gray-400 mb-1">{unit}</span>}
      </div>
    </div>
  )
}

function DiskBar({ pct }) {
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-orange-400' : 'bg-green-500'
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <HardDrive size={13} /> Espace disque
        </div>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function FailedJobRow({ job, onRetry }) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-xl border border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-950/10">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{job.payload}</p>
        <p className="text-xs text-red-600 dark:text-red-400 truncate mt-0.5">{job.exception}</p>
        <p className="text-xs text-gray-400 mt-1">{job.queue} · {job.failed_at}</p>
      </div>
      <button
        onClick={() => onRetry(job.id)}
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
      >
        <PlayCircle size={13} /> Rejouer
      </button>
    </div>
  )
}

function CronRow({ task }) {
  const style = STATUS_STYLE[task.status] ?? STATUS_STYLE.unknown
  const StatusIcon = style.icon
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-3">
        <StatusIcon size={14} className={style.color} />
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{task.name}</p>
          <p className="text-xs text-gray-400">{task.schedule}</p>
        </div>
      </div>
      <span className="text-xs text-gray-400">
        {task.last_run ? `Dernière : ${task.last_run}` : 'Jamais exécuté'}
      </span>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function MonitoringDashboard({
  initialHealth,
  failedJobs:     initialFailed    = [],
  cronStatus:     initialCron      = [],
  backupStatus:   initialBackup    = {},
}) {
  const [health,      setHealth]      = useState(initialHealth)
  const [failedJobs,  setFailedJobs]  = useState(initialFailed)
  const [cronStatus,  setCronStatus]  = useState(initialCron)
  const [backupStatus,setBackupStatus]= useState(initialBackup)
  const [loading,     setLoading]     = useState(false)
  const [lastUpdate,  setLastUpdate]  = useState(null)

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true)
      const [healthRes, detailRes] = await Promise.all([
        fetch('/api/v1/superadmin/health',              { headers: { Accept: 'application/json' } }),
        fetch('/api/v1/superadmin/monitoring/details',  { headers: { Accept: 'application/json' } }),
      ])
      if (healthRes.ok)  setHealth(await healthRes.json())
      if (detailRes.ok) {
        const d = await detailRes.json()
        if (d.failed_jobs)   setFailedJobs(d.failed_jobs)
        if (d.cron_status)   setCronStatus(d.cron_status)
        if (d.backup_status) setBackupStatus(d.backup_status)
      }
      setLastUpdate(new Date().toLocaleTimeString('fr-FR'))
    } catch (err) {
      console.warn('Monitoring fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(fetchHealth, POLL_MS)
    return () => clearInterval(id)
  }, [fetchHealth])

  const retryJob = async (id) => {
    try {
      await fetch(`/api/v1/superadmin/jobs/${id}/retry`, { method: 'POST', headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' } })
      fetchHealth()
    } catch {}
  }

  const triggerBackup = async () => {
    try {
      await fetch('/api/v1/superadmin/backup/trigger', { method: 'POST', headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '' } })
      alert('Sauvegarde déclenchée. Elle apparaîtra dans quelques instants.')
    } catch {}
  }

  const services = health?.services ?? {}
  const metrics  = health?.metrics  ?? {}
  const status   = health?.status   ?? 'unknown'

  return (
    <>
      <Head title="Monitoring — SECRETIS SuperAdmin" />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 space-y-6">

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Monitoring système</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Actualisation auto toutes les 30 s
              {lastUpdate && ` · Mise à jour : ${lastUpdate}`}
            </p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-[#1A3A5C] text-white hover:bg-[#162f4a] disabled:opacity-50 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>

        {/* ── Bannière statut global ───────────────────────────────────────── */}
        <GlobalBanner status={status} />

        {/* ── Services (7 cards) ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(SERVICE_META).map(([key]) => (
            <ServiceCard key={key} serviceKey={key} data={services[key]} />
          ))}
        </div>

        {/* ── Métriques ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <DiskBar pct={metrics.disk_usage_percent ?? 0} />
          <MetricCard
            label="Jobs échoués 24h"
            value={metrics.failed_jobs_24h}
            icon={AlertTriangle}
            warn={metrics.failed_jobs_24h > 0}
            danger={metrics.failed_jobs_24h > 10}
          />
          <MetricCard
            label="Queue en attente"
            value={metrics.queue_size}
            icon={Layers}
            warn={metrics.queue_size > 100}
            danger={metrics.queue_size > 500}
          />
          <MetricCard
            label="Temps de réponse"
            value={metrics.response_time_ms}
            unit="ms"
            icon={Activity}
            warn={metrics.response_time_ms > 500}
            danger={metrics.response_time_ms > 1000}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Jobs échoués ─────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <AlertTriangle size={16} className="text-orange-500" />
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Jobs échoués</h2>
              {failedJobs.length > 0 && (
                <span className="ml-auto text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {failedJobs.length}
                </span>
              )}
            </div>
            <div className="p-4 space-y-2 max-h-72 overflow-y-auto">
              {failedJobs.length === 0 && (
                <p className="text-sm text-green-600 dark:text-green-400 text-center py-6">
                  Aucun job échoué.
                </p>
              )}
              {failedJobs.map(job => (
                <FailedJobRow key={job.id} job={job} onRetry={retryJob} />
              ))}
            </div>
          </div>

          {/* ── Tâches CRON ─────────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <Calendar size={16} className="text-[#1A3A5C] dark:text-blue-400" />
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Tâches planifiées</h2>
            </div>
            <div className="px-5 py-1">
              {cronStatus.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">Aucune tâche CRON configurée.</p>
              )}
              {cronStatus.map((task, i) => (
                <CronRow key={i} task={task} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Sauvegardes ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Save size={16} className="text-[#1A3A5C] dark:text-blue-400" />
              <h2 className="font-semibold text-gray-800 dark:text-white text-sm">Sauvegardes</h2>
            </div>
            <button
              onClick={triggerBackup}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <Save size={12} /> Déclencher maintenant
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              ['Dernière sauvegarde', backupStatus.last_backup_at ?? 'Jamais'],
              ['Statut',             backupStatus.status ?? '—'],
              ['Taille',             backupStatus.size_mb ? `${backupStatus.size_mb} Mo` : '—'],
              ['Destination',        backupStatus.location ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
                <p className="font-medium text-gray-700 dark:text-gray-200 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
