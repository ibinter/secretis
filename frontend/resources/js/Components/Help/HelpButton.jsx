/**
 * SECRETIS ERP — Components/Help/HelpButton.jsx
 *
 * Bouton flottant "?" en bas à droite avec menu contextuel.
 * Z-index 40 : au-dessus du contenu, sous les modals (z-50+).
 * Badge notification si nouveau article dans le guide depuis la dernière visite.
 *
 * Usage : <HelpButton /> dans le layout principal.
 */

import React, { useState, useEffect, useRef } from 'react'
import { router } from '@inertiajs/react'

// ─── Clé localStorage ────────────────────────────────────────────────────────
const LAST_GUIDE_VISIT_KEY = 'secretis_last_guide_visit'
// Date du dernier article publié (à mettre à jour avec les releases)
const LATEST_GUIDE_ARTICLE = '2026-01-15T00:00:00Z'

// ─── Menu items ──────────────────────────────────────────────────────────────
const MENU_ITEMS = [
  {
    id:    'guide',
    label: 'Guide utilisateur',
    icon:  '📖',
    href:  '/aide/guide',
    desc:  'Documentation complète',
    badge: false, // mis à jour dynamiquement
  },
  {
    id:    'faq',
    label: 'FAQ',
    icon:  '💬',
    href:  '/aide/faq',
    desc:  'Questions fréquentes',
  },
  {
    id:    'cases',
    label: 'Cas pratiques',
    icon:  '🎯',
    href:  '/aide/cas-pratiques',
    desc:  'Tutoriels guidés',
  },
  {
    id:    'support',
    label: 'Support',
    icon:  '🎫',
    href:  '/aide/support',
    desc:  'Ouvrir un ticket',
  },
  {
    id:    'sara',
    label: 'SARA',
    icon:  '🤖',
    action: 'sara',
    desc:  'Demander à l\'IA',
  },
]

// ─── Icônes inline ───────────────────────────────────────────────────────────
function QuestionIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
    </svg>
  )
}

// ─── Composant ───────────────────────────────────────────────────────────────
export default function HelpButton({ onOpenSara }) {
  const [open, setOpen]       = useState(false)
  const [hasNew, setHasNew]   = useState(false)
  const menuRef               = useRef(null)
  const btnRef                = useRef(null)

  // Détection nouveau article guide
  useEffect(() => {
    try {
      const lastVisit = localStorage.getItem(LAST_GUIDE_VISIT_KEY)
      if (!lastVisit || new Date(lastVisit) < new Date(LATEST_GUIDE_ARTICLE)) {
        setHasNew(true)
      }
    } catch {
      // localStorage non disponible (SSR)
    }
  }, [])

  // Fermer au clic extérieur / Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  const handleItem = (item) => {
    setOpen(false)
    if (item.action === 'sara') {
      onOpenSara?.()
      return
    }
    if (item.id === 'guide') {
      try {
        localStorage.setItem(LAST_GUIDE_VISIT_KEY, new Date().toISOString())
        setHasNew(false)
      } catch {}
    }
    router.visit(item.href)
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">

      {/* Menu contextuel */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Menu d'aide SECRETIS"
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden w-60 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#1A3A5C] text-white">
            <p className="font-semibold text-sm">Besoin d'aide ?</p>
            <p className="text-xs text-blue-200 mt-0.5">Choisissez une option</p>
          </div>

          {/* Items */}
          <div className="py-1">
            {MENU_ITEMS.map(item => (
              <button
                key={item.id}
                role="menuitem"
                onClick={() => handleItem(item)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <span className="text-xl flex-shrink-0" aria-hidden="true">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</span>
                    {item.id === 'guide' && hasNew && (
                      <span className="px-1.5 py-0.5 bg-[#F39C12] text-white text-xs rounded-full font-semibold leading-none">
                        Nouveau
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 text-center">SECRETIS ERP — Support inclus</p>
          </div>
        </div>
      )}

      {/* Bouton principal */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label={open ? "Fermer le menu d'aide" : "Ouvrir le menu d'aide"}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`
          relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2E86C1]
          ${open
            ? 'bg-gray-700 dark:bg-gray-600 text-white rotate-0'
            : 'bg-[#2E86C1] hover:bg-[#1A3A5C] text-white hover:scale-105'
          }
        `}
      >
        {open ? <CloseIcon /> : <QuestionIcon />}

        {/* Badge "nouveau article" */}
        {!open && hasNew && (
          <span
            aria-label="Nouveau contenu disponible"
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#F39C12] rounded-full flex items-center justify-center"
          >
            <span className="text-white text-xs font-bold leading-none">!</span>
          </span>
        )}
      </button>
    </div>
  )
}
