/**
 * SuperAdmin/Payments.jsx — Validation des paiements de la plateforme
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`POST /superadmin/payments/{id}/validate` en multipart,
 *  `POST /superadmin/payments/{id}/reject`), même export CSV serveur,
 * même prop Inertia `payments`, mêmes filtres locaux.
 *
 * Nettoyages sans effet fonctionnel : import `router` inutilisé et deux états
 * jamais lus (`filterPeriod`, `actionLoading`) supprimés ; les icônes emoji
 * des méthodes de paiement sont remplacées par des icônes lucide.
 */

import React, { useState, useRef } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
  CreditCard, Landmark, Smartphone, Banknote, Download, Eye, Check, X,
  Search, Clock, CircleDollarSign, Wallet,
} from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, DataTable, EmptyState,
  cx, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Données de démonstration (repli historique, conservées) ──────────────── */
const MOCK_PAYMENTS = [
  { id: 1,  org_name: 'Banque Nationale CI',   amount: 149000, currency: 'XOF', method: 'bank_transfer', status: 'pending',   plan: 'Enterprise', period: '12 mois', reference: 'VIR-2026-001', created_at: '2026-07-21', proof_url: null },
  { id: 2,  org_name: 'Cabinet Avocats Konan', amount:  59000, currency: 'XOF', method: 'mobile_money',  status: 'validated', plan: 'Pro',        period: '3 mois',  reference: 'MMO-2026-002', created_at: '2026-07-20', proof_url: '/proofs/2.jpg' },
  { id: 3,  org_name: 'ONG Green Africa',      amount:  29000, currency: 'XOF', method: 'card',          status: 'validated', plan: 'Starter',    period: '1 mois',  reference: 'CARD-2026-003', created_at: '2026-07-20', proof_url: null },
  { id: 4,  org_name: 'Hôtel Ivoire Palace',   amount:  59000, currency: 'XOF', method: 'bank_transfer', status: 'pending',   plan: 'Pro',        period: '3 mois',  reference: 'VIR-2026-004', created_at: '2026-07-19', proof_url: null },
  { id: 5,  org_name: 'Pharmaci Pro',          amount:  59000, currency: 'XOF', method: 'mobile_money',  status: 'rejected',  plan: 'Pro',        period: '6 mois',  reference: 'MMO-2026-005', created_at: '2026-07-18', proof_url: '/proofs/5.jpg' },
  { id: 6,  org_name: 'ITIC Formations',       amount: 149000, currency: 'XOF', method: 'bank_transfer', status: 'pending',   plan: 'Enterprise', period: '12 mois', reference: 'VIR-2026-006', created_at: '2026-07-18', proof_url: '/proofs/6.pdf' },
  { id: 7,  org_name: 'Mairie de Bouaké',      amount:  29000, currency: 'XOF', method: 'card',          status: 'validated', plan: 'Starter',    period: '12 mois', reference: 'CARD-2026-007', created_at: '2026-07-17', proof_url: null },
  { id: 8,  org_name: 'Groupe Nanan Invest',   amount:  59000, currency: 'XOF', method: 'mobile_money',  status: 'validated', plan: 'Pro',        period: '6 mois',  reference: 'MMO-2026-008', created_at: '2026-07-16', proof_url: '/proofs/8.jpg' },
  { id: 9,  org_name: 'Transport Abidjan Sud', amount:  59000, currency: 'XOF', method: 'bank_transfer', status: 'pending',   plan: 'Pro',        period: '3 mois',  reference: 'VIR-2026-009', created_at: '2026-07-15', proof_url: null },
  { id: 10, org_name: 'Pharmacie Centrale',    amount:  59000, currency: 'XOF', method: 'mobile_money',  status: 'validated', plan: 'Pro',        period: '6 mois',  reference: 'MMO-2026-010', created_at: '2026-07-14', proof_url: '/proofs/10.jpg' },
];

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const METHOD_META = {
  bank_transfer: { label: 'Virement bancaire', icon: Landmark },
  mobile_money:  { label: 'Mobile Money',      icon: Smartphone },
  card:          { label: 'Carte bancaire',    icon: CreditCard },
  cash:          { label: 'Espèces',           icon: Banknote },
};

const STATUS_META = {
  pending:   { tone: 'warning', label: 'En attente' },
  validated: { tone: 'success', label: 'Validé' },
  rejected:  { tone: 'danger',  label: 'Rejeté' },
  refunded:  { tone: 'neutral', label: 'Remboursé' },
};

const PLAN_TONE = { Enterprise: 'accent', Pro: 'info', Starter: 'neutral' };

const formatAmount = (amount, currency = 'XOF') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount ?? 0);

/* ─── Validation d'un paiement ─────────────────────────────────────────────── */

function ValidateModal({ payment, onClose, onValidated }) {
  const [notes, setNotes]    = useState('');
  const [file, setFile]      = useState(null);
  const [submitting, setSub] = useState(false);
  const fileRef              = useRef(null);

  if (!payment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSub(true);

    const formData = new FormData();
    formData.append('notes', notes);
    if (file) formData.append('proof', file);

    try {
      await axios.post(`/superadmin/payments/${payment.id}/validate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onValidated(payment.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la validation');
    } finally {
      setSub(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="w-full max-w-md">
        <Card
          padded={false}
          className="shadow-xl"
          title="Valider le paiement"
          subtitle={`${payment.org_name} · ${formatAmount(payment.amount, payment.currency)}`}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
              <Button type="submit" variant="primary" loading={submitting}>Valider le paiement</Button>
            </div>
          }
        >
          <div className="space-y-4 px-4 py-5 sm:px-6">
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Note de validation</span>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Virement reçu sur le compte IBIG le…"
                className={cx(CONTROL, 'resize-none')}
              />
            </label>

            <div>
              <p className={cx('mb-1.5 text-xs font-medium', TEXT_MUTED)}>Preuve de paiement (facultatif)</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cx(
                  'w-full rounded-lg border-2 border-dashed p-4 text-center transition-colors',
                  BORDER, 'hover:border-purple-400 hover:bg-purple-50/40 dark:hover:bg-purple-500/5',
                  FOCUS_RING,
                )}
              >
                {file ? (
                  <span className={cx('text-sm font-medium', TEXT_TITLE)}>{file.name}</span>
                ) : (
                  <span className="block">
                    <span className={cx('block text-sm', TEXT_MUTED)}>Cliquez pour sélectionner un fichier</span>
                    <span className={cx('mt-1 block text-xs', TEXT_FAINT)}>JPG, PNG ou PDF — 5 Mo maximum</span>
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

/* ─── Rejet d'un paiement ──────────────────────────────────────────────────── */

function RejectModal({ payment, onClose, onRejected }) {
  const [reason, setReason]  = useState('');
  const [submitting, setSub] = useState(false);

  if (!payment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSub(true);
    try {
      await axios.post(`/superadmin/payments/${payment.id}/reject`, { reason });
      onRejected(payment.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors du rejet');
    } finally {
      setSub(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="w-full max-w-md">
        <Card
          padded={false}
          className="shadow-xl"
          title="Rejeter le paiement"
          subtitle={`${payment.org_name} · ${formatAmount(payment.amount, payment.currency)}`}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
              <Button type="submit" variant="danger" loading={submitting} disabled={!reason.trim()}>
                Rejeter le paiement
              </Button>
            </div>
          }
        >
          <div className="px-4 py-5 sm:px-6">
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Motif du rejet *</span>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                rows={4}
                placeholder="Virement non reçu, référence incorrecte, montant insuffisant…"
                className={cx(CONTROL, 'resize-none')}
              />
            </label>
          </div>
        </Card>
      </form>
    </div>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function Payments({ payments: initialPayments }) {
  const [payments, setPayments]      = useState(initialPayments?.data ?? MOCK_PAYMENTS);
  const [search, setSearch]          = useState('');
  const [filterStatus, setStatus]    = useState('');
  const [filterMethod, setMethod]    = useState('');
  const [validateModal, setValModal] = useState(null);
  const [rejectModal, setRejModal]   = useState(null);

  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search
      || p.org_name?.toLowerCase().includes(q)
      || p.reference?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || p.status === filterStatus;
    const matchMethod = !filterMethod || p.method === filterMethod;
    return matchSearch && matchStatus && matchMethod;
  });

  const pendingCount   = payments.filter(p => p.status === 'pending').length;
  const todayValidated = payments.filter(
    p => p.status === 'validated' && p.created_at === new Date().toISOString().split('T')[0],
  ).length;
  const monthRevenue = payments.filter(p => p.status === 'validated').reduce((sum, p) => sum + p.amount, 0);
  const totalRevenue = payments.reduce((sum, p) => sum + (p.status === 'validated' ? p.amount : 0), 0);

  const handleValidated = (id) =>
    setPayments(prev => prev.map(p => (p.id === id ? { ...p, status: 'validated' } : p)));

  const handleRejected = (id) =>
    setPayments(prev => prev.map(p => (p.id === id ? { ...p, status: 'rejected' } : p)));

  const isFiltered = Boolean(search || filterStatus || filterMethod);
  const resetFilters = () => { setSearch(''); setStatus(''); setMethod(''); };

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    { key: 'org_name', label: 'Organisation', className: cx('font-medium', TEXT_TITLE) },
    {
      key: 'reference',
      label: 'Référence',
      nowrap: true,
      render: (v) => (
        <span className={cx('rounded bg-gray-50 px-2 py-1 font-mono text-xs dark:bg-white/[0.06]', TEXT_MUTED)}>
          {v}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Montant',
      numeric: true,
      nowrap: true,
      render: (v, p) => formatAmount(v, p.currency),
    },
    {
      key: 'plan',
      label: 'Plan / période',
      nowrap: true,
      render: (v, p) => (
        <div className="flex flex-col items-start gap-1">
          <Badge variant={PLAN_TONE[v] ?? 'neutral'}>{v}</Badge>
          <span className={cx('text-xs', TEXT_MUTED)}>{p.period}</span>
        </div>
      ),
    },
    {
      key: 'method',
      label: 'Méthode',
      nowrap: true,
      render: (v) => {
        const meta = METHOD_META[v];
        if (!meta) return <span className={TEXT_FAINT}>{v ?? '—'}</span>;
        return <Badge variant="neutral" icon={meta.icon}>{meta.label}</Badge>;
      },
    },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => {
        const meta = STATUS_META[v] ?? STATUS_META.pending;
        return <Badge variant={meta.tone} dot>{meta.label}</Badge>;
      },
    },
    {
      key: 'created_at',
      label: 'Date',
      nowrap: true,
      className: cx('text-xs', TEXT_MUTED, NUM),
      render: (v) => (v
        ? new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—'),
    },
  ];

  return (
    <SuperAdminLayout title="Paiements">
      <Head title="Paiements — SuperAdmin SECRETIS" />

      <PageHeader
        icon={CreditCard}
        title="Paiements"
        subtitle="Validation des règlements de toutes les organisations clientes."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Paiements' }]}
        actions={
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => { window.location.href = '/superadmin/payments/export'; }}
          >
            Exporter CSV
          </Button>
        }
      />

      <div className="space-y-6">

        {/* ── Indicateurs ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Clock}
            tone={pendingCount > 0 ? 'warning' : 'success'}
            label="En attente de validation"
            value={pendingCount}
            hint={pendingCount > 0 ? 'À traiter en priorité' : 'Rien à traiter'}
          />
          <StatCard
            icon={Check} tone="success" label="Validés aujourd'hui"
            value={todayValidated} hint="paiements"
          />
          <StatCard
            icon={CircleDollarSign} tone="accent" label="Revenus du mois"
            value={formatAmount(monthRevenue)} hint="paiements validés"
          />
          <StatCard
            icon={Wallet} tone="neutral" label="Total encaissé"
            value={formatAmount(totalRevenue)} hint="depuis le début"
          />
        </section>

        {/* ── Filtres ─────────────────────────────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une organisation ou une référence…"
                aria-label="Rechercher un paiement"
                className={cx(CONTROL, 'h-10 pl-9')}
              />
            </div>

            <select
              value={filterStatus}
              onChange={e => setStatus(e.target.value)}
              aria-label="Filtrer par statut"
              className={cx(CONTROL, 'h-10 w-auto min-w-[160px]')}
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="validated">Validé</option>
              <option value="rejected">Rejeté</option>
              <option value="refunded">Remboursé</option>
            </select>

            <select
              value={filterMethod}
              onChange={e => setMethod(e.target.value)}
              aria-label="Filtrer par méthode de paiement"
              className={cx(CONTROL, 'h-10 w-auto min-w-[180px]')}
            >
              <option value="">Toutes les méthodes</option>
              {Object.entries(METHOD_META).map(([value, meta]) => (
                <option key={value} value={value}>{meta.label}</option>
              ))}
            </select>

            {isFiltered && (
              <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
            )}

            <span className={cx('ml-auto text-sm', TEXT_MUTED, NUM)}>
              {filtered.length} paiement{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </Card>

        {/* ── Tableau ─────────────────────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={filtered}
          rowKey="id"
          pageSize={25}
          rowClassName={(p) => (p.status === 'pending' ? 'bg-amber-50/40 dark:bg-amber-500/[0.06]' : '')}
          actions={(payment) => (
            <>
              {payment.proof_url && (
                <Button
                  as="a"
                  href={payment.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost" size="sm" iconOnly icon={Eye}
                  title="Voir la preuve de paiement"
                />
              )}

              {payment.status === 'pending' && (
                <>
                  <Button
                    variant="ghost" size="sm" iconOnly icon={Check}
                    title="Valider le paiement"
                    className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    onClick={() => setValModal(payment)}
                  />
                  <Button
                    variant="ghost" size="sm" iconOnly icon={X}
                    title="Rejeter le paiement"
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    onClick={() => setRejModal(payment)}
                  />
                </>
              )}

              {payment.status !== 'pending' && !payment.proof_url && (
                <span className={TEXT_FAINT}>—</span>
              )}
            </>
          )}
          empty={
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucun paiement ne correspond"
                description="Aucun règlement ne correspond à cette recherche ou à ces filtres."
                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
              />
            ) : (
              <EmptyState
                icon={CreditCard}
                title="Aucun paiement enregistré"
                description="Les règlements des organisations clientes apparaîtront ici dès leur réception."
              />
            )
          }
        />

      </div>

      {validateModal && (
        <ValidateModal
          payment={validateModal}
          onClose={() => setValModal(null)}
          onValidated={handleValidated}
        />
      )}
      {rejectModal && (
        <RejectModal
          payment={rejectModal}
          onClose={() => setRejModal(null)}
          onRejected={handleRejected}
        />
      )}
    </SuperAdminLayout>
  );
}

export { Payments };
