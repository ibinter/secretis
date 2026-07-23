/**
 * SECRETIS ERP — Onboarding/OnboardingChecklist.jsx
 * Widget flottant de checklist d'onboarding
 *
 * - Barre de progression circulaire
 * - 5 tâches avec checkmark
 * - Réductible/expansible
 * - Disparaît après 100% (avec animation de célébration)
 * - Position : bas à droite, au-dessus du bouton SARA
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';

const STEPS_META = {
  organization_profile:    { label: 'Configurer l\'organisation',       emoji: '🏢', route: '/parametres/organisation' },
  invite_users:            { label: 'Inviter votre premier utilisateur', emoji: '👥', route: '/parametres/utilisateurs' },
  create_first_event:      { label: 'Créer votre premier événement',     emoji: '📅', route: '/agenda' },
  upload_first_document:   { label: 'Importer un document dans la GED',  emoji: '📄', route: '/ged' },
  discover_sara:           { label: 'Découvrir le tableau de bord',      emoji: '🎯', route: '/dashboard' },
};

const DISMISS_KEY = 'onboarding_checklist_dismissed';
const SHOW_DAYS   = 30;

export default function OnboardingChecklist({ organizationCreatedAt }) {
  const [open, setOpen]         = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  );
  const [progress, setProgress]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // ── Vérifier si on est dans la fenêtre des 30 jours ──────────────────────
  const isWithinWindow = useCallback(() => {
    if (!organizationCreatedAt) return true;
    const daysSince = (Date.now() - new Date(organizationCreatedAt).getTime()) / 86400000;
    return daysSince <= SHOW_DAYS;
  }, [organizationCreatedAt]);

  // ── Chargement de la progression ──────────────────────────────────────────
  useEffect(() => {
    if (dismissed || !isWithinWindow()) return;
    setLoading(true);
    axios.get('/api/v1/onboarding/progress')
      .then(({ data }) => {
        setProgress(data);
        // Auto-ouvrir si moins de 50% complété
        if ((data.percentage ?? 0) < 50) setOpen(true);
        // Célébration à 100%
        if ((data.percentage ?? 0) >= 100 && !celebrating) {
          setCelebrating(true);
          setTimeout(() => {
            dismiss();
          }, 3500);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dismissed, isWithinWindow]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed || !isWithinWindow() || (!loading && !progress)) return null;

  const steps    = progress ? Object.keys(STEPS_META) : [];
  const completed = steps.filter(k => progress?.[k]);
  const total     = steps.length;
  const pct       = total ? Math.round((completed.length / total) * 100) : 0;

  // Cercle SVG ──────────────────────────────────────────────────────────────
  const radius    = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={`fixed bottom-24 right-5 z-40 w-72 bg-white rounded-2xl shadow-xl
                  border border-gray-200 overflow-hidden transition-all duration-300
                  ${celebrating ? 'ring-2 ring-green-400 ring-offset-2' : ''}`}
    >
      {/* ── Célébration ───────────────────────────────────────────── */}
      {celebrating && (
        <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center z-10 p-4">
          <div className="text-4xl animate-bounce mb-2">🎉</div>
          <p className="font-bold text-gray-900 text-center">Félicitations !</p>
          <p className="text-sm text-gray-500 text-center mt-1">
            Vous avez complété toutes les étapes de démarrage.
          </p>
        </div>
      )}

      {/* ── En-tête ───────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
        aria-expanded={open}
        aria-label="Progression de l'onboarding"
      >
        {/* Cercle de progression */}
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle
              cx="25" cy="25" r={radius}
              fill="none"
              stroke={pct >= 100 ? '#22c55e' : '#3b82f6'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
            {loading ? '...' : `${pct}%`}
          </span>
        </div>

        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-gray-800">Prise en main</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {completed.length}/{total} étapes complétées
          </p>
        </div>

        {/* Flèche */}
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Corps (steps) ─────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-gray-100">
          <div className="p-3 space-y-1">
            {steps.map(key => {
              const meta  = STEPS_META[key];
              const done  = progress?.[key] ?? false;
              return (
                <button
                  key={key}
                  onClick={() => router.visit(meta.route)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                               text-left transition-colors group
                               ${done ? 'opacity-60' : 'hover:bg-blue-50'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0
                                   text-xs font-bold transition-all
                                   ${done
                                     ? 'bg-green-500 text-white'
                                     : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100'}`}>
                    {done ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{meta.emoji}</span>
                    )}
                  </div>
                  <span className={`text-xs flex-1 leading-tight
                                    ${done ? 'line-through text-gray-400' : 'text-gray-700 group-hover:text-blue-700'}`}>
                    {meta.label}
                  </span>
                  {!done && (
                    <svg className="w-3 h-3 text-gray-300 group-hover:text-blue-400" fill="none"
                      stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pied de page */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-400">
              Encore {SHOW_DAYS - Math.round((Date.now() - new Date(organizationCreatedAt).getTime()) / 86400000)} jours
            </span>
            <button
              onClick={dismiss}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              Masquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
