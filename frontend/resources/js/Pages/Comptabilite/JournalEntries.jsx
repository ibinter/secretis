/**
 * Comptabilite/JournalEntries.jsx — Saisie et liste des écritures SYSCOHADA
 *
 * Props Inertia :
 *   entries      : paginé — liste des écritures
 *   fiscalYears  : exercices fiscaux disponibles
 *   chartAccounts: plan comptable (comptes feuilles)
 *   filters      : filtres actifs
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Aucun calcul modifié : l'équilibre Débit/Crédit et le payload envoyé à
 * `/comptabilite/journal` sont strictement identiques.
 */

import { Head, router } from '@inertiajs/react';
import { useState, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PlusIcon, CheckIcon, TrashIcon, LockClosedIcon,
  LockOpenIcon, XMarkIcon, BookOpenIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card, DataTable, EmptyState,
  cx, CONTROL, SURFACE, BORDER, SURFACE_SUNK,
  TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';
import {
  money, JournalBadge, JOURNAL_TYPES, statusMeta,
  TABLE_HEAD, TH_CELL, TFOOT,
} from '@/Components/Comptabilite/accounting';

const emptyLine = () => ({
  account_number: '',
  debit_amount: '',
  credit_amount: '',
  description: '',
  analytic_code: '',
  _key: Math.random(),
});

// ============================================================
// Composant AccountCombobox
// ============================================================
function AccountCombobox({ value, onChange, accounts, placeholder = 'N° compte' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || '');
  const ref = useRef(null);

  const filtered = useMemo(() =>
    search.length < 1
      ? accounts.slice(0, 20)
      : accounts
          .filter(a =>
            a.account_number.startsWith(search) ||
            a.account_name.toLowerCase().includes(search.toLowerCase())
          )
          .slice(0, 20),
    [search, accounts]
  );

  const select = (acc) => {
    onChange(acc.account_number);
    setSearch(acc.account_number);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <input
        className={cx(CONTROL, 'h-9')}
        value={search}
        placeholder={placeholder}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && filtered.length > 0 && (
        <ul className={cx(
          'absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-lg border shadow-lg',
          BORDER, SURFACE, 'text-sm',
        )}>
          {filtered.map(acc => (
            <li
              key={acc.account_number}
              className="flex cursor-pointer gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
              onMouseDown={() => select(acc)}
            >
              <span className="w-14 shrink-0 font-mono text-xs font-semibold text-purple-700 dark:text-purple-400">
                {acc.account_number}
              </span>
              <span className={cx('truncate', TEXT_TITLE)}>{acc.account_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// Formulaire de saisie d'écriture
// ============================================================
function JournalForm({ accounts, fiscalYears, onClose, onSaved }) {
  const today = format(new Date(), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    entry_date: today,
    description: '',
    reference: '',
    journal_type: 'OD',
    fiscal_year_id: fiscalYears.find(f => f.status === 'open')?.id || '',
    lines: [emptyLine(), emptyLine()],
  });
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setLine = (idx, k, v) =>
    setForm(f => ({
      ...f,
      lines: f.lines.map((l, i) => i === idx ? { ...l, [k]: v } : l),
    }));

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const removeLine = (idx) =>
    setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));

  const totalDebit  = form.lines.reduce((s, l) => s + (parseFloat(l.debit_amount)  || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0);
  const balanced    = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!balanced) { toast.error('Écriture déséquilibrée — Débit ≠ Crédit'); return; }

    const payload = {
      ...form,
      lines: form.lines.map(l => ({
        account_number: l.account_number,
        debit_amount:   parseFloat(l.debit_amount)  || 0,
        credit_amount:  parseFloat(l.credit_amount) || 0,
        description:    l.description || null,
        analytic_code:  l.analytic_code || null,
      })),
    };

    setSaving(true);
    try {
      await axios.post('/comptabilite/journal', payload);
      toast.success('Écriture créée');
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/50 p-4 pt-10 backdrop-blur-sm dark:bg-black/60">
      <form onSubmit={handleSubmit} className="w-full max-w-5xl">
        <Card
          padded={false}
          className="shadow-xl max-h-[88vh] overflow-y-auto"
          title="Nouvelle écriture comptable"
          subtitle="Une écriture n'est enregistrable que si le total débit égale le total crédit."
          actions={
            <Button variant="ghost" size="sm" iconOnly icon={XMarkIcon}
                    title="Fermer" onClick={onClose} />
          }
          footer={
            <div className="flex items-center justify-between gap-3">
              <Badge variant={balanced ? 'success' : 'danger'} size="md" icon={balanced ? CheckIcon : undefined}>
                {balanced ? 'Écriture équilibrée' : `Écart ${money(Math.abs(totalDebit - totalCredit))}`}
              </Badge>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
                <Button type="submit" variant="primary" loading={saving} disabled={!balanced}>
                  Enregistrer l'écriture
                </Button>
              </div>
            </div>
          }
        >
          {/* En-tête écriture */}
          <div className="grid grid-cols-2 gap-4 px-4 py-4 sm:px-6 md:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Date</span>
              <input type="date" className={cx(CONTROL, 'h-10')} value={form.entry_date}
                     onChange={e => setField('entry_date', e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Journal</span>
              <select className={cx(CONTROL, 'h-10')} value={form.journal_type}
                      onChange={e => setField('journal_type', e.target.value)}>
                {JOURNAL_TYPES.map(j => (
                  <option key={j.value} value={j.value}>{j.value} – {j.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Exercice</span>
              <select className={cx(CONTROL, 'h-10')} value={form.fiscal_year_id}
                      onChange={e => setField('fiscal_year_id', e.target.value)}>
                <option value="">Sans exercice</option>
                {fiscalYears.map(fy => (
                  <option key={fy.id} value={fy.id} disabled={fy.status === 'closed'}>
                    {fy.name} {fy.status === 'closed' ? '(clôturé)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Référence pièce</span>
              <input type="text" className={cx(CONTROL, 'h-10')} placeholder="FAC-2026-001…"
                     value={form.reference} onChange={e => setField('reference', e.target.value)} />
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 md:col-span-4">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Libellé de l'écriture *</span>
              <input type="text" className={cx(CONTROL, 'h-10')} required
                     placeholder="Ex : Règlement facture client XYZ…"
                     value={form.description} onChange={e => setField('description', e.target.value)} />
            </label>
          </div>

          {/* Lignes d'écriture */}
          <div className="px-4 pb-4 sm:px-6">
            <div className={cx('overflow-x-auto rounded-lg border', BORDER)}>
              <table className="w-full border-collapse text-sm">
                <thead className={TABLE_HEAD}>
                  <tr>
                    <th scope="col" className={cx(TH_CELL, 'text-left w-44')}>Compte</th>
                    <th scope="col" className={cx(TH_CELL, 'text-left')}>Libellé ligne</th>
                    <th scope="col" className={cx(TH_CELL, 'text-right w-36')}>Débit</th>
                    <th scope="col" className={cx(TH_CELL, 'text-right w-36')}>Crédit</th>
                    <th scope="col" className={cx(TH_CELL, 'text-left w-28')}>Analytique</th>
                    <th scope="col" className={cx(TH_CELL, 'w-12')}><span className="sr-only">Retirer</span></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                  {form.lines.map((line, idx) => (
                    <tr key={line._key}>
                      <td className="px-2 py-2">
                        <AccountCombobox
                          accounts={accounts}
                          value={line.account_number}
                          onChange={v => setLine(idx, 'account_number', v)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className={cx(CONTROL, 'h-9')}
                          placeholder="Libellé…"
                          value={line.description}
                          onChange={e => setLine(idx, 'description', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number" step="0.01" min="0"
                          className={cx(CONTROL, 'h-9 text-right tabular-nums')}
                          value={line.debit_amount}
                          onChange={e => setLine(idx, 'debit_amount', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number" step="0.01" min="0"
                          className={cx(CONTROL, 'h-9 text-right tabular-nums')}
                          value={line.credit_amount}
                          onChange={e => setLine(idx, 'credit_amount', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className={cx(CONTROL, 'h-9')}
                          placeholder="CC-01…"
                          value={line.analytic_code}
                          onChange={e => setLine(idx, 'analytic_code', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        {form.lines.length > 2 && (
                          <Button
                            type="button" variant="ghost" size="sm" iconOnly icon={TrashIcon}
                            title="Retirer la ligne"
                            className="hover:text-red-600 dark:hover:text-red-400"
                            onClick={() => removeLine(idx)}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totaux */}
                <tfoot className={TFOOT}>
                  <tr>
                    <td className={cx('px-4 py-3 text-xs uppercase tracking-wider', TEXT_MUTED)} colSpan={2}>
                      Totaux
                    </td>
                    <td className={cx('px-4 py-3 text-right whitespace-nowrap', NUM)}>{money(totalDebit)}</td>
                    <td className={cx('px-4 py-3 text-right whitespace-nowrap', NUM)}>{money(totalCredit)}</td>
                    <td colSpan={2} className="px-4 py-3 text-center">
                      <Badge variant={balanced ? 'success' : 'danger'} icon={balanced ? CheckIcon : undefined}>
                        {balanced ? 'Équilibrée' : 'Déséquilibrée'}
                      </Badge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <Button
              type="button" variant="subtle" size="sm" icon={PlusIcon}
              className="mt-3" onClick={addLine}
            >
              Ajouter une ligne
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

// ============================================================
// Page principale
// ============================================================
export default function JournalEntries({ entries, fiscalYears, chartAccounts, filters }) {
  const [showForm, setShowForm]   = useState(false);
  const [localFilters, setLocalFilters] = useState(filters || {});

  const applyFilters = () => {
    router.get('/comptabilite/journal', localFilters, { preserveState: true });
  };

  const handleSaved = () => {
    router.reload({ only: ['entries'] });
  };

  const handleValidate = async (id) => {
    if (!confirm('Valider et verrouiller cette écriture ?')) return;
    try {
      await axios.post(`/comptabilite/journal/${id}/validate`);
      toast.success('Écriture validée');
      router.reload({ only: ['entries'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de validation');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette écriture ?')) return;
    try {
      await axios.delete(`/comptabilite/journal/${id}`);
      toast.success('Écriture supprimée');
      router.reload({ only: ['entries'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const isFiltered = Boolean(
    filters?.journal_type || filters?.date_from || filters?.date_to ||
    (filters?.locked !== undefined && filters?.locked !== ''),
  );

  const resetFilters = () => {
    setLocalFilters({});
    router.get('/comptabilite/journal', {}, { preserveState: true });
  };

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'entry_number',
      label: 'N° Écriture',
      nowrap: true,
      width: '160px',
      render: (v) => (
        <span className="font-mono text-xs font-semibold text-purple-700 dark:text-purple-400">{v}</span>
      ),
    },
    {
      key: 'entry_date',
      label: 'Date',
      nowrap: true,
      render: (v) => (
        <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
          {format(new Date(v), 'dd/MM/yyyy', { locale: fr })}
        </span>
      ),
    },
    {
      key: 'journal_type',
      label: 'Journal',
      align: 'center',
      width: '90px',
      render: (v) => <JournalBadge type={v} />,
    },
    {
      key: 'description',
      label: 'Libellé',
      render: (v) => (
        <span className={cx('block max-w-xs truncate font-medium', TEXT_TITLE)}>{v}</span>
      ),
    },
    {
      key: 'reference',
      label: 'Référence',
      render: (v) => v
        ? <span className={cx('text-xs', TEXT_MUTED)}>{v}</span>
        : <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'lines_count',
      label: 'Lignes',
      numeric: true,
      width: '90px',
      render: (v) => <span className={TEXT_MUTED}>{v}</span>,
    },
    {
      key: 'is_locked',
      label: 'Statut',
      nowrap: true,
      render: (v) => {
        const { label, tone } = statusMeta('entry', v ? 'locked' : 'draft');
        return (
          <Badge variant={tone} icon={v ? LockClosedIcon : LockOpenIcon}>{label}</Badge>
        );
      },
    },
  ];

  return (
    <AuthLayout>
      <Head title="Journal comptable SYSCOHADA" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={BookOpenIcon}
          title="Journal comptable"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Journal' }]}
          subtitle="SYSCOHADA Révisé 2017 — montants en FCFA (XOF)"
          actions={
            <Button variant="primary" icon={PlusIcon} onClick={() => setShowForm(true)}>
              Nouvelle écriture
            </Button>
          }
        />

        {/* Filtres */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          <select
            className={cx(CONTROL, 'h-10')}
            value={localFilters.journal_type || ''}
            onChange={e => setLocalFilters(f => ({ ...f, journal_type: e.target.value }))}
          >
            <option value="">Tous les journaux</option>
            {JOURNAL_TYPES.map(j => (
              <option key={j.value} value={j.value}>{j.value} – {j.label}</option>
            ))}
          </select>
          <input
            type="date" aria-label="Du"
            className={cx(CONTROL, 'h-10')}
            value={localFilters.date_from || ''}
            onChange={e => setLocalFilters(f => ({ ...f, date_from: e.target.value }))}
          />
          <input
            type="date" aria-label="Au"
            className={cx(CONTROL, 'h-10')}
            value={localFilters.date_to || ''}
            onChange={e => setLocalFilters(f => ({ ...f, date_to: e.target.value }))}
          />
          <select
            className={cx(CONTROL, 'h-10')}
            value={localFilters.locked ?? ''}
            onChange={e => setLocalFilters(f => ({ ...f, locked: e.target.value }))}
          >
            <option value="">Tous statuts</option>
            <option value="1">Validées</option>
            <option value="0">Non validées</option>
          </select>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={applyFilters}>Filtrer</Button>
            {isFiltered && <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>}
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={entries.data}
          rowKey="id"
          pageSize={entries.per_page ?? 15}
          totalItems={entries.total ?? entries.data.length}
          actions={(entry) => entry.is_locked ? (
            <span className={cx('text-xs', TEXT_FAINT)}>Verrouillée</span>
          ) : (
            <>
              <Button
                variant="ghost" size="sm" iconOnly icon={CheckIcon}
                title="Valider et verrouiller"
                className="hover:text-emerald-600 dark:hover:text-emerald-400"
                onClick={() => handleValidate(entry.id)}
              />
              <Button
                variant="ghost" size="sm" iconOnly icon={TrashIcon}
                title="Supprimer"
                className="hover:text-red-600 dark:hover:text-red-400"
                onClick={() => handleDelete(entry.id)}
              />
            </>
          )}
          empty={
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucune écriture ne correspond"
                description="Aucun résultat pour ces critères. Élargissez la période ou changez de journal."
                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
              />
            ) : (
              <EmptyState
                icon={BookOpenIcon}
                title="Aucune écriture"
                description="Saisissez votre première écriture : elle alimentera le grand livre, la balance et les états financiers."
                hints={[
                  'Une écriture doit toujours être équilibrée (débit = crédit).',
                  'Une écriture validée est verrouillée et ne peut plus être supprimée.',
                ]}
                action={
                  <Button variant="primary" icon={PlusIcon} onClick={() => setShowForm(true)}>
                    Saisir la première écriture
                  </Button>
                }
              />
            )
          }
          footer={entries.last_page > 1 ? (
            <div className={cx('flex items-center justify-between gap-3 px-4 py-3', SURFACE_SUNK)}>
              <p className={cx('text-xs tabular-nums', TEXT_MUTED)}>
                Page {entries.current_page} sur {entries.last_page} — {entries.total} écriture{entries.total > 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary" size="sm"
                  disabled={!entries.prev_page_url}
                  onClick={() => entries.prev_page_url && router.visit(entries.prev_page_url)}
                >
                  Précédent
                </Button>
                <Button
                  variant="secondary" size="sm"
                  disabled={!entries.next_page_url}
                  onClick={() => entries.next_page_url && router.visit(entries.next_page_url)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          ) : null}
        />
      </div>

      {/* Formulaire modal */}
      {showForm && (
        <JournalForm
          accounts={chartAccounts}
          fiscalYears={fiscalYears}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </AuthLayout>
  );
}
export { JournalEntries };
