/**
 * SECRETIS ERP — ConfirmModal.jsx
 * Modal de confirmation réutilisable avec cooldown optionnel
 *
 * Props :
 *   title           string   — titre de la modal
 *   message         string   — corps du message (supporte JSX)
 *   confirmLabel    string   — libellé bouton confirmer (défaut "Confirmer")
 *   confirmVariant  'danger' | 'primary' | 'warning'  (défaut 'primary')
 *   cancelLabel     string   — libellé bouton annuler (défaut "Annuler")
 *   onConfirm       () => void | Promise<void>
 *   onCancel        () => void
 *   open            boolean  — contrôle l'affichage
 *   cooldown        number   — secondes avant que Confirmer soit actif (défaut 0)
 *   loading         boolean  — état chargement (affiché après onConfirm)
 *   icon            ReactNode | string (emoji) — icône décorative
 *   size            'sm' | 'md' | 'lg'  (défaut 'md')
 *
 * @example
 *   <ConfirmModal
 *     open={showDelete}
 *     title="Supprimer le document"
 *     message="Cette action est irréversible."
 *     confirmLabel="Supprimer"
 *     confirmVariant="danger"
 *     cooldown={3}
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDelete(false)}
 *   />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── Icônes ───────────────────────────────────────────────────────────────────
const Icon = {
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Info: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Spinner: () => (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  ),
};

// ─── Configuration des variantes ──────────────────────────────────────────────
const VARIANTS = {
  danger: {
    icon:   <Icon.Trash />,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    btn:    'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  },
  warning: {
    icon:   <Icon.Warning />,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    btn:    'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
  },
  primary: {
    icon:   <Icon.Check />,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    btn:    'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
  },
  info: {
    icon:   <Icon.Info />,
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    btn:    'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500',
  },
};

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ConfirmModal({
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
}) {
  const [countdown, setCountdown]   = useState(cooldown);
  const [confirming, setConfirming] = useState(false);
  const confirmBtnRef               = useRef(null);
  const cancelBtnRef                = useRef(null);
  const variant = VARIANTS[confirmVariant] || VARIANTS.primary;

  // ── Gestion du cooldown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setCountdown(cooldown);
      setConfirming(false);
      return;
    }
    if (cooldown <= 0) {
      setCountdown(0);
      return;
    }
    setCountdown(cooldown);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open, cooldown]);

  // ── Focus trap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      // Focus sur le bouton Annuler par défaut (safer)
      setTimeout(() => cancelBtnRef.current?.focus(), 50);
    }
  }, [open]);

  // ── Fermeture au clavier Échap ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape' && !confirming && !loading) onCancel?.();
      if (e.key === 'Enter' && countdown === 0 && !confirming && !loading) handleConfirm();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, countdown, confirming, loading]);

  // ── Prévenir le scroll du body ───────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ── Confirmation ─────────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (countdown > 0 || confirming || loading) return;
    setConfirming(true);
    try {
      await onConfirm?.();
    } finally {
      setConfirming(false);
    }
  }, [countdown, confirming, loading, onConfirm]);

  if (!open) return null;

  const isDisabled = countdown > 0 || confirming || loading;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby={message ? 'confirm-modal-description' : undefined}
    >
      {/* Fond semi-transparent */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !confirming && !loading && onCancel?.()}
        aria-hidden="true"
      />

      {/* Panneau */}
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${SIZES[size] || SIZES.md}
          animate-in fade-in zoom-in-95 duration-200`}
        style={{
          animation: 'modalIn 0.2s ease-out',
        }}
      >
        {/* Bouton fermer */}
        <button
          onClick={onCancel}
          disabled={confirming || loading}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700
            hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-0"
          aria-label="Fermer"
        >
          <Icon.X />
        </button>

        <div className="p-6">
          {/* Icône */}
          <div className="flex items-start gap-4 mb-4">
            {icon !== undefined ? (
              typeof icon === 'string'
                ? <span className="text-4xl flex-shrink-0">{icon}</span>
                : <div className="flex-shrink-0">{icon}</div>
            ) : (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                ${variant.iconBg} ${variant.iconColor}`}>
                {variant.icon}
              </div>
            )}

            <div className="flex-1 min-w-0 pt-1">
              <h2
                id="confirm-modal-title"
                className="text-lg font-bold text-gray-900 leading-tight"
              >
                {title}
              </h2>
              {message && (
                <div
                  id="confirm-modal-description"
                  className="mt-1.5 text-sm text-gray-600 leading-relaxed"
                >
                  {typeof message === 'string' ? <p>{message}</p> : message}
                </div>
              )}
            </div>
          </div>

          {/* Barre de cooldown */}
          {cooldown > 0 && countdown > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>Disponible dans</span>
                <span className="font-semibold text-gray-700">{countdown}s</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${((cooldown - countdown) / cooldown) * 100}%`,
                    backgroundColor: confirmVariant === 'danger' ? '#ef4444'
                      : confirmVariant === 'warning' ? '#f97316'
                      : '#2563eb',
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            <button
              ref={cancelBtnRef}
              onClick={onCancel}
              disabled={confirming || loading}
              className="flex-1 py-2.5 px-4 rounded-xl border-2 border-gray-200 text-sm font-semibold
                text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300
                disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {cancelLabel}
            </button>

            <button
              ref={confirmBtnRef}
              onClick={handleConfirm}
              disabled={isDisabled}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white
                focus:outline-none focus:ring-2 focus:ring-offset-1
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150 flex items-center justify-center gap-2
                ${variant.btn}
              `}
            >
              {(confirming || loading) && <Icon.Spinner />}
              {countdown > 0
                ? `${confirmLabel} (${countdown}s)`
                : confirming || loading
                ? 'En cours…'
                : confirmLabel
              }
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );

  // Rendu dans un portal pour éviter les problèmes de z-index
  return createPortal(modal, document.body);
}

// ─── Hook utilitaire pour simplifier l'usage ──────────────────────────────────
/**
 * Hook pour gérer l'état d'une modal de confirmation.
 *
 * @example
 *   const { confirmProps, confirm } = useConfirmModal();
 *
 *   // Déclencher la modal
 *   confirm({
 *     title: "Supprimer ?",
 *     message: "Action irréversible.",
 *     confirmVariant: "danger",
 *     cooldown: 3,
 *     onConfirm: () => handleDelete(id),
 *   });
 *
 *   // Dans le JSX
 *   <ConfirmModal {...confirmProps} />
 */
export function useConfirmModal() {
  const [state, setState] = useState({
    open:    false,
    title:   '',
    message: '',
    confirmLabel:   'Confirmer',
    confirmVariant: 'primary',
    cancelLabel:    'Annuler',
    cooldown:       0,
    icon:           undefined,
    onConfirm:      null,
  });

  const confirm = useCallback(({
    title,
    message,
    confirmLabel   = 'Confirmer',
    confirmVariant = 'primary',
    cancelLabel    = 'Annuler',
    cooldown       = 0,
    icon,
    onConfirm,
  }) => {
    setState({
      open: true,
      title,
      message,
      confirmLabel,
      confirmVariant,
      cancelLabel,
      cooldown,
      icon,
      onConfirm,
    });
  }, []);

  const close = useCallback(() => {
    setState(prev => ({ ...prev, open: false }));
  }, []);

  const confirmProps = {
    open:           state.open,
    title:          state.title,
    message:        state.message,
    confirmLabel:   state.confirmLabel,
    confirmVariant: state.confirmVariant,
    cancelLabel:    state.cancelLabel,
    cooldown:       state.cooldown,
    icon:           state.icon,
    onConfirm:      state.onConfirm,
    onCancel:       close,
  };

  return { confirmProps, confirm, close };
}
export { ConfirmModal };
