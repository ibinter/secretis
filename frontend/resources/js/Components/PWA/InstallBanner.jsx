/**
 * SECRETIS ERP — InstallBanner.jsx (v2)
 * Bannière d'installation PWA avec design Tailwind dark mode.
 * - Slide-up animé sur mobile, popup centré sur desktop
 * - Instructions iOS Safari
 * - Dismiss 7 jours / permanent
 */

import React, { useState, useEffect, useCallback } from 'react';
import usePwa from '@/hooks/usePwa';

const STORAGE_KEY    = 'secretis_pwa_banner';
const SHOW_DELAY_MS  = 30_000; // 30 secondes après première interaction
const SNOOZE_DAYS    = 7;

function wasDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { dismissedAt, permanent } = JSON.parse(raw);
    if (permanent) return true;
    return Date.now() - dismissedAt < SNOOZE_DAYS * 86_400_000;
  } catch { return false; }
}

function dismiss(permanent = false) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now(), permanent }));
  } catch {}
}

// ── Icône share iOS ────────────────────────────────────────────────────────────
function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="inline w-4 h-4 mx-0.5" aria-hidden="true">
      <path d="M10 2L6.5 5.5M10 2l3.5 3.5M10 2v9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M5 8H3a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1V9a1 1 0 00-1-1h-2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// ── Badge logo ─────────────────────────────────────────────────────────────────
function AppBadge() {
  return (
    <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md" aria-hidden="true">
      <span className="text-white font-black text-sm tracking-tight">S</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function InstallBanner() {
  const { isInstalled, isInstallable, isIos, install } = usePwa();

  const [visible,    setVisible]    = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [leaving,    setLeaving]    = useState(false);

  // Marquer une interaction
  useEffect(() => {
    if (isInstalled || wasDismissed()) return;
    const mark = () => setInteracted(true);
    document.addEventListener('click',  mark, { once: true, passive: true });
    document.addEventListener('scroll', mark, { once: true, passive: true });
    return () => {
      document.removeEventListener('click',  mark);
      document.removeEventListener('scroll', mark);
    };
  }, [isInstalled]);

  // Afficher après délai si installable et interagit
  useEffect(() => {
    if (!interacted || !isInstallable || isInstalled || wasDismissed()) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [interacted, isInstallable, isInstalled]);

  const close = useCallback((permanent = false) => {
    setLeaving(true);
    dismiss(permanent);
    setTimeout(() => setVisible(false), 300);
  }, []);

  const handleInstall = useCallback(async () => {
    const ok = await install();
    if (ok) setVisible(false);
  }, [install]);

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Installer l'application SECRETIS"
      className={[
        // Base
        'fixed z-[9999] left-0 right-0 bottom-0',
        // Desktop : centré, max-width, bottom-right
        'sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm sm:rounded-2xl',
        // Fond + couleur
        'bg-[#1A3A5C] dark:bg-[#0F2337] text-white',
        // Ombre
        'shadow-2xl',
        // Animation
        leaving
          ? 'animate-[slideDown_0.3s_ease-in_forwards]'
          : 'animate-[slideUp_0.3s_ease-out_forwards]',
      ].join(' ')}
    >
      <style>{`
        @keyframes slideUp   { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(0); opacity: 1; }   to { transform: translateY(100%); opacity: 0; } }
      `}</style>

      {/* Barre supérieure décorative */}
      <div className="h-1 w-full bg-gradient-to-r from-accent via-secondary to-primary rounded-t-2xl sm:rounded-t-2xl" aria-hidden="true" />

      <div className="p-4 sm:p-5">
        {/* En-tête */}
        <div className="flex items-start gap-3">
          <AppBadge />

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug text-balance">
              {isIos
                ? 'Installez SECRETIS sur votre iPhone'
                : 'Installez SECRETIS sur votre appareil'}
            </p>
            {!isIos && (
              <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
                Accès rapide, mode hors ligne et notifications push
              </p>
            )}
          </div>

          {/* Fermer */}
          <button
            onClick={() => close(false)}
            aria-label="Rappeler plus tard"
            className="shrink-0 -mt-0.5 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Instructions iOS */}
        {isIos && (
          <div className="mt-3 bg-white/10 rounded-xl p-3 text-xs text-white/80 leading-relaxed">
            Appuyez sur{' '}
            <span className="inline-flex items-center font-medium text-white bg-white/15 px-1.5 py-0.5 rounded">
              Partager <ShareIcon />
            </span>
            {' '}puis{' '}
            <span className="font-medium text-white bg-white/15 px-1.5 py-0.5 rounded">
              Sur l'écran d'accueil
            </span>
          </div>
        )}

        {/* Boutons */}
        <div className="mt-4 flex items-center gap-2">
          {!isIos && (
            <button
              onClick={handleInstall}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-accent hover:bg-accent/90 active:bg-accent/80 text-white text-sm font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-[#1A3A5C]"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Installer
            </button>
          )}

          <button
            onClick={() => close(false)}
            className="px-4 py-2.5 text-sm text-white/60 hover:text-white border border-white/20 hover:border-white/40 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Plus tard
          </button>

          <button
            onClick={() => close(true)}
            className="px-4 py-2.5 text-xs text-white/40 hover:text-white/60 transition-colors focus:outline-none"
          >
            Ne plus afficher
          </button>
        </div>
      </div>
    </div>
  );
}
