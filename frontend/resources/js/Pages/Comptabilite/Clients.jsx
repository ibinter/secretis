/**
 * Comptabilite/Clients.jsx — Carnet d'adresses clients comptables SECRETIS ERP
 *
 * Props Inertia :
 *   clients : Paginator<AccountingClient with invoices_count>
 *   filters : { search }
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier inchangée
 * (routes `/comptabilite/clients`, axios, états locaux).
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  PlusIcon, MagnifyingGlassIcon, PencilSquareIcon,
  TrashIcon, UserGroupIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';
import debounce from 'lodash/debounce';
import {
  PageHeader, Button, Badge, Card, EmptyState,
  cx, CONTROL, BORDER, SURFACE, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, FOCUS_RING, NUM,
} from '@/Components/UI';

const EMPTY_FORM = {
  name: '', email: '', phone: '', address: '',
  tax_number: '', currency: 'XOF', notes: '',
};

const CURRENCIES = [
  ['XOF', 'FCFA (XOF)'],
  ['EUR', 'Euro (EUR)'],
  ['USD', 'Dollar (USD)'],
  ['XAF', 'CFA BEAC (XAF)'],
];

// =============================================================================

export default function Clients({ clients, filters }) {
  const [modal, setModal] = useState(null); // null | { mode: 'create'|'edit', client?: {} }
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setModal({ mode: 'create' });
  };

  const openEdit = (client) => {
    setForm({
      name:       client.name,
      email:      client.email ?? '',
      phone:      client.phone ?? '',
      address:    client.address ?? '',
      tax_number: client.tax_number ?? '',
      currency:   client.currency ?? 'XOF',
      notes:      client.notes ?? '',
    });
    setErrors({});
    setModal({ mode: 'edit', client });
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    try {
      if (modal.mode === 'create') {
        await axios.post('/comptabilite/clients', form);
        toast.success('Client créé.');
      } else {
        await axios.put(`/comptabilite/clients/${modal.client.id}`, form);
        toast.success('Client mis à jour.');
      }
      setModal(null);
      router.reload({ only: ['clients'] });
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

  const handleDelete = async (client) => {
    if (! confirm(`Supprimer le client "${client.name}" ?`)) return;
    try {
      await axios.delete(`/comptabilite/clients/${client.id}`);
      toast.success('Client supprimé.');
      router.reload({ only: ['clients'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Impossible de supprimer ce client.');
    }
  };

  const applySearch = debounce((value) => {
    router.get('/comptabilite/clients', { search: value || undefined }, {
      preserveState: true, replace: true,
    });
  }, 350);

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const isFiltered = Boolean(filters?.search);

  const resetFilters = () => {
    router.get('/comptabilite/clients', {}, { preserveState: true, replace: true });
  };

  /* ─── Rendu ──────────────────────────────────────────────────────────────── */

  return (
    <AuthLayout>
      <Head title="Clients comptables" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={UserGroupIcon}
          title="Clients"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Clients' }]}
          subtitle={`${clients.total} client${clients.total > 1 ? 's' : ''} facturable${clients.total > 1 ? 's' : ''}`}
          actions={
            <Button variant="primary" icon={PlusIcon} onClick={openCreate}>
              Nouveau client
            </Button>
          }
        />

        {/* Recherche */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 sm:max-w-sm sm:flex-none">
            <MagnifyingGlassIcon className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
            <input
              type="text"
              placeholder="Nom, email, NIF…"
              defaultValue={filters.search}
              onChange={(e) => applySearch(e.target.value)}
              className={cx(CONTROL, 'h-10 pl-9')}
            />
          </div>
          {isFiltered && <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>}
        </div>

        {/* Grille clients */}
        {clients.data.length === 0 ? (
          isFiltered ? (
            <EmptyState
              bordered
              variant="no-results"
              title="Aucun client ne correspond"
              description="Aucun résultat pour cette recherche. Essayez un autre nom, email ou NIF."
              action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser la recherche</Button>}
            />
          ) : (
            <EmptyState
              bordered
              icon={UserGroupIcon}
              title="Aucun client"
              description="Créez votre premier client : il pourra ensuite recevoir devis et factures."
              hints={[
                'Le NIF apparaît sur les factures émises.',
                'La devise du client détermine celle de ses documents.',
              ]}
              action={
                <Button variant="primary" icon={PlusIcon} onClick={openCreate}>
                  Créer votre premier client
                </Button>
              }
            />
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.data.map((client) => (
              <div
                key={client.id}
                className={cx(SURFACE, 'border', BORDER, 'rounded-xl p-5 shadow-sm transition-colors',
                              'hover:bg-gray-50 dark:hover:bg-white/[0.03]')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                      {client.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className={cx('text-sm font-medium leading-tight truncate', TEXT_TITLE)}>{client.name}</p>
                      {client.email && (
                        <p className={cx('mt-0.5 text-xs truncate', TEXT_MUTED)}>{client.email}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={client.is_active ? 'success' : 'neutral'} dot>
                    {client.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                <dl className={cx('mt-4 space-y-1 text-xs', TEXT_MUTED)}>
                  {client.phone && (
                    <div className="flex gap-1.5">
                      <dt className={TEXT_FAINT}>Tél.</dt>
                      <dd className="tabular-nums">{client.phone}</dd>
                    </div>
                  )}
                  {client.tax_number && (
                    <div className="flex gap-1.5">
                      <dt className={TEXT_FAINT}>NIF</dt>
                      <dd className="tabular-nums">{client.tax_number}</dd>
                    </div>
                  )}
                  {client.address && <p className="truncate">{client.address}</p>}
                </dl>

                <div className={cx('mt-4 flex items-center justify-between border-t pt-3', BORDER)}>
                  <p className={cx('text-xs', TEXT_MUTED)}>
                    <span className={cx('text-sm font-semibold', NUM, TEXT_TITLE)}>
                      {client.invoices_count ?? 0}
                    </span>
                    {' '}facture{(client.invoices_count ?? 0) > 1 ? 's' : ''}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="sm" iconOnly icon={PencilSquareIcon}
                      title="Modifier" onClick={() => openEdit(client)}
                    />
                    <Button
                      variant="ghost" size="sm" iconOnly icon={TrashIcon}
                      title="Supprimer"
                      className="hover:text-red-600 dark:hover:text-red-400"
                      onClick={() => handleDelete(client)}
                    />
                    <Button
                      variant="subtle" size="sm"
                      onClick={() => router.visit(`/comptabilite/factures?client_id=${client.id}`)}
                    >
                      Factures
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {clients.last_page > 1 && clients.links && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-1">
            {clients.links.map((link, i) => (
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
        )}
      </div>

      {/* ===== Modal création / édition ===== */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
            <Card
              padded={false}
              className="shadow-xl max-h-[90vh] overflow-y-auto"
              title={modal.mode === 'create' ? 'Nouveau client' : `Modifier — ${modal.client.name}`}
              subtitle="Les champs marqués d'un astérisque sont obligatoires."
              actions={
                <Button variant="ghost" size="sm" iconOnly icon={XMarkIcon}
                        title="Fermer" onClick={() => setModal(null)} />
              }
              footer={
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setModal(null)}>Annuler</Button>
                  <Button variant="primary" loading={saving} onClick={handleSave}>
                    {modal.mode === 'create' ? 'Créer' : 'Mettre à jour'}
                  </Button>
                </div>
              }
            >
              <div className="px-4 py-4 sm:px-6 space-y-4">
                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Nom / Raison sociale *</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className={cx(CONTROL, 'h-10', errors.name && 'border-red-400 dark:border-red-500/60')}
                  />
                  {errors.name && <span className="text-xs text-red-600 dark:text-red-400">{errors.name[0]}</span>}
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={cx('text-xs font-medium', TEXT_MUTED)}>Email</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField('email', e.target.value)}
                      className={cx(CONTROL, 'h-10')}
                    />
                    {errors.email && <span className="text-xs text-red-600 dark:text-red-400">{errors.email[0]}</span>}
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={cx('text-xs font-medium', TEXT_MUTED)}>Téléphone</span>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField('phone', e.target.value)}
                      className={cx(CONTROL, 'h-10')}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Adresse</span>
                  <textarea
                    rows={2}
                    value={form.address}
                    onChange={(e) => setField('address', e.target.value)}
                    className={cx(CONTROL, 'resize-none')}
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={cx('text-xs font-medium', TEXT_MUTED)}>NIF / Identifiant fiscal</span>
                    <input
                      type="text"
                      value={form.tax_number}
                      onChange={(e) => setField('tax_number', e.target.value)}
                      className={cx(CONTROL, 'h-10')}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={cx('text-xs font-medium', TEXT_MUTED)}>Devise</span>
                    <select
                      value={form.currency}
                      onChange={(e) => setField('currency', e.target.value)}
                      className={cx(CONTROL, 'h-10')}
                    >
                      {CURRENCIES.map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Notes</span>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    placeholder="Informations internes sur ce client…"
                    className={cx(CONTROL, 'resize-none')}
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
export { Clients };
