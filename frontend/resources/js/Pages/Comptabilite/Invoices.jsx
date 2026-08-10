/**
 * Comptabilite/Invoices.jsx — Liste des factures SECRETIS ERP
 *
 * Props Inertia :
 *   invoices : Paginator<Invoice with client>
 *   clients  : AccountingClient[]
 *   filters  : { status, client_id, date_from, date_to, search }
 *
 * Présentation migrée sur `@/Components/UI` + le socle comptable partagé
 * `@/Components/Comptabilite/accounting`. Logique métier inchangée : mêmes
 * routes, mêmes appels axios, mêmes états locaux.
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  DocumentArrowDownIcon, EnvelopeIcon, CheckCircleIcon,
  MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, TrashIcon,
  DocumentTextIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import AuthLayout from '@/Layouts/AuthLayout';
import debounce from 'lodash/debounce';
import {
  PageHeader, Button, DataTable, EmptyState, Card,
  cx, CONTROL, BORDER, SURFACE, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, FOCUS_RING,
} from '@/Components/UI';
import { Money, StatusBadge, statusOptions, money } from '@/Components/Comptabilite/accounting';

const STATUS_OPTIONS = statusOptions('invoice');
const PAYMENT_METHODS = [
  ['virement', 'Virement bancaire'],
  ['mobile_money', 'Mobile Money'],
  ['especes', 'Espèces'],
  ['cheque', 'Chèque'],
  ['carte', 'Carte bancaire'],
];

const fmtDate = (d) => {
  if (!d) return null;
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
};

// =============================================================================

export default function Invoices({ invoices, clients, filters }) {
  const [loading, setLoading] = useState({});
  const [payModal, setPayModal] = useState(null);
  const [payData, setPayData] = useState({
    amount: '', payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'virement', reference: '',
  });

  const setLoaderKey = (key, val) => setLoading((prev) => ({ ...prev, [key]: val }));

  // Filtrage
  const applyFilter = debounce((key, value) => {
    router.get('/comptabilite/factures', { ...filters, [key]: value || undefined }, {
      preserveState: true, replace: true,
    });
  }, 350);

  // Actions
  const handleSend = async (id, number) => {
    setLoaderKey(`send-${id}`, true);
    try {
      await axios.post(`/comptabilite/factures/${id}/send`);
      toast.success(`Facture ${number} envoyée.`);
      router.reload({ only: ['invoices'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Erreur lors de l\'envoi.');
    } finally {
      setLoaderKey(`send-${id}`, false);
    }
  };

  const handlePdfDownload = (id, number) => {
    window.open(`/comptabilite/factures/${id}/pdf`, '_blank');
  };

  const handlePaySubmit = async () => {
    if (!payModal) return;
    setLoaderKey('pay', true);
    try {
      await axios.post(`/comptabilite/factures/${payModal.id}/pay`, payData);
      toast.success('Paiement enregistré.');
      setPayModal(null);
      router.reload({ only: ['invoices'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Erreur lors du paiement.');
    } finally {
      setLoaderKey('pay', false);
    }
  };

  const handleDelete = async (id, number) => {
    if (! confirm(`Supprimer la facture ${number} ?`)) return;
    try {
      await axios.delete(`/comptabilite/factures/${id}`);
      toast.success('Facture supprimée.');
      router.reload({ only: ['invoices'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Impossible de supprimer.');
    }
  };

  const isFiltered = Boolean(
    filters?.search || filters?.status || filters?.client_id || filters?.date_from || filters?.date_to,
  );

  const resetFilters = () => {
    router.get('/comptabilite/factures', {}, { preserveState: true, replace: true });
  };

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'invoice_number',
      label: 'N°',
      nowrap: true,
      width: '150px',
      render: (v) => (
        <span className="font-mono text-xs font-semibold text-purple-700 dark:text-purple-400">{v}</span>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (_v, inv) => (
        <div className="min-w-0">
          <p className={cx('font-medium truncate', TEXT_TITLE)}>
            {inv.client?.name ?? <span className={TEXT_FAINT}>—</span>}
          </p>
          {inv.client?.email && (
            <p className={cx('text-xs truncate', TEXT_MUTED)}>{inv.client.email}</p>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Objet',
      render: (v) => (
        <span className="block max-w-xs truncate">{v || <span className={TEXT_FAINT}>—</span>}</span>
      ),
    },
    {
      key: 'issue_date',
      label: 'Date',
      nowrap: true,
      render: (v) => (
        <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
          {fmtDate(v) ?? <span className={TEXT_FAINT}>—</span>}
        </span>
      ),
    },
    {
      key: 'due_date',
      label: 'Échéance',
      nowrap: true,
      render: (v, inv) => {
        const d = fmtDate(v);
        if (!d) return <span className={TEXT_FAINT}>—</span>;
        return (
          <span className={cx(
            'text-xs tabular-nums',
            inv.status === 'overdue'
              ? 'font-semibold text-red-600 dark:text-red-400'
              : TEXT_MUTED,
          )}>
            {d}
          </span>
        );
      },
    },
    {
      key: 'total',
      label: 'Total TTC',
      numeric: true,
      width: '150px',
      render: (v) => <Money value={v} />,
    },
    {
      key: 'balance_due',
      label: 'Solde dû',
      numeric: true,
      width: '150px',
      render: (v) => (
        Number(v) > 0
          ? <Money value={v} className="text-red-600 dark:text-red-400" />
          : <span className={cx('text-xs font-medium', TEXT_MUTED)}>Soldé</span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => <StatusBadge kind="invoice" status={v} />,
    },
  ];

  /* ─── Rendu ──────────────────────────────────────────────────────────────── */

  return (
    <AuthLayout>
      <Head title="Factures" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={DocumentTextIcon}
          title="Factures"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Factures' }]}
          subtitle={`${invoices.total ?? invoices.data.length} facture${(invoices.total ?? 0) > 1 ? 's' : ''} — montants en FCFA (XOF)`}
          actions={
            <Button
              variant="primary" icon={PlusIcon}
              onClick={() => router.visit('/comptabilite/factures/create')}
            >
              Nouvelle facture
            </Button>
          }
        />

        {/* Filtres */}
        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
          <div className="relative col-span-2 lg:col-span-1">
            <MagnifyingGlassIcon className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
            <input
              type="text"
              placeholder="Numéro, objet…"
              defaultValue={filters.search}
              onChange={(e) => applyFilter('search', e.target.value)}
              className={cx(CONTROL, 'h-10 pl-9')}
            />
          </div>

          <select
            defaultValue={filters.status}
            onChange={(e) => applyFilter('status', e.target.value)}
            className={cx(CONTROL, 'h-10')}
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            defaultValue={filters.client_id}
            onChange={(e) => applyFilter('client_id', e.target.value)}
            className={cx(CONTROL, 'h-10')}
          >
            <option value="">Tous les clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="date"
            aria-label="Émises à partir du"
            defaultValue={filters.date_from}
            onChange={(e) => applyFilter('date_from', e.target.value)}
            className={cx(CONTROL, 'h-10')}
          />
          <input
            type="date"
            aria-label="Émises jusqu'au"
            defaultValue={filters.date_to}
            onChange={(e) => applyFilter('date_to', e.target.value)}
            className={cx(CONTROL, 'h-10')}
          />
        </div>

        {/* Tableau */}
        <DataTable
          columns={columns}
          data={invoices.data}
          rowKey="id"
          pageSize={invoices.per_page ?? 15}
          totalItems={invoices.total ?? invoices.data.length}
          actions={(inv) => (
            <>
              <Button
                variant="ghost" size="sm" iconOnly icon={DocumentArrowDownIcon}
                title="Télécharger le PDF"
                onClick={() => handlePdfDownload(inv.id, inv.invoice_number)}
              />
              {['draft', 'sent'].includes(inv.status) && (
                <Button
                  variant="ghost" size="sm" iconOnly icon={EnvelopeIcon}
                  title="Envoyer par email"
                  loading={loading[`send-${inv.id}`]}
                  onClick={() => handleSend(inv.id, inv.invoice_number)}
                />
              )}
              {['sent', 'overdue'].includes(inv.status) && (
                <Button
                  variant="ghost" size="sm" iconOnly icon={CheckCircleIcon}
                  title="Enregistrer un paiement"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  onClick={() => {
                    setPayData((p) => ({ ...p, amount: inv.balance_due }));
                    setPayModal(inv);
                  }}
                />
              )}
              {inv.status === 'draft' && (
                <Button
                  variant="ghost" size="sm" iconOnly icon={PencilSquareIcon}
                  title="Modifier"
                  onClick={() => router.visit(`/comptabilite/factures/${inv.id}/edit`)}
                />
              )}
              {['draft', 'cancelled'].includes(inv.status) && (
                <Button
                  variant="ghost" size="sm" iconOnly icon={TrashIcon}
                  title="Supprimer"
                  className="hover:text-red-600 dark:hover:text-red-400"
                  onClick={() => handleDelete(inv.id, inv.invoice_number)}
                />
              )}
            </>
          )}
          empty={
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucune facture ne correspond"
                description="Aucun résultat pour ces critères. Élargissez la période ou changez de statut."
                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
              />
            ) : (
              <EmptyState
                icon={DocumentTextIcon}
                title="Aucune facture"
                description="Créez votre première facture : elle alimentera le journal des ventes, la balance et le suivi des encaissements."
                hints={[
                  'Une facture en brouillon reste modifiable et supprimable.',
                  'L\'envoi par email bascule la facture au statut « Envoyée ».',
                ]}
                action={
                  <Button
                    variant="primary" icon={PlusIcon}
                    onClick={() => router.visit('/comptabilite/factures/create')}
                  >
                    Créer votre première facture
                  </Button>
                }
              />
            )
          }
          footer={invoices.last_page > 1 && invoices.links ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
                {invoices.from}–{invoices.to} sur {invoices.total} factures
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {invoices.links.map((link, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!link.url}
                    onClick={() => link.url && router.get(link.url)}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                    className={cx(
                      'min-w-[32px] rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      link.active
                        ? 'border-transparent bg-purple-600 text-white'
                        : cx(BORDER, SURFACE, 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                      !link.url && 'pointer-events-none opacity-40',
                      FOCUS_RING,
                    )}
                  />
                ))}
              </div>
            </div>
          ) : null}
        />
      </div>

      {/* ===== Modal paiement ===== */}
      {payModal && (
        <div
          onClick={() => setPayModal(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
            <Card
              padded={false}
              className="shadow-xl"
              title="Enregistrer un paiement"
              subtitle={`Facture ${payModal.invoice_number}`}
              actions={
                <Button variant="ghost" size="sm" iconOnly icon={XMarkIcon}
                        title="Fermer" onClick={() => setPayModal(null)} />
              }
              footer={
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setPayModal(null)}>Annuler</Button>
                  <Button
                    variant="primary"
                    loading={loading.pay}
                    disabled={!payData.amount}
                    onClick={handlePaySubmit}
                  >
                    Confirmer le paiement
                  </Button>
                </div>
              }
            >
              <div className="px-4 py-4 sm:px-6 space-y-4">
                <div className={cx(
                  'flex items-center justify-between rounded-lg border px-3 py-2',
                  'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10',
                )}>
                  <span className="text-sm text-red-700 dark:text-red-300">Solde dû</span>
                  <span className="text-sm font-semibold tabular-nums text-red-700 dark:text-red-300">
                    {money(payModal.balance_due)}
                  </span>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Montant (FCFA) *</span>
                  <input
                    type="number"
                    min="1"
                    max={payModal.balance_due}
                    value={payData.amount}
                    onChange={(e) => setPayData((p) => ({ ...p, amount: e.target.value }))}
                    className={cx(CONTROL, 'h-10 text-right tabular-nums')}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Date de paiement *</span>
                  <input
                    type="date"
                    value={payData.payment_date}
                    onChange={(e) => setPayData((p) => ({ ...p, payment_date: e.target.value }))}
                    className={cx(CONTROL, 'h-10')}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Mode de paiement *</span>
                  <select
                    value={payData.payment_method}
                    onChange={(e) => setPayData((p) => ({ ...p, payment_method: e.target.value }))}
                    className={cx(CONTROL, 'h-10')}
                  >
                    {PAYMENT_METHODS.map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Référence (optionnel)</span>
                  <input
                    type="text"
                    placeholder="N° virement, transaction…"
                    value={payData.reference}
                    onChange={(e) => setPayData((p) => ({ ...p, reference: e.target.value }))}
                    className={cx(CONTROL, 'h-10')}
                  />
                </label>
              </div>
            </Card>
          </div>
        </div>
      )}

    </AuthLayout>
  );
}
export { Invoices };
