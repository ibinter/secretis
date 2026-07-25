import React, { useState } from 'react'
import { Head, router, Link } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  Edit:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  Check:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Users:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Dollar:  () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Toggle:  ({ on }) => on
    ? <svg className="w-10 h-6" viewBox="0 0 40 24"><rect width="40" height="24" rx="12" fill="#1E8449"/><circle cx="28" cy="12" r="9" fill="#fff"/></svg>
    : <svg className="w-10 h-6" viewBox="0 0 40 24"><rect width="40" height="24" rx="12" fill="#CBD5E1"/><circle cx="12" cy="12" r="9" fill="#fff"/></svg>,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = n => new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0))
const fmtFcfa = n => fmt(n) + ' FCFA'

const PLAN_STYLE = {
  starter:    { badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
  pro:        { badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
  enterprise: { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
}

// ─── Carte plan ───────────────────────────────────────────────────────────────
function PlanCard({ plan, onToggle, toggling }) {
  const style = PLAN_STYLE[plan.slug] ?? PLAN_STYLE.starter

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border-2 ${style.border} p-6 flex flex-col gap-4 relative`}>
      {/* Badge recommandé */}
      {plan.features?.includes('recommended') && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ background: '#F39C12' }}>
            Recommandé
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${style.badge}`}>
              {plan.slug}
            </span>
            {!plan.is_active && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Désactivé
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
          {plan.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{plan.description}</p>
          )}
        </div>

        {/* Toggle actif */}
        <button
          onClick={() => onToggle(plan)}
          disabled={toggling === plan.id}
          className="flex-shrink-0 ml-2 opacity-80 hover:opacity-100 transition-opacity disabled:opacity-40"
          title={plan.is_active ? 'Désactiver ce plan' : 'Activer ce plan'}
        >
          <Ic.Toggle on={plan.is_active} />
        </button>
      </div>

      {/* Prix */}
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {fmt(plan.price_xof)}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">FCFA / mois</span>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400 mb-1">
            <Ic.Users />
            <span className="text-xs">Clients actifs</span>
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {plan.stats?.active_clients ?? 0}
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400 mb-1">
            <Ic.Dollar />
            <span className="text-xs">MRR généré</span>
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
            {fmtFcfa(plan.stats?.mrr ?? 0)}
          </div>
        </div>
      </div>

      {/* Limites */}
      <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Ic.Check />
          <span>
            {plan.max_users === 0 ? 'Utilisateurs illimités' : `Jusqu'à ${plan.max_users} utilisateurs`}
          </span>
        </div>
        {(plan.modules ?? []).slice(0, 4).map(m => (
          <div key={m} className="flex items-center gap-2">
            <Ic.Check />
            <span className="capitalize">{m.replace('_', ' ')}</span>
          </div>
        ))}
        {(plan.modules ?? []).length > 4 && (
          <div className="text-xs text-slate-400 pl-6">
            + {plan.modules.length - 4} autres modules
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-700">
        <Link
          href={route('superadmin.plans.edit', { plan: plan.id })}
          className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(46,134,193,0.12)', color: '#7e22ce' }}
        >
          <Ic.Edit />
          Modifier ce plan
        </Link>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
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
    } catch (err) {
      setFlash({ type: 'error', msg: 'Erreur lors de la mise à jour du plan.' })
    } finally {
      setToggling(null)
      setTimeout(() => setFlash(null), 3500)
    }
  }

  const totalMrr = plans.reduce((s, p) => s + (p.stats?.mrr ?? 0), 0)
  const totalClients = plans.reduce((s, p) => s + (p.stats?.active_clients ?? 0), 0)

  return (
    <SuperAdminLayout>
      <Head title="Plans tarifaires — SECRETIS" />

      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">

        {/* Flash */}
        {flash && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
            flash.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {flash.msg}
          </div>
        )}

        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Plans tarifaires</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Gestion des offres commerciales IBIG SECRETIS
            </p>
          </div>
        </div>

        {/* Récap global */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{plans.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Plans configurés</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{totalClients}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Clients actifs (total)</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
            <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{fmtFcfa(totalMrr)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">MRR total généré</div>
          </div>
        </div>

        {/* Cartes plans */}
        {plans.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
            <p className="text-slate-400 dark:text-slate-500">Aucun plan configuré.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onToggle={handleToggle}
                toggling={toggling}
              />
            ))}
          </div>
        )}

        {/* Note de transparence */}
        <div className="mt-8 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 text-sm text-purple-800 dark:text-purple-300">
          <strong>Important :</strong> La modification des prix s'applique uniquement aux nouvelles souscriptions.
          Les abonnements en cours ne sont pas rétroactivement affectés.
        </div>
      </div>
    </SuperAdminLayout>
  )
}
export { PlansIndex };
