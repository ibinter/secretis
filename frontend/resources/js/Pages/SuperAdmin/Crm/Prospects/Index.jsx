/**
 * SuperAdmin/Crm/Prospects/Index.jsx — Pipeline de prospection
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia (`prospects`, `kpi`),
 * mêmes états locaux (vue kanban/tableau, recherche, filtres),
 * mêmes destinations de navigation.
 *
 * Nettoyage sans effet fonctionnel : imports `axios` et `router` inutilisés
 * supprimés. Les boutons « Import » et « Export » n'ont toujours aucun
 * gestionnaire côté code : ils sont conservés tels quels et signalés dans le
 * rapport.
 */

import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import {
  Users, Plus, Search, Upload, Download, Eye, Calendar, Star,
  LayoutGrid, List,
} from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card, StatCard, DataTable, EmptyState,
  cx, SURFACE, BORDER, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Étapes du pipeline ───────────────────────────────────────────────────── */

const STAGES = [
  { key: 'new',             label: 'Nouveau',       dot: 'bg-gray-400' },
  { key: 'to_contact',      label: 'À contacter',   dot: 'bg-sky-400' },
  { key: 'contacted',       label: 'Contacté',      dot: 'bg-sky-500' },
  { key: 'qualified',       label: 'Qualifié',      dot: 'bg-purple-400' },
  { key: 'demo_scheduled',  label: 'Démo prévue',   dot: 'bg-amber-400' },
  { key: 'demo_done',       label: 'Démo réalisée', dot: 'bg-amber-500' },
  { key: 'offer_sent',      label: 'Offre envoyée', dot: 'bg-purple-500' },
  { key: 'negotiation',     label: 'Négociation',   dot: 'bg-purple-600' },
  { key: 'won',             label: 'Gagné',         dot: 'bg-emerald-500' },
  { key: 'lost',            label: 'Perdu',         dot: 'bg-red-500' },
  { key: 'to_retry',        label: 'À relancer',    dot: 'bg-gray-500' },
]

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */

const MOCK_PROSPECTS = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  first_name: ['Awa', 'Konan', 'Brice', 'Fatou', 'Jean-Marc', 'Aminata', 'David', 'Sylvie'][i % 8],
  last_name: ['Diallo', 'N\'Goran', 'Koffi', 'Touré', 'Ettien', 'Coulibaly', 'Mensah', 'Aka'][i % 8],
  company: ['MediaGroup CI', 'StartupHub BF', 'TechSN', 'Cabinet RH+', 'Agro Express', 'Banque Régionale', 'EduConnect', 'HealthTech'][i % 8],
  country: ['CI', 'BF', 'SN', 'CM', 'TG', 'ML', 'GN', 'BJ'][i % 8],
  software: ['SECRETIS', 'SECRETIS RH', 'SECRETIS Compta'][i % 3],
  source: ['inbound', 'referral', 'linkedin', 'event', 'cold'][i % 5],
  score: [85, 42, 70, 55, 90, 30, 65, 78][i % 8],
  stage: STAGES[i % STAGES.length].key,
  assigned_to: ['Kouassi A.', 'Diallo F.', null][i % 3],
  next_action: ['Appel de qualification', 'Envoi de démo', 'Relance email', null][i % 4],
  next_action_at: new Date(Date.now() + (i - 5) * 86400000).toISOString(),
  created_at: new Date(Date.now() - i * 86400000 * 3).toISOString(),
}))

const MOCK_KPI = { new_week: 7, in_progress: 24, demos_scheduled: 4, converted_month: 3 }

/* ─── Score ────────────────────────────────────────────────────────────────── */

function ScoreBar({ score }) {
  const bar = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <span className={cx('block h-full rounded-full', bar)} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
      </span>
      <span className={cx('text-xs font-medium', TEXT_MUTED, NUM)}>{score}</span>
    </span>
  )
}

/* ─── Vue kanban ───────────────────────────────────────────────────────────── */

function KanbanView({ prospects }) {
  const byStage = STAGES.reduce(
    (acc, s) => ({ ...acc, [s.key]: prospects.filter(p => p.stage === s.key) }),
    {},
  )

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-3">
        {STAGES.map(stage => (
          <div key={stage.key} className="w-60 shrink-0">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className={cx('h-2 w-2 rounded-full', stage.dot)} />
              <span className={cx('text-xs font-semibold', TEXT_TITLE)}>{stage.label}</span>
              <span className={cx('ml-auto text-xs', TEXT_FAINT, NUM)}>{byStage[stage.key]?.length ?? 0}</span>
            </div>

            <div className="space-y-2">
              {(byStage[stage.key] ?? []).map(p => (
                <Link
                  key={p.id}
                  href={`/superadmin/crm/prospects/${p.id}`}
                  className={cx(
                    SURFACE, 'group block rounded-xl border p-3 shadow-sm transition-colors', BORDER,
                    'hover:border-purple-300 dark:hover:border-purple-500/40', FOCUS_RING,
                  )}
                >
                  <p className={cx('text-xs font-semibold group-hover:text-purple-700 dark:group-hover:text-purple-300', TEXT_TITLE)}>
                    {p.first_name} {p.last_name}
                  </p>
                  <p className={cx('mt-0.5 truncate text-[11px]', TEXT_MUTED)}>{p.company} · {p.country}</p>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className={cx('truncate text-[11px]', TEXT_FAINT)}>{p.software}</span>
                    <ScoreBar score={p.score} />
                  </div>

                  {p.next_action && (
                    <p className="mt-1.5 truncate text-[11px] text-amber-600 dark:text-amber-400">
                      &rarr; {p.next_action}
                    </p>
                  )}
                </Link>
              ))}

              {(byStage[stage.key] ?? []).length === 0 && (
                <p className={cx('rounded-lg border border-dashed py-6 text-center text-[11px]', BORDER, TEXT_FAINT)}>
                  Aucun prospect
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function ProspectsIndex({ prospects: propProspects, kpi: propKpi }) {
  const prospects = propProspects ?? MOCK_PROSPECTS
  const kpi       = propKpi ?? MOCK_KPI

  const [view, setView]      = useState('kanban')
  const [search, setSearch]  = useState('')
  const [filterStage, setFS] = useState('')
  const [filterAgent, setFA] = useState('')

  const filtered = prospects.filter(p => {
    if (search && !`${p.first_name} ${p.last_name} ${p.company}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStage && p.stage !== filterStage) return false
    if (filterAgent && p.assigned_to !== filterAgent) return false
    return true
  })

  const isFiltered = Boolean(search || filterStage || filterAgent)
  const resetFilters = () => { setSearch(''); setFS(''); setFA('') }

  const agents = [...new Set(prospects.map(p => p.assigned_to).filter(Boolean))]

  /* ─── Colonnes du tableau ────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'last_name',
      label: 'Nom',
      nowrap: true,
      render: (_v, p) => (
        <span className={cx('font-medium', TEXT_TITLE)}>{p.first_name} {p.last_name}</span>
      ),
    },
    {
      key: 'company',
      label: 'Entreprise',
      render: (v) => <span className="block max-w-[160px] truncate">{v}</span>,
    },
    { key: 'country', label: 'Pays', nowrap: true, className: cx('font-mono text-xs', TEXT_MUTED) },
    { key: 'software', label: 'Logiciel', nowrap: true, className: cx('text-xs', TEXT_MUTED) },
    { key: 'source', label: 'Source', nowrap: true, render: (v) => <Badge variant="neutral">{v}</Badge> },
    { key: 'score', label: 'Score', width: '140px', render: (v) => <ScoreBar score={v} /> },
    {
      key: 'stage',
      label: 'Étape',
      nowrap: true,
      render: (v) => {
        const stage = STAGE_MAP[v]
        return (
          <span className={cx('inline-flex items-center gap-1.5 text-xs font-medium', TEXT_TITLE)}>
            <span className={cx('h-2 w-2 rounded-full', stage?.dot ?? 'bg-gray-400')} />
            {stage?.label ?? v}
          </span>
        )
      },
    },
    {
      key: 'assigned_to',
      label: 'Commercial',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED),
      render: (v) => v ?? <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'next_action',
      label: 'Prochaine action',
      render: (v) => (v
        ? <span className="block max-w-[180px] truncate text-xs text-amber-600 dark:text-amber-400">{v}</span>
        : <span className={TEXT_FAINT}>—</span>),
    },
  ]

  return (
    <SuperAdminLayout title="Prospects CRM">
      <Head title="Prospects — CRM Super Admin" />

      <PageHeader
        icon={Users}
        title="Prospects"
        subtitle="Pipeline de prospection commerciale de la plateforme."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'CRM' }, { label: 'Prospects' }]}
        actions={
          <>
            <Button variant="secondary" icon={Upload}>Import</Button>
            <Button variant="secondary" icon={Download}>Export</Button>
            <Button as={Link} href="/superadmin/crm/prospects/create" variant="primary" icon={Plus}>
              Nouveau prospect
            </Button>
          </>
        }
      />

      <div className="space-y-6">

        {/* ── Indicateurs ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Plus}     tone="accent"  label="Nouveaux cette semaine" value={kpi.new_week ?? 0} />
          <StatCard icon={Users}    tone="info"    label="En cours"               value={kpi.in_progress ?? 0} />
          <StatCard icon={Calendar} tone="warning" label="Démos planifiées"       value={kpi.demos_scheduled ?? 0} />
          <StatCard icon={Star}     tone="success" label="Convertis ce mois"      value={kpi.converted_month ?? 0} />
        </section>

        {/* ── Barre d'outils ──────────────────────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nom ou entreprise…"
                aria-label="Rechercher un prospect"
                className={cx(CONTROL, 'h-10 pl-9')}
              />
            </div>

            <select
              value={filterStage}
              onChange={e => setFS(e.target.value)}
              aria-label="Filtrer par étape"
              className={cx(CONTROL, 'h-10 w-auto min-w-[170px]')}
            >
              <option value="">Toutes les étapes</option>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>

            <select
              value={filterAgent}
              onChange={e => setFA(e.target.value)}
              aria-label="Filtrer par commercial"
              className={cx(CONTROL, 'h-10 w-auto min-w-[170px]')}
            >
              <option value="">Tous les commerciaux</option>
              {agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            {isFiltered && <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>}

            <div
              role="group"
              aria-label="Mode d'affichage"
              className={cx('ml-auto flex overflow-hidden rounded-lg border', BORDER)}
            >
              <button
                type="button"
                title="Vue kanban"
                aria-pressed={view === 'kanban'}
                onClick={() => setView('kanban')}
                className={cx(
                  'p-2.5 transition-colors',
                  view === 'kanban' ? 'bg-purple-600 text-white' : cx(TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                  FOCUS_RING,
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Vue tableau"
                aria-pressed={view === 'table'}
                onClick={() => setView('table')}
                className={cx(
                  'p-2.5 transition-colors',
                  view === 'table' ? 'bg-purple-600 text-white' : cx(TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                  FOCUS_RING,
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        {/* ── Contenu ─────────────────────────────────────────────────────── */}
        {view === 'kanban' ? (
          <KanbanView prospects={filtered} />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            rowKey="id"
            pageSize={25}
            actions={(p) => (
              <Button
                as={Link} href={`/superadmin/crm/prospects/${p.id}`}
                variant="ghost" size="sm" iconOnly icon={Eye}
                title="Voir la fiche prospect"
              />
            )}
            empty={
              isFiltered ? (
                <EmptyState
                  variant="no-results"
                  title="Aucun prospect ne correspond"
                  description="Aucun résultat pour cette recherche ou ces filtres."
                  action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
                />
              ) : (
                <EmptyState
                  icon={Users}
                  title="Aucun prospect"
                  description="Les prospects du pipeline commercial apparaîtront ici."
                />
              )
            }
          />
        )}

      </div>
    </SuperAdminLayout>
  )
}

export { ProspectsIndex };
