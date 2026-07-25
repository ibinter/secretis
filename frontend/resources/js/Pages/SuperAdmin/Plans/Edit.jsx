import React, { useState } from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  Back:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>,
  Save:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Info:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Warning: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
}

// ─── Composant champ formulaire ───────────────────────────────────────────────
function Field({ label, error, hint, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
        bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400
        focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400
        transition-colors ${className}`}
      {...props}
    />
  )
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  )
}

// ─── Confirmation modal ───────────────────────────────────────────────────────
function ConfirmModal({ plan, activeLicenses, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-shrink-0">
            <span className="text-amber-600 dark:text-amber-400"><Ic.Warning /></span>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Confirmer la modification</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Vous modifiez le plan <strong>« {plan.name} »</strong>.
            </p>
          </div>
        </div>

        {activeLicenses > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-sm text-amber-800 dark:text-amber-300">
            <strong>{activeLicenses} abonnement{activeLicenses > 1 ? 's' : ''} actif{activeLicenses > 1 ? 's' : ''}</strong> utilisent ce plan en ce moment.
            Les modifications s'appliqueront uniquement aux <strong>nouvelles souscriptions</strong>.
            Les abonnements existants ne sont pas affectés.
          </div>
        )}

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
          Voulez-vous enregistrer ces modifications ?
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2 px-4 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-bold text-white transition-colors"
            style={{ background: '#1E8449' }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page Edit ────────────────────────────────────────────────────────────────
export default function PlansEdit({ plan, active_licenses = 0, all_modules = [] }) {
  const [showConfirm, setShowConfirm] = useState(false)

  const { data, setData, put, processing, errors } = useForm({
    name:             plan.name ?? '',
    description:      plan.description ?? '',
    price_xof:        plan.price_xof ?? 0,
    price_eur:        plan.price_eur ?? 0,
    max_users:        plan.max_users ?? 0,
    trial_days:       plan.trial_days ?? 14,
    modules:          plan.modules ?? [],
    features:         plan.features ?? [],
    is_active:        plan.is_active ?? true,
    is_public:        plan.is_public ?? true,
    is_recommended:   (plan.features ?? []).includes('recommended'),
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
    setData('modules', current.includes(slug)
      ? current.filter(m => m !== slug)
      : [...current, slug]
    )
  }

  const isModuleEnabled = (slug) => data.modules.includes(slug)

  return (
    <SuperAdminLayout>
      <Head title={`Modifier ${plan.name} — Plans SECRETIS`} />

      {showConfirm && (
        <ConfirmModal
          plan={plan}
          activeLicenses={active_licenses}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">

        {/* En-tête */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={route('superadmin.plans.index')}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            <Ic.Back />
            Plans tarifaires
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Modifier — {plan.name}
          </h1>
          {active_licenses > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium">
              {active_licenses} abonné{active_licenses > 1 ? 's' : ''} actif{active_licenses > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Colonne principale ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Informations générales */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2">
                  Informations générales
                </h2>

                <Field label="Nom du plan" error={errors.name}>
                  <Input
                    value={data.name}
                    onChange={e => setData('name', e.target.value)}
                    placeholder="Ex : Pro Avancé"
                  />
                </Field>

                <Field label="Description" error={errors.description}>
                  <textarea
                    value={data.description}
                    onChange={e => setData('description', e.target.value)}
                    rows={3}
                    placeholder="Description courte affichée dans le catalogue…"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600
                      bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400
                      focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400
                      transition-colors resize-none"
                  />
                </Field>
              </div>

              {/* Tarification */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2">
                  Tarification
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Prix mensuel (FCFA)" error={errors.price_xof}
                    hint="Montant pour un abonnement mensuel">
                    <Input
                      type="number"
                      min="0"
                      step="500"
                      value={data.price_xof}
                      onChange={e => setData('price_xof', parseFloat(e.target.value) || 0)}
                    />
                  </Field>
                  <Field label="Prix équivalent (EUR)" error={errors.price_eur}
                    hint="Pour l'affichage multi-devise">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={data.price_eur}
                      onChange={e => setData('price_eur', parseFloat(e.target.value) || 0)}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Utilisateurs max" error={errors.max_users}
                    hint="0 = illimité">
                    <Input
                      type="number"
                      min="0"
                      value={data.max_users}
                      onChange={e => setData('max_users', parseInt(e.target.value) || 0)}
                    />
                  </Field>
                  <Field label="Période d'essai (jours)" error={errors.trial_days}>
                    <Input
                      type="number"
                      min="0"
                      max="90"
                      value={data.trial_days}
                      onChange={e => setData('trial_days', parseInt(e.target.value) || 0)}
                    />
                  </Field>
                </div>

                {/* Aperçu prix */}
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-sm text-slate-600 dark:text-slate-400 flex gap-6">
                  <div>
                    <span className="text-xs block text-slate-400 mb-0.5">Mensuel</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {new Intl.NumberFormat('fr-FR').format(data.price_xof)} FCFA
                    </span>
                  </div>
                  <div>
                    <span className="text-xs block text-slate-400 mb-0.5">Annuel (×12)</span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {new Intl.NumberFormat('fr-FR').format(data.price_xof * 12)} FCFA
                    </span>
                  </div>
                </div>
              </div>

              {/* Modules inclus */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2 mb-4">
                  Modules inclus
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {all_modules.map(mod => (
                    <label key={mod.slug}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-all text-sm ${
                        isModuleEnabled(mod.slug)
                          ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-600 text-purple-800 dark:text-purple-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}>
                      <input
                        type="checkbox"
                        checked={isModuleEnabled(mod.slug)}
                        onChange={() => toggleModule(mod.slug)}
                        className="sr-only"
                      />
                      <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        isModuleEnabled(mod.slug)
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {isModuleEnabled(mod.slug) && (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                          </svg>
                        )}
                      </span>
                      <span className="leading-tight">{mod.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  {data.modules.length} module{data.modules.length > 1 ? 's' : ''} sélectionné{data.modules.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* ── Colonne latérale ── */}
            <div className="space-y-6">

              {/* Paramètres d'affichage */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2">
                  Affichage
                </h2>

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
                  label='Badge "Recommandé"'
                />
              </div>

              {/* Impact actuel */}
              {active_licenses > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                  <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                    <span className="flex-shrink-0 mt-0.5"><Ic.Warning /></span>
                    <div>
                      <div className="font-semibold text-sm mb-1">Impact des modifications</div>
                      <p className="text-xs leading-relaxed">
                        <strong>{active_licenses}</strong> abonnement{active_licenses > 1 ? 's' : ''} actif{active_licenses > 1 ? 's' : ''} utilisent ce plan.
                        Les nouveaux prix s'appliquent uniquement aux nouvelles souscriptions.
                        Les abonnements en cours sont inchangés.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Identifiants */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Identifiants</h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div><span className="text-slate-400">ID :</span> <code className="font-mono text-slate-700 dark:text-slate-300">{plan.id}</code></div>
                  <div><span className="text-slate-400">Slug :</span> <code className="font-mono text-slate-700 dark:text-slate-300">{plan.slug}</code></div>
                </div>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <Ic.Info /> Le slug est immuable et sert de clé dans les licences.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-white transition-opacity disabled:opacity-60"
                  style={{ background: '#9333EA' }}
                >
                  <Ic.Save />
                  {processing ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </button>
                <Link href={route('superadmin.plans.index')}
                  className="block text-center py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Annuler
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </SuperAdminLayout>
  )
}
export { PlansEdit };
