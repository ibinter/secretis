/**
 * SECRETIS ERP — DemoBanner.jsx
 *
 * Bandeau d'avertissement affiché en permanence sur l'environnement de démonstration.
 * Visible uniquement si config('app.demo_mode') === true (transmis via window.__SECRETIS_CONFIG__).
 *
 * Caractéristiques :
 *   - Bandeau orange fixe en haut, z-index élevé, non fermable
 *   - Lien vers /register et vers la landing page SECRETIS
 *   - Compteur de réinitialisation (chaque nuit à 03h00 heure d'Abidjan)
 *   - Accessible (rôle alert, aria-live)
 */

import React, { useEffect, useState } from 'react';

// ── Calcul du prochain reset (03h00 heure d'Abidjan = UTC+0) ─────────────────
function getNextResetTime() {
  const now = new Date();
  const reset = new Date(now);
  reset.setUTCHours(3, 0, 0, 0); // 03h00 UTC = 03h00 Abidjan (UTC+0)
  if (reset <= now) {
    reset.setUTCDate(reset.getUTCDate() + 1);
  }
  return reset;
}

function formatCountdown(ms) {
  if (ms <= 0) return '00h 00m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

// ── Icônes inline ─────────────────────────────────────────────────────────────
const IconFlask = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6M9 3v8L6.5 15M9 3H6.5M15 3v8l2.5 4M15 3h2.5M6.5 15l-.5 1.5A2 2 0 008 19h8a2 2 0 002-1.5L17.5 15M6.5 15h11"/>
  </svg>
);

const IconArrowRight = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

const IconClock = () => (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);

// ── Composant principal ───────────────────────────────────────────────────────
export default function DemoBanner() {
  const [countdown, setCountdown] = useState('');
  const [nextReset, setNextReset] = useState(getNextResetTime);

  // Vérifier si on est en mode démo
  const isDemoMode = window.__SECRETIS_CONFIG__?.demo_mode === true
    || import.meta.env.VITE_DEMO_MODE === 'true';

  useEffect(() => {
    if (!isDemoMode) return;

    const tick = () => {
      const now = new Date();
      let reset = nextReset;
      if (reset <= now) {
        reset = getNextResetTime();
        setNextReset(reset);
      }
      setCountdown(formatCountdown(reset - now));
    };

    tick();
    const interval = setInterval(tick, 30000); // mise à jour toutes les 30s
    return () => clearInterval(interval);
  }, [isDemoMode, nextReset]);

  if (!isDemoMode) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'linear-gradient(90deg, #D97706 0%, #B45309 100%)',
        color: '#FFFBEB',
        padding: '0 16px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '13px',
        fontWeight: 500,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        userSelect: 'none',
      }}
    >
      {/* ── Icône + message principal ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        <span style={{ flexShrink: 0, opacity: 0.9 }}>
          <IconFlask />
        </span>
        <span style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          letterSpacing: '0.01em',
        }}>
          <strong style={{ fontWeight: 700 }}>ENVIRONNEMENT DE DÉMONSTRATION</strong>
          {' '}— Les données sont fictives et réinitialisées chaque nuit.
        </span>
      </div>

      {/* ── Compteur de réinitialisation ──────────────────────────────────── */}
      {countdown && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          flexShrink: 0,
          opacity: 0.85,
          fontSize: '12px',
          background: 'rgba(0,0,0,0.15)',
          borderRadius: '4px',
          padding: '2px 8px',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <IconClock />
          Reset dans {countdown}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <a
          href="https://ibigsoft.com/secretis"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#FEF3C7',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(254,243,199,0.5)',
            textUnderlineOffset: '2px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
          }}
        >
          En savoir plus
        </a>

        <a
          href="/register"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: '#FFFBEB',
            color: '#92400E',
            fontWeight: 700,
            fontSize: '12px',
            padding: '4px 12px',
            borderRadius: '5px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FDE68A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFFBEB'; }}
        >
          Créer mon compte
          <IconArrowRight />
        </a>
      </div>
    </div>
  );
}

/**
 * Hook utilitaire pour décaler le contenu principal sous le bandeau.
 *
 * Usage dans le layout principal :
 *   const demoBannerHeight = useDemoBannerOffset();
 *   <main style={{ paddingTop: demoBannerHeight }}>...</main>
 */
export function useDemoBannerOffset() {
  const isDemoMode = window.__SECRETIS_CONFIG__?.demo_mode === true
    || import.meta.env.VITE_DEMO_MODE === 'true';
  return isDemoMode ? 40 : 0;
}
