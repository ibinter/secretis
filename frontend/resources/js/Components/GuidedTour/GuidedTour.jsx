/**
 * SECRETIS ERP — GuidedTour/GuidedTour.jsx v2
 * Visite guidée interactive enrichie — 12 étapes
 *
 * Déclenchée :
 * - À la première connexion post-onboarding (is_tour_done=false)
 * - Via bouton "Visite guidée" dans le Centre d'aide
 * - Via SARA : "Voulez-vous que je vous fasse visiter SECRETIS ?"
 * - Via l'événement custom 'guided-tour:start'
 *
 * 12 étapes :
 *  Dashboard (2) → Agenda (2) → Documents (2) → Tâches (2) → Visiteurs (1) → SARA (2) → Profil (1)
 *
 * Persistance via localStorage('tour_completed').
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// ─── Définition des étapes — 12 étapes ───────────────────────────────────────
const STEPS = [
  // ── Dashboard (2) ──────────────────────────────────────────────────────────
  {
    id: 'nav_menu',
    selector: '[data-tour="main-nav"]',
    title: 'Menu de navigation',
    description: 'Voici votre menu de navigation — tous vos modules accessibles ici. Cliquez sur une icône pour accéder au module correspondant.',
    position: 'right',
    emoji: '🗂️',
    module: 'Dashboard',
  },
  {
    id: 'dashboard',
    selector: '[data-tour="dashboard-widgets"]',
    title: 'Tableau de bord',
    description: 'Vue synthétique de l\'activité de votre organisation : tâches en cours, événements du jour, documents récents. Personnalisez les widgets selon vos besoins.',
    position: 'top',
    emoji: '📊',
    module: 'Dashboard',
  },
  // ── Agenda (2) ─────────────────────────────────────────────────────────────
  {
    id: 'agenda_module',
    selector: '[data-tour="nav-agenda"]',
    title: 'Module Agenda',
    description: 'Gérez vos événements, réunions et réservations de salles. Créez des événements récurrents et invitez vos collaborateurs en quelques clics.',
    position: 'right',
    emoji: '📅',
    module: 'Agenda',
  },
  {
    id: 'notifications',
    selector: '[data-tour="notifications"]',
    title: 'Notifications',
    description: 'Restez informé en temps réel — nouvelles tâches, invitations aux réunions, approbations en attente. Un badge rouge indique des notifications non lues.',
    position: 'bottom',
    emoji: '🔔',
    module: 'Agenda',
  },
  // ── Documents (2) ──────────────────────────────────────────────────────────
  {
    id: 'ged_module',
    selector: '[data-tour="nav-documents"]',
    title: 'Module Documents',
    description: 'La GED (Gestion Électronique de Documents) centralise tous vos fichiers. Importez, classez, partagez et configurez des circuits de validation.',
    position: 'right',
    emoji: '📁',
    module: 'Documents',
  },
  {
    id: 'global_search',
    selector: '[data-tour="global-search"]',
    title: 'Recherche globale',
    description: 'Appuyez sur Ctrl+K pour ouvrir la recherche universelle. Trouvez instantanément n\'importe quel document, tâche, utilisateur ou réunion dans toute l\'application.',
    position: 'bottom',
    emoji: '🔍',
    module: 'Documents',
  },
  // ── Tâches (2) ─────────────────────────────────────────────────────────────
  {
    id: 'tasks_module',
    selector: '[data-tour="nav-tasks"]',
    title: 'Module Tâches & Projets',
    description: 'Pilotez vos projets avec des vues Kanban, Gantt et liste. Affectez des tâches, définissez des priorités et suivez l\'avancement en temps réel.',
    position: 'right',
    emoji: '✅',
    module: 'Tâches',
  },
  {
    id: 'quick_actions',
    selector: '[data-tour="quick-actions"]',
    title: 'Actions rapides',
    description: 'Créez rapidement une tâche, un événement ou importez un document depuis n\'importe quelle page grâce au bouton d\'actions rapides.',
    position: 'bottom-left',
    emoji: '⚡',
    module: 'Tâches',
  },
  // ── Visiteurs (1) ──────────────────────────────────────────────────────────
  {
    id: 'visitors_module',
    selector: '[data-tour="nav-visitors"]',
    title: 'Module Visiteurs',
    description: 'Gérez l\'accueil de vos visiteurs : enregistrement à l\'arrivée, génération de badge imprimable, notification automatique du contact interne et rapport de fréquentation.',
    position: 'right',
    emoji: '👥',
    module: 'Visiteurs',
  },
  // ── SARA (2) ───────────────────────────────────────────────────────────────
  {
    id: 'sara',
    selector: '[data-tour="sara-button"]',
    title: 'Assistante SARA',
    description: 'SARA est votre assistante IA intégrée — disponible à tout moment en bas à droite. Posez-lui n\'importe quelle question sur SECRETIS en langage naturel.',
    position: 'top-left',
    emoji: '🤖',
    module: 'SARA',
  },
  {
    id: 'help_center',
    selector: '[data-tour="help-center"]',
    title: 'Centre d\'aide',
    description: 'Accédez au guide complet, aux FAQ, aux cas pratiques interactifs et au support. Apprenez SECRETIS à votre rythme avec 20 exercices guidés.',
    position: 'bottom-left',
    emoji: '❓',
    module: 'SARA',
  },
  // ── Profil (1) ─────────────────────────────────────────────────────────────
  {
    id: 'user_profile',
    selector: '[data-tour="user-profile"]',
    title: 'Votre profil',
    description: 'Personnalisez votre expérience : langue d\'interface, fuseau horaire, notifications, mot de passe et thème clair/sombre. Déconnectez-vous en toute sécurité.',
    position: 'bottom-left',
    emoji: '👤',
    module: 'Profil',
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

// ─── Modal "Passer la visite" ─────────────────────────────────────────────────
function SkipConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-xs w-full shadow-2xl text-center">
        <div className="text-3xl mb-3">⏭️</div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-2">Passer la visite ?</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Vous pouvez toujours relancer la visite depuis le menu Aide.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Continuer
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#C0392B] hover:bg-red-700 text-white text-sm font-medium transition-colors">
            Passer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de félicitations ───────────────────────────────────────────────────
function CompletionModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Visite terminée !</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Vous connaissez maintenant les fonctionnalités essentielles de SECRETIS. C'est parti !
        </p>
        <div className="space-y-3">
          <a href="/aide/guide"
            className="block w-full bg-[#9333EA] hover:bg-[#7e22ce] text-white font-semibold py-3 rounded-xl transition-colors text-sm">
            📖 Explorer le guide complet
          </a>
          <a href="/aide/cas-pratiques"
            className="block w-full bg-[#F39C12] hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
            🧪 Tester les cas pratiques
          </a>
          <button onClick={onClose}
            className="block w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium py-2 text-sm transition-colors">
            Commencer à travailler →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant Tooltip ────────────────────────────────────────────────────────
function TourTooltip({ step, stepIndex, total, rect, onNext, onPrev, onSkip }) {
  const style = getTooltipStyle(rect, step.position);
  const percent = Math.round(((stepIndex + 1) / total) * 100);

  return (
    <div
      style={{ ...style, width: 320, zIndex: 9999 }}
      className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-800">
        <div className="h-1 bg-gradient-to-r from-[#9333EA] to-[#7e22ce] transition-all duration-400"
          style={{ width: `${percent}%` }} />
      </div>

      {/* En-tête */}
      <div className="bg-gradient-to-r from-[#9333EA] to-[#7e22ce] px-4 py-3 flex items-center gap-2">
        <span className="text-base">{step.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{step.title}</p>
          <p className="text-white/50 text-[10px]">Module : {step.module} • Étape {stepIndex + 1} sur {total}</p>
        </div>
        <button onClick={onSkip} aria-label="Passer la visite"
          className="text-white/60 hover:text-white transition-colors text-xs px-2 py-1 rounded hover:bg-white/10">
          Passer
        </button>
      </div>

      {/* Description */}
      <div className="px-4 py-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.description}</p>
      </div>

      {/* Pied de page */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        {/* Dots de progression */}
        <div className="flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i}
              className={`rounded-full transition-all duration-200 ${
                i === stepIndex
                  ? 'w-4 h-1.5 bg-[#7e22ce]'
                  : i < stepIndex
                  ? 'w-1.5 h-1.5 bg-[#1E8449]'
                  : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <button onClick={onPrev}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              ← Préc.
            </button>
          )}
          <button onClick={onNext}
            className="text-xs bg-[#9333EA] hover:bg-[#7e22ce] text-white px-4 py-2 rounded-xl font-semibold transition-colors">
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
  const [active, setActive]         = useState(autoStart);
  const [stepIdx, setStepIdx]       = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showCompletion, setShowCompletion]    = useState(false);
  const scrollTimeoutRef = useRef(null);

  const step = STEPS[stepIdx];

  // ── Ne pas relancer si déjà terminé ──────────────────────────────────────
  useEffect(() => {
    if (autoStart && localStorage.getItem('tour_completed') === 'true') {
      setActive(false);
    }
  }, [autoStart]);

  // ── Trouver et mettre en valeur l'élément cible ───────────────────────────
  const focusStep = useCallback((idx) => {
    const s = STEPS[idx];
    if (!s) return;
    const el = document.querySelector(s.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }, 400);
    } else {
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
      setShowCompletion(false);
      setShowSkipConfirm(false);
      setActive(true);
    };
    window.addEventListener('guided-tour:start', handleStart);
    return () => window.removeEventListener('guided-tour:start', handleStart);
  }, []);

  // ── Terminer le tour ──────────────────────────────────────────────────────
  const finish = useCallback(async (showModal = false) => {
    setActive(false);
    localStorage.setItem('tour_completed', 'true');
    try {
      await axios.post('/api/v1/onboarding/tour-complete');
    } catch {}
    if (showModal) setShowCompletion(true);
    else onComplete?.();
  }, [onComplete]);

  const handleSkipRequest = () => setShowSkipConfirm(true);
  const handleSkipConfirm = () => { setShowSkipConfirm(false); finish(false); };
  const handleSkipCancel  = () => setShowSkipConfirm(false);

  const next = () => {
    if (stepIdx < TOTAL - 1) {
      setStepIdx(i => i + 1);
    } else {
      finish(true); // Afficher la modal de félicitations
    }
  };

  const prev = () => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  };

  return (
    <>
      {/* Modal "Passer la visite" */}
      {showSkipConfirm && (
        <SkipConfirmModal onConfirm={handleSkipConfirm} onCancel={handleSkipCancel} />
      )}

      {/* Modal félicitations */}
      {showCompletion && (
        <CompletionModal onClose={() => { setShowCompletion(false); onComplete?.(); }} />
      )}

      {active && (
        <>
          {/* Overlay avec découpe spotlight */}
          <Spotlight rect={targetRect} />

          {/* Zone de clic non-bloquante */}
          <div className="fixed inset-0 z-[9991]" />

          {/* Tooltip */}
          <TourTooltip
            step={step}
            stepIndex={stepIdx}
            total={TOTAL}
            rect={targetRect}
            onNext={next}
            onPrev={prev}
            onSkip={handleSkipRequest}
          />

          {/* Raccourci clavier */}
          <KeyboardHandler onNext={next} onPrev={prev} onSkip={handleSkipRequest} />
        </>
      )}
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
export { GuidedTour };
