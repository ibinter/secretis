/**
 * IBIG SECRETIS — CookieConsent.jsx
 * Bannière RGPD cookie consent pour l'intérieur de l'application.
 * - Bannière compacte par défaut (fixed bottom)
 * - Panneau de personnalisation détaillé
 * - Persistance localStorage + API POST /api/v1/privacy/consent
 * - Focus trap + aria-modal pour l'accessibilité
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronDown, ChevronUp, Shield, BarChart2, Megaphone, Brain, Lock } from 'lucide-react'
import { useFocusTrap } from '../../hooks/useFocusTrap'

const STORAGE_KEY = 'secretis_cookie_consent'
const API_ENDPOINT = '/api/v1/privacy/consent'

const CATEGORIES = [
  {
    key: 'necessary',
    label: 'Cookies nécessaires',
    description: 'Essentiels au fonctionnement du site. Ne peuvent pas être désactivés.',
    examples: 'session, CSRF, préférences de langue',
    icon: Lock,
    required: true,
    defaultValue: true,
  },
  {
    key: 'preferences',
    label: 'Cookies de préférences',
    description: 'Permettent de mémoriser vos paramètres (langue, fuseau, thème).',
    examples: 'dark_mode, locale, timezone',
    icon: Shield,
    required: false,
    defaultValue: true,
  },
  {
    key: 'statistics',
    label: 'Cookies de statistiques',
    description: 'Nous aident à comprendre comment vous utilisez SECRETIS (anonymisé).',
    examples: 'page_views, feature_usage, session_duration',
    icon: BarChart2,
    required: false,
    defaultValue: true,
  },
  {
    key: 'marketing',
    label: 'Cookies de marketing',
    description: 'Utilisés pour vous montrer des offres pertinentes.',
    examples: 'campaign_tracking, affiliate_id',
    icon: Megaphone,
    required: false,
    defaultValue: false,
  },
  {
    key: 'ai_sara',
    label: 'Cookies IA / SARA',
    description: "Permettent à SARA d'améliorer ses réponses grâce à votre historique de conversation.",
    examples: 'sara_context, conversation_memory',
    icon: Brain,
    required: false,
    defaultValue: true,
  },
]

function Toggle({ checked, onChange, disabled, id, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      id={id}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F39C12]',
        disabled
          ? 'cursor-not-allowed opacity-60'
          : 'cursor-pointer',
        checked
          ? 'bg-[#F39C12]'
          : 'bg-gray-300 dark:bg-gray-600',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  )
}

function CategoryRow({ cat, value, onChange }) {
  const Icon = cat.icon
  const toggleId = `cookie-toggle-${cat.key}`

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-lg bg-[#9333EA]/10 dark:bg-white/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#9333EA] dark:text-purple-300" aria-hidden="true" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor={toggleId}
            className="text-sm font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
          >
            {cat.label}
            {cat.required && (
              <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                (toujours actif)
              </span>
            )}
          </label>
          <Toggle
            id={toggleId}
            checked={value}
            onChange={onChange}
            disabled={cat.required}
            label={`${cat.label} — ${value ? 'activé' : 'désactivé'}`}
          />
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{cat.description}</p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
          Exemples&nbsp;: {cat.examples}
        </p>
      </div>
    </div>
  )
}

export default function CookieConsent() {
  const [visible, setVisible]       = useState(false)
  const [expanded, setExpanded]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [prefs, setPrefs]           = useState(
    Object.fromEntries(CATEGORIES.map(c => [c.key, c.defaultValue]))
  )

  const bannerRef = useRef(null)
  const { trapRef } = useFocusTrap({
    active: visible,
    onEscape: () => { /* ne pas fermer sans choix explicite */ },
    returnFocus: false,
  })

  // Vérifier si l'utilisateur a déjà fait un choix
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        // Délai léger pour ne pas bloquer le rendu initial
        const timer = setTimeout(() => setVisible(true), 800)
        return () => clearTimeout(timer)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  const persist = useCallback(async (categories) => {
    // Stocker localement
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        categories,
        timestamp: new Date().toISOString(),
      }))
    } catch { /* Safari private mode */ }

    // Envoyer au serveur si authentifié
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
      await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        },
        body: JSON.stringify({ categories }),
      })
    } catch { /* silencieux si pas connecté ou réseau KO */ }
  }, [])

  const handleAcceptAll = async () => {
    setSaving(true)
    const all = Object.fromEntries(CATEGORIES.map(c => [c.key, true]))
    setPrefs(all)
    await persist(all)
    setSaving(false)
    setVisible(false)
  }

  const handleRejectAll = async () => {
    setSaving(true)
    const minimal = Object.fromEntries(CATEGORIES.map(c => [c.key, c.required]))
    setPrefs(minimal)
    await persist(minimal)
    setSaving(false)
    setVisible(false)
  }

  const handleSaveChoices = async () => {
    setSaving(true)
    await persist(prefs)
    setSaving(false)
    setVisible(false)
  }

  const togglePref = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (!visible) return null

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Gestion des cookies"
      aria-describedby="cookie-desc"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <div
        ref={bannerRef}
        className={[
          'mx-auto max-w-4xl bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl',
          'overflow-hidden',
        ].join(' ')}
      >
        {/* Bandeau compact */}
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#F39C12]/15 flex items-center justify-center mt-0.5">
              <Shield className="w-4 h-4 text-[#F39C12]" aria-hidden="true" />
            </div>
            <p id="cookie-desc" className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience SECRETIS.
              En continuant, vous acceptez notre{' '}
              <a
                href="/legal/politique-cookies"
                className="text-[#7e22ce] hover:underline focus:outline-none focus:ring-1 focus:ring-[#7e22ce] rounded"
                target="_blank"
                rel="noopener noreferrer"
              >
                politique de cookies
              </a>
              .
            </p>
          </div>

          {/* Actions compactes */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAcceptAll}
              disabled={saving}
              className={[
                'px-5 py-2.5 rounded-lg text-sm font-semibold text-white',
                'bg-[#F39C12] hover:bg-[#e08e0b] active:bg-[#c97d0a]',
                'focus:outline-none focus:ring-2 focus:ring-[#F39C12] focus:ring-offset-2',
                'transition-colors disabled:opacity-60',
              ].join(' ')}
            >
              Tout accepter
            </button>
            <button
              type="button"
              onClick={handleRejectAll}
              disabled={saving}
              className={[
                'px-5 py-2.5 rounded-lg text-sm font-semibold',
                'border border-gray-300 dark:border-gray-600',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-gray-50 dark:hover:bg-gray-800',
                'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
                'transition-colors disabled:opacity-60',
              ].join(' ')}
            >
              Tout refuser
            </button>
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              aria-controls="cookie-preferences-panel"
              className={[
                'px-4 py-2.5 rounded-lg text-sm font-medium',
                'text-[#7e22ce] hover:underline',
                'focus:outline-none focus:ring-2 focus:ring-[#7e22ce] focus:ring-offset-2',
                'inline-flex items-center gap-1.5 transition-colors',
              ].join(' ')}
            >
              Personnaliser
              {expanded
                ? <ChevronUp className="w-4 h-4" aria-hidden="true" />
                : <ChevronDown className="w-4 h-4" aria-hidden="true" />
              }
            </button>
          </div>
        </div>

        {/* Panneau de personnalisation */}
        {expanded && (
          <div
            id="cookie-preferences-panel"
            className="border-t border-gray-100 dark:border-gray-700 px-5 pb-6 md:px-6"
          >
            <h2 className="mt-5 mb-1 text-base font-bold text-gray-900 dark:text-gray-100">
              Gérer mes préférences de cookies
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Activez ou désactivez chaque catégorie selon vos préférences.
            </p>

            <div role="group" aria-label="Catégories de cookies">
              {CATEGORIES.map(cat => (
                <CategoryRow
                  key={cat.key}
                  cat={cat}
                  value={prefs[cat.key]}
                  onChange={() => togglePref(cat.key)}
                />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <a
                href="/legal/politique-cookies"
                className="text-xs text-gray-500 dark:text-gray-400 hover:underline focus:outline-none focus:ring-1 focus:ring-gray-400 rounded"
                target="_blank"
                rel="noopener noreferrer"
              >
                Politique de cookies complète
              </a>
              <button
                type="button"
                onClick={handleSaveChoices}
                disabled={saving}
                aria-busy={saving}
                className={[
                  'px-5 py-2.5 rounded-lg text-sm font-semibold text-white',
                  'bg-[#9333EA] hover:bg-[#142d48]',
                  'focus:outline-none focus:ring-2 focus:ring-[#9333EA] focus:ring-offset-2',
                  'transition-colors disabled:opacity-60',
                ].join(' ')}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer mes choix'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export { CookieConsent };
