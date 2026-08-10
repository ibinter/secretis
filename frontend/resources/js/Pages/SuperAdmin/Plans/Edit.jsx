/**
 * SuperAdmin/Plans/Edit.jsx — Édition d'une offre tarifaire
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : même `useForm` Inertia, mêmes champs, même
 * route Ziggy `superadmin.plans.update`, même confirmation avant envoi.
 *
 * Correction d'affichage : le `min-h-screen bg-slate-50 p-6` interne
 * doublait le fond et le padding déjà fournis par `SuperAdminLayout`.
 */

import React, { useState } from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import { ArrowLeft, Check, Info, AlertTriangle, Save, X } from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Badge, Card,
  cx, SURFACE_SUNK, BORDER, CONTROL, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Champ de formulaire ──────────────────────────────────────────────────── */

function Field({ label, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className={cx('block text-xs font-medium', TEXT_MUTED)}>{label}</label>
      {children}
      {hint && <p className={cx('text-xs', TEXT_FAINT)}>{hint}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/20',
          FOCUS_RING,
        )}
      >
        <span
          className={cx(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
      <span className={cx('text-sm', TEXT_BODY)}>{label}</span>
    </label>
  )
}

/* ─── Confirmation ─────────────────────────────────────────────────────────── */

function ConfirmModal({ plan, activeLicenses, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md">
        <Card
          padded={false}
          className="shadow-xl"
          title="Confirmer la modification"
          subtitle={`Plan « ${plan.name} »`}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onCancel} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onCancel}>Annuler</Button>
              <Button variant="primary" onClick={onConfirm}>Enregistrer</Button>
            </div>
          }
        >
          <div className="space-y-4 px-4 py-5 sm:px-6">
            {activeLicenses > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  <span className={NUM}>{activeLicenses}</span> abonnement{activeLicenses > 1 ? 's' : ''}{' '}
                  actif{activeLicenses > 1 ? 's' : ''} utilise{activeLicenses > 1 ? 'nt' : ''} ce plan.
                  Les modifications ne s'appliqueront qu'aux nouvelles souscriptions.
                </p>
              </div>
            )}
            <p className={cx('text-sm', TEXT_BODY)}>Voulez-vous enregistrer ces modifications ?</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function PlansEdit({ plan, active_licenses = 0, all_modules = [] }) {
  const [showConfirm, setShowConfirm] = useState(false)

  const { data, setData, put, processing, errors } = useForm({
    name:           plan.name ?? '',
    description:    plan.description ?? '',
    price_xof:      plan.price_xof ?? 0,
    price_eur:      plan.price_eur ?? 0,
    max_users:      plan.max_users ?? 0,
    trial_days:     plan.trial_days ?? 14,
    modules:        plan.modules ?? [],
    features:       plan.features ?? [],
    is_active:      plan.is_active ?? true,
    is_public:      plan.is_public ?? true,
    is_recommended: (plan.features ?? []).includes('recommended'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    setShowConfirm(false)
    put(route('superadmin.plans.update', { plan: plan.id }))
  }

  const toggleModule = (slug) => {
    const current = data.modules
    setData('modules', current.includes(slug) ? current.filter(m => m !== slug) : [...current, slug])
  }

  const isModuleEnabled = (slug) => data.modules.includes(slug)
  const fmtNum = v => new Intl.NumberFormat('fr-FR').format(v ?? 0)

  return (
    <SuperAdminLayout title={`Plan — ${plan.name}`}>
      <Head title={`Modifier ${plan.name} — Plans SECRETIS`} />

      {showConfirm && (
        <ConfirmModal
          plan={plan}
          activeLicenses={active_licenses}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <PageHeader
        title={`Modifier — ${plan.name}`}
        subtitle="Les modifications ne s'appliquent qu'aux nouvelles souscriptions."
        breadcrumbs={[
          { label: 'Console', href: '/superadmin' },
          { label: 'Plans tarifaires', href: route('superadmin.plans.index') },
          { label: plan.name },
        ]}
        meta={
          active_licenses > 0 ? (
            <Badge variant="info" size="md">
              {active_licenses} abonné{active_licenses > 1 ? 's' : ''} actif{active_licenses > 1 ? 's' : ''}
            </Badge>
          ) : null
        }
        actions={
          <Button as={Link} href={route('superadmin.plans.index')} variant="ghost" icon={ArrowLeft}>
            Retour aux plans
          </Button>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Colonne principale ────────────────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">

            <Card title="Informations générales">
              <div className="space-y-4">
                <Field label="Nom du plan" error={errors.name}>
                  <input
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    placeholder="Ex. Pro Avancé"
                    className={cx(CONTROL, 'h-10')}
                  />
                </Field>

                <Field label="Description" error={errors.description}>
                  <textarea
                    value={data.description}
                    onChange={e => setData('description', e.target.value)}
                    rows={3}
                    placeholder="Description courte affichée dans le catalogue…"
                    className={cx(CONTROL, 'resize-none')}
                  />
                </Field>
              </div>
            </Card>

            <Card title="Tarification">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Prix mensuel (FCFA)" error={errors.price_xof} hint="Montant d'un abonnement mensuel">
                    <input
                      type="number" min="0" step="500"
                      value={data.price_xof}
                      onChange={e => setData('price_xof', parseFloat(e.target.value) || 0)}
                      className={cx(CONTROL, 'h-10', NUM)}
                    />
                  </Field>
                  <Field label="Prix équivalent (EUR)" error={errors.price_eur} hint="Pour l'affichage multi-devise">
                    <input
                      type="number" min="0" step="1"
                      value={data.price_eur}
                      onChange={e => setData('price_eur', parseFloat(e.target.value) || 0)}
                      className={cx(CONTROL, 'h-10', NUM)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Utilisateurs maximum" error={errors.max_users} hint="0 = illimité">
                    <input
                      type="number" min="0"
                      value={data.max_users}
                      onChange={e => setData('max_users', parseInt(e.target.value, 10) || 0)}
                      className={cx(CONTROL, 'h-10', NUM)}
                    />
                  </Field>
                  <Field label="Période d'essai (jours)" error={errors.trial_days}>
                    <input
                      type="number" min="0" max="90"
                      value={data.trial_days}
                      onChange={e => setData('trial_days', parseInt(e.target.value, 10) || 0)}
                      className={cx(CONTROL, 'h-10', NUM)}
                    />
                  </Field>
                </div>

                <div className={cx(SURFACE_SUNK, 'flex flex-wrap gap-8 rounded-lg p-4')}>
                  <div>
                    <p className={cx('mb-0.5 text-xs', TEXT_MUTED)}>Mensuel</p>
                    <p className={cx('font-semibold', TEXT_TITLE, NUM)}>{fmtNum(data.price_xof)} FCFA</p>
                  </div>
                  <div>
                    <p className={cx('mb-0.5 text-xs', TEXT_MUTED)}>Annuel (× 12)</p>
                    <p className={cx('font-semibold', TEXT_TITLE, NUM)}>{fmtNum(data.price_xof * 12)} FCFA</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card
              title="Modules inclus"
              subtitle={`${data.modules.length} module${data.modules.length > 1 ? 's' : ''} sélectionné${data.modules.length > 1 ? 's' : ''}`}
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {all_modules.map(mod => {
                  const on = isModuleEnabled(mod.slug)
                  return (
                    <label
                      key={mod.slug}
                      className={cx(
                        'flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors',
                        on
                          ? 'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-500/50 dark:bg-purple-500/10 dark:text-purple-300'
                          : cx(BORDER, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'),
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleModule(mod.slug)}
                        className="sr-only"
                      />
                      <span className={cx(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        on ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-300 dark:border-gray-600',
                      )}>
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="leading-tight">{mod.label}</span>
                    </label>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* ── Colonne latérale ──────────────────────────────────────────── */}
          <div className="space-y-6">

            <Card title="Affichage">
              <div className="space-y-4">
                <Toggle
                  checked={data.is_active}
                  onChange={v => setData('is_active', v)}
                  label="Plan actif (souscription possible)"
                />
                <Toggle
                  checked={data.is_public}
                  onChange={v => setData('is_public', v)}
                  label="Visible dans le catalogue public"
                />
                <Toggle
                  checked={data.is_recommended}
                  onChange={v => setData('is_recommended', v)}
                  label="Badge « Recommandé »"
                />
              </div>
            </Card>

            {active_licenses > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="mb-1 text-sm font-semibold">Impact des modifications</p>
                    <p className="text-xs leading-relaxed">
                      <span className={NUM}>{active_licenses}</span> abonnement{active_licenses > 1 ? 's' : ''}{' '}
                      actif{active_licenses > 1 ? 's' : ''} utilise{active_licenses > 1 ? 'nt' : ''} ce plan.
                      Les nouveaux prix ne s'appliquent qu'aux nouvelles souscriptions ; les abonnements en cours restent inchangés.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Card title="Identifiants">
              <dl className={cx('space-y-1.5 text-xs', TEXT_MUTED)}>
                <div className="flex items-center justify-between gap-2">
                  <dt>Identifiant</dt>
                  <dd><code className={cx('font-mono', TEXT_BODY)}>{plan.id}</code></dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt>Slug</dt>
                  <dd><code className={cx('font-mono', TEXT_BODY)}>{plan.slug}</code></dd>
                </div>
              </dl>
              <p className={cx('mt-3 flex items-start gap-1.5 text-xs', TEXT_FAINT)}>
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Le slug est immuable : il sert de clé dans les licences.
              </p>
            </Card>

            <div className="space-y-2">
              <Button type="submit" variant="primary" icon={Save} block loading={processing}>
                Enregistrer les modifications
              </Button>
              <Button as={Link} href={route('superadmin.plans.index')} variant="secondary" block>
                Annuler
              </Button>
            </div>
          </div>
        </div>
      </form>
    </SuperAdminLayout>
  )
}

export { PlansEdit };
