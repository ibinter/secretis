/**
 * Payment/Success.jsx — Page de retour après paiement réussi
 * URL : /payment/success?ref={order_ref}&provider={provider}
 * Polling toutes les 3s jusqu'à statut ≠ 'pending' (max 2 minutes)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Confettis CSS ─────────────────────────────────────────────────────────────
const ConfettiStyle = () => (
  <style>{`
    @keyframes confetti-fall {
      0%   { transform: translateY(-100px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
    }
    .confetti-piece {
      position: fixed;
      top: -20px;
      width: 10px;
      height: 10px;
      border-radius: 2px;
      animation: confetti-fall linear infinite;
      pointer-events: none;
      z-index: 100;
    }
  `}</style>
);

const CONFETTI_COLORS = ['#F39C12', '#9333EA', '#7e22ce', '#1E8449', '#C0392B', '#8E44AD'];

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    duration: `${1.5 + Math.random() * 2}s`,
    delay: `${Math.random() * 3}s`,
    size: `${6 + Math.random() * 8}px`,
    shape: Math.random() > 0.5 ? '50%' : '2px',
  }));

  return (
    <>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </>
  );
}

// ─── État "Traitement en cours" ────────────────────────────────────────────────
function ProcessingState() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 relative">
        <div className="w-20 h-20 border-4 border-purple-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Vérification en cours…</h1>
      <p className="text-gray-500 mb-4">Le paiement est en cours de traitement. Cela peut prendre quelques instants.</p>
      <div className="bg-purple-50 border border-purple-100 rounded-xl px-5 py-3 inline-block text-sm text-purple-700">
        Vous recevrez un email de confirmation.
      </div>
    </div>
  );
}

// ─── État "Échoué" ────────────────────────────────────────────────────────────
function FailedState({ reason, orderRef }) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Paiement non abouti</h1>
      {reason && (
        <p className="text-red-500 text-sm mb-4 bg-red-50 border border-red-100 rounded-lg px-4 py-2 inline-block">{reason}</p>
      )}
      <p className="text-gray-500 mb-8">Votre commande n'a pas pu être confirmée. Aucun montant n'a été débité.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => router.visit('/abonnement/checkout')}
          className="px-6 py-3 bg-[#9333EA] text-white font-semibold rounded-xl hover:bg-[#7e22ce] transition-colors"
        >
          Réessayer le paiement
        </button>
        <button
          onClick={() => router.visit('/aide')}
          className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
        >
          Contacter le support
        </button>
      </div>
    </div>
  );
}

// ─── État "Timeout" ────────────────────────────────────────────────────────────
function TimeoutState({ orderRef }) {
  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
        <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Confirmation en attente</h1>
      <p className="text-gray-500 mb-4">
        Nous n'avons pas encore reçu la confirmation de votre paiement.
      </p>
      <p className="text-gray-400 text-sm mb-8">Vérifiez votre email ou consultez votre tableau de bord.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => router.visit(`/abonnement/commandes/${orderRef}`)}
          className="px-6 py-3 bg-[#9333EA] text-white font-semibold rounded-xl hover:bg-[#7e22ce] transition-colors"
        >
          Voir le statut de ma commande
        </button>
        <button
          onClick={() => router.visit('/dashboard')}
          className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
        >
          Retour au tableau de bord
        </button>
      </div>
    </div>
  );
}

// ─── État "Payé" ──────────────────────────────────────────────────────────────
function PaidState({ order }) {
  const planLabel = order?.plan_id === 'enterprise' ? 'Enterprise' : order?.plan_id === 'pro' ? 'Pro' : 'Starter';
  return (
    <div className="text-center">
      <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Paiement confirmé !</h1>
      <p className="text-lg text-gray-600 mb-2">
        Votre abonnement <strong className="text-[#9333EA]">Plan {planLabel}</strong> est maintenant actif.
      </p>

      {order?.reference && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 inline-block mb-8 mt-2">
          <span className="text-xs text-gray-400 uppercase tracking-wide">Numéro de commande</span>
          <div className="text-sm font-mono font-bold text-gray-800 mt-0.5">{order.reference}</div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={() => router.visit('/dashboard')}
          className="px-8 py-3 bg-[#9333EA] text-white font-bold rounded-xl hover:bg-[#7e22ce] transition-colors text-base shadow-lg shadow-blue-900/20"
        >
          Accéder à mon espace →
        </button>
        {order?.reference && (
          <a
            href={`/api/v1/orders/${order.reference}/invoice`}
            download
            className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors inline-flex items-center gap-2 justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Télécharger la facture
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function PaymentSuccess({ order: initialOrder }) {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref') || initialOrder?.reference;
  const provider = urlParams.get('provider');

  const [order, setOrder] = useState(initialOrder || null);
  const [status, setStatus] = useState(initialOrder?.status || 'pending');
  const [timedOut, setTimedOut] = useState(false);
  const pollRef = useRef(null);
  const timeoutRef = useRef(null);

  const poll = useCallback(async () => {
    if (!ref) return;
    try {
      const res = await axios.get(`/api/v1/orders/${ref}`);
      const s = res.data?.status;
      if (s && s !== 'pending') {
        setOrder(res.data);
        setStatus(s);
        clearInterval(pollRef.current);
        clearTimeout(timeoutRef.current);
      }
    } catch {
      // silently retry
    }
  }, [ref]);

  useEffect(() => {
    if (status === 'pending') {
      pollRef.current = setInterval(poll, 3000);
      timeoutRef.current = setTimeout(() => {
        setTimedOut(true);
        clearInterval(pollRef.current);
      }, 120_000); // 2 minutes
    }
    return () => {
      clearInterval(pollRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, [poll, status]);

  const renderContent = () => {
    if (timedOut) return <TimeoutState orderRef={ref} />;
    if (status === 'paid') return <PaidState order={order} />;
    if (status === 'failed') return <FailedState reason={order?.failure_reason} orderRef={ref} />;
    return <ProcessingState />;
  };

  return (
    <>
      <Head title="Confirmation de paiement — SECRETIS" />
      <ConfettiStyle />

      {status === 'paid' && <Confetti />}

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-[#9333EA] flex items-center justify-center">
                <span className="text-white font-black text-sm">IS</span>
              </div>
              <span className="font-bold text-[#9333EA] text-lg" style={{ fontFamily: 'Georgia, serif' }}>
                IBIG <span className="text-[#F39C12]">SECRETIS</span>
              </span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 px-8 py-10">
            {renderContent()}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Des questions ? <a href="/aide" className="text-purple-600 hover:underline">Centre d'aide</a> · <a href="mailto:support@ibig-secretis.com" className="text-purple-600 hover:underline">support@ibig-secretis.com</a>
          </p>
        </div>
      </div>
    </>
  );
}
export { PaymentSuccess };
