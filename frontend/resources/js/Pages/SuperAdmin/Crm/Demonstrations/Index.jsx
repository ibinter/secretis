/**
 * SuperAdmin/Crm/Demonstrations/Index.jsx — Démonstrations produit
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : même appel réseau
 * (`POST /superadmin/crm/demonstrations/{id}/send-reminder`),
 * mêmes états locaux (vue calendrier/liste, filtre de statut),
 * mêmes destinations de navigation.
 *
 * Nettoyage sans effet fonctionnel : import `router` inutilisé supprimé.
 */

import React, { useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import axios from 'axios'
import {
  Presentation, Plus, CalendarDays, List, Video, MapPin, Mail, Check, ExternalLink,
} from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card, DataTable, EmptyState,
  cx, SURFACE, BORDER, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const STATUS_META = {
  requested: { label: 'Demandée',  tone: 'neutral' },
  scheduled: { label: 'Planifiée', tone: 'info' },
  confirmed: { label: 'Confirmée', tone: 'accent' },
  done:      { label: 'Réalisée',  tone: 'success' },
  cancelled: { label: 'Annulée',   tone: 'danger' },
}

const MOCK_DEMOS = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  prospect_name: ['Awa Diallo', 'Konan N\'Goran', 'Brice Koffi', 'Fatou Touré', 'David Mensah'][i % 5],
  prospect_id: i + 1,
  company: ['MediaGroup CI', 'StartupHub BF', 'TechSN', 'Cabinet RH+', 'EduConnect'][i % 5],
  software: ['SECRETIS', 'SECRETIS RH', 'SECRETIS Compta'][i % 3],
  agent: ['Kouassi A.', 'Diallo F.'][i % 2],
  status: ['requested', 'scheduled', 'confirmed', 'done', 'cancelled'][i % 5],
  scheduled_at: new Date(Date.now() + (i - 3) * 86400000 * 2).toISOString(),
  timezone: 'Africa/Abidjan',
  mode: ['visio', 'presentiel'][i % 2],
  link: i % 2 === 0 ? 'https://meet.google.com/abc-def-ghi' : null,
  duration_min: 60,
}))

const ModeIcon = ({ mode, className }) =>
  mode === 'visio'
    ? <Video className={className} aria-hidden="true" />
    : <MapPin className={className} aria-hidden="true" />

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function DemonstrationsIndex({ demos: propDemos }) {
  const demos = propDemos ?? MOCK_DEMOS

  const [view, setView]       = useState('list')
  const [filterStatus, setFS] = useState('')

  const fmtDateTime = d =>
    new Date(d).toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  const sendReminder = async (id) => {
    try {
      await axios.post(`/superadmin/crm/demonstrations/${id}/send-reminder`)
      alert('Rappel envoyé.')
    } catch {
      alert('Erreur')
    }
  }

  const filtered = demos.filter(d => !filterStatus || d.status === filterStatus)

  /* ─── Vue calendrier (regroupement par jour) ─────────────────────────────── */

  const CalendarView = () => {
    const days = {}
    filtered.forEach(d => {
      const key = new Date(d.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
      if (!days[key]) days[key] = []
      days[key].push(d)
    })

    if (Object.keys(days).length === 0) {
      return (
        <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl shadow-sm')}>
          <EmptyState
            icon={CalendarDays}
            title="Aucune démonstration planifiée"
            description="Les démonstrations produit programmées apparaîtront ici."
          />
        </div>
      )
    }

    return (
      <div className="space-y-5">
        {Object.entries(days).map(([day, items]) => (
          <section key={day}>
            <h3 className={cx('mb-2 text-xs font-semibold uppercase tracking-wider', TEXT_MUTED)}>{day}</h3>
            <div className="space-y-2">
              {items.map(d => {
                const meta = STATUS_META[d.status] ?? { label: d.status, tone: 'neutral' }
                return (
                  <div
                    key={d.id}
                    className={cx(SURFACE, 'flex flex-wrap items-center gap-4 rounded-xl border p-4 shadow-sm', BORDER)}
                  >
                    <div className="w-16 shrink-0 text-center">
                      <p className={cx('text-lg font-semibold text-purple-700 dark:text-purple-300', NUM)}>
                        {new Date(d.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className={cx('text-xs', TEXT_FAINT, NUM)}>{d.duration_min} min</p>
                    </div>

                    <span className="h-10 w-px shrink-0 bg-gray-200 dark:bg-[#1E3048]" />

                    <div className="min-w-0 flex-1">
                      <p className={cx('font-medium', TEXT_TITLE)}>{d.prospect_name}</p>
                      <p className={cx('text-xs', TEXT_MUTED)}>{d.company} · {d.software}</p>
                    </div>

                    <Badge variant={meta.tone} dot>{meta.label}</Badge>

                    <span className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
                      <ModeIcon mode={d.mode} className="h-3.5 w-3.5" />
                      {d.mode === 'visio' ? 'Visioconférence' : 'Présentiel'}
                    </span>

                    {d.link && (
                      <a
                        href={d.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cx('inline-flex items-center gap-1 rounded text-xs text-purple-700 hover:underline dark:text-purple-300', FOCUS_RING)}
                      >
                        Rejoindre <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    )
  }

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'prospect_name',
      label: 'Prospect',
      render: (v, d) => (
        <Link
          href={`/superadmin/crm/prospects/${d.prospect_id}`}
          className={cx('rounded font-medium text-purple-700 hover:underline dark:text-purple-300', FOCUS_RING)}
        >
          {v}
        </Link>
      ),
    },
    { key: 'company', label: 'Entreprise', className: cx('text-xs', TEXT_MUTED) },
    { key: 'software', label: 'Logiciel', nowrap: true, className: cx('text-xs', TEXT_MUTED) },
    { key: 'agent', label: 'Agent', nowrap: true, className: cx('text-xs', TEXT_MUTED) },
    {
      key: 'scheduled_at',
      label: 'Date et heure',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED, NUM),
      render: (v) => fmtDateTime(v),
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
      key: 'mode',
      label: 'Mode',
      nowrap: true,
      render: (v) => (
        <span className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
          <ModeIcon mode={v} className="h-3.5 w-3.5" />
          {v === 'visio' ? 'Visioconférence' : 'Présentiel'}
        </span>
      ),
    },
  ]

  return (
    <SuperAdminLayout title="Démonstrations">
      <Head title="Démonstrations — CRM Super Admin" />

      <PageHeader
        icon={Presentation}
        title="Démonstrations"
        subtitle={`${demos.length} démonstration${demos.length > 1 ? 's' : ''} au total`}
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'CRM' }, { label: 'Démonstrations' }]}
        actions={
          <Button as={Link} href="/superadmin/crm/demonstrations/create" variant="primary" icon={Plus}>
            Planifier une démo
          </Button>
        }
      />

      <div className="space-y-6">

        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterStatus}
              onChange={e => setFS(e.target.value)}
              aria-label="Filtrer par statut"
              className={cx(CONTROL, 'h-10 w-auto min-w-[180px]')}
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>

            {filterStatus && <Button variant="ghost" onClick={() => setFS('')}>Réinitialiser</Button>}

            <div
              role="group"
              aria-label="Mode d'affichage"
              className={cx('ml-auto flex overflow-hidden rounded-lg border', BORDER)}
            >
              <button
                type="button"
                aria-pressed={view === 'calendar'}
                onClick={() => setView('calendar')}
                className={cx(
                  'inline-flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors',
                  view === 'calendar' ? 'bg-purple-600 text-white' : cx(TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                  FOCUS_RING,
                )}
              >
                <CalendarDays className="h-4 w-4" /> Calendrier
              </button>
              <button
                type="button"
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
                className={cx(
                  'inline-flex items-center gap-1.5 px-3 py-2.5 text-sm transition-colors',
                  view === 'list' ? 'bg-purple-600 text-white' : cx(TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                  FOCUS_RING,
                )}
              >
                <List className="h-4 w-4" /> Liste
              </button>
            </div>
          </div>
        </Card>

        {view === 'calendar' ? (
          <CalendarView />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            rowKey="id"
            pageSize={25}
            actions={(d) => (
              <>
                <Button
                  variant="ghost" size="sm" iconOnly icon={Mail}
                  title="Envoyer un rappel"
                  onClick={() => sendReminder(d.id)}
                />
                {d.link && (
                  <Button
                    as="a" href={d.link} target="_blank" rel="noopener noreferrer"
                    variant="ghost" size="sm" iconOnly icon={ExternalLink}
                    title="Ouvrir le lien de visioconférence"
                  />
                )}
                <Button
                  as={Link} href={`/superadmin/crm/demonstrations/${d.id}/notes`}
                  variant="ghost" size="sm" iconOnly icon={Check}
                  title="Compte rendu de la démonstration"
                />
              </>
            )}
            empty={
              filterStatus ? (
                <EmptyState
                  variant="no-results"
                  title="Aucune démonstration"
                  description="Aucune démonstration ne correspond à ce statut."
                  action={<Button variant="secondary" onClick={() => setFS('')}>Réinitialiser le filtre</Button>}
                />
              ) : (
                <EmptyState
                  icon={Presentation}
                  title="Aucune démonstration"
                  description="Les démonstrations produit programmées avec les prospects apparaîtront ici."
                />
              )
            }
          />
        )}

      </div>
    </SuperAdminLayout>
  )
}

export { DemonstrationsIndex };
