/**
 * IBIG SECRETIS — AccessibleModal.jsx
 * Version accessible de ConfirmModal — WCAG 2.1 AA
 *
 * Conformité :
 *   - role="dialog" + aria-modal="true" (criterion 4.1.2)
 *   - aria-labelledby + aria-describedby (criterion 1.3.1)
 *   - Focus piégé à l'intérieur (criterion 2.1.2)
 *   - Fermeture par Escape (criterion 2.1.1)
 *   - Focus restauré à la fermeture (criterion 2.4.3)
 *   - Annonce ARIA à l'ouverture (criterion 4.1.3)
 *   - Fond semi-transparent non interactif (aria-hidden)
 *   - Mode sombre complet
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { generateId, announceToScreenReader } from '@/utils/accessibility';

// ─── Icônes ───────────────────────────────────────────────────────────────────
const Icons = {
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Spinner: () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
};

const VARIANTS = {
  danger: {
    icon:      <Icons.Trash />,
    iconBg:    'bg-red-100 dark:bg-[#2b0d0d]',
    iconColor: 'text-red-600 dark:text-[#eb5757]',
    btn:       'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500',
  },
  warning: {
    icon:      <Icons.Warning />,
    iconBg:    'bg-orange-100 dark:bg-[#2b1a0d]',
    iconColor: 'text-orange-600 dark:text-[#f2994a]',
    btn:       'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 focus:ring-orange-500',
  },
  primary: {
    icon:      <Icons.Check />,
    iconBg:    'bg-blue-100 dark:bg-[#0a1a2e]',
    iconColor: 'text-blue-600 dark:text-[#64b5f6]',
    btn:       'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500',
  },
  info: {
    icon:      <Icons.Info />,
    iconBg:    'bg-cyan-100 dark:bg-[#0a1a2e]',
    iconColor: 'text-cyan-600 dark:text-[#64b5f6]',
    btn:       'bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-600 focus:ring-cyan-500',
  },
};

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

// ─── Composant principal ──────────────────────────────────────────────────────
export default function AccessibleModal({
  open            = false,
  title           = 'Confirmation',
  message,
  confirmLabel    = 'Confirmer',
  confirmVariant  = 'primary',
  cancelLabel     = 'Annuler',
  onConfirm,
  onCancel,
  cooldown        = 0,
  loading         = false,
  icon,
  size            = 'md',
  children,
}) {
  const [countdown, setCountdown]   = useState(cooldown);
  const [confirming, setConfirming] = useState(false);

  // IDs stables pour aria-labelledby / aria-describedby
  const titleId   = useRef(generateId('modal-title')).current;
  const descId    = useRef(generateId('modal-desc')).current;
  const cancelRef = useRef(null);

  const variant = VARIANTS[confirmVariant] || VARIANTS.primary;

  // Focus trap
  const { trapRef } = useFocusTrap({
    active:  open,
    onEscape: () => !confirming && !loading && onCancel?.(),
    initialFocus: '[data-modal-cancel]',
    returnFocus: true,
  });

  // Cooldown timer
  useEffect(() => {
    if (!open) { setCountdown(cooldown); setConfirming(false); return; }
    if (cooldown <= 0) { setCountdown(0); return; }
    setCountdown(cooldown);
    const timer = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [open, cooldown]);

  // Annonce ARIA à l'ouverture
  useEffect(() => {
    if (open) {
      announceToScreenReader(`Dialogue ouvert : ${title}`, 'assertive');
    }
  }, [open, title]);

  // Prévenir le scroll du body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Masquer le reste du contenu aux lecteurs d'écran
      document.getElementById('app')?.setAttribute('aria-hidden', 'true');
    } else {
      document.body.style.overflow = '';
      document.getElementById('app')?.removeAttribute('aria-hidden');
    }
    return () => {
      document.body.style.overflow = '';
      document.getElementById('app')?.removeAttribute('aria-hidden');
    };
  }, [open]);

  const handleConfirm = useCallback(async () => {
    if (countdown > 0 || confirming || loading) return;
    setConfirming(true);
    try { await onConfirm?.(); }
    finally { setConfirming(false); }
  }, [countdown, confirming, loading, onConfirm]);

  if (!open) return null;

  const isDisabled = countdown > 0 || confirming || loading;

  const modal = (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
      aria-hidden="false"
    >
      {/* Fond — aria-hidden pour les SR */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-sm"
        onClick={() => !confirming && !loading && onCancel?.()}
        aria-hidden="true"
      />

      {/* Panneau — dialog */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message || children ? descId : undefined}
        className={`
          relative w-full ${SIZES[size] || SIZES.md}
          bg-white dark:bg-[#1E2D40]
          rounded-2xl shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.70)]
          border border-transparent dark:border-[#2A3F55]
          focus:outline-none
        `}
        style={{ animation: 'accessibleModalIn 0.2s ease-out' }}
        tabIndex={-1}
      >
        {/* Bouton fermer */}
        <button
          onClick={onCancel}
          disabled={confirming || loading}
          className="absolute top-4 right-4 p-1.5
            text-gray-400 hover:text-gray-700
            dark:text-[#6B8BA4] dark:hover:text-[#E8F1FA]
            hover:bg-gray-100 dark:hover:bg-[#243447]
            rounded-lg transition-colors
            disabled:opacity-0
            focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#2E86C1]"
          aria-label="Fermer la fenêtre de dialogue"
        >
          <Icons.X />
        </button>

        <div className="p-6">
          {/* Icône + Titre */}
          <div className="flex items-start gap-4 mb-4">
            {icon !== undefined ? (
              typeof icon === 'string'
                ? <span className="text-4xl flex-shrink-0" aria-hidden="true">{icon}</span>
                : <div className="flex-shrink-0" aria-hidden="true">{icon}</div>
            ) : (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                ${variant.iconBg} ${variant.iconColor}`}
                aria-hidden="true">
                {variant.icon}
              </div>
            )}

            <div className="flex-1 min-w-0 pt-1">
              <h2
                id={titleId}
                className="text-lg font-bold text-gray-900 dark:text-[#E8F1FA] leading-tight"
              >
                {title}
              </h2>

              {(message || children) && (
                <div
                  id={descId}
                  className="mt-1.5 text-sm text-gray-600 dark:text-[#A8C0D6] leading-relaxed"
                >
                  {children || (typeof message === 'string' ? <p>{message}</p> : message)}
                </div>
              )}
            </div>
          </div>

          {/* Barre de cooldown */}
          {cooldown > 0 && countdown > 0 && (
            <div className="mb-4" role="timer" aria-label={`Disponible dans ${countdown} secondes`}>
              <div className="flex items-center justify-between text-xs mb-1.5
                text-gray-500 dark:text-[#6B8BA4]">
                <span>Disponible dans</span>
                <span className="font-semibold text-gray-700 dark:text-[#A8C0D6]">{countdown}s</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-[#2A3F55] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${((cooldown - countdown) / cooldown) * 100}%`,
                    backgroundColor: confirmVariant === 'danger' ? '#ef4444'
                      : confirmVariant === 'warning' ? '#f97316' : '#2563eb',
                  }}
                  aria-hidden="true"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            <button
              ref={cancelRef}
              data-modal-cancel
              onClick={onCancel}
              disabled={confirming || loading}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all
                border-2 border-gray-200 dark:border-[#2A3F55]
                text-gray-700 dark:text-[#A8C0D6]
                hover:bg-gray-50 dark:hover:bg-[#243447]
                focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-[#2A3F55]
                focus:ring-offset-2 dark:focus:ring-offset-[#1E2D40]
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelLabel}
            </button>

            <button
              onClick={handleConfirm}
              disabled={isDisabled}
              aria-disabled={isDisabled}
              aria-describedby={countdown > 0 ? `${descId}-cooldown` : undefined}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white
                focus:outline-none focus:ring-2 focus:ring-offset-2
                dark:focus:ring-offset-[#1E2D40]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150
                flex items-center justify-center gap-2
                ${variant.btn}
              `}
            >
              {(confirming || loading) && <Icons.Spinner />}
              {countdown > 0
                ? `${confirmLabel} (${countdown}s)`
                : confirming || loading ? 'En cours…'
                : confirmLabel
              }
            </button>

            {countdown > 0 && (
              <span id={`${descId}-cooldown`} className="sr-only">
                Disponible dans {countdown} secondes
              </span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes accessibleModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes accessibleModalIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}

// ─── Hook utilitaire ──────────────────────────────────────────────────────────
export { useConfirmModal } from '@/Components/UI/ConfirmModal';
