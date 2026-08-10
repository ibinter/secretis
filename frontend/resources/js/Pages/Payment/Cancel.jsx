/**
 * Payment/Cancel.jsx — Page de retour après annulation sur la passerelle
 * URL : /payment/cancel?ref={order_ref}
 */

import React from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

export default function PaymentCancel({ ref: propRef }) {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref') || propRef;

  return (
    <AppLayout>
      <Head title="Paiement annulé — SECRETIS" />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 flex items-center justify-center p-4">
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
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 px-8 py-10 text-center">

            {/* Icône */}
            <div className="w-24 h-24 mx-auto mb-6 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Paiement annulé</h1>
            <p className="text-gray-500 text-base mb-2">
              Vous avez annulé le paiement.
            </p>
            <p className="text-gray-400 text-sm mb-8">
              Votre commande reste en attente — aucun montant n'a été débité.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {ref && (
                <button
                  onClick={() => router.visit(`/abonnement/commandes/${ref}`)}
                  className="w-full py-3 bg-[#9333EA] text-white font-bold rounded-xl hover:bg-[#7e22ce] transition-colors text-base shadow-lg shadow-blue-900/20"
                >
                  Reprendre le paiement
                </button>
              )}
              <button
                onClick={() => router.visit('/abonnement/checkout')}
                className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Choisir un autre moyen de paiement
              </button>
              <button
                onClick={() => router.visit('/dashboard')}
                className="w-full py-3 text-gray-400 font-medium hover:text-gray-600 transition-colors text-sm"
              >
                Retour au tableau de bord
              </button>
            </div>

          </div>

          {/* Aide */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Besoin d'aide ? <a href="/aide" className="text-purple-600 hover:underline">Centre d'aide</a>
            {' · '}
            <a href="mailto:support@ibig-secretis.com" className="text-purple-600 hover:underline">
              support@ibig-secretis.com
            </a>
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
export { PaymentCancel };
