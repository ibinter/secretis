/**
 * app.jsx — Point d'entrée IBIG SECRETIS
 */
import '../css/app.css'

import React from 'react'
import { createRoot }      from 'react-dom/client'
import { createInertiaApp }from '@inertiajs/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'

// ─── PWA / mode hors-ligne ────────────────────────────────────────────────────
import { registerServiceWorker } from './pwa/registerServiceWorker'

// ─── i18n ─────────────────────────────────────────────────────────────────────
import i18n from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'

/**
 * Chargement des traductions.
 *
 * La liste des langues etait ECRITE EN DUR : ['fr', 'en', 'ar']. Le dossier
 * i18n en contient dix. Sept fichiers — ar-MA, ar-TN, ha, pt-BR, pt-MZ, pt-ST,
 * sw — etaient donc traduits, maintenus, et JAMAIS charges : un utilisateur en
 * haoussa ou en swahili lisait du francais sans qu'aucune erreur ne le signale.
 *
 * On ne charge pas les dix pour autant : dix fichiers de plus de mille chaines
 * dans le paquet initial se paient a chaque visite, pour neuf langues que
 * l'utilisateur ne lira jamais. On charge la langue demandee, le francais comme
 * repli, et — pour les fichiers de variante regionale — la langue de base
 * qu'ils surchargent.
 */
const REPLI = 'fr'

async function chargerLocale(lng) {
  try {
    const mod = await import(`./i18n/${lng}.json`)
    return mod.default ?? mod
  } catch {
    return null
  }
}

/**
 * Fusion profonde variante -> base.
 *
 * ar-MA et ar-TN sont des fichiers de SURCHARGE : ils declarent `_meta.base`
 * et ne reprennent que ce qui differe. Les charger seuls donnerait une
 * interface aux trois quarts vide.
 */
function fusionner(base, surcharge) {
  if (!base) return surcharge
  if (!surcharge) return base

  const sortie = { ...base }

  for (const [cle, valeur] of Object.entries(surcharge)) {
    sortie[cle] = valeur && typeof valeur === 'object' && !Array.isArray(valeur)
      ? fusionner(base[cle], valeur)
      : valeur
  }

  return sortie
}

async function loadI18n(locale = REPLI) {
  const resources = {}

  for (const lng of [...new Set([locale, REPLI])]) {
    let traductions = await chargerLocale(lng)

    if (traductions?._meta?.base) {
      traductions = fusionner(await chargerLocale(traductions._meta.base), traductions)
    }

    if (traductions) {
      resources[lng] = { translation: traductions }
    }
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: REPLI,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
}

// ─── React Query ──────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:       1000 * 60 * 2,   // 2 min
      cacheTime:       1000 * 60 * 10,  // 10 min
      retry:           1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
})

// ─── Laravel Echo / Reverb ────────────────────────────────────────────────────
async function initEcho() {
  try {
    const [{ default: Echo }, { default: Pusher }] = await Promise.all([
      import('laravel-echo'),
      import('pusher-js'),
    ])
    window.Pusher = Pusher
    window.Echo = new Echo({
      broadcaster:  'reverb',
      key:          import.meta.env.VITE_REVERB_APP_KEY,
      wsHost:       import.meta.env.VITE_REVERB_HOST,
      wsPort:       import.meta.env.VITE_REVERB_PORT        ?? 80,
      wssPort:      import.meta.env.VITE_REVERB_PORT        ?? 443,
      forceTLS:     (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
    })
  } catch { /* Echo optional — no websocket in test env */ }
}

// ─── Sentry (production only) ─────────────────────────────────────────────────
async function initSentry() {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/react')
      Sentry.init({
        dsn:          import.meta.env.VITE_SENTRY_DSN,
        environment:  import.meta.env.VITE_APP_ENV ?? 'production',
        release:      import.meta.env.VITE_APP_VERSION,
        tracesSampleRate: 0.2,
      })
    } catch { /* Sentry optional */ }
  }
}

// ─── RTL ─────────────────────────────────────────────────────────────────────
function applyDirection(locale = 'fr') {
  const rtlLocales = ['ar', 'he', 'fa', 'ur']
  const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('dir', dir)
  document.documentElement.setAttribute('lang', locale)
}

// ─── Global Error Boundary ────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) {
    console.error('[SECRETIS ErrorBoundary]', error, info)
    if (window.Sentry) window.Sentry.captureException(error, { extra: info })
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#C0392B]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-[#C0392B] text-2xl">⚠</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Une erreur est survenue</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            L'équipe IBIG Soft a été notifiée. Veuillez recharger la page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-[#9333EA] text-white rounded-lg text-sm font-medium hover:bg-[#142d48]"
          >
            Recharger la page
          </button>
          {import.meta.env.DEV && (
            <pre className="mt-4 text-left text-xs bg-gray-900 text-red-400 p-4 rounded-lg overflow-auto max-h-40">
              {this.state.error?.message}
            </pre>
          )}
        </div>
      </div>
    )
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
Promise.all([
  initEcho(),
  initSentry(),
]).catch(console.error)

// Mode hors-ligne : enregistrement du Service Worker.
// Volontairement hors du flux de rendu — toute erreur y est absorbée et ne peut
// pas empêcher l'application de démarrer.
try {
  registerServiceWorker()
} catch (err) {
  console.warn('[PWA] Service Worker non enregistré :', err)
}

// ─── Inertia App ─────────────────────────────────────────────────────────────
createInertiaApp({
  title:    (title) => title ? `${title} — SECRETIS` : 'IBIG SECRETIS',
  resolve:  (name) =>
    resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),

  async setup({ el, App, props }) {
    // Locale from server
    const locale = props.initialPage?.props?.locale ?? 'fr'
    await loadI18n(locale)
    applyDirection(locale)

    // Store user id for Echo
    const userId = props.initialPage?.props?.auth?.user?.id
    if (userId) window.__SECRETIS_USER_ID = userId

    // Theme init
    const savedTheme = localStorage.getItem('secretis-theme')
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    }

    createRoot(el).render(
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <App {...props} />
          </I18nextProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    )
  },
})
