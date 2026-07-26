/**
 * SECRETIS ERP — AppointmentConfirmation.jsx
 * Page de confirmation après prise de rendez-vous visiteur
 * Route : /rdv/confirmation/:token
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useLocation } from 'react-router-dom';

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Icons = {
  Check: () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  MapPin: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Download: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  X: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ─── Utilitaires ─────────────────────────────────────────────────────────────
const MONTHS_FR = [
  'janvier','février','mars','avril','mai','juin',
  'juillet','août','septembre','octobre','novembre','décembre',
];
const DAYS_FR = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

function formatDateFr(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Modal d'annulation ───────────────────────────────────────────────────────
function CancelModal({ onClose, onConfirm, cancelling }) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const reasons = [
    'Empêchement personnel',
    'Changement de planning',
    'Rendez-vous replanifié',
    'Problème de transport',
    'Autre',
  ];

  function handleConfirm() {
    if (!reason) { setReasonError('Veuillez sélectionner un motif.'); return; }
    onConfirm(reason);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Annuler ce rendez-vous</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <Icons.X />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Cette action est irréversible. Un email de confirmation d'annulation vous sera envoyé.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motif d'annulation <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {reasons.map(r => (
              <label key={r} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="cancel-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => { setReason(r); setReasonError(''); }}
                  className="w-4 h-4 text-red-500 border-gray-300 focus:ring-red-400"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{r}</span>
              </label>
            ))}
          </div>
          {reasonError && <p className="text-xs text-red-500 mt-2">{reasonError}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700
              hover:bg-gray-50 transition-colors"
          >
            Conserver le RDV
          </button>
          <button
            onClick={handleConfirm}
            disabled={cancelling}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold
              hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {cancelling ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icons.Trash />
            )}
            Annuler le RDV
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function AppointmentConfirmation() {
  const { token } = useParams();
  const location  = useLocation();

  const [appointment, setAppointment] = useState(location.state?.appointment || null);
  const [loading, setLoading]         = useState(!appointment);
  const [error, setError]             = useState(null);
  const [showCancel, setShowCancel]   = useState(false);
  const [cancelling, setCancelling]   = useState(false);
  const [cancelled, setCancelled]     = useState(false);

  // ── Chargement si pas de state passé ────────────────────────────────────────
  useEffect(() => {
    if (!appointment && token) {
      axios.get(`/api/public/visitor/appointment/${token}`)
        .then(res => setAppointment(res.data))
        .catch(() => setError('Rendez-vous introuvable ou lien expiré.'))
        .finally(() => setLoading(false));
    }
  }, [token, appointment]);

  // ── Annulation ───────────────────────────────────────────────────────────────
  async function handleCancel(reason) {
    setCancelling(true);
    try {
      await axios.post(`/api/public/visitor/appointment/${token}/cancel`, { reason });
      setCancelled(true);
      setShowCancel(false);
    } catch {
      alert('Impossible d\'annuler ce rendez-vous. Veuillez contacter l\'accueil.');
    } finally {
      setCancelling(false);
    }
  }

  // ── Lien ICS ─────────────────────────────────────────────────────────────────
  function getIcsUrl() {
    return `/api/public/visitor/appointment/${token}/ics`;
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Rendez-vous introuvable</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🚫</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rendez-vous annulé</h2>
          <p className="text-gray-500">
            Votre rendez-vous a été annulé avec succès. Un email de confirmation vous a été envoyé.
          </p>
        </div>
      </div>
    );
  }

  const org     = appointment?.organization;
  const primary = org?.primary_color || '#2563EB';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          {org?.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="h-10 w-auto" />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: primary }}>
              {org?.name?.[0] || 'S'}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">{org?.name}</h1>
            <p className="text-xs text-gray-500">Confirmation de rendez-vous</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* ── Bannière succès ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white"
            style={{ backgroundColor: primary }}>
            <Icons.Check />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rendez-vous confirmé !</h2>
          <p className="text-gray-500 max-w-sm mx-auto">
            Un email de confirmation avec votre QR code a été envoyé à{' '}
            <strong>{appointment?.visitor_email}</strong>.
          </p>
        </div>

        {/* ── Détails + QR code ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {/* Détails */}
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Votre rendez-vous</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: primary }}>
                    <Icons.Calendar />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Date</div>
                    <div className="font-semibold text-gray-900 capitalize">
                      {formatDateFr(appointment?.date)}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: primary }}>
                    <Icons.Clock />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Horaire</div>
                    <div className="font-semibold text-gray-900">
                      {appointment?.start_time} – {appointment?.end_time}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: primary }}>
                    <Icons.User />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Avec</div>
                    <div className="font-semibold text-gray-900">{appointment?.host_name}</div>
                    {appointment?.host_title && (
                      <div className="text-xs text-gray-500">{appointment.host_title}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: primary }}>
                    <Icons.MapPin />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Service</div>
                    <div className="font-semibold text-gray-900">{appointment?.service_name}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* QR Code */}
            <div className="p-6 sm:border-l border-gray-100 flex flex-col items-center justify-center bg-gray-50">
              <p className="text-xs text-gray-500 mb-3 text-center">
                Présentez ce QR code à l'accueil
              </p>
              {appointment?.qr_code_url ? (
                <img
                  src={appointment.qr_code_url}
                  alt="QR Code rendez-vous"
                  className="w-40 h-40 rounded-xl shadow-sm"
                />
              ) : (
                <div className="w-40 h-40 bg-white rounded-xl border-2 border-dashed border-gray-300
                  flex items-center justify-center text-gray-400 text-xs text-center px-4">
                  QR code en génération…
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2 font-mono">
                #{appointment?.reference_code}
              </p>
            </div>
          </div>
        </div>

        {/* ── Instructions d'arrivée ── */}
        {org?.arrival_instructions && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-purple-800 mb-2">📍 Instructions d'arrivée</h3>
            <p className="text-sm text-purple-700 whitespace-pre-line">{org.arrival_instructions}</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={getIcsUrl()}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2
              border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Icons.Download />
            Ajouter à mon agenda
          </a>
          <button
            onClick={() => setShowCancel(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2
              border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <Icons.Trash />
            Annuler ce rendez-vous
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          Portail sécurisé propulsé par <span className="font-semibold">SECRETIS ERP</span>
        </p>
      </main>

      {showCancel && (
        <CancelModal
          onClose={() => setShowCancel(false)}
          onConfirm={handleCancel}
          cancelling={cancelling}
        />
      )}
    </div>
  );
}
export { AppointmentConfirmation };
