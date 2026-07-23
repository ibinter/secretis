/**
 * SECRETIS ERP — OfflineIndicator.jsx
 * Barre d'alerte hors-ligne : fine, pleine largeur, orange pulsé.
 * Affiche le nombre d'actions en attente de synchronisation.
 * Slide-up quand la connexion est rétablie.
 */

import React, { useState, useEffect } from 'react';
import usePwa from '@/hooks/usePwa';

export default function OfflineIndicator() {
  const { isOnline, pendingSyncCount, syncNow } = usePwa();
  const [visible,  setVisible]  = useState(false);
  const [syncing,  setSyncing]  = useState(false);
  const [leaving,  setLeaving]  = useState(false);

  // Gérer l'animation d'apparition / disparition
  useEffect(() => {
    if (!isOnline) {
      setLeaving(false);
      setVisible(true);
    } else if (visible) {
      // Afficher brièvement "Reconnecté" puis masquer
      setLeaving(true);
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSync = async () => {
    setSyncing(true);
    await syncNow();
    setSyncing(false);
  };

  if (!visible) return null;

  if (leaving) {
    // État de reconnexion
    return (
      <div
        role="status"
        aria-live="polite"
        className="relative z-[header] w-full flex items-center justify-center gap-2 px-4 py-1.5 bg-success text-white text-xs font-medium transition-all duration-500 animate-fade-in print:hidden"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
        Connexion rétablie
        {pendingSyncCount > 0 && (
          <span className="ml-1 opacity-90">— synchronisation en cours…</span>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="relative z-[header] w-full print:hidden"
    >
      {/* Barre principale */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/95 dark:bg-warning text-white text-xs font-medium">
        {/* Point pulsé */}
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>

        <span className="flex-1 min-w-0 truncate">
          Mode hors ligne
          {pendingSyncCount > 0 && (
            <> — <strong>{pendingSyncCount}</strong> action{pendingSyncCount > 1 ? 's' : ''} en attente de synchronisation</>
          )}
        </span>

        {/* Bouton sync manuel */}
        {pendingSyncCount > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 disabled:opacity-60 transition-colors text-[11px] font-semibold"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            >
              <path d="M4 10a6 6 0 1112 0" />
              <path d="M14 8l2 2-2 2" />
            </svg>
            {syncing ? 'Sync…' : 'Sync'}
          </button>
        )}
      </div>
    </div>
  );
}
