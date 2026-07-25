import React, { useState, useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmt(n, cur = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n || 0);
}

// ── Health badge ─────────────────────────────────────────────────────────────

const HEALTH_CONFIG = {
  on_track:  { label: 'En bonne voie', dot: 'bg-green-500', text: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  at_risk:   { label: 'À risque',       dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  off_track: { label: 'Hors piste',     dot: 'bg-red-500',   text: 'text-red-700 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-900/20'    },
};

function HealthDot({ health, size = 'sm' }) {
  const cfg  = HEALTH_CONFIG[health] || HEALTH_CONFIG.on_track;
  const sizeClass = size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5';
  return <span className={`inline-block ${sizeClass} rounded-full ${cfg.dot} flex-shrink-0`} title={cfg.label} />;
}

// ── Mini Gantt (4 semaines) ───────────────────────────────────────────────────

function MiniGantt({ project }) {
  const W = 160, H = 20;
  const today = new Date();
  const start = project.start_date ? new Date(project.start_date) : new Date(today.getFullYear(), today.getMonth(), 1);
  const end   = project.end_date   ? new Date(project.end_date)   : new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const totalMs = Math.max(1, end - start);

  // Fenêtre : 4 semaines depuis aujourd'hui
  const windowStart = new Date(today);
  const windowEnd   = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 28);

  const toX = (d) => ((d - windowStart) / (windowEnd - windowStart)) * W;

  const barStart = Math.max(0, toX(start));
  const barEnd   = Math.min(W, toX(end));
  const barW     = Math.max(4, barEnd - barStart);
  const todayX   = Math.max(0, Math.min(W, toX(today)));

  const barColor = project.health === 'off_track' ? '#EF4444' : project.health === 'at_risk' ? '#F59E0B' : '#3B82F6';

  return (
    <svg width={W} height={H} className="overflow-visible">
      {/* Fond */}
      <rect x={0} y={6} width={W} height={8} rx={4} fill="#E2E8F0" />
      {/* Barre projet */}
      {barStart < W && barEnd > 0 && (
        <rect x={barStart} y={6} width={barW} height={8} rx={4} fill={barColor} opacity={0.8} />
      )}
      {/* Progression */}
      {barStart < W && (
        <rect x={barStart} y={6} width={barW * (project.completion_percent / 100)} height={8} rx={4} fill={barColor} />
      )}
      {/* Aujourd'hui */}
      <line x1={todayX} y1={0} x2={todayX} y2={H} stroke="#1D4ED8" strokeWidth={1.5} strokeDasharray="3 2" />
    </svg>
  );
}

// ── Budget Bar ────────────────────────────────────────────────────────────────

function BudgetBar({ spent, planned, currency }) {
  if (!planned || planned === 0) return <span className="text-xs text-gray-400">Pas de budget</span>;
  const pct = Math.min(100, (spent / planned) * 100);
  const color = pct > 100 ? '#EF4444' : pct > 85 ? '#F59E0B' : '#22C55E';

  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{fmt(spent, currency)}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs text-gray-400">sur {fmt(planned, currency)}</p>
    </div>
  );
}

// ── Carte projet ──────────────────────────────────────────────────────────────

function ProjectCard({ project }) {
  const cfg = HEALTH_CONFIG[project.health] || HEALTH_CONFIG.on_track;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow overflow-hidden">
      {/* En-tête coloré */}
      <div className="h-1.5" style={{ backgroundColor: project.color || '#3B82F6' }} />

      <div className="p-5">
        {/* Titre + santé */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/projets/${project.id}`}
            className="text-base font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 truncate flex-1">
            {project.name}
          </Link>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
            <HealthDot health={project.health} />
            {cfg.label}
          </span>
        </div>

        {/* Client + Manager */}
        <div className="text-xs text-gray-500 space-y-0.5 mb-3">
          {project.client && <p>Client : <span className="font-medium">{project.client.name}</span></p>}
          {project.manager && <p>Manager : <span className="font-medium">{project.manager.name}</span></p>}
          <p>
            {fmtDate(project.start_date)} → {fmtDate(project.end_date)}
          </p>
        </div>

        {/* Progression tâches */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Tâches</span>
            <span>{project.completed_tasks_count || 0} / {project.tasks_count || 0}</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all bg-purple-500"
              style={{ width: `${project.completion_percent || 0}%` }} />
          </div>
        </div>

        {/* Budget */}
        <div className="mb-4">
          <BudgetBar
            spent={project.budget_spent} planned={project.budget_planned}
            currency={project.budget_currency || 'XOF'}
          />
        </div>

        {/* Mini Gantt */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-1">4 semaines</p>
          <MiniGantt project={project} />
        </div>

        {/* Liens */}
        <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
          <Link href={`/projets/${project.id}`}
            className="flex-1 text-center text-xs py-1.5 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300 transition-colors">
            Dashboard
          </Link>
          <Link href={`/projets/${project.id}/gantt`}
            className="flex-1 text-center text-xs py-1.5 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400 transition-colors">
            Gantt
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Ligne projet (vue liste) ──────────────────────────────────────────────────

function ProjectRow({ project }) {
  const cfg = HEALTH_CONFIG[project.health] || HEALTH_CONFIG.on_track;
  const pct = project.completion_percent || 0;

  return (
    <tr className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <HealthDot health={project.health} />
          <Link href={`/projets/${project.id}`}
            className="font-medium text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 text-sm">
            {project.name}
          </Link>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-gray-500">{project.client?.name || '—'}</td>
      <td className="py-3 px-4 text-sm text-gray-500">{project.manager?.name || '—'}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden max-w-24">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300 w-8">{pct}%</span>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-gray-500">{fmtDate(project.end_date)}</td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1">
          <Link href={`/projets/${project.id}`}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
            Dashboard
          </Link>
          <Link href={`/projets/${project.id}/gantt`}
            className="px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-100 dark:hover:bg-purple-800/50">
            Gantt
          </Link>
        </div>
      </td>
    </tr>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ProjectList() {
  const { projects } = usePage().props;

  const [viewMode, setViewMode]   = useState('cards'); // 'cards' | 'list'
  const [search, setSearch]       = useState('');
  const [filterHealth, setFilterHealth] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = useMemo(() => {
    return (projects || []).filter((p) => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.manager?.name?.toLowerCase().includes(search.toLowerCase());
      const matchHealth = filterHealth === 'all' || p.health === filterHealth;
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchSearch && matchHealth && matchStatus;
    });
  }, [projects, search, filterHealth, filterStatus]);

  const counts = useMemo(() => ({
    on_track:  (projects || []).filter((p) => p.health === 'on_track').length,
    at_risk:   (projects || []).filter((p) => p.health === 'at_risk').length,
    off_track: (projects || []).filter((p) => p.health === 'off_track').length,
  }), [projects]);

  return (
    <AppLayout>
      <Head title="Gestion de projets" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projets</h1>
            <p className="text-sm text-gray-500 mt-0.5">{(projects || []).length} projet(s) au total</p>
          </div>
          <Link href="/projets/creer"
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
            + Nouveau projet
          </Link>
        </div>

        {/* ── Résumé santé ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { key: 'on_track', label: 'En bonne voie', color: 'green' },
            { key: 'at_risk',  label: 'À risque',       color: 'amber' },
            { key: 'off_track',label: 'Hors piste',      color: 'red'   },
          ].map((item) => (
            <button key={item.key}
              onClick={() => setFilterHealth(filterHealth === item.key ? 'all' : item.key)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                filterHealth === item.key
                  ? `border-${item.color}-500 bg-${item.color}-50 dark:bg-${item.color}-900/20`
                  : 'border-transparent bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600'
              } shadow-sm`}>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{counts[item.key]}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <HealthDot health={item.key} />
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Filtres + Barre de recherche ── */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <input
            type="text" placeholder="Rechercher…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-56"
          />

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="paused">En pause</option>
            <option value="completed">Terminé</option>
            <option value="cancelled">Annulé</option>
          </select>

          <div className="ml-auto flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
            {[
              { key: 'cards', icon: '⊞' },
              { key: 'list',  icon: '≡' },
            ].map((v) => (
              <button key={v.key} onClick={() => setViewMode(v.key)}
                className={`px-3 py-2 transition-colors ${viewMode === v.key
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                {v.icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenu ── */}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📁</p>
            <p className="text-lg font-medium">Aucun projet trouvé</p>
            <p className="text-sm mt-1">Modifiez vos filtres ou créez un nouveau projet.</p>
          </div>
        )}

        {viewMode === 'cards' && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}

        {viewMode === 'list' && filtered.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {['Projet', 'Client', 'Manager', 'Progression', 'Échéance', 'Santé', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => <ProjectRow key={p.id} project={p} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
export { ProjectList };
