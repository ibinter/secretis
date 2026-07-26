import React, { useState, useEffect, useCallback } from 'react';

/**
 * Détecte un nouveau Service Worker en attente et propose la mise à jour.
 * Envoie SKIP_WAITING + recharge la page au clic.
 */
export default function UpdateNotifier() {
  const [waitingWorker, setWaitingWorker] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const detectUpdate = useCallback(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      // Worker déjà en attente au moment du chargement
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowToast(true);
      }

      // Écouter les mises à jour futures
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (
            newWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(newWorker);
            setShowToast(true);
          }
        });
      });
    });

    // Recharger automatiquement quand le SW prend le contrôle
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  useEffect(() => {
    detectUpdate();
    // Vérifier les mises à jour toutes les heures
    const interval = setInterval(() => {
      navigator.serviceWorker?.ready.then((reg) => reg.update());
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [detectUpdate]);

  const handleUpdate = () => {
    if (!waitingWorker) return;
    setIsUpdating(true);
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    // La page se rechargera via l'événement controllerchange
  };

  const handleDismiss = () => {
    setShowToast(false);
  };

  if (!showToast) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: '#9333EA',
        color: '#fff',
        borderRadius: 10,
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        maxWidth: 420,
        width: 'calc(100vw - 40px)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        animation: 'secretis-slide-up 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes secretis-slide-up {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* Icône mise à jour */}
      <div
        style={{
          width: 36,
          height: 36,
          background: 'rgba(243,156,18,0.2)',
          border: '2px solid #F39C12',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: 16
        }}
      >
        ↑
      </div>

      {/* Texte */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
          Nouvelle version disponible
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
          SECRETIS a été mis à jour. Rechargez pour en profiter.
        </div>
      </div>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          style={{
            background: '#F39C12',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '7px 12px',
            fontWeight: 600,
            fontSize: 13,
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            opacity: isUpdating ? 0.7 : 1,
            whiteSpace: 'nowrap'
          }}
        >
          {isUpdating ? '...' : 'Mettre à jour'}
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Plus tard"
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            padding: '7px 9px',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
export { UpdateNotifier };
