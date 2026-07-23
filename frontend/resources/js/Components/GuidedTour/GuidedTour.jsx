/**
 * SECRETIS ERP — GuidedTour/GuidedTour.jsx
 * Visite guidée interactive de l'interface
 *
 * Déclenchée :
 * - À la première connexion post-onboarding (is_tour_done=false)
 * - Via bouton "Visite guidée" dans le Centre d'aide
 * - Via SARA : "Voulez-vous que je vous fasse visiter SECRETIS ?"
 *
 * 7 étapes avec tooltip positionné sur les éléments :
 *  1. Menu principal
 *  2. Header notifications
 *  3. Recherche globale
 *  4. Tableau de bord
 *  5. SARA
 *  6. Profil utilisateur
 *  7. Centre d'aide
 *
 * Écoute l'événement custom 'guided-tour:start' pour démarrage externe.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// ─── Définition des étapes ────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'nav_menu',
    selector: '[data-tour="main-nav"]',
    title: 'Menu de navigation',
    description: 'Voici votre menu de navigation — tous vos modules accessibles ici. Cliquez sur une icône pour accéder au module correspondant.',
    position: 'right',
    emoji: '🗂️',
  },
  {
    id: 'notifications',
    selector: '[data-tour="notifications"]',
    title: 'Notifications',
    description: 'Restez informé — vos alertes et notifications en temps réel. Un badge rouge indique des notifications non lues.',
    position: 'bottom',
    emoji: '🔔',
  },
  {
    id: 'global_search',
    selector: '[data-tour="global-search"]',
    title: 'Recherche globale',
    description: 'Trouvez n\'importe quoi en tapant Ctrl+K. Recherchez des tâches, documents, utilisateurs, réunions — tout en un seul endroit.',
    position: 'bottom',
    emoji: '🔍',
  },
  {
    id: 'dashboard',
    selector: '[data-tour="dashboard-widgets"]',
    title: 'Tableau de bord',
    description: 'Votre vue synthétique de l\'activité de votre organisation. Personnalisez les widgets selon vos besoins.',
    position: 'top',
    emoji: '📊',
  },
  {
    id: 'sara',
    selector: '[data-tour="sara-button"]',
    title: 'Assistante SARA',
    description: 'Votre assistante IA disponible à tout moment — cliquez ici pour l\'ouvrir. Posez-lui n\'importe quelle question en langage naturel.',
    position: 'top-left',
    emoji: '🤖',
  },
  {
    id: 'user_profile',
    selector: '[data-tour="user-profile"]',
    title: 'Votre profil',
    description: 'Vos préférences, langue, mot de passe et déconnexion. Personnalisez l\'interface selon vos préférences.',
    position: 'bottom-left',
    emoji: '👤',
  },
  {
    id: 'help_center',
    selector: '[data-tour="help-center"]',
    title: 'Centre d\'aide',
    description: 'Notre guide, FAQ et support disponibles à tout moment. Cliquez ici si vous avez besoin d\'aide.',
    position: 'bottom-left',
    emoji: '❓',
  },
];

const TOTAL = STEPS.length;

// ─── Calcul de position du tooltip ───────────────────────────────────────────
function getTooltipStyle(rect, position, tooltipW = 300, tooltipH = 180) {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };

  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top, left;

  switch (position) {
    case 'right':
      top  = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.right + margin;
      break;
    case 'left':
      top  = rect.top + rect.height / 2 - tooltipH / 2;
      left = rect.left - tooltipW - margin;
      break;
    case 'bottom':
      top  = rect.bottom + margin;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case 'top':
      top  = rect.top - tooltipH - margin;
      left = rect.left + rect.width / 2 - tooltipW / 2;
      break;
    case 'top-left':
      top  = rect.top - tooltipH - margin;
      left = rect.right - tooltipW;
      break;
    case 'bottom-left':
      top  = rect.bottom + margin;
      left = rect.right - tooltipW;
      break;
    default:
      top  = rect.bottom + margin;
      left = rect.left;
  }

  // Contraindre dans le viewport
  top  = Math.max(8, Math.min(top,  vh - tooltipH - 8));
  left = Math.max(8, Math.min(left, vw - tooltipW - 8));

  return { top: `${top}px`, left: `${left}px`, position: 'fixed' };
}

// ─── Composant Tooltip ────────────────────────────────────────────────────────
function TourTooltip({ step, stepIndex, total, rect, onNext, onPrev, onSkip }) {
  const style = getTooltipStyle(rect, step.position);

  return (
    <div
      style={{ ...style, width: 300, zIndex: 9999 }}
      className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden
                 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {/* En-tête */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">{step.emoji}</span>
        <span className="text-white font-semibold text-sm flex-1">{step.title}</span>
        <button onClick={onSkip} aria-label="Ignorer la visite"
          className="text-white/60 hover:text-white transition-colors text-lg leading-none">
          ×
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-4">
        <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
      </div>

      {/* Pied de page */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
        {/* Progression */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i}
              className={`h-1.5 rounded-full transition-all
                          ${i === stepIndex ? 'w-4 bg-blue-600' : 'w-1.5 bg-gray-300'}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{stepIndex + 1}/{total}</span>
          {stepIndex > 0 && (
            <button onClick={onPrev}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1
                         rounded hover:bg-gray-200 transition-colors">
              ← Préc.
            </button>
          )}
          <button onClick={onNext}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5
                       rounded-lg font-medium transition-colors">
            {stepIndex === total - 1 ? 'Terminer ✓' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Spotlight Overlay ─────────────────────────────────────────────────────────
function Spotlight({ rect }) {
  if (!rect) return <div className="fixed inset-0 bg-black/50 z-[9990]" />;

  const pad = 8;
  const x   = rect.left   - pad;
  const y   = rect.top    - pad;
  const w   = rect.width  + pad * 2;
  const h   = rect.height + pad * 2;

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} rx="8" fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#spotlight-mask)" />
        <rect x={x} y={y} width={w} height={h} rx="8"
          fill="transparent"
          stroke="rgba(59,130,246,0.8)"
          strokeWidth="2"
          strokeDasharray="6 3"
        >
          <animateTransform
            attributeName="transform" type="rotate"
            from={`0 ${x + w/2} ${y + h/2}`} to={`360 ${x + w/2} ${y + h/2}`}
            dur="8s" repeatCount="indefinite" />
        </rect>
      </svg>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function GuidedTour({ autoStart = false, onComplete }) {
  const [active, setActive]     = useState(autoStart);
  const [stepIdx, setStepIdx]   = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const scrollTimeoutRef = useRef(null);

  const step = STEPS[stepIdx];

  // ── Trouver et mettre en valeur l'élément cible ───────────────────────────
  const focusStep = useCallback((idx) => {
    const s = STEPS[idx];
    if (!s) return;

    const el = document.querySelector(s.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Attendre la fin du scroll avant de positionner
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }, 400);
    } else {
      // Élément non trouvé — continuer quand même
      setTargetRect(null);
    }
  }, []);

  useEffect(() => {
    if (active) focusStep(stepIdx);
  }, [active, stepIdx, focusStep]);

  // ── Écouter l'événement de démarrage externe ─────────────────────────────
  useEffect(() => {
    const handleStart = () => {
      setStepIdx(0);
      setActive(true);
    };
    window.addEventListener('guided-tour:start', handleStart);
    return () => window.removeEventListener('guided-tour:start', handleStart);
  }, []);

  // ── Terminer le tour ──────────────────────────────────────────────────────
  const finish = useCallback(async () => {
    setActive(false);
    try {
      await axios.post('/api/v1/onboarding/tour-complete');
    } catch {}
    onComplete?.();
  }, [onComplete]);

  const next = () => {
    if (stepIdx < TOTAL - 1) {
      setStepIdx(i => i + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  };

  if (!active) return null;

  return (
    <>
      {/* Overlay avec découpe spotlight */}
      <Spotlight rect={targetRect} />

      {/* Zone de clic pour avancer (hors tooltip) */}
      <div className="fixed inset-0 z-[9991]" onClick={() => {}} />

      {/* Tooltip */}
      <TourTooltip
        step={step}
        stepIndex={stepIdx}
        total={TOTAL}
        rect={targetRect}
        onNext={next}
        onPrev={prev}
        onSkip={finish}
      />

      {/* Raccourci clavier */}
      <KeyboardHandler onNext={next} onPrev={prev} onSkip={finish} />
    </>
  );
}

// ─── Gestionnaire clavier ─────────────────────────────────────────────────────
function KeyboardHandler({ onNext, onPrev, onSkip }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); onNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
      else if (e.key === 'Escape') { e.preventDefault(); onSkip(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNext, onPrev, onSkip]);

  return null;
}
