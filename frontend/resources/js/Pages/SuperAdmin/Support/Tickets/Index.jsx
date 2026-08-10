/**
 * SuperAdmin/Support/Tickets/Index.jsx — File de tickets support plateforme
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia (`tickets`, `sla`),
 * mêmes onglets, mêmes filtres locaux, mêmes liens de détail.
 *
 * Nettoyage sans effet fonctionnel : import `router` inutilisé supprimé.
 * Le helper `assignTicket` (POST …/assign) n'était appelé par aucun contrôle
 * de la page : il est conservé tel quel et signalé dans le rapport.
 */

import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import { Ticket, Search, Eye, Clock, AlertTriangle, CircleCheck } from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card, StatCard, DataTable, EmptyState,
  cx, SURFACE, BORDER, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */

const MOCK_TICKETS = Array.from({ length: 18 }, (_, i) => ({
  id: 1000 + i,
  org_name: ['Banque Nationale CI', 'Cabinet Konan', 'ONG Green Africa', 'Hôtel Ivoire', 'TechCorp Dakar'][i % 5],
  subject: ['Impossible de générer la paie', 'Erreur synchronisation IA', 'Module GED : upload bloqué', 'Question facturation', 'Accès utilisateur refusé', 'Rapport non généré', 'Bug affichage mobile', 'Problème MFA', 'Erreur import CSV', 'Lenteur dashboard'][i % 10],
  category: ['technique', 'facturation', 'fonctionnel', 'technique', 'accès'][i % 5],
  priority: ['critique', 'haute', 'normale', 'basse'][i % 4],
  status: ['open', 'pending', 'resolved', 'closed', 'overdue'][i % 5],
  agent: i % 3 === 0 ? null : ['Brice K.', 'Amenan D.'][i % 2],
  sla_hours: [2, 4, 8, 24, 48][i % 5],
  created_at: new Date(Date.now() - i * 3600000 * 4).toISOString(),
  sla_breach_at: new Date(Date.now() + (i % 5 === 4 ? -3600000 : i * 3600000)).toISOString(),
}))

const MOCK_SLA = { total: 18, ontime: 14, overdue: 4, pct: 78 }

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const PRIORITY_META = {
  critique: { label: 'Critique', tone: 'danger' },
  haute:    { label: 'Haute',    tone: 'warning' },
  normale:  { label: 'Normale',  tone: 'info' },
  basse:    { label: 'Basse',    tone: 'neutral' },
}

const STATUS_META = {
  open:     { label: 'Ouvert',     tone: 'info' },
  pending:  { label: 'En attente', tone: 'warning' },
  resolved: { label: 'Résolu',     tone: 'success' },
  closed:   { label: 'Fermé',      tone: 'neutral' },
  overdue:  { label: 'En retard',  tone: 'danger' },
}

const TABS_DEF = [
  { key: 'all',        label: 'Tous' },
  { key: 'unassigned', label: 'Non assignés' },
  { key: 'open',       label: 'Ouverts' },
  { key: 'overdue',    label: 'En retard SLA' },
  { key: 'resolved',   label: 'Résolus' },
]

const tabMatches = (key, t) => {
  if (key === 'all')        return true
  if (key === 'unassigned') return !t.agent
  if (key === 'overdue')    return t.status === 'overdue'
  if (key === 'resolved')   return ['resolved', 'closed'].includes(t.status)
  return t.status === key
}

/* ─── Compte à rebours SLA ─────────────────────────────────────────────────── */

function SlaTimer({ breachAt }) {
  const remaining = new Date(breachAt) - Date.now()
  const overdue   = remaining < 0
  const hrs       = Math.abs(Math.floor(remaining / 3600000))
  const mins      = Math.abs(Math.floor((remaining % 3600000) / 60000))

  return (
    <span
      className={cx(
        'text-xs font-medium', NUM,
        overdue
          ? 'text-red-600 dark:text-red-400'
          : hrs < 2
            ? 'text-amber-600 dark:text-amber-400'
            : TEXT_MUTED,
      )}
    >
      {overdue ? '−' : ''}{hrs} h {String(mins).padStart(2, '0')}
    </span>
  )
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function TicketsIndex({ tickets: propTickets, sla: propSla }) {
  const allTickets = propTickets ?? MOCK_TICKETS
  const sla        = propSla ?? MOCK_SLA

  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch]       = useState('')
  const [filterPriority, setFP]   = useState('')
  const [filterStatus, setFS]     = useState('')
  const [filterAgent, setFA]      = useState('')

  const fmtDate = d =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const filtered = allTickets.filter(t => {
    if (!tabMatches(activeTab, t)) return false
    if (search
      && !t.subject.toLowerCase().includes(search.toLowerCase())
      && !t.org_name.toLowerCase().includes(search.toLowerCase())) return false
    if (filterPriority && t.priority !== filterPriority) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterAgent === '__unassigned' && t.agent) return false
    if (filterAgent && filterAgent !== '__unassigned' && t.agent !== filterAgent) return false
    return true
  })

  // Conservé à l'identique : aucun contrôle de la page ne l'appelle aujourd'hui.
  const assignTicket = async (ticketId, agent) => {
    try { await axios.post(`/superadmin/support/tickets/${ticketId}/assign`, { agent }) } catch { /* silencieux */ }
  }
  void assignTicket

  const isFiltered = Boolean(search || filterPriority || filterStatus || filterAgent)
  const resetFilters = () => { setSearch(''); setFP(''); setFS(''); setFA('') }

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'id',
      label: 'N°',
      width: '90px',
      nowrap: true,
      render: (v) => <span className={cx('font-mono text-xs', TEXT_FAINT)}>#{v}</span>,
    },
    {
      key: 'org_name',
      label: 'Organisation',
      render: (v) => <span className={cx('block max-w-[160px] truncate font-medium', TEXT_TITLE)}>{v}</span>,
    },
    {
      key: 'subject',
      label: 'Sujet',
      render: (v, t) => (
        <Link
          href={`/superadmin/support/tickets/${t.id}`}
          className={cx('block max-w-[260px] truncate rounded text-purple-700 hover:underline dark:text-purple-300', FOCUS_RING)}
        >
          {v}
        </Link>
      ),
    },
    { key: 'category', label: 'Catégorie', nowrap: true, className: cx('text-xs', TEXT_MUTED) },
    {
      key: 'priority',
      label: 'Priorité',
      nowrap: true,
      render: (v) => {
        const meta = PRIORITY_META[v] ?? { label: v, tone: 'neutral' }
        return <Badge variant={meta.tone} dot>{meta.label}</Badge>
      },
    },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => {
        const meta = STATUS_META[v] ?? { label: v, tone: 'neutral' }
        return <Badge variant={meta.tone} dot>{meta.label}</Badge>
      },
    },
    {
      key: 'agent',
      label: 'Agent',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED),
      render: (v) => v ?? <Badge variant="danger">Non assigné</Badge>,
    },
    {
      key: 'sla_breach_at',
      label: 'SLA restant',
      align: 'right',
      nowrap: true,
      render: (v) => <SlaTimer breachAt={v} />,
    },
    {
      key: 'created_at',
      label: 'Créé le',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED, NUM),
      render: (v) => fmtDate(v),
    },
  ]

  return (
    <SuperAdminLayout title="Tickets support">
      <Head title="Tickets — Support Super Admin" />

      <PageHeader
        icon={Ticket}
        title="Tickets support"
        subtitle="File de traitement des demandes clientes et respect des engagements de service."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Support' }, { label: 'Tickets' }]}
        tabs={
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Filtrer les tickets">
            {TABS_DEF.map(t => {
              const count = allTickets.filter(tk => tabMatches(t.key, tk)).length
              const active = activeTab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setActiveTab(t.key)}
                  className={cx(
                    'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300'
                      : cx('border-transparent', TEXT_MUTED, 'hover:text-gray-700 dark:hover:text-gray-200'),
                    FOCUS_RING,
                  )}
                >
                  {t.label}
                  <Badge variant={active ? 'accent' : 'neutral'}>{count}</Badge>
                </button>
              )
            })}
          </nav>
        }
      />

      <div className="space-y-6">

        {/* ── Engagements de service ──────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Ticket} tone="accent" label="Total tickets" value={sla.total ?? 0} />
          <StatCard icon={CircleCheck} tone="success" label="Dans les délais" value={sla.ontime ?? 0} />
          <StatCard
            icon={AlertTriangle}
            tone={(sla.overdue ?? 0) > 0 ? 'danger' : 'success'}
            label="SLA dépassé"
            value={sla.overdue ?? 0}
          />
          <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-4 shadow-sm')}>
            <div className="flex items-start justify-between gap-3">
              <p className={cx('text-xs font-medium uppercase tracking-wide', TEXT_MUTED)}>Taux de respect SLA</p>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </span>
            </div>
            <p className={cx('mt-2 text-2xl font-semibold tracking-tight', TEXT_TITLE, NUM)}>
              {sla.pct ?? 0} %
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-white/10">
              <div
                className={cx(
                  'h-2 rounded-full transition-all',
                  (sla.pct ?? 0) >= 90 ? 'bg-emerald-500' : (sla.pct ?? 0) >= 70 ? 'bg-amber-500' : 'bg-red-500',
                )}
                style={{ width: `${Math.min(100, Math.max(0, sla.pct ?? 0))}%` }}
              />
            </div>
          </div>
        </section>

        {/* ── Filtres ─────────────────────────────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Sujet ou organisation…"
                aria-label="Rechercher un ticket"
                className={cx(CONTROL, 'h-10 pl-9')}
              />
            </div>

            <select
              value={filterPriority}
              onChange={e => setFP(e.target.value)}
              aria-label="Filtrer par priorité"
              className={cx(CONTROL, 'h-10 w-auto min-w-[170px]')}
            >
              <option value="">Toutes les priorités</option>
              <option value="critique">Critique</option>
              <option value="haute">Haute</option>
              <option value="normale">Normale</option>
              <option value="basse">Basse</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFS(e.target.value)}
              aria-label="Filtrer par statut"
              className={cx(CONTROL, 'h-10 w-auto min-w-[160px]')}
            >
              <option value="">Tous les statuts</option>
              <option value="open">Ouvert</option>
              <option value="pending">En attente</option>
              <option value="overdue">En retard</option>
              <option value="resolved">Résolu</option>
            </select>

            <select
              value={filterAgent}
              onChange={e => setFA(e.target.value)}
              aria-label="Filtrer par agent"
              className={cx(CONTROL, 'h-10 w-auto min-w-[170px]')}
            >
              <option value="">Tous les agents</option>
              <option value="__unassigned">Non assignés</option>
              {[...new Set(allTickets.map(t => t.agent).filter(Boolean))].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {isFiltered && (
              <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
            )}
          </div>
        </Card>

        {/* ── Tableau ─────────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={filtered}
          rowKey="id"
          pageSize={25}
          actions={(t) => (
            <Button
              as={Link} href={`/superadmin/support/tickets/${t.id}`}
              variant="ghost" size="sm" iconOnly icon={Eye}
              title="Ouvrir le ticket"
            />
          )}
          empty={
            isFiltered || activeTab !== 'all' ? (
              <EmptyState
                variant="no-results"
                title="Aucun ticket correspondant"
                description="Aucun ticket ne correspond à cet onglet ou à ces filtres."
                action={<Button variant="secondary" onClick={() => { resetFilters(); setActiveTab('all') }}>Tout afficher</Button>}
              />
            ) : (
              <EmptyState
                icon={Ticket}
                title="Aucun ticket"
                description="Les demandes d'assistance des organisations clientes apparaîtront ici."
              />
            )
          }
        />

      </div>
    </SuperAdminLayout>
  )
}

export { TicketsIndex };
