/**
 * Comptabilite/Expenses.jsx — Dépenses SECRETIS ERP
 *
 * Props Inertia :
 *   expenses       : Paginator<Expense with category, creator>
 *   categories     : ExpenseCategory[]
 *   budgetOverview : { id, name, color, icon, budget_monthly, current_spend, usage_percent }[]
 *   filters        : { status, category_id }
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Logique métier inchangée (routes, axios, FormData, états).
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  PlusIcon, CheckCircleIcon, XCircleIcon,
  PaperClipIcon, ReceiptPercentIcon, CloudArrowUpIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Card, DataTable, EmptyState,
  cx, CONTROL, BORDER, SURFACE, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, FOCUS_RING, NUM,
} from '@/Components/UI';
import { Money, StatusBadge, statusOptions, money } from '@/Components/Comptabilite/accounting';

const STATUS_OPTIONS = statusOptions('expense');

const EMPTY_FORM = {
  category_id:  '',
  title:        '',
  amount:       '',
  expense_date: new Date().toISOString().slice(0, 10),
  vendor:       '',
  notes:        '',
  receipt:      null,
};

const fmtDate = (d) => {
  if (!d) return null;
  try { return format(parseISO(d), 'dd MMM yyyy', { locale: fr }); } catch { return d; }
};

// =============================================================================

export default function Expenses({ expenses, categories, budgetOverview, filters }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [approving, setApproving] = useState(null);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async () => {
    setSaving(true);
    setErrors({});

    const payload = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== null && v !== '') payload.append(k, v);
    });

    try {
      await axios.post('/comptabilite/depenses', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Dépense créée.');
      setShowForm(false);
      setForm(EMPTY_FORM);
      router.reload({ only: ['expenses', 'budgetOverview'] });
    } catch (e) {
      if (e.response?.status === 422) {
        setErrors(e.response.data.errors ?? {});
      } else {
        toast.error('Une erreur est survenue.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    setApproving(id + '-approve');
    try {
      await axios.post(`/comptabilite/depenses/${id}/approve`);
      toast.success('Dépense approuvée.');
      router.reload({ only: ['expenses'] });
    } catch {
      toast.error('Erreur lors de l\'approbation.');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (id) => {
    setApproving(id + '-reject');
    try {
      await axios.post(`/comptabilite/depenses/${id}/reject`);
      toast.success('Dépense refusée.');
      router.reload({ only: ['expenses'] });
    } catch {
      toast.error('Erreur lors du refus.');
    } finally {
      setApproving(null);
    }
  };

  const applyFilter = (key, value) => {
    router.get('/comptabilite/depenses', { ...filters, [key]: value || undefined }, {
      preserveState: true, replace: true,
    });
  };

  const isFiltered = Boolean(filters?.status || filters?.category_id);

  const resetFilters = () => {
    router.get('/comptabilite/depenses', {}, { preserveState: true, replace: true });
  };

  // Total dépenses approuvées du mois
  const totalMonthApproved = budgetOverview.reduce((acc, c) => acc + c.current_spend, 0);

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'title',
      label: 'Titre',
      render: (v, exp) => (
        <div className="min-w-0">
          <p className={cx('font-medium truncate', TEXT_TITLE)}>{v}</p>
          {exp.notes && <p className={cx('text-xs truncate max-w-xs', TEXT_MUTED)}>{exp.notes}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Catégorie',
      nowrap: true,
      render: (_v, exp) => exp.category ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: exp.category.color }}
            aria-hidden="true"
          />
          <span className={TEXT_TITLE}>{exp.category.name}</span>
        </span>
      ) : <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'expense_date',
      label: 'Date',
      nowrap: true,
      render: (v) => (
        <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
          {fmtDate(v) ?? <span className={TEXT_FAINT}>—</span>}
        </span>
      ),
    },
    {
      key: 'vendor',
      label: 'Fournisseur',
      render: (v) => v || <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'amount',
      label: 'Montant',
      numeric: true,
      width: '160px',
      render: (v) => <Money value={v} />,
    },
    {
      key: 'receipt_path',
      label: 'Pièce',
      align: 'center',
      width: '80px',
      render: (v) => v ? (
        <a
          href={`/storage/${v}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Voir le justificatif"
          className={cx(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg',
            'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors',
            FOCUS_RING,
          )}
        >
          <PaperClipIcon className="h-4 w-4" />
        </a>
      ) : <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => <StatusBadge kind="expense" status={v} />,
    },
  ];

  /* ─── Rendu ──────────────────────────────────────────────────────────────── */

  return (
    <AuthLayout>
      <Head title="Dépenses" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={ReceiptPercentIcon}
          title="Dépenses"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Dépenses' }]}
          subtitle={`Total du mois (approuvé) : ${money(totalMonthApproved)}`}
          actions={
            <Button variant="primary" icon={PlusIcon} onClick={() => setShowForm(true)}>
              Nouvelle dépense
            </Button>
          }
        />

        {/* Budget par catégorie */}
        {budgetOverview.length > 0 && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgetOverview.map((cat) => {
              const over = cat.usage_percent >= 90;
              const warn = !over && cat.usage_percent >= 70;
              return (
                <div key={cat.id} className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-4 shadow-sm')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center"
                        style={{ background: cat.color }}
                      >
                        <ReceiptPercentIcon className="h-4 w-4 text-white" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className={cx('text-sm font-medium truncate', TEXT_TITLE)}>{cat.name}</p>
                        <p className={cx('text-xs', TEXT_MUTED)}>
                          {cat.budget_monthly ? `Budget ${money(cat.budget_monthly)}` : 'Pas de budget défini'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cx('text-sm font-semibold', NUM, TEXT_TITLE)}>{money(cat.current_spend)}</p>
                      <p className={cx('text-xs', TEXT_MUTED)}>ce mois</p>
                    </div>
                  </div>

                  {cat.budget_monthly > 0 && (
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(cat.usage_percent, 100)}%`,
                            background: over ? '#DC2626' : warn ? '#F59E0B' : cat.color,
                          }}
                        />
                      </div>
                      <div className={cx('mt-1.5 flex items-center justify-between text-xs', TEXT_MUTED, NUM)}>
                        <span>{cat.usage_percent}% utilisé</span>
                        <span>Reste {money(Math.max(0, cat.budget_monthly - cat.current_spend))}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Filtres */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            defaultValue={filters.status}
            onChange={(e) => applyFilter('status', e.target.value)}
            className={cx(CONTROL, 'h-10 w-auto min-w-[180px]')}
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            defaultValue={filters.category_id}
            onChange={(e) => applyFilter('category_id', e.target.value)}
            className={cx(CONTROL, 'h-10 w-auto min-w-[200px]')}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {isFiltered && <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>}
        </div>

        {/* Liste dépenses */}
        <DataTable
          columns={columns}
          data={expenses.data}
          rowKey="id"
          pageSize={expenses.per_page ?? 15}
          totalItems={expenses.total ?? expenses.data.length}
          actions={(exp) => exp.status === 'pending' ? (
            <>
              <Button
                variant="ghost" size="sm" iconOnly icon={CheckCircleIcon}
                title="Approuver"
                className="hover:text-emerald-600 dark:hover:text-emerald-400"
                loading={approving === exp.id + '-approve'}
                onClick={() => handleApprove(exp.id)}
              />
              <Button
                variant="ghost" size="sm" iconOnly icon={XCircleIcon}
                title="Refuser"
                className="hover:text-red-600 dark:hover:text-red-400"
                loading={approving === exp.id + '-reject'}
                onClick={() => handleReject(exp.id)}
              />
            </>
          ) : (
            <span className={cx('text-xs', TEXT_FAINT)}>—</span>
          )}
          empty={
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucune dépense ne correspond"
                description="Aucun résultat pour ces critères. Changez de statut ou de catégorie."
                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
              />
            ) : (
              <EmptyState
                icon={ReceiptPercentIcon}
                title="Aucune dépense"
                description="Enregistrez votre première dépense pour suivre les budgets par catégorie et conserver les justificatifs."
                hints={[
                  'Joignez le reçu (PDF, JPG, PNG) dès la saisie.',
                  'Une dépense doit être approuvée avant d\'entrer au budget.',
                ]}
                action={
                  <Button variant="primary" icon={PlusIcon} onClick={() => setShowForm(true)}>
                    Créer votre première dépense
                  </Button>
                }
              />
            )
          }
          footer={expenses.last_page > 1 && expenses.links ? (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
                {expenses.from}–{expenses.to} sur {expenses.total}
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {expenses.links.map((link, i) => (
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

      {/* ===== Modal création dépense ===== */}
      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
            <Card
              padded={false}
              className="shadow-xl max-h-[90vh] overflow-y-auto"
              title="Nouvelle dépense"
              subtitle="Les champs marqués d'un astérisque sont obligatoires."
              actions={
                <Button variant="ghost" size="sm" iconOnly icon={XMarkIcon}
                        title="Fermer" onClick={() => setShowForm(false)} />
              }
              footer={
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setShowForm(false)}>Annuler</Button>
                  <Button variant="primary" loading={saving} onClick={handleSubmit}>
                    Créer la dépense
                  </Button>
                </div>
              }
            >
              <div className="px-4 py-4 sm:px-6 space-y-4">
                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Catégorie *</span>
                  <select
                    value={form.category_id}
                    onChange={(e) => setField('category_id', e.target.value)}
                    className={cx(CONTROL, 'h-10', errors.category_id && 'border-red-400 dark:border-red-500/60')}
                  >
                    <option value="">— Sélectionner une catégorie —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.category_id && (
                    <span className="text-xs text-red-600 dark:text-red-400">{errors.category_id[0]}</span>
                  )}
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Titre / Libellé *</span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Ex : Achat fournitures bureau"
                    className={cx(CONTROL, 'h-10', errors.title && 'border-red-400 dark:border-red-500/60')}
                  />
                  {errors.title && (
                    <span className="text-xs text-red-600 dark:text-red-400">{errors.title[0]}</span>
                  )}
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={cx('text-xs font-medium', TEXT_MUTED)}>Montant (FCFA) *</span>
                    <input
                      type="number"
                      min="1"
                      value={form.amount}
                      onChange={(e) => setField('amount', e.target.value)}
                      className={cx(CONTROL, 'h-10 text-right tabular-nums', errors.amount && 'border-red-400 dark:border-red-500/60')}
                    />
                    {errors.amount && (
                      <span className="text-xs text-red-600 dark:text-red-400">{errors.amount[0]}</span>
                    )}
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={cx('text-xs font-medium', TEXT_MUTED)}>Date *</span>
                    <input
                      type="date"
                      value={form.expense_date}
                      onChange={(e) => setField('expense_date', e.target.value)}
                      className={cx(CONTROL, 'h-10')}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Fournisseur</span>
                  <input
                    type="text"
                    value={form.vendor}
                    onChange={(e) => setField('vendor', e.target.value)}
                    placeholder="Nom du fournisseur / prestataire"
                    className={cx(CONTROL, 'h-10')}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Notes</span>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    className={cx(CONTROL, 'resize-none')}
                  />
                </label>

                <div className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Justificatif (reçu, facture)</span>
                  <label className={cx(
                    'flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg',
                    'border-2 border-dashed', BORDER,
                    'hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors',
                  )}>
                    <CloudArrowUpIcon className={cx('h-6 w-6', TEXT_FAINT)} />
                    <span className={cx('px-4 text-center text-xs', TEXT_MUTED)}>
                      {form.receipt ? form.receipt.name : 'Cliquer pour téléverser (PDF, JPG, PNG — max 5 Mo)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setField('receipt', e.target.files[0] || null)}
                    />
                  </label>
                  {errors.receipt && (
                    <span className="text-xs text-red-600 dark:text-red-400">{errors.receipt[0]}</span>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

    </AuthLayout>
  );
}
export { Expenses };
