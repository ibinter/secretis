/**
 * SuperAdmin/Dashboard.jsx — Tableau de bord global temps réel SuperAdmin IBIG Soft
 * Auto-refresh toutes les 60 secondes | Recharts pour les graphiques
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Icônes SVG inline ────────────────────────────────────────────────────────
const Icons = {
  Building:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Currency:    () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Trial:       () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  Ticket:      () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
  Users:       () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Payment:     () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  Storage:     () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>,
  Uptime:      () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Alert:       () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  Check:       () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  X:           () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Refresh:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Funnel:      () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
};

// ─── Données mockées ──────────────────────────────────────────────────────────
const MOCK = {
  kpis: {
    orgs_actives: 47, orgs_variation: +12,
    mrr: 4_250_000, mrr_variation: +15.3,
    essais: 8, essais_conversion: 68.4,
    tickets_ouverts: 12, tickets_retard: 3,
    nouveaux_clients: 6,
    paiements_a_valider: 3,
    stockage_used_gb: 142, stockage_total_gb: 500,
    uptime: 99.97,
  },
  mrr_12m: [
    { mois: 'Août 25',  mrr: 2_100_000 },
    { mois: 'Sep 25',   mrr: 2_400_000 },
    { mois: 'Oct 25',   mrr: 2_650_000 },
    { mois: 'Nov 25',   mrr: 2_900_000 },
    { mois: 'Déc 25',   mrr: 3_100_000 },
    { mois: 'Jan 26',   mrr: 3_250_000 },
    { mois: 'Fév 26',   mrr: 3_480_000 },
    { mois: 'Mar 26',   mrr: 3_650_000 },
    { mois: 'Avr 26',   mrr: 3_820_000 },
    { mois: 'Mai 26',   mrr: 3_950_000 },
    { mois: 'Jun 26',   mrr: 4_100_000 },
    { mois: 'Jul 26',   mrr: 4_250_000 },
  ],
  essais_8sem: [
    { sem: 'S14', essais: 3 },
    { sem: 'S15', essais: 5 },
    { sem: 'S16', essais: 4 },
    { sem: 'S17', essais: 7 },
    { sem: 'S18', essais: 6 },
    { sem: 'S19', essais: 9 },
    { sem: 'S20', essais: 8 },
    { sem: 'S21', essais: 11 },
  ],
  health: [
    { label: 'Base de données', status: 'ok' },
    { label: 'Redis / Cache', status: 'ok' },
    { label: 'Queue worker', status: 'degraded' },
    { label: 'SMTP (emails)', status: 'ok' },
    { label: 'SARA (IA / Groq)', status: 'ok' },
    { label: 'Stockage S3', status: 'ok' },
    { label: 'Reverb (WebSocket)', status: 'ok' },
    { label: 'CDN / Assets', status: 'ok' },
  ],
  connexions_recentes: [
    { org: 'Banque Nationale CI', user: 'Kouamé Yao', role: 'Admin', ip: '196.28.1.44', pays: 'CI', date: '2026-07-23 14:32' },
    { org: 'ONG Green Africa', user: 'Amara Diallo', role: 'Secrétaire', ip: '41.82.120.5', pays: 'SN', date: '2026-07-23 14:28' },
    { org: 'Cabinet Avocats Konan', user: 'Marie Konan', role: 'Admin', ip: '197.234.5.22', pays: 'CI', date: '2026-07-23 14:15' },
    { org: 'Pharmaci Pro', user: 'Jean Traoré', role: 'Utilisateur', ip: '196.1.50.10', pays: 'BF', date: '2026-07-23 13:58' },
    { org: 'Hôtel Ivoire Palace', user: 'Fatou Sow', role: 'Manager', ip: '196.203.12.8', pays: 'SN', date: '2026-07-23 13:45' },
    { org: 'Ministère Finance', user: 'Paul Gbeke', role: 'Admin', ip: '192.168.10.5', pays: 'GH', date: '2026-07-23 13:30' },
    { org: 'Clinique Saint-Jean', user: 'Aicha Ba', role: 'Réceptionniste', ip: '196.45.20.11', pays: 'ML', date: '2026-07-23 13:22' },
    { org: 'Université Lomé', user: 'Koffi Atta', role: 'RH', ip: '196.54.30.4', pays: 'TG', date: '2026-07-23 13:10' },
    { org: 'BTP Sahel SARL', user: 'Moussa Coulibaly', role: 'Secrétaire', ip: '41.210.60.2', pays: 'ML', date: '2026-07-23 13:05' },
    { org: 'Assurance Continent', user: 'Nadia Ekra', role: 'Admin', ip: '196.28.8.90', pays: 'CI', date: '2026-07-23 12:55' },
  ],
  funnel: [
    { label: 'Visiteurs landing', n: 1240 },
    { label: 'Inscriptions essai', n: 312 },
    { label: 'Actifs (> 3 actions)', n: 214 },
    { label: 'Payants', n: 147 },
    { label: 'Enterprise', n: 18 },
  ],
  paiements_pending: [
    { ref: 'PAY-20260721-001', org: 'Cabinet Avocats Konan', plan: 'Pro', montant: '75 000 XOF', methode: 'Orange Money', date: '2026-07-21' },
    { ref: 'PAY-20260720-003', org: 'BTP Sahel SARL', plan: 'Starter', montant: '25 000 XOF', methode: 'Wave CI', date: '2026-07-20' },
    { ref: 'PAY-20260719-007', org: 'Clinique Saint-Jean', plan: 'Pro', montant: '75 000 XOF', methode: 'Virement', date: '2026-07-19' },
  ],
  prospects: [
    { nom: 'Groupe NSIA Finance', score: 92, prochaine_action: 'Démo planifiée', date_action: '2026-07-25', statut: 'demo' },
    { nom: 'Mairie de Bouaké', score: 85, prochaine_action: 'Envoi proposition', date_action: '2026-07-24', statut: 'offer' },
    { nom: 'Pharmacie Centrale Dakar', score: 78, prochaine_action: 'Relance email', date_action: '2026-07-23', statut: 'contact' },
    { nom: 'Lycée Technique Lomé', score: 71, prochaine_action: 'Appel découverte', date_action: '2026-07-26', statut: 'contact' },
    { nom: 'TransAir Logistics CI', score: 65, prochaine_action: 'Envoi ressources', date_action: '2026-07-28', statut: 'lead' },
  ],
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function fmtXOF(v) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v);
}
function fmtXOFShort(v) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M XOF`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} K XOF`;
  return `${v} XOF`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = 'blue', trend, badge }) {
  const colors = {
    blue:   { bg: 'bg-purple-50',   icon: 'bg-purple-100 text-purple-700',    text: 'text-purple-800' },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-700',  text: 'text-green-800' },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-700',  text: 'text-amber-800' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-700', text: 'text-purple-800' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-700',      text: 'text-red-800' },
    teal:   { bg: 'bg-teal-50',   icon: 'bg-teal-100 text-teal-700',    text: 'text-teal-800' },
    indigo: { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-800' },
    slate:  { bg: 'bg-slate-50',  icon: 'bg-slate-100 text-slate-700',   text: 'text-slate-800' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`${c.bg} rounded-xl p-4 border border-white shadow-sm flex items-start gap-3 relative`}>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-3 right-3 min-w-[1.25rem] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
          {badge}
        </span>
      )}
      <div className={`p-2.5 rounded-lg ${c.icon} flex-shrink-0`}>
        <Icon />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className={`text-xl font-bold ${c.text} mt-0.5 leading-tight`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend !== undefined && (
          <p className={`text-xs mt-1 font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs mois préc.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Health Indicator ─────────────────────────────────────────────────────────
function HealthRow({ label, status }) {
  const map = {
    ok:       { dot: 'bg-green-500', text: 'text-green-700', label: 'Opérationnel' },
    degraded: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-700', label: 'Dégradé' },
    down:     { dot: 'bg-red-500 animate-ping', text: 'text-red-700', label: 'Hors service' },
  };
  const s = map[status] || map.ok;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
        <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
      </div>
    </div>
  );
}

// ─── Funnel Step ─────────────────────────────────────────────────────────────
function FunnelStep({ label, n, total, next }) {
  const pct = Math.round((n / total) * 100);
  const conv = next ? Math.round((next / n) * 100) : null;
  return (
    <div className="flex-1 text-center">
      <div className="bg-purple-900 text-white rounded-xl px-3 py-4 mx-1">
        <div className="text-2xl font-bold">{n.toLocaleString('fr-FR')}</div>
        <div className="text-xs text-purple-200 mt-1">{label}</div>
        <div className="text-xs text-purple-300 mt-0.5">{pct}% total</div>
      </div>
      {conv !== null && (
        <div className="flex items-center justify-center mt-1">
          <span className="text-xs text-gray-400">→ {conv}%</span>
        </div>
      )}
    </div>
  );
}

// ─── Custom Tooltip MRR ───────────────────────────────────────────────────────
const MrrTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-sm font-bold text-purple-900">{fmtXOFShort(payload[0].value)}</p>
    </div>
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function SuperAdminDashboard({ data: propData }) {
  const [data, setData] = useState(propData || MOCK);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null); // { ref, action: 'approve'|'reject' }

  const kpis = data.kpis || MOCK.kpis;
  const health = data.health || MOCK.health;
  const hasDown = health.some(h => h.status === 'down');
  const hasDegraded = health.some(h => h.status === 'degraded');
  const allOk = !hasDown && !hasDegraded;

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axios.get('/api/v1/superadmin/dashboard');
      if (res.data) setData(res.data);
      setLastRefresh(new Date());
    } catch {
      // Keep mock on error
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePaymentAction = async (ref, action) => {
    try {
      await axios.post(`/api/v1/superadmin/payments/${ref}/${action}`);
      showToast(action === 'approve' ? 'Paiement approuvé !' : 'Paiement rejeté.');
      setPaymentModal(null);
      await fetchData();
    } catch {
      showToast('Erreur lors du traitement.', 'error');
    }
  };

  const funnel = data.funnel || MOCK.funnel;
  const funnelTotal = funnel[0]?.n || 1;

  const storePct = Math.round(((kpis.stockage_used_gb || 142) / (kpis.stockage_total_gb || 500)) * 100);

  return (
    <>
      <Head title="SuperAdmin — IBIG Soft" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <Icons.Check /> : <Icons.X />}
          {toast.msg}
        </div>
      )}

      {/* Modal confirmation paiement */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {paymentModal.action === 'approve' ? '✅ Approuver' : '❌ Rejeter'} le paiement
            </h3>
            <p className="text-sm text-gray-600 mb-1">Réf : <strong>{paymentModal.ref}</strong></p>
            <p className="text-sm text-gray-600 mb-6">Organisation : <strong>{paymentModal.org}</strong></p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPaymentModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Annuler
              </button>
              <button
                onClick={() => handlePaymentAction(paymentModal.ref, paymentModal.action)}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg ${paymentModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="bg-[#9333EA] text-white shadow-xl">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center font-black text-lg">
                IS
              </div>
              <div>
                <div className="font-bold text-base leading-tight">IBIG SECRETIS — SuperAdmin</div>
                <div className="text-purple-200 text-xs">Tableau de bord opérationnel global</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                ${allOk ? 'bg-green-500/20 text-green-200' : hasDegraded ? 'bg-amber-500/20 text-amber-200' : 'bg-red-500/20 text-red-200'}`}>
                <span className={`w-2 h-2 rounded-full ${allOk ? 'bg-green-400' : hasDegraded ? 'bg-amber-400 animate-pulse' : 'bg-red-400 animate-ping'}`} />
                {allOk ? 'Tous les services OK' : hasDegraded ? 'Service dégradé' : 'Service hors ligne'}
              </div>
              <button
                onClick={fetchData}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-purple-200 hover:text-white text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <span className={refreshing ? 'animate-spin' : ''}><Icons.Refresh /></span>
                {refreshing ? 'Actualisation…' : `Actualisé à ${lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8">

          {/* ── Section 1 : KPI cards (2 rangées × 4) ───────────────────── */}
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Indicateurs clés</h2>

            {/* Rangée 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <KpiCard
                icon={Icons.Building}
                label="Organisations actives"
                value={kpis.orgs_actives ?? 47}
                trend={kpis.orgs_variation ?? +12}
                color="blue"
              />
              <KpiCard
                icon={Icons.Currency}
                label="MRR"
                value={fmtXOFShort(kpis.mrr ?? 4_250_000)}
                trend={kpis.mrr_variation ?? +15.3}
                color="teal"
              />
              <KpiCard
                icon={Icons.Trial}
                label="Essais en cours"
                value={kpis.essais ?? 8}
                sub={`Taux conv. ${kpis.essais_conversion ?? 68.4}%`}
                color="amber"
              />
              <KpiCard
                icon={Icons.Ticket}
                label="Tickets ouverts"
                value={kpis.tickets_ouverts ?? 12}
                sub={`${kpis.tickets_retard ?? 3} en retard (SLA)`}
                color={(kpis.tickets_retard ?? 3) > 0 ? 'red' : 'blue'}
              />
            </div>

            {/* Rangée 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={Icons.Users}
                label="Nouveaux clients ce mois"
                value={kpis.nouveaux_clients ?? 6}
                color="green"
              />
              <KpiCard
                icon={Icons.Payment}
                label="Preuves paiement à valider"
                value={kpis.paiements_a_valider ?? 3}
                badge={kpis.paiements_a_valider ?? 3}
                color={(kpis.paiements_a_valider ?? 3) > 0 ? 'red' : 'green'}
              />
              <div className="bg-slate-50 rounded-xl p-4 border border-white shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700"><Icons.Storage /></div>
                  <p className="text-xs text-gray-500 font-medium">Stockage utilisé</p>
                </div>
                <p className="text-xl font-bold text-slate-800 mb-1">
                  {kpis.stockage_used_gb ?? 142} <span className="text-sm font-normal text-gray-400">/ {kpis.stockage_total_gb ?? 500} GB</span>
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${storePct > 80 ? 'bg-red-500' : storePct > 60 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${storePct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{storePct}% utilisé</p>
              </div>
              <KpiCard
                icon={Icons.Uptime}
                label="Disponibilité (uptime)"
                value={`${kpis.uptime ?? 99.97}%`}
                sub="30 derniers jours"
                color="green"
              />
            </div>
          </section>

          {/* ── Section 2 : Graphiques ───────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* MRR 12 mois */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-800 mb-4">MRR — 12 derniers mois</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.mrr_12m || MOCK.mrr_12m}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<MrrTooltip />} />
                  <Line type="monotone" dataKey="mrr" stroke="#9333EA" strokeWidth={2.5} dot={{ r: 3, fill: '#9333EA' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Nouveaux essais 8 semaines */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Nouveaux essais — 8 dernières semaines</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.essais_8sem || MOCK.essais_8sem}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="sem" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="essais" fill="#F39C12" radius={[4, 4, 0, 0]} name="Essais" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Section 3 : Alertes techniques ──────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Icons.Alert />
                <h3 className="text-sm font-bold text-gray-800">Santé des services</h3>
              </div>

              {allOk && (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 rounded-lg px-4 py-3 mb-3 text-sm font-medium">
                  <Icons.Check />
                  Tous les services opérationnels
                </div>
              )}

              {health.filter(h => h.status !== 'ok').map(h => (
                <div key={h.label} className={`mb-2 rounded-lg px-3 py-2 text-sm flex items-center gap-2
                  ${h.status === 'down' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  <Icons.Alert />
                  <span>{h.label} — {h.status === 'down' ? 'Hors service' : 'Dégradé'}</span>
                </div>
              ))}

              <div className="mt-2 divide-y divide-gray-50">
                {health.map(h => <HealthRow key={h.label} label={h.label} status={h.status} />)}
              </div>

              <a href="/superadmin/saas/health" className="mt-4 text-xs text-purple-700 font-semibold hover:underline flex items-center gap-1">
                Monitoring détaillé →
              </a>
            </div>

            {/* ── Section 4 : Activité récente ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
              <h3 className="text-sm font-bold text-gray-800 mb-4">10 dernières connexions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Organisation', 'Utilisateur', 'Rôle', 'IP', 'Pays', 'Date'].map(h => (
                        <th key={h} className="text-left py-2 pr-4 text-gray-400 font-semibold uppercase tracking-wide text-[0.65rem]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(data.connexions_recentes || MOCK.connexions_recentes).map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2 pr-4 font-medium text-gray-800 max-w-[140px] truncate">{c.org}</td>
                        <td className="py-2 pr-4 text-gray-600">{c.user}</td>
                        <td className="py-2 pr-4">
                          <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-[0.65rem] font-semibold">{c.role}</span>
                        </td>
                        <td className="py-2 pr-4 font-mono text-gray-500">{c.ip}</td>
                        <td className="py-2 pr-4">
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[0.65rem] font-bold">{c.pays}</span>
                        </td>
                        <td className="py-2 text-gray-400">{c.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── Section 5 : Funnel de conversion ────────────────────────── */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Icons.Funnel />
              <h3 className="text-sm font-bold text-gray-800">Entonnoir de conversion</h3>
            </div>
            <div className="flex items-end gap-0 overflow-x-auto pb-2">
              {funnel.map((step, i) => (
                <FunnelStep
                  key={step.label}
                  label={step.label}
                  n={step.n}
                  total={funnelTotal}
                  next={funnel[i + 1]?.n}
                />
              ))}
            </div>
          </section>

          {/* ── Section 6 : Preuves de paiement en attente ─────────────── */}
          {(kpis.paiements_a_valider ?? 3) > 0 && (
            <section className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-800">Preuves de paiement en attente</h3>
                <span className="ml-auto bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
                  {kpis.paiements_a_valider} en attente
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Référence', 'Organisation', 'Plan', 'Montant', 'Méthode', 'Date', 'Actions'].map(h => (
                        <th key={h} className="text-left py-2 pr-4 text-gray-400 font-semibold uppercase tracking-wide text-[0.65rem]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(data.paiements_pending || MOCK.paiements_pending).map(p => (
                      <tr key={p.ref} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 font-mono text-purple-700">{p.ref}</td>
                        <td className="py-2 pr-4 font-medium text-gray-800">{p.org}</td>
                        <td className="py-2 pr-4">
                          <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[0.65rem] font-bold">{p.plan}</span>
                        </td>
                        <td className="py-2 pr-4 font-semibold text-gray-800">{p.montant}</td>
                        <td className="py-2 pr-4 text-gray-500">{p.methode}</td>
                        <td className="py-2 pr-4 text-gray-400">{p.date}</td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setPaymentModal({ ref: p.ref, org: p.org, action: 'approve' })}
                              className="px-2.5 py-1 bg-green-600 text-white rounded-lg text-[0.65rem] font-bold hover:bg-green-700 flex items-center gap-1"
                            >
                              <Icons.Check /> Approuver
                            </button>
                            <button
                              onClick={() => setPaymentModal({ ref: p.ref, org: p.org, action: 'reject' })}
                              className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[0.65rem] font-bold hover:bg-red-200 flex items-center gap-1"
                            >
                              <Icons.X /> Rejeter
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => router.visit('/superadmin/payments')}
                className="mt-3 text-xs text-purple-700 font-semibold hover:underline"
              >
                Voir tous les paiements →
              </button>
            </section>
          )}

          {/* ── Section 7 : Prospection CRM ─────────────────────────────── */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">Prospects prioritaires</h3>
              <button
                onClick={() => router.visit('/superadmin/crm/prospects')}
                className="text-xs text-purple-700 font-semibold hover:underline"
              >
                Pipeline complet →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Prospect', 'Score', 'Prochaine action', 'Date', 'Statut'].map(h => (
                      <th key={h} className="text-left py-2 pr-4 text-gray-400 font-semibold uppercase tracking-wide text-[0.65rem]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(data.prospects || MOCK.prospects).map(p => {
                    const statMap = { demo: { cls: 'bg-purple-100 text-purple-700', label: 'Démo' }, offer: { cls: 'bg-purple-100 text-purple-700', label: 'Offre' }, contact: { cls: 'bg-amber-100 text-amber-700', label: 'Contact' }, lead: { cls: 'bg-gray-100 text-gray-700', label: 'Lead' } };
                    const s = statMap[p.statut] || statMap.lead;
                    return (
                      <tr key={p.nom} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 pr-4 font-semibold text-gray-900">{p.nom}</td>
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${p.score >= 80 ? 'bg-green-500' : p.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${p.score}%` }} />
                            </div>
                            <span className="text-xs font-bold text-gray-700">{p.score}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-gray-600 text-xs">{p.prochaine_action}</td>
                        <td className="py-2.5 pr-4 text-gray-400 text-xs">{p.date_action}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>{s.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

        </main>
      </div>
    </>
  );
}
export { SuperAdminDashboard };
