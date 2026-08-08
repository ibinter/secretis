/**
 * SECRETIS ERP — UpdatePrompt.jsx
 * Toast de mise à jour PWA — affiché quand un nouveau SW est en attente.
 * Géré via usePwa().updateAvailable
 */

import React, { useState, useEffect } from 'react';
import usePwa from '@/hooks/usePwa';

export default function UpdatePrompt() {
  const { updateAvailable, updateApp, forceUpdate } = usePwa();
  const [dismissed,   setDismissed]   = useState(false);
  const [isUpdating,  setIsUpdating]  = useState(false);
  const [showForce,   setShowForce]   = useState(false);

  // Si la mise à jour normale n'aboutit pas (Service Worker bloqué, cache
  // corrompu), proposer la purge complète au bout de 5 s.
  useEffect(() => {
    if (!isUpdating) return;
    const t = setTimeout(() => setShowForce(true), 5000);
    return () => clearTimeout(t);
  }, [isUpdating]);

  if (!updateAvailable || dismissed) return null;

  const handleUpdate = () => {
    setIsUpdating(true);
    updateApp();
    // La page se rechargera automatiquement via l'événement controllerchange
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[toast] w-[calc(100vw-2rem)] max-w-md animate-slide-up"
    >
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border border-white/10 bg-[#9333EA] dark:bg-[#0C1E30] text-white">
        {/* Indicateur de mise à jour */}
        <div className="shrink-0 w-9 h-9 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-4.5 h-4.5 text-accent">
            <path d="M10 3v4m0 0l-2-2m2 2l2-2" />
            <path d="M5 10a5 5 0 1010 0" />
          </svg>
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">Nouvelle version disponible</p>
          <p className="text-xs text-white/65 mt-0.5">SECRETIS a été mis à jour. Rechargez pour en profiter.</p>

          {/* Filet de sécurité : purge complète si la mise à jour reste bloquée */}
          {showForce && (
            <button
              onClick={forceUpdate}
              className="mt-1 text-[11px] font-semibold text-accent underline underline-offset-2 hover:text-white transition-colors"
            >
              La mise à jour ne se termine pas ? Vider le cache et forcer
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-accent hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 whitespace-nowrap"
          >
            {isUpdating ? (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
                </svg>
                Mise à jour…
              </span>
            ) : 'Mettre à jour'}
          </button>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Plus tard"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
export { UpdatePrompt };
