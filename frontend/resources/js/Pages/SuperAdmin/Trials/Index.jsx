/**
 * SuperAdmin/Trials/Index.jsx — Organisations en période d'essai
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`POST /superadmin/organisations/{id}/extend-trial`,
 *  `POST /superadmin/organisations/{id}/send-trial-reminder`),
 * mêmes états locaux, mêmes destinations de navigation.
 */

import React, { useState } from 'react'
import { Head, router, Link } from '@inertiajs/react'
import axios from 'axios'
import {
  Hourglass, TrendingUp, CircleCheck, CircleX, Mail, CalendarPlus, ArrowRight, X, User,
} from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card, StatCard, DataTable, EmptyState,
  cx, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI'

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */

const MOCK_TRIALS = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  org_name: ['MediaGroup CI', 'StartupTech BF', 'École Numérique SN', 'Clinique Santé Plus', 'Immobilier Pro', 'Transport & Co', 'Agro Ivoire', 'Cabinet RH Expert', 'E-Commerce Dakar', 'Association Femmes Leaders', 'Assurances Continentales', 'Bureau d\'Études GéoCi'][i],
  org_id: 100 + i,
  country: ['CI', 'BF', 'SN', 'CM', 'TG', 'ML', 'CI', 'SN', 'SN', 'CI', 'BJ', 'CI'][i],
  admin_email: `admin${i}@trial.org`,
  trial_start: new Date(Date.now() - (14 - i) * 86400000).toISOString(),
  trial_end: new Date(Date.now() + i * 86400000 * 2).toISOString(),
  logins_count: [3, 12, 1, 25, 8, 4, 30, 7, 2, 15, 9, 6][i],
  plan: ['Starter', 'Pro', 'Enterprise'][i % 3],
  assigned_to: ['Kouassi A.', 'Diallo F.', null][i % 3],
}))

const MOCK_KPI = { active: 12, expiring_week: 4, conversion_rate: 68, avg_days: 11.3 }

const PLAN_TONE = { Enterprise: 'accent', Pro: 'info', Starter: 'neutral' }

/* ─── Jauge de progression de l'essai ──────────────────────────────────────── */

function DaysBar({ trialStart, trialEnd, total = 14 }) {
  const now   = Date.now()
  const start = new Date(trialStart).getTime()
  const end   = new Date(trialEnd).getTime()
  const elapsed   = Math.max(0, Math.min(total, Math.round((now - start) / 86400000)))
  const remaining = Math.max(0, Math.round((end - now) / 86400000))
  const pct   = Math.min(100, Math.round((elapsed / total) * 100))
  const bar   = remaining <= 2 ? 'bg-red-500' : remaining <= 5 ? 'bg-amber-500' : 'bg-purple-600'
  const label = remaining <= 2
    ? 'text-red-600 dark:text-red-400'
    : remaining <= 5
      ? 'text-amber-600 dark:text-amber-400'
      : TEXT_MUTED

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
        <div className={cx('h-full rounded-full transition-all', bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cx('text-xs font-medium', NUM, label)}>{remaining} j</span>
    </div>
  )
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function TrialsIndex({ trials: propTrials, kpi: propKpi }) {
  const trials = propTrials ?? MOCK_TRIALS
  const kpi    = propKpi ?? MOCK_KPI

  const [extending, setExtending] = useState(null)
  const [days, setDays]           = useState(7)
  const [saving, setSaving]       = useState(false)

  const fmtDate = d => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })

  const extendTrial = async (orgId) => {
    setSaving(true)
    try {
      await axios.post(`/superadmin/organisations/${orgId}/extend-trial`, { days })
      setExtending(null)
      router.reload()
    } catch {
      alert('Erreur prolongation')
    } finally {
      setSaving(false)
    }
  }

  const convertToPayant = (orgId) => {
    router.visit(`/superadmin/organisations/${orgId}?tab=licence&action=convert`)
  }

  const sendRelance = async (orgId) => {
    try {
      await axios.post(`/superadmin/organisations/${orgId}/send-trial-reminder`)
      alert('Email de relance envoyé.')
    } catch {
      alert('Erreur')
    }
  }

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'org_name',
      label: 'Organisation',
      render: (v, t) => (
        <div className="min-w-0">
          <Link
            href={`/superadmin/organisations/${t.org_id}`}
            className="font-medium text-purple-700 hover:underline dark:text-purple-300"
          >
            {v}
          </Link>
          <p className={cx('truncate text-xs', TEXT_FAINT)}>{t.admin_email}</p>
        </div>
      ),
    },
    { key: 'country', label: 'Pays', nowrap: true, className: cx('font-mono text-xs', TEXT_MUTED) },
    {
      key: 'plan',
      label: 'Plan',
      nowrap: true,
      render: (v) => <Badge variant={PLAN_TONE[v] ?? 'neutral'}>{v}</Badge>,
    },
    {
      key: 'trial_start',
      label: 'Début → fin',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED, NUM),
      render: (_v, t) => `${fmtDate(t.trial_start)} → ${fmtDate(t.trial_end)}`,
    },
    {
      key: 'trial_end',
      label: 'Progression',
      width: '150px',
      render: (_v, t) => <DaysBar trialStart={t.trial_start} trialEnd={t.trial_end} />,
    },
    {
      key: 'logins_count',
      label: 'Activité',
      numeric: true,
      nowrap: true,
      render: (v) => (
        <span className="inline-flex items-center gap-1.5">
          <User className={cx('h-3.5 w-3.5', TEXT_FAINT)} />
          {v ?? 0}
        </span>
      ),
    },
    {
      key: 'assigned_to',
      label: 'Assigné à',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED),
      render: (v) => v ?? <span className={TEXT_FAINT}>—</span>,
    },
  ]

  return (
    <SuperAdminLayout title="Essais gratuits">
      <Head title="Essais gratuits — Super Admin" />

      <PageHeader
        icon={Hourglass}
        title="Essais gratuits"
        subtitle="Suivi des organisations en période d'évaluation et de leur conversion."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Essais' }]}
      />

      <div className="space-y-6">

        {/* ── Indicateurs ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Hourglass} tone="accent" label="Essais actifs" value={kpi.active ?? 0} />
          <StatCard
            icon={CircleX}
            tone={(kpi.expiring_week ?? 0) > 0 ? 'danger' : 'success'}
            label="Expirent cette semaine"
            value={kpi.expiring_week ?? 0}
          />
          <StatCard
            icon={TrendingUp} tone="success" label="Taux de conversion"
            value={kpi.conversion_rate ?? 0} unit="%"
          />
          <StatCard
            icon={CircleCheck} tone="info" label="Durée moyenne"
            value={kpi.avg_days ?? 0} unit="j"
          />
        </section>

        {/* ── Tableau ─────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className={cx('text-base font-semibold', TEXT_TITLE)}>Organisations en essai</h2>
            <span className={cx('text-sm', TEXT_MUTED, NUM)}>
              {trials.length} organisation{trials.length > 1 ? 's' : ''}
            </span>
          </div>

          <DataTable
            columns={columns}
            data={trials}
            rowKey="id"
            pageSize={25}
            actions={(t) => (
              <>
                <Button
                  variant="subtle" size="xs" icon={CalendarPlus}
                  title="Prolonger l'essai"
                  onClick={() => setExtending(t)}
                >
                  Prolonger
                </Button>
                <Button
                  variant="secondary" size="xs" iconRight={ArrowRight}
                  title="Convertir en abonnement payant"
                  onClick={() => convertToPayant(t.org_id)}
                >
                  Convertir
                </Button>
                <Button
                  variant="ghost" size="xs" iconOnly icon={Mail}
                  title="Envoyer une relance"
                  onClick={() => sendRelance(t.org_id)}
                />
              </>
            )}
            empty={
              <EmptyState
                icon={Hourglass}
                title="Aucun essai en cours"
                description="Les organisations qui démarrent une période d'évaluation apparaîtront ici."
              />
            }
          />
        </section>

      </div>

      {/* ── Prolongation ──────────────────────────────────────────────────── */}
      {extending && (
        <div
          onClick={() => setExtending(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
        >
          <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
            <Card
              padded={false}
              className="shadow-xl"
              title="Prolonger l'essai"
              subtitle={extending.org_name}
              actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={() => setExtending(null)} />}
              footer={
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setExtending(null)}>Annuler</Button>
                  <Button variant="primary" loading={saving} onClick={() => extendTrial(extending.org_id)}>
                    Prolonger
                  </Button>
                </div>
              }
            >
              <div className="px-4 py-5 sm:px-6">
                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Nombre de jours supplémentaires</span>
                  <select
                    value={days}
                    onChange={e => setDays(Number(e.target.value))}
                    className={cx(CONTROL, 'h-10')}
                  >
                    {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} jours</option>)}
                  </select>
                </label>
              </div>
            </Card>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}

export { TrialsIndex };
