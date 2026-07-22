import React, { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'secretis_pwa_install_dismissed';
const INSTALL_DELAY_MS = 30000; // 30 secondes après première interaction

/**
 * Bannière d'installation PWA pour SECRETIS.
 * Gère l'événement beforeinstallprompt + instructions iOS spécifiques.
 */
export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [interacted, setInteracted] = useState(false);

  // Détecter iOS (Safari)
  const detectIos = useCallback(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua) && !window.MSStream;
  }, []);

  // Vérifier si déjà installé
  const isInstalled = useCallback(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }, []);

  // Vérifier si l'utilisateur a déjà refusé
  const wasDismissed = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      const { dismissedAt } = JSON.parse(stored);
      // Ne plus afficher pendant 30 jours après refus
      return Date.now() - dismissedAt < 30 * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (isInstalled() || wasDismissed()) return;

    const ios = detectIos();
    setIsIos(ios);

    // Capturer l'événement beforeinstallprompt (Chrome / Edge / Android)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Pour iOS : afficher les instructions manuelles si interagit
    const handleInteraction = () => setInteracted(true);
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('scroll', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [isInstalled, wasDismissed, detectIos]);

  // Afficher la bannière après interaction + délai
  useEffect(() => {
    if (!interacted) return;
    if (wasDismissed() || isInstalled()) return;

    const timer = setTimeout(() => {
      if (deferredPrompt || isIos) {
        setShowBanner(true);
      }
    }, INSTALL_DELAY_MS);

    return () => clearTimeout(timer);
  }, [interacted, deferredPrompt, isIos, isInstalled, wasDismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() }));
    } catch {}
  };

  if (!showBanner) return null;

  return (
    <div
      role="banner"
      aria-label="Installer l'application SECRETIS"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#1A3A5C',
        color: '#fff',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.25)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: '14px'
      }}
    >
      {/* Icône */}
      <div
        style={{
          width: 40,
          height: 40,
          background: '#F39C12',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: 0.5
        }}
      >
        IS
      </div>

      {/* Message */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isIos ? (
          <>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              Installez SECRETIS sur votre iPhone
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
              Appuyez sur{' '}
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: 4 }}>
                Partager
              </span>{' '}
              puis{' '}
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: 4 }}>
                Sur l'écran d'accueil
              </span>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              Installez SECRETIS sur votre appareil
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
              Accès rapide, mode hors ligne et notifications
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {!isIos && (
          <button
            onClick={handleInstall}
            style={{
              background: '#F39C12',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 14px',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Installer
          </button>
        )}
        <button
          onClick={handleDismiss}
          aria-label="Fermer"
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            padding: '8px 10px',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
