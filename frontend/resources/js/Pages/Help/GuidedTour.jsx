import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Map } from 'lucide-react';

/**
 * GuidedTour — Visite guidée interactive SECRETIS
 *
 * Déclenchée automatiquement au premier login (localStorage key: secretis_tour_completed).
 * Accessible également via Aide > Visite guidée.
 *
 * Props:
 *   isOpen        {boolean}  — contrôle l'affichage depuis le parent
 *   onClose       {Function} — callback quand l'utilisateur ferme ou termine
 *   forceShow     {boolean}  — ignorer le localStorage (pour les tests / relance manuelle)
 */

const TOUR_STEPS = [
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    description:
      "Bienvenue sur IBIG SECRETIS ! Votre tableau de bord centralise toutes les informations clés de votre journée : événements à venir, courriers en attente, tâches assignées et activité récente de votre équipe.",
    target: '[data-tour="dashboard"]',
    placement: 'bottom',
    icon: '🏠',
  },
  {
    id: 'sara',
    title: 'SARA — Votre assistante IA',
    description:
      "SARA est votre secrétaire artificielle intégrée. Elle peut trouver des créneaux libres, extraire des décisions de vos réunions, rédiger des synthèses et vous alerter sur les urgences. Cliquez sur SARA ✨ pour démarrer une conversation.",
    target: '[data-tour="sara-button"]',
    placement: 'bottom-end',
    icon: '✨',
  },
  {
    id: 'agenda',
    title: 'Agenda & Planning',
    description:
      "Gérez vos événements, réservez des salles et invitez des participants directement depuis l'agenda. Les vues Mois, Semaine et Jour s'adaptent à vos besoins. L'agenda est synchronisable avec Google Calendar et Outlook via le format ICS.",
    target: '[data-tour="nav-agenda"]',
    placement: 'right',
    icon: '📅',
  },
  {
    id: 'courrier',
    title: 'Courrier & GED',
    description:
      "Enregistrez, numérotez automatiquement et suivez tous les courriers entrants et sortants. La GED (Gestion Électronique des Documents) vous permet d'organiser, partager et rechercher tous les documents de l'organisation.",
    target: '[data-tour="nav-courrier"]',
    placement: 'right',
    icon: '📬',
  },
  {
    id: 'reunions',
    title: 'Réunions',
    description:
      "Planifiez vos réunions, rédigez les ordres du jour et conduisez-les en mode temps réel. SARA peut extraire automatiquement les décisions de vos notes et les transformer en tâches assignées.",
    target: '[data-tour="nav-reunions"]',
    placement: 'right',
    icon: '🤝',
  },
  {
    id: 'taches',
    title: 'Tâches & Projets',
    description:
      "Organisez le travail de votre équipe en Kanban, Liste ou Gantt. Créez des projets, définissez des dépendances et suivez l'avancement en temps réel. Les alertes automatiques vous préviennent avant les échéances.",
    target: '[data-tour="nav-taches"]',
    placement: 'right',
    icon: '✅',
  },
  {
    id: 'communication',
    title: 'Communication',
    description:
      "Échangez des messages directs, créez des groupes, diffusez des circulaires avec suivi des accusés de réception et publiez des annonces sur le tableau d'affichage. L'annuaire centralisé regroupe tous vos contacts internes et externes.",
    target: '[data-tour="nav-communication"]',
    placement: 'right',
    icon: '💬',
  },
  {
    id: 'accueil',
    title: 'Accueil Visiteurs',
    description:
      "Enregistrez les visiteurs, imprimez des badges, gérez la file d'attente virtuelle et configurez le portail de prise de RDV en ligne. Le rapport journalier est généré automatiquement.",
    target: '[data-tour="nav-accueil"]',
    placement: 'right',
    icon: '🏛️',
  },
  {
    id: 'notifications',
    title: 'Notifications en temps réel',
    description:
      "Toutes vos alertes SECRETIS apparaissent ici : nouvelles assignations, rappels d'échéance, demandes de validation et messages. Vous pouvez configurer les canaux (email, WhatsApp) dans vos préférences.",
    target: '[data-tour="notifications-bell"]',
    placement: 'bottom-start',
    icon: '🔔',
  },
  {
    id: 'profile',
    title: 'Votre profil & Préférences',
    description:
      "Accédez à votre profil pour modifier vos informations, changer votre mot de passe, personnaliser vos notifications et consulter vos paramètres de confidentialité. C'est également ici que vous trouverez l'accès à l'Académie SECRETIS.",
    target: '[data-tour="user-menu"]',
    placement: 'bottom-end',
    icon: '👤',
  },
];

const STORAGE_KEY = 'secretis_tour_completed';
const TOUR_VERSION = '1.0';

// ─── Calcul du positionnement du tooltip ─────────────────────────────────────

function getTooltipStyle(targetEl, placement) {
  if (!targetEl) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  const rect = targetEl.getBoundingClientRect();
  const tooltipW = 380;
  const tooltipH = 220;
  const gap = 14;

  const positions = {
    bottom: {
      top: rect.bottom + gap,
      left: rect.left + rect.width / 2 - tooltipW / 2,
    },
    'bottom-end': {
      top: rect.bottom + gap,
      left: rect.right - tooltipW,
    },
    'bottom-start': {
      top: rect.bottom + gap,
      left: rect.left,
    },
    right: {
      top: rect.top + rect.height / 2 - tooltipH / 2,
      left: rect.right + gap,
    },
    left: {
      top: rect.top + rect.height / 2 - tooltipH / 2,
      left: rect.left - tooltipW - gap,
    },
    top: {
      top: rect.top - tooltipH - gap,
      left: rect.left + rect.width / 2 - tooltipW / 2,
    },
  };

  const pos = positions[placement] || positions.bottom;

  // Garde dans les limites de la fenêtre
  pos.left = Math.max(12, Math.min(pos.left, window.innerWidth - tooltipW - 12));
  pos.top = Math.max(12, Math.min(pos.top, window.innerHeight - tooltipH - 12));

  return { top: pos.top, left: pos.left, width: tooltipW };
}

function getHighlightStyle(targetEl) {
  if (!targetEl) return null;
  const rect = targetEl.getBoundingClientRect();
  return {
    top: rect.top - 6,
    left: rect.left - 6,
    width: rect.width + 12,
    height: rect.height + 12,
  };
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function GuidedTour({ isOpen: isOpenProp, onClose, forceShow = false }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetEl, setTargetEl] = useState(null);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [highlightStyle, setHighlightStyle] = useState(null);
  const rafRef = useRef(null);

  // Décide si la visite doit s'afficher
  const shouldShow = useCallback(() => {
    if (forceShow) return true;
    if (isOpenProp === false) return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { version } = JSON.parse(stored);
        if (version === TOUR_VERSION) return false;
      } catch {
        // JSON invalide → réafficher
      }
    }
    return true;
  }, [isOpenProp, forceShow]);

  useEffect(() => {
    if (shouldShow()) {
      setVisible(true);
      setCurrentStep(0);
    }
  }, [shouldShow]);

  // Met à jour la position du tooltip et du highlight à chaque changement d'étape
  useEffect(() => {
    if (!visible) return;

    const step = TOUR_STEPS[currentStep];
    const el = document.querySelector(step.target);
    setTargetEl(el);

    const update = () => {
      const freshEl = document.querySelector(step.target);
      if (freshEl) {
        setTooltipStyle(getTooltipStyle(freshEl, step.placement));
        setHighlightStyle(getHighlightStyle(freshEl));
      } else {
        // Élément non trouvé : centrer le tooltip
        setTooltipStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
        setHighlightStyle(null);
      }
    };

    update();
    // Scroll l'élément cible dans la vue
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Recalcul lors du resize
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [currentStep, visible]);

  const completeTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: TOUR_VERSION, completedAt: Date.now() }));
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const skipTour = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: TOUR_VERSION, skippedAt: Date.now() }));
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const goNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      completeTour();
    }
  }, [currentStep, completeTour]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  // Raccourci clavier
  useEffect(() => {
    if (!visible) return;
    const handle = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') skipTour();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [visible, goNext, goPrev, skipTour]);

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return createPortal(
    <>
      {/* Overlay sombre avec découpe pour l'élément cible */}
      <div
        className="fixed inset-0 z-[9990] pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      />

      {/* Backdrop cliquable pour fermer */}
      <div
        className="fixed inset-0 z-[9991]"
        onClick={skipTour}
        role="presentation"
      />

      {/* Highlight de l'élément cible */}
      {highlightStyle && (
        <div
          className="fixed z-[9992] rounded-lg pointer-events-none"
          style={{
            ...highlightStyle,
            boxShadow: '0 0 0 4000px rgba(0,0,0,0.55)',
            border: '2px solid #3b82f6',
            transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}

      {/* Tooltip principal */}
      <div
        className="fixed z-[9999] pointer-events-auto"
        style={{
          ...tooltipStyle,
          transition: 'top 0.3s ease, left 0.3s ease',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Visite guidée — Étape ${currentStep + 1} sur ${TOUR_STEPS.length}`}
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden w-[380px]">

          {/* En-tête */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{step.icon}</span>
              <div>
                <p className="text-xs text-purple-200 font-medium uppercase tracking-wider">
                  Étape {currentStep + 1} / {TOUR_STEPS.length}
                </p>
                <h3 className="text-white font-bold text-base leading-tight">{step.title}</h3>
              </div>
            </div>
            <button
              onClick={skipTour}
              className="text-purple-200 hover:text-white transition-colors p-1 rounded-md hover:bg-purple-500/40"
              aria-label="Ignorer la visite guidée"
            >
              <X size={18} />
            </button>
          </div>

          {/* Barre de progression */}
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full bg-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Corps */}
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Indicateurs d'étapes (dots) */}
          <div className="px-5 pb-2 flex justify-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 bg-purple-600'
                    : i < currentStep
                    ? 'w-2 bg-purple-300'
                    : 'w-2 bg-gray-200 dark:bg-gray-700'
                }`}
                aria-label={`Aller à l'étape ${i + 1}`}
              />
            ))}
          </div>

          {/* Pied — Actions */}
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
            <button
              onClick={skipTour}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Ignorer la visite
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={currentStep === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Étape précédente"
              >
                <ChevronLeft size={16} />
                Précédent
              </button>

              <button
                onClick={goNext}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
                aria-label={isLast ? 'Terminer la visite guidée' : 'Étape suivante'}
              >
                {isLast ? (
                  <>Terminer ✓</>
                ) : (
                  <>
                    Suivant
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ─── Hook utilitaire ──────────────────────────────────────────────────────────

/**
 * useGuidedTour — Hook pour déclencher la visite guidée depuis n'importe quel composant.
 *
 * Usage :
 *   const { openTour, TourComponent } = useGuidedTour();
 *   // Dans le JSX : <TourComponent />
 *   // Pour déclencher : <button onClick={openTour}>Reprendre la visite</button>
 */
export function useGuidedTour() {
  const [isOpen, setIsOpen] = useState(false);

  const openTour = useCallback(() => setIsOpen(true), []);
  const closeTour = useCallback(() => setIsOpen(false), []);

  const TourComponent = useCallback(
    () => <GuidedTour isOpen={isOpen} onClose={closeTour} forceShow={isOpen} />,
    [isOpen, closeTour],
  );

  return { openTour, closeTour, TourComponent };
}

// ─── Bouton de relance (à placer dans le menu Aide) ──────────────────────────

export function GuidedTourLauncher() {
  const { openTour, TourComponent } = useGuidedTour();

  return (
    <>
      <button
        onClick={openTour}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Map size={16} className="text-purple-500" />
        Visite guidée interactive
      </button>
      <TourComponent />
    </>
  );
}
