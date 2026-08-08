/**
 * SuperAdmin/Plans/Index.jsx — Offres tarifaires de la plateforme
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes routes Ziggy
 * (`superadmin.plans.toggle`, `superadmin.plans.edit`), même prop `plans`,
 * mêmes états locaux.
 *
 * Correction d'affichage : la page ajoutait son propre
 * `min-h-screen bg-slate-50 p-6` à l'intérieur de `SuperAdminLayout`, qui
 * applique déjà fond et padding — d'où une double marge et un fond clair
 * incohérent en thème sombre. Ce conteneur a été retiré.
 */

import React, { useState } from 'react'
import { Head, router, Link } from '@inertiajs/react'
import axios from 'axios'
import { Layers, Pencil, Check, Users, CircleDollarSign, Info } from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card, EmptyState,
  cx, SURFACE, SURFACE_SUNK, BORDER, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const fmt     = n => new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0))
const fmtFcfa = n => `${fmt(n)} FCFA`

const PLAN_TONE = { starter: 'neutral', pro: 'info', enterprise: 'accent' }

/* ─── Interrupteur d'activation ────────────────────────────────────────────── */

function Toggle({ on, disabled, onClick, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        on ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/20',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        FOCUS_RING,
      )}
    >
      <span
        className={cx(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
          on ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

/* ─── Carte de plan ────────────────────────────────────────────────────────── */

function PlanCard({ plan, onToggle, toggling }) {
  const modules = plan.modules ?? []

  return (
    <article
      className={cx(
        SURFACE, 'relative flex flex-col gap-4 rounded-xl border p-6 shadow-sm', BORDER,
        !plan.is_active && 'opacity-75',
      )}
    >
      {plan.features?.includes('recommended') && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="warning" size="md">Recommandé</Badge>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant={PLAN_TONE[plan.slug] ?? 'neutral'}>{plan.slug}</Badge>
            {!plan.is_active && <Badge variant="danger">Désactivé</Badge>}
          </div>
          <h3 className={cx('text-lg font-semibold', TEXT_TITLE)}>{plan.name}</h3>
          {plan.description && (
            <p className={cx('mt-1 text-xs leading-relaxed', TEXT_MUTED)}>{plan.description}</p>
          )}
        </div>

        <Toggle
          on={plan.is_active}
          disabled={toggling === plan.id}
          onClick={() => onToggle(plan)}
          label={plan.is_active ? `Désactiver le plan ${plan.name}` : `Activer le plan ${plan.name}`}
        />
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={cx('text-3xl font-semibold tracking-tight', TEXT_TITLE, NUM)}>
          {fmt(plan.price_xof)}
        </span>
        <span className={cx('text-sm font-medium', TEXT_MUTED)}>FCFA / mois</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={cx(SURFACE_SUNK, 'rounded-lg p-3 text-center')}>
          <p className={cx('mb-1 inline-flex items-center gap-1 text-xs', TEXT_MUTED)}>
            <Users className="h-3.5 w-3.5" /> Clients actifs
          </p>
          <p className={cx('text-xl font-semibold', TEXT_TITLE, NUM)}>
            {plan.stats?.active_clients ?? 0}
          </p>
        </div>
        <div className={cx(SURFACE_SUNK, 'rounded-lg p-3 text-center')}>
          <p className={cx('mb-1 inline-flex items-center gap-1 text-xs', TEXT_MUTED)}>
            <CircleDollarSign className="h-3.5 w-3.5" /> MRR généré
          </p>
          <p className={cx('text-base font-semibold', TEXT_TITLE, NUM)}>
            {fmtFcfa(plan.stats?.mrr ?? 0)}
          </p>
        </div>
      </div>

      <ul className={cx('space-y-1.5 text-sm', TEXT_BODY)}>
        <li className="flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          {plan.max_users === 0 ? 'Utilisateurs illimités' : `Jusqu'à ${plan.max_users} utilisateurs`}
        </li>
        {modules.slice(0, 4).map(m => (
          <li key={m} className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="capitalize">{m.replace('_', ' ')}</span>
          </li>
        ))}
        {modules.length > 4 && (
          <li className={cx('pl-6 text-xs', TEXT_FAINT)}>+ {modules.length - 4} autres modules</li>
        )}
      </ul>

      <div className={cx('mt-auto border-t pt-4', BORDER)}>
        <Button
          as={Link}
          href={route('superadmin.plans.edit', { plan: plan.id })}
          variant="subtle"
          icon={Pencil}
          block
        >
          Modifier ce plan
        </Button>
      </div>
    </article>
  )
}

/* ─── Page principale ──────────────────────────────────────────────────────── */

export default function PlansIndex({ plans = [] }) {
  const [toggling, setToggling] = useState(null)
  const [flash, setFlash]       = useState(null)

  const handleToggle = async (plan) => {
    if (!confirm(`${plan.is_active ? 'Désactiver' : 'Activer'} le plan « ${plan.name} » ?`)) return

    setToggling(plan.id)
    try {
      await axios.post(route('superadmin.plans.toggle', { plan: plan.id }))
      router.reload({ only: ['plans'] })
      setFlash({ type: 'success', msg: `Plan « ${plan.name} » mis à jour.` })
    } catch {
      setFlash({ type: 'error', msg: 'Erreur lors de la mise à jour du plan.' })
    } finally {
      setToggling(null)
      setTimeout(() => setFlash(null), 3500)
    }
  }

  const totalMrr     = plans.reduce((s, p) => s + (p.stats?.mrr ?? 0), 0)
  const totalClients = plans.reduce((s, p) => s + (p.stats?.active_clients ?? 0), 0)

  return (
    <SuperAdminLayout title="Plans tarifaires">
      <Head title="Plans tarifaires — SECRETIS" />

      <PageHeader
        icon={Layers}
        title="Plans tarifaires"
        subtitle="Offres commerciales proposées aux organisations clientes."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Plans' }]}
      />

      {flash && (
        <div
          role="status"
          className={cx(
            'mb-4 rounded-lg border px-4 py-3 text-sm font-medium',
            flash.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
          )}
        >
          {flash.msg}
        </div>
      )}

      <div className="space-y-6">

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[
            { label: 'Plans configurés',       value: plans.length },
            { label: 'Clients actifs (total)', value: totalClients },
            { label: 'MRR total généré',       value: fmtFcfa(totalMrr) },
          ].map(s => (
            <div key={s.label} className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-4 text-center shadow-sm')}>
              <p className={cx('text-2xl font-semibold tracking-tight', TEXT_TITLE, NUM)}>{s.value}</p>
              <p className={cx('mt-1 text-xs', TEXT_MUTED)}>{s.label}</p>
            </div>
          ))}
        </section>

        {plans.length === 0 ? (
          <div className={cx(SURFACE, 'border', BORDER, 'rounded-xl shadow-sm')}>
            <EmptyState
              icon={Layers}
              title="Aucun plan configuré"
              description="Les offres tarifaires proposées aux clients apparaîtront ici une fois créées."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} onToggle={handleToggle} toggling={toggling} />
            ))}
          </div>
        )}

        <Card>
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" aria-hidden="true" />
            <p className={cx('text-sm', TEXT_BODY)}>
              <span className={cx('font-semibold', TEXT_TITLE)}>Important :</span>{' '}
              la modification des prix ne s'applique qu'aux nouvelles souscriptions.
              Les abonnements en cours ne sont pas affectés rétroactivement.
            </p>
          </div>
        </Card>

      </div>
    </SuperAdminLayout>
  )
}

export { PlansIndex };
