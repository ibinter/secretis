/**
 * SECRETIS ERP — Pages/Offline.jsx
 * Page hors-ligne React (Inertia).
 * - Illustration SVG SECRETIS
 * - Auto-reload quand connexion rétablie
 * - Liste des actions en attente de synchronisation
 */

import React, { useState, useEffect, useCallback } from 'react';
import usePwa from '@/hooks/usePwa';

// ── Illustration SVG hors-ligne ───────────────────────────────────────────────
function OfflineIllustration() {
  return (
    <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-48 h-36 mx-auto mb-6" role="img" aria-label="Connexion hors ligne">
      {/* Nuage */}
      <ellipse cx="120" cy="95" rx="58" ry="38" fill="#E8F4FB" className="dark:fill-[#1E3048]" />
      <ellipse cx="95"  cy="106" rx="35" ry="30" fill="#E8F4FB" className="dark:fill-[#1E3048]" />
      <ellipse cx="148" cy="108" rx="28" ry="24" fill="#E8F4FB" className="dark:fill-[#1E3048]" />

      {/* Barre rouge diagonale */}
      <line x1="68" y1="60" x2="172" y2="140" stroke="#C0392B" strokeWidth="6" strokeLinecap="round" />

      {/* Antenne / signal barré */}
      <path d="M100 75 Q120 55 140 75" stroke="#7e22ce" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.4" />
      <path d="M90 65 Q120 40 150 65" stroke="#7e22ce" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.2" />

      {/* Point central */}
      <circle cx="120" cy="82" r="5" fill="#9333EA" className="dark:fill-[#A8C0D6]" />

      {/* Gouttes de pluie */}
      <rect x="100" y="135" width="4" height="12" rx="2" fill="#7e22ce" opacity="0.5" />
      <rect x="118" y="140" width="4" height="10" rx="2" fill="#7e22ce" opacity="0.4" />
      <rect x="136" y="133" width="4" height="14" rx="2" fill="#7e22ce" opacity="0.5" />
    </svg>
  );
}

// ── Élément d'action en attente ───────────────────────────────────────────────
function PendingItem({ label, time }) {
  return (
    <li className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-[#1E3048] last:border-0">
      <span className="shrink-0 w-2 h-2 rounded-full bg-warning animate-pulse" aria-hidden="true" />
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{label}</span>
      {time && (
        <time className="shrink-0 text-xs text-gray-400 dark:text-gray-500 font-mono tabular-nums">
          {time}
        </time>
      )}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Offline() {
  const { isOnline, pendingSyncCount, syncNow } = usePwa();
  const [pendingItems, setPendingItems] = useState([]);
  const [syncing,      setSyncing]      = useState(false);
  const [retrying,     setRetrying]     = useState(false);

  // Recharger dès la reconnexion
  useEffect(() => {
    if (isOnline) {
      setRetrying(true);
      const t = setTimeout(() => window.location.reload(), 800);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  // Écoute des mises à jour de la file d'attente IndexedDB
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = ({ data }) => {
      if (data?.type === 'action-queued' || data?.type === 'action-synced') {
        // Rafraîchir le compteur via usePwa
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  const handleRetry = useCallback(() => {
    setRetrying(true);
    window.location.reload();
  }, []);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    await syncNow();
    setSyncing(false);
  }, [syncNow]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-50 dark:bg-[#0F1923]">
      <div className="w-full max-w-md text-center">

        {/* Illustration */}
        <OfflineIllustration />

        {/* Titre */}
        <h1 className="text-2xl font-bold text-[#9333EA] dark:text-white text-balance mb-3">
          {retrying ? 'Reconnexion en cours…' : 'Vous êtes hors ligne'}
        </h1>

        {/* Description */}
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
          {retrying
            ? 'Connexion détectée, rechargement en cours…'
            : 'Vérifiez votre connexion internet. Les données disponibles en cache restent accessibles en lecture.'}
        </p>

        {/* Actions disponibles hors ligne */}
        <div className="mb-6 bg-white dark:bg-[#162032] rounded-xl border border-gray-100 dark:border-[#1E3048] shadow-sm text-left p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 px-1">
            Disponible hors ligne
          </h2>
          <ul>
            <PendingItem label="Consulter l'agenda (données mises en cache)" />
            <PendingItem label="Lire les tâches et courriers récents" />
            <PendingItem label="Accéder aux documents GED téléchargés" />
            <PendingItem label="Consulter les contacts de l'annuaire" />
          </ul>
        </div>

        {/* Actions en attente de sync */}
        {pendingSyncCount > 0 && (
          <div className="mb-6 bg-white dark:bg-[#162032] rounded-xl border border-warning/30 dark:border-warning/20 shadow-sm text-left p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-warning dark:text-warning/90">
                En attente de synchronisation
              </h2>
              <span className="px-2 py-0.5 bg-warning/15 text-warning text-xs font-bold rounded-full tabular-nums">
                {pendingSyncCount}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Ces actions seront automatiquement synchronisées dès votre reconnexion.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing || !isOnline}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-warning/40 text-warning text-sm font-medium hover:bg-warning/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true">
                <path d="M4 10a6 6 0 1112 0" /><path d="M14 8l2 2-2 2" />
              </svg>
              {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
            </button>
          </div>
        )}

        {/* Bouton réessayer */}
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#9333EA] dark:bg-secondary hover:bg-[#142D47] dark:hover:bg-secondary/90 disabled:opacity-70 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30 dark:focus:ring-secondary/30"
        >
          {retrying ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
              </svg>
              Reconnexion…
            </>
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className="w-4 h-4" aria-hidden="true">
                <path d="M4 10a6 6 0 1112 0" /><path d="M14 8l2 2-2 2" />
              </svg>
              Réessayer la connexion
            </>
          )}
        </button>

        {/* Footer */}
        <p className="mt-8 text-xs text-gray-300 dark:text-gray-600">
          IBIG SECRETIS — ERP Secrétariat
        </p>
      </div>
    </div>
  );
}
export { Offline };
