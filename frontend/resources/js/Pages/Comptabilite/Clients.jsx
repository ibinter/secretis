/**
 * Comptabilite/Clients.jsx — Carnet d'adresses clients comptables SECRETIS ERP
 *
 * Props Inertia :
 *   clients : Paginator<AccountingClient with invoices_count>
 *   filters : { search }
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  PlusIcon, MagnifyingGlassIcon, PencilIcon,
  TrashIcon, UserGroupIcon, CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';
import debounce from 'lodash/debounce';

const fcfa = (v) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v ?? 0) + ' FCFA';

const EMPTY_FORM = {
  name: '', email: '', phone: '', address: '',
  tax_number: '', currency: 'XOF', notes: '',
};

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

  return (
    <AuthLayout>
      <Head title="Clients comptables" />

      <div className="p-6 space-y-5">

        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {clients.total} client{clients.total > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#9333EA] text-white rounded-lg text-sm hover:bg-[#16324e] transition"
          >
            <PlusIcon className="h-4 w-4" />
            Nouveau client
          </button>
        </div>

        {/* Recherche */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="relative max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Nom, email, NIF..."
              defaultValue={filters.search}
              onChange={(e) => applySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30"
            />
          </div>
        </div>

        {/* Grille clients */}
        {clients.data.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
            <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun client trouvé.</p>
            <button onClick={openCreate} className="mt-4 text-sm text-[#9333EA] font-medium hover:underline">
              Créer le premier client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.data.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar initiales */}
                    <div className="h-10 w-10 rounded-full bg-[#9333EA] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm leading-tight">{client.name}</div>
                      {client.email && (
                        <div className="text-xs text-gray-400 mt-0.5">{client.email}</div>
                      )}
                    </div>
                  </div>
                  {client.is_active ? (
                    <CheckBadgeIcon className="h-5 w-5 text-emerald-500 flex-shrink-0" title="Actif" />
                  ) : (
                    <span className="text-xs text-gray-400">Inactif</span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-gray-500 mb-4">
                  {client.phone && <div>Tél : {client.phone}</div>}
                  {client.tax_number && <div>NIF : {client.tax_number}</div>}
                  {client.address && (
                    <div className="truncate">{client.address}</div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                  <div className="text-center">
                    <div className="text-sm font-bold text-[#9333EA]">{client.invoices_count ?? 0}</div>
                    <div className="text-xs text-gray-400">Factures</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(client)}
                      className="p-1.5 text-gray-400 hover:text-[#9333EA] hover:bg-purple-50 rounded-lg transition"
                      title="Modifier"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(client)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Supprimer"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                    <a
                      href={`/comptabilite/invoices?client_id=${client.id}`}
                      className="px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition"
                    >
                      Factures
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {clients.last_page > 1 && (
          <div className="flex justify-center gap-2">
            {clients.links.map((link, i) => (
              <button
                key={i}
                disabled={!link.url}
                onClick={() => link.url && router.get(link.url)}
                dangerouslySetInnerHTML={{ __html: link.label }}
                className={`px-3 py-1.5 rounded-lg text-xs transition ${
                  link.active
                    ? 'bg-[#9333EA] text-white'
                    : link.url
                    ? 'bg-white border border-gray-200 hover:bg-gray-50'
                    : 'opacity-40 cursor-not-allowed'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== Modal création / édition ===== */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-5">
              {modal.mode === 'create' ? 'Nouveau client' : `Modifier — ${modal.client.name}`}
            </h3>

            <div className="space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom / Raison sociale <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30 ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30" />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Adresse</label>
                <textarea rows={2} value={form.address} onChange={(e) => setField('address', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">NIF / Identifiant fiscal</label>
                  <input type="text" value={form.tax_number} onChange={(e) => setField('tax_number', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Devise</label>
                  <select value={form.currency} onChange={(e) => setField('currency', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30">
                    <option value="XOF">FCFA (XOF)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="USD">Dollar (USD)</option>
                    <option value="XAF">CFA BEAC (XAF)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={(e) => setField('notes', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/30 resize-none"
                  placeholder="Informations internes sur ce client..." />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-[#9333EA] text-white rounded-lg text-sm font-medium hover:bg-[#16324e] disabled:opacity-50 transition"
              >
                {saving ? 'Enregistrement...' : modal.mode === 'create' ? 'Créer' : 'Mettre à jour'}
              </button>
            </div>
          </div>
        </div>
      )}

    </AuthLayout>
  );
}
export { Clients };
