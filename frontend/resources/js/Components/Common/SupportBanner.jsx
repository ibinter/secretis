/**
 * SECRETIS ERP — SupportBanner.jsx
 *
 * Bandeau rouge affiché quand un agent IBIG Soft est en prise en main active.
 * Transmis via le header HTTP X-Support-Mode: true (intercepté dans l'intercepteur Axios).
 *
 * Caractéristiques :
 *   - Bandeau rouge fixe en haut, z-index maximal, impossible à fermer sans terminer la session
 *   - Nom de l'agent IBIG Soft visible
 *   - Compte à rebours jusqu'à l'expiration de la session
 *   - Bouton "Terminer la session" (admin client uniquement)
 *   - Bouton "Voir le journal des actions"
 *   - Pulsation rouge pour attirer l'attention
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

// ── Utilitaires ───────────────────────────────────────────────────────────────
function formatTimeLeft(seconds) {
  if (seconds <= 0) return 'Expirée';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

// ── Icônes ────────────────────────────────────────────────────────────────────
const IconShield = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const IconList = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const IconX = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconClock = () => (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);

// ── Modal journal des actions ─────────────────────────────────────────────────
function ActionsLogModal({ sessionId, onClose }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/v1/support/sessions/${sessionId}/actions`)
      .then(r => setActions(r.data?.actions ?? []))
      .catch(() => setActions([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Journal des actions de prise en main"
      style={{
        position: 'fixed', inset: 0, zIndex: 10001,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '10px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* En-tête */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #FCA5A5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FEF2F2',
          borderRadius: '10px 10px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#DC2626' }}><IconList /></span>
            <strong style={{ color: '#7F1D1D', fontSize: '15px' }}>
              Journal des actions — Session #{sessionId}
            </strong>
          </div>
          <button onClick={onClose} aria-label="Fermer"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#6B7280', padding: '4px', borderRadius: '4px',
            }}>
            <IconX />
          </button>
        </div>

        {/* Corps */}
        <div style={{ overflow: 'auto', flex: 1, padding: '12px 0' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6B7280', padding: '24px' }}>Chargement…</p>
          ) : actions.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6B7280', padding: '24px' }}>
              Aucune action sensible enregistrée dans cette session.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Heure', 'Action', 'Chemin', 'IP'].map(h => (
                    <th key={h} style={{
                      padding: '8px 16px', textAlign: 'left',
                      color: '#374151', fontWeight: 600,
                      borderBottom: '1px solid #E5E7EB',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {actions.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 16px', color: '#6B7280', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(a.timestamp).toLocaleTimeString('fr-FR')}
                    </td>
                    <td style={{ padding: '8px 16px', color: '#DC2626', fontWeight: 500 }}>
                      {a.action}
                    </td>
                    <td style={{ padding: '8px 16px', color: '#374151', wordBreak: 'break-all' }}>
                      {a.data?.path ?? '—'}
                    </td>
                    <td style={{ padding: '8px 16px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {a.ip ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function SupportBanner({ sessionInfo = null, canEnd = false }) {
  /**
   * sessionInfo attendu :
   * {
   *   id:          number,
   *   agentName:   string,
   *   agentEmail:  string,
   *   expiresAt:   ISO string,
   * }
   */

  const [timeLeft, setTimeLeft] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [ending, setEnding] = useState(false);
  const intervalRef = useRef(null);

  // Calculer le temps restant
  useEffect(() => {
    if (!sessionInfo?.expiresAt) return;

    const compute = () => {
      const diff = Math.max(0, Math.floor(
        (new Date(sessionInfo.expiresAt) - new Date()) / 1000
      ));
      setTimeLeft(diff);
    };

    compute();
    intervalRef.current = setInterval(compute, 1000);
    return () => clearInterval(intervalRef.current);
  }, [sessionInfo?.expiresAt]);

  const handleEnd = useCallback(async () => {
    if (!sessionInfo?.id) return;
    if (!window.confirm(
      'Êtes-vous sûr de vouloir terminer la session de prise en main ?\n'
      + "L'agent IBIG Soft n'aura plus accès à votre espace."
    )) return;

    setEnding(true);
    try {
      await axios.post(`/api/v1/support/sessions/${sessionInfo.id}/end`);
      window.location.reload();
    } catch {
      setEnding(false);
      alert('Une erreur est survenue lors de la clôture de la session. Veuillez contacter le support.');
    }
  }, [sessionInfo?.id]);

  if (!sessionInfo) return null;

  const isExpiringSoon = timeLeft > 0 && timeLeft < 300; // moins de 5 minutes

  return (
    <>
      {/* ── Bandeau principal ───────────────────────────────────────────────── */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10000,
          background: isExpiringSoon
            ? 'linear-gradient(90deg, #B91C1C 0%, #991B1B 100%)'
            : 'linear-gradient(90deg, #DC2626 0%, #B91C1C 100%)',
          color: '#FEF2F2',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '12px',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: '0 2px 12px rgba(220,38,38,0.5)',
          userSelect: 'none',
        }}
      >
        {/* Indicateur pulsant */}
        <span style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'secretis-support-pulse 2s ease-in-out infinite',
        }}>
          <IconShield />
          <style>{`
            @keyframes secretis-support-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50%       { opacity: 0.6; transform: scale(0.9); }
            }
          `}</style>
        </span>

        {/* Message principal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          <span style={{
            fontWeight: 800,
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}>
            PRISE EN MAIN ACTIVE
          </span>
          <span style={{ opacity: 0.85, fontSize: '12px', flexShrink: 0 }}>—</span>
          <span style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            opacity: 0.95,
          }}>
            Un agent IBIG Soft{' '}
            <strong>({sessionInfo.agentName || 'Agent Support'})</strong>{' '}
            accède à votre espace.
          </span>
        </div>

        {/* Compte à rebours */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          flexShrink: 0,
          background: isExpiringSoon ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
          borderRadius: '4px',
          padding: '3px 9px',
          fontVariantNumeric: 'tabular-nums',
          fontSize: '12px',
          fontWeight: 600,
        }}>
          <IconClock />
          {formatTimeLeft(timeLeft)}
        </div>

        {/* Journal des actions */}
        <button
          onClick={() => setShowLog(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#FEF2F2',
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: '5px',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          aria-label="Voir le journal des actions effectuées pendant la prise en main"
        >
          <IconList />
          Journal
        </button>

        {/* Terminer la session — admin client uniquement */}
        {canEnd && (
          <button
            onClick={handleEnd}
            disabled={ending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#FFFBEB',
              color: '#92400E',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '5px',
              cursor: ending ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              opacity: ending ? 0.6 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!ending) e.currentTarget.style.background = '#FDE68A'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFFBEB'; }}
            aria-label="Terminer la session de prise en main"
          >
            <IconX />
            {ending ? 'Clôture…' : 'Terminer la session'}
          </button>
        )}
      </div>

      {/* ── Modal journal ───────────────────────────────────────────────────── */}
      {showLog && (
        <ActionsLogModal
          sessionId={sessionInfo.id}
          onClose={() => setShowLog(false)}
        />
      )}
    </>
  );
}

/**
 * Hook pour récupérer les infos de la session de prise en main active.
 * À placer dans le composant layout principal.
 *
 * Lit les headers X-Support-* via l'intercepteur Axios (à configurer dans axios.js).
 *
 * Usage :
 *   const { supportSession, canEndSession } = useSupportSession();
 *   <SupportBanner sessionInfo={supportSession} canEnd={canEndSession} />
 */
export function useSupportSession() {
  const [supportSession, setSupportSession] = useState(null);
  const [canEndSession, setCanEndSession] = useState(false);

  useEffect(() => {
    // Lire les données de prise en main depuis la méta globale (injectée par le backend)
    const meta = window.__SECRETIS_CONFIG__?.support_session;
    if (meta?.active) {
      setSupportSession({
        id:        meta.session_id,
        agentName: meta.agent_name,
        agentEmail: meta.agent_email,
        expiresAt: meta.expires_at,
      });
      setCanEndSession(meta.can_end ?? false);
    }
  }, []);

  return { supportSession, canEndSession };
}
