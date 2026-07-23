/**
 * SECRETIS ERP — Onboarding/OnboardingChecklist.jsx
 * Widget gamifié d'onboarding — points, badges, barre de progression, confetti
 *
 * - Mini widget compact (collapsed par défaut si > 50 %)
 * - Barre de progression colorée avec pourcentage et score de points
 * - Badge de niveau : Débutant → Initié → Expert → Master
 * - Liste des étapes avec icône, titre, points, bouton "Faire" ou ✓
 * - Animation confetti quand 100 % complété
 * - Persisté via API (onboarding.status / onboarding.complete)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { router } from '@inertiajs/react'

// ─── Niveaux de badges ────────────────────────────────────────────────────────
const LEVELS = [
  { label: 'Débutant', min: 0,   bg: 'bg-gray-100 dark:bg-gray-700',           text: 'text-gray-600 dark:text-gray-300',     icon: '🌱' },
  { label: 'Initié',   min: 201, bg: 'bg-blue-100 dark:bg-blue-900/30',         text: 'text-blue-700 dark:text-blue-300',     icon: '⚡' },
  { label: 'Expert',   min: 401, bg: 'bg-orange-100 dark:bg-orange-900/30',     text: 'text-orange-700 dark:text-orange-300', icon: '🏆' },
  { label: 'Master',   min: 601, bg: 'bg-green-100 dark:bg-green-900/30',       text: 'text-green-700 dark:text-green-300',   icon: '👑' },
]

function resolveLevel(points) {
  let level = LEVELS[0]
  for (const l of LEVELS) { if (points >= l.min) level = l }
  return level
}

// ─── Confetti (CSS-only, pas de lib externe) ──────────────────────────────────
function Confetti({ active }) {
  if (!active) return null
  const particles = Array.from({ length: 24 }, (_, i) => ({
    key: i,
    color: ['#1A3A5C', '#2E86C1', '#F39C12', '#1E8449', '#C0392B', '#9B59B6'][i % 6],
    left: `${(i / 24) * 100}%`,
    delay: `${(i % 8) * 0.12}s`,
    size: `${6 + (i % 4) * 2}px`,
  }))
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" aria-hidden="true">
      {particles.map(p => (
        <span
          key={p.key}
          className="absolute top-0 rounded-sm animate-bounce"
          style={{ left: p.left, width: p.size, height: p.size, backgroundColor: p.color, animationDelay: p.delay, animationDuration: '1s' }}
        />
      ))}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function OnboardingChecklist() {
  const [open, setOpen]           = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [progress, setProgress]   = useState(null)
  const [completing, setCompleting] = useState(null)
  const [celebrating, setCelebrating] = useState(false)
  const prevPercent = useRef(0)

  // ── Charger la progression via API ────────────────────────────────────────
  const fetchProgress = useCallback(async () => {
    try {
      const { data } = await axios.get('/onboarding/status')
      setProgress(data)
      if (data.percent < 50) setOpen(true)
    } catch {
      // non-critique
    }
  }, [])

  useEffect(() => { fetchProgress() }, [fetchProgress])

  // Déclencher confetti à 100 %
  useEffect(() => {
    if (!progress) return
    if (progress.percent === 100 && prevPercent.current < 100) {
      setCelebrating(true)
      setTimeout(() => setCelebrating(false), 3500)
    }
    prevPercent.current = progress.percent
  }, [progress?.percent])

  // ── Compléter une étape ───────────────────────────────────────────────────
  const handleComplete = async (stepKey, routeName) => {
    if (routeName) {
      try { router.visit(window.route(routeName)) } catch { router.visit('/dashboard') }
      return
    }
    setCompleting(stepKey)
    try {
      const { data } = await axios.post('/onboarding/complete', { key: stepKey })
      setProgress(data.progress)
    } finally {
      setCompleting(null)
    }
  }

  // ── Ignorer l'onboarding ──────────────────────────────────────────────────
  const handleSkip = async () => {
    try { await axios.post('/onboarding/skip') } catch {}
    setDismissed(true)
  }

  if (dismissed || !progress) return null

  const level        = resolveLevel(progress.points_earned)
  const nextLevel    = LEVELS[Math.min(LEVELS.indexOf(level) + 1, LEVELS.length - 1)]
  const pendingSteps = (progress.steps ?? []).filter(s => !s.completed)
  const doneSteps    = (progress.steps ?? []).filter(s => s.completed)

  // Widget compact
  if (!open) {
    return (
      <div className="fixed bottom-24 right-6 z-30">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg px-4 py-3 hover:shadow-xl transition-all"
          aria-label="Ouvrir la checklist d'onboarding"
        >
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2E86C1" strokeWidth="3"
                strokeDasharray={`${progress.percent} 100`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#1A3A5C] dark:text-white">
              {progress.percent}%
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Démarrage</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{progress.completed}/{progress.total} · {progress.points_earned} pts</p>
          </div>
          <span className="text-xl flex-shrink-0" aria-hidden="true">{level.icon}</span>
        </button>
      </div>
    )
  }

  // Widget étendu
  return (
    <div className="fixed bottom-24 right-6 z-30 w-80 flex flex-col max-h-[85vh]">
      <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <Confetti active={celebrating} />

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1A3A5C] to-[#2E86C1] px-5 py-4 flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-white text-base">
                {progress.percent === 100 ? '🎉 Félicitations !' : 'Premiers pas'}
              </h3>
              <p className="text-blue-200 text-xs mt-0.5">
                {progress.percent === 100 ? 'Tous les défis complétés !' : `${progress.total - progress.completed} étape(s) restante(s)`}
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Réduire" className="text-blue-200 hover:text-white transition-colors mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
          </div>

          {/* Barre de progression */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-xs text-blue-100">{progress.percent}% complété</span>
              <span className="text-xs text-blue-100 font-semibold">{progress.points_earned} pts</span>
            </div>
            <div className="h-2 bg-blue-800/40 rounded-full overflow-hidden">
              <div className="h-full bg-[#F39C12] rounded-full transition-all duration-700" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>

          {/* Badge niveau */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xl" aria-hidden="true">{level.icon}</span>
            <span className={`px-2.5 py-0.5 ${level.bg} ${level.text} rounded-full text-xs font-semibold`}>{level.label}</span>
            {nextLevel && nextLevel !== level && (
              <span className="text-xs text-blue-200 ml-auto">→ {nextLevel.label} à {nextLevel.min} pts</span>
            )}
          </div>
        </div>

        {/* Étapes en attente */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-700">
          {pendingSteps.map(step => (
            <div key={step.key} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <span className="text-xl flex-shrink-0" aria-hidden="true">{step.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{step.title}</p>
                <span className="text-xs text-[#F39C12] font-semibold">+{step.points} pts</span>
              </div>
              <button
                onClick={() => handleComplete(step.key, step.route_name)}
                disabled={completing === step.key}
                className="flex-shrink-0 px-2.5 py-1.5 bg-[#2E86C1] hover:bg-[#1A3A5C] text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {completing === step.key ? '...' : (step.action_label || 'Faire')}
              </button>
            </div>
          ))}

          {/* Étapes complétées */}
          {doneSteps.length > 0 && (
            <>
              {pendingSteps.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Complétées</p>
                </div>
              )}
              {doneSteps.map(step => (
                <div key={step.key} className="flex items-center gap-3 px-4 py-3 opacity-55">
                  <span className="text-xl flex-shrink-0" aria-hidden="true">{step.icon}</span>
                  <p className="flex-1 text-sm text-gray-400 dark:text-gray-500 line-through truncate">{step.title}</p>
                  <svg className="w-5 h-5 text-[#1E8449] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-label="Complété">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <button onClick={handleSkip} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Ignorer l'onboarding
          </button>
          <span className="text-xs text-gray-400">{progress.completed}/{progress.total} faites</span>
        </div>
      </div>
    </div>
  )
}
