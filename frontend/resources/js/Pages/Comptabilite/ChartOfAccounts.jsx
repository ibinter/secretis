/**
 * Comptabilite/ChartOfAccounts.jsx — Plan comptable SYSCOHADA
 *
 * Props Inertia :
 *   accounts : paginé
 *   filters  : filtres actifs
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Logique métier inchangée (routes, axios, export CSV).
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon,
  ShieldCheckIcon, TrashIcon, XMarkIcon, TableCellsIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card, DataTable, EmptyState,
  cx, CONTROL, SURFACE_SUNK, TEXT_MUTED, TEXT_FAINT, TEXT_TITLE,
} from '@/Components/UI';
import { AccountTypeBadge, ACCOUNT_TYPES } from '@/Components/Comptabilite/accounting';

const CLASSES = Array.from({ length: 8 }, (_, i) => ({
  value: String(i + 1),
  label: `Classe ${i + 1}`,
}));

// ============================================================
// Formulaire d'ajout de compte
// ============================================================
function AddAccountForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    account_number: '',
    account_name:   '',
    account_type:   'actif',
    parent_account_number: '',
    ohada_class:    '1',
    is_leaf:        true,
  });
  const [saving, setSaving] = useState(false);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/comptabilite/plan-comptable', {
        ...form,
        ohada_class: parseInt(form.ohada_class),
        is_leaf:     form.is_leaf === true || form.is_leaf === 'true',
      });
      toast.success(`Compte ${form.account_number} créé`);
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit} className="w-full max-w-lg">
        <Card
          padded={false}
          className="shadow-xl"
          title="Ajouter un compte"
          subtitle="Les champs marqués d'un astérisque sont obligatoires."
          actions={
            <Button variant="ghost" size="sm" iconOnly icon={XMarkIcon}
                    title="Fermer" onClick={onClose} />
          }
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
              <Button type="submit" variant="primary" loading={saving}>Créer le compte</Button>
            </div>
          }
        >
          <div className="space-y-4 px-4 py-4 sm:px-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>N° compte *</span>
                <input className={cx(CONTROL, 'h-10 font-mono')} placeholder="ex : 4112" required
                       value={form.account_number} onChange={e => setF('account_number', e.target.value)} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>Classe OHADA *</span>
                <select className={cx(CONTROL, 'h-10')} value={form.ohada_class}
                        onChange={e => setF('ohada_class', e.target.value)}>
                  {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Libellé *</span>
              <input className={cx(CONTROL, 'h-10')} placeholder="ex : Clients particuliers" required
                     value={form.account_name} onChange={e => setF('account_name', e.target.value)} />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>Type *</span>
                <select className={cx(CONTROL, 'h-10')} value={form.account_type}
                        onChange={e => setF('account_type', e.target.value)}>
                  {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>Compte parent</span>
                <input className={cx(CONTROL, 'h-10 font-mono')} placeholder="ex : 411"
                       value={form.parent_account_number}
                       onChange={e => setF('parent_account_number', e.target.value)} />
              </label>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_leaf}
                onChange={e => setF('is_leaf', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#0F1923]"
              />
              <span className={cx('text-sm', TEXT_MUTED)}>
                Compte feuille (peut recevoir des écritures directes)
              </span>
            </label>
          </div>
        </Card>
      </form>
    </div>
  );
}

// ============================================================
// Export CSV
// ============================================================
function exportCsv(accounts) {
  const BOM = '﻿';
  const header = 'N° Compte;Libellé;Type;Classe;Compte parent;Feuille;Système\n';
  const rows   = accounts.map(a =>
    `${a.account_number};"${a.account_name}";${a.account_type};${a.ohada_class};${a.parent_account_number || ''};${a.is_leaf ? 'Oui' : 'Non'};${a.is_system ? 'SYSCOHADA' : 'Personnalisé'}`
  ).join('\n');
  const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plan-comptable-syscohada.csv';
  link.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Page principale
// ============================================================
export default function ChartOfAccounts({ accounts, filters }) {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch]     = useState(filters.search || '');
  const [cls, setCls]           = useState(filters.class || '');
  const [type, setType]         = useState(filters.type  || '');

  const applyFilters = () => {
    router.get('/comptabilite/plan-comptable', { search, class: cls, type }, { preserveState: true });
  };

  const handleSaved = () => {
    router.reload({ only: ['accounts'] });
  };

  const handleDelete = async (id, number) => {
    if (!confirm(`Supprimer le compte ${number} ?`)) return;
    try {
      await axios.delete(`/comptabilite/plan-comptable/${id}`);
      toast.success('Compte supprimé');
      router.reload({ only: ['accounts'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const allAccounts = accounts?.data || [];

  const isFiltered = Boolean(filters.search || filters.class || filters.type);

  const resetFilters = () => {
    setSearch(''); setCls(''); setType('');
    router.get('/comptabilite/plan-comptable', {}, { preserveState: true });
  };

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'account_number',
      label: 'N° Compte',
      nowrap: true,
      width: '120px',
      render: (v) => (
        <span className="font-mono text-xs font-semibold text-purple-700 dark:text-purple-400">{v}</span>
      ),
    },
    {
      key: 'account_name',
      label: 'Libellé',
      render: (v) => <span className={cx('font-medium', TEXT_TITLE)}>{v}</span>,
    },
    {
      key: 'ohada_class',
      label: 'Classe',
      align: 'center',
      width: '90px',
      render: (v) => <Badge variant="neutral" pill={false}>Cl. {v}</Badge>,
    },
    {
      key: 'account_type',
      label: 'Type',
      align: 'center',
      width: '120px',
      render: (v) => <AccountTypeBadge type={v} />,
    },
    {
      key: 'parent_account_number',
      label: 'Parent',
      align: 'center',
      width: '100px',
      render: (v) => v
        ? <span className={cx('font-mono text-xs', TEXT_MUTED)}>{v}</span>
        : <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'is_leaf',
      label: 'Feuille',
      align: 'center',
      width: '90px',
      render: (v) => v
        ? <Badge variant="success">Oui</Badge>
        : <span className={TEXT_FAINT}>Non</span>,
    },
    {
      key: 'is_system',
      label: 'Origine',
      align: 'center',
      width: '150px',
      render: (v) => v
        ? <Badge variant="info" icon={ShieldCheckIcon}>SYSCOHADA</Badge>
        : <Badge variant="neutral">Personnalisé</Badge>,
    },
  ];

  return (
    <AuthLayout>
      <Head title="Plan comptable SYSCOHADA" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={TableCellsIcon}
          title="Plan comptable"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Plan comptable' }]}
          subtitle="SYSCOHADA Révisé 2017 — classes 1 à 8"
          actions={
            <>
              <Button variant="secondary" icon={ArrowDownTrayIcon} onClick={() => exportCsv(allAccounts)}>
                Export CSV
              </Button>
              <Button variant="primary" icon={PlusIcon} onClick={() => setShowForm(true)}>
                Ajouter un compte
              </Button>
            </>
          }
        />

        {/* Filtres */}
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          <div className="relative col-span-2">
            <MagnifyingGlassIcon className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
            <input
              className={cx(CONTROL, 'h-10 pl-9')}
              placeholder="Rechercher un N° ou un libellé…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <select className={cx(CONTROL, 'h-10')} value={cls} onChange={e => setCls(e.target.value)}>
            <option value="">Toutes classes</option>
            {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className={cx(CONTROL, 'h-10')} value={type} onChange={e => setType(e.target.value)}>
            <option value="">Tous types</option>
            {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={applyFilters}>Filtrer</Button>
            {isFiltered && <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>}
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={allAccounts}
          rowKey="id"
          pageSize={accounts.per_page ?? 25}
          totalItems={accounts.total ?? allAccounts.length}
          actions={(acc) => acc.is_system ? (
            <span className={cx('text-xs', TEXT_FAINT)}>Verrouillé</span>
          ) : (
            <Button
              variant="ghost" size="sm" iconOnly icon={TrashIcon}
              title="Supprimer le compte"
              className="hover:text-red-600 dark:hover:text-red-400"
              onClick={() => handleDelete(acc.id, acc.account_number)}
            />
          )}
          empty={
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucun compte ne correspond"
                description="Aucun compte ne satisfait ces critères. Élargissez la classe, le type ou la recherche."
                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
              />
            ) : (
              <EmptyState
                icon={TableCellsIcon}
                title="Plan comptable vide"
                description="Ajoutez un premier compte pour pouvoir saisir des écritures et produire la balance."
                hints={[
                  'Seuls les comptes « feuille » reçoivent des écritures directes.',
                  'Les comptes SYSCOHADA de base ne sont pas supprimables.',
                ]}
                action={
                  <Button variant="primary" icon={PlusIcon} onClick={() => setShowForm(true)}>
                    Ajouter un compte
                  </Button>
                }
              />
            )
          }
          footer={accounts.last_page > 1 ? (
            <div className={cx('flex items-center justify-between gap-3 px-4 py-3', SURFACE_SUNK)}>
              <p className={cx('text-xs tabular-nums', TEXT_MUTED)}>
                {accounts.total} compte{accounts.total > 1 ? 's' : ''} — page {accounts.current_page} sur {accounts.last_page}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary" size="sm"
                  disabled={!accounts.prev_page_url}
                  onClick={() => accounts.prev_page_url && router.visit(accounts.prev_page_url)}
                >
                  Précédent
                </Button>
                <Button
                  variant="secondary" size="sm"
                  disabled={!accounts.next_page_url}
                  onClick={() => accounts.next_page_url && router.visit(accounts.next_page_url)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          ) : null}
        />
      </div>

      {showForm && (
        <AddAccountForm onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
    </AuthLayout>
  );
}
export { ChartOfAccounts };
