import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const BANT_COLOR = (s) => s >= 75 ? 'bg-green-500' : s >= 50 ? 'bg-amber-400' : s >= 25 ? 'bg-orange-400' : 'bg-red-400';

const TYPE_MAP = {
  lead:     { label: 'Lead',       cls: 'bg-gray-100 text-gray-700' },
  prospect: { label: 'Prospect',   cls: 'bg-purple-100 text-purple-700' },
  client:   { label: 'Client',     cls: 'bg-green-100 text-green-700' },
  partner:  { label: 'Partenaire', cls: 'bg-purple-100 text-purple-700' },
};

const STATUS_MAP = {
  new:         { label: 'Nouveau',     cls: 'bg-sky-100 text-sky-700' },
  contacted:   { label: 'Contacté',   cls: 'bg-indigo-100 text-indigo-700' },
  qualified:   { label: 'Qualifié',   cls: 'bg-violet-100 text-violet-700' },
  demo:        { label: 'Démo',       cls: 'bg-teal-100 text-teal-700' },
  proposal:    { label: 'Proposition',cls: 'bg-amber-100 text-amber-700' },
  negotiation: { label: 'Négociation',cls: 'bg-orange-100 text-orange-700' },
  won:         { label: 'Gagné',      cls: 'bg-green-100 text-green-700' },
  lost:        { label: 'Perdu',      cls: 'bg-red-100 text-red-700' },
  inactive:    { label: 'Inactif',    cls: 'bg-gray-100 text-gray-500' },
};

const SOURCE_LABELS = {
  web: 'Web', referral: 'Référence', partner: 'Partenaire',
  event: 'Événement', cold: 'Cold', social: 'Réseaux sociaux', inbound: 'Inbound',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

// ─── Modal contact ────────────────────────────────────────────────────────────
function ContactModal({ contact, onClose, onSaved }) {
  const isEdit = !!contact?.id;
  const [form, setForm] = useState({
    type:           contact?.type          || 'lead',
    company_name:   contact?.company_name  || '',
    contact_name:   contact?.contact_name  || '',
    email:          contact?.email         || '',
    phone:          contact?.phone         || '',
    country:        contact?.country       || '',
    city:           contact?.city          || '',
    sector:         contact?.sector        || '',
    employee_count: contact?.employee_count|| '',
    annual_revenue: contact?.annual_revenue|| '',
    source:         contact?.source        || 'web',
    notes:          contact?.notes         || '',
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, employee_count: form.employee_count || null, annual_revenue: form.annual_revenue || null };
      if (isEdit) {
        await axios.put(`/superadmin/crm/contacts/${contact.id}`, payload);
      } else {
        await axios.post('/superadmin/crm/contacts', payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      alert('Erreur : ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">
            {isEdit ? `Modifier — ${contact.company_name}` : 'Nouveau contact'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Type', key: 'type', type: 'select', options: Object.entries(TYPE_MAP).map(([k,v]) => ({ value: k, label: v.label })) },
            { label: 'Source', key: 'source', type: 'select', options: Object.entries(SOURCE_LABELS).map(([k,v]) => ({ value: k, label: v })) },
            { label: 'Société *', key: 'company_name', type: 'text', placeholder: 'Banque Nationale CI', span: 2 },
            { label: 'Nom du contact *', key: 'contact_name', type: 'text', placeholder: 'Jean Kouassi' },
            { label: 'Email *', key: 'email', type: 'email', placeholder: 'jean@banque.ci' },
            { label: 'Téléphone', key: 'phone', type: 'tel', placeholder: '+225 07 00 00 00' },
            { label: 'Pays (ISO)', key: 'country', type: 'text', placeholder: 'CI', maxLength: 2 },
            { label: 'Ville', key: 'city', type: 'text', placeholder: 'Abidjan' },
            { label: 'Secteur', key: 'sector', type: 'text', placeholder: 'Banque & Finance' },
            { label: 'Nb. employés', key: 'employee_count', type: 'number', placeholder: '50' },
            { label: 'CA annuel (XOF)', key: 'annual_revenue', type: 'number', placeholder: '50000000', span: 2 },
          ].map(({ label, key, type, placeholder, options, span, maxLength }) => (
            <div key={key} className={span === 2 ? 'col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              {type === 'select' ? (
                <select
                  value={form[key]}
                  onChange={e => f(key, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
                >
                  {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => f(key, e.target.value)}
                  maxLength={maxLength}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
                  placeholder={placeholder}
                />
              )}
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => f('notes', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900 resize-none"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">Annuler</button>
          <button
            onClick={save}
            disabled={saving || !form.company_name || !form.contact_name || !form.email}
            className="px-4 py-2 text-sm font-bold text-white bg-purple-900 rounded-lg hover:bg-purple-800 disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : isEdit ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import CSV ───────────────────────────────────────────────────────────────
function CsvImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const parsePreview = (csvText) => {
    const lines = csvText.split('\n').filter(Boolean);
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1, 6).map(l => {
      const cells = l.split(',').map(c => c.trim().replace(/"/g, ''));
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: cells[i] || '' }), {});
    });
    setPreview(rows);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => parsePreview(ev.target.result);
    reader.readAsText(f, 'UTF-8');
  };

  const doImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await axios.post('/superadmin/crm/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onImported();
      onClose();
    } catch (e) {
      alert('Erreur import : ' + (e.response?.data?.message || e.message));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">Import CSV de contacts</h3>
          <p className="text-sm text-gray-500 mt-1">
            Colonnes attendues : <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">company_name, contact_name, email, phone, country, city, sector, source</code>
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
          >
            <p className="text-sm font-medium text-gray-700">
              {file ? file.name : 'Cliquez ou glissez un fichier CSV'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Encodage UTF-8, séparateur virgule</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

          {preview.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs font-medium text-gray-500 mb-2">Aperçu (5 premières lignes) :</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {Object.keys(preview[0]).slice(0, 5).map(h => (
                      <th key={h} className="px-2 py-1 bg-gray-50 border border-gray-200 text-left font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).slice(0, 5).map((v, j) => (
                        <td key={j} className="px-2 py-1 border border-gray-100 text-gray-700">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">Annuler</button>
          <button
            onClick={doImport}
            disabled={!file || importing}
            className="px-4 py-2 text-sm font-bold text-white bg-purple-900 rounded-lg hover:bg-purple-800 disabled:opacity-50"
          >
            {importing ? 'Import en cours...' : `Importer ${preview.length > 0 ? '(aperçu OK)' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function CrmContacts() {
  const [contacts, setContacts]     = useState([]);
  const [meta, setMeta]             = useState({});
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(new Set());
  const [filters, setFilters]       = useState({ search: '', type: '', status: '', country: '', source: '' });
  const [page, setPage]             = useState(1);
  const [editContact, setEditContact] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/superadmin/crm/contacts', {
        params: { ...filters, page, type: filters.type || undefined, status: filters.status || undefined, country: filters.country || undefined, source: filters.source || undefined, search: filters.search || undefined },
      });
      setContacts(res.data.data || res.data);
      setMeta(res.data.meta || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, [filters, page]);

  const exportCsv = () => {
    const headers = ['ID', 'Type', 'Société', 'Contact', 'Email', 'Téléphone', 'Pays', 'Statut', 'Source', 'Score BANT', 'Dernier contact'];
    const rows = contacts
      .filter(c => selected.size === 0 || selected.has(c.id))
      .map(c => [c.id, c.type, c.company_name, c.contact_name, c.email, c.phone || '', c.country || '', c.status, c.source, c.bant_score || '', c.last_contact_at ? new Date(c.last_contact_at).toLocaleDateString('fr-FR') : '']);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `crm_contacts_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map(c => c.id)));
    }
  };

  const deleteContact = async (id) => {
    if (!confirm('Supprimer ce contact ?')) return;
    try {
      await axios.delete(`/superadmin/crm/contacts/${id}`);
      notify('Contact supprimé.');
      fetchContacts();
    } catch (e) {
      notify('Erreur.', 'error');
    }
  };

  return (
    <>
      <Head title="Contacts CRM — SuperAdmin IBIG Soft" />

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.msg}
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-purple-900 text-white px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold">Contacts CRM</h1>
              <p className="text-purple-200 text-xs mt-0.5">
                {meta.total ?? contacts.length} contacts
                {selected.size > 0 && ` · ${selected.size} sélectionnés`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {selected.size > 0 && (
                <select
                  onChange={async (e) => {
                    const action = e.target.value;
                    if (!action) return;
                    // Attribution groupée
                    if (action.startsWith('assign_')) {
                      const userId = action.replace('assign_', '');
                      for (const id of selected) {
                        await axios.put(`/superadmin/crm/contacts/${id}`, { assigned_to: userId }).catch(() => {});
                      }
                      notify(`${selected.size} contacts assignés.`);
                      setSelected(new Set());
                      fetchContacts();
                    }
                    e.target.value = '';
                  }}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white"
                  defaultValue=""
                >
                  <option value="">Actions groupées</option>
                  <option value="assign_1">Assigner à moi</option>
                </select>
              )}
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium"
              >
                ↑ Import CSV
              </button>
              <button
                onClick={exportCsv}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium"
              >
                ↓ Export CSV
              </button>
              <button
                onClick={() => setEditContact({})}
                className="px-4 py-2 bg-white text-purple-900 rounded-lg text-sm font-bold hover:bg-purple-50"
              >
                + Nouveau contact
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          {/* Filtres avancés */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-3">
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Rechercher société, contact, email..."
              className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
            />
            {[
              { key: 'type', label: 'Type', options: [['', 'Tous les types'], ...Object.entries(TYPE_MAP).map(([k,v]) => [k, v.label])] },
              { key: 'status', label: 'Statut', options: [['', 'Tous les statuts'], ...Object.entries(STATUS_MAP).map(([k,v]) => [k, v.label])] },
              { key: 'source', label: 'Source', options: [['', 'Toutes les sources'], ...Object.entries(SOURCE_LABELS).map(([k,v]) => [k, v])] },
              { key: 'country', label: 'Pays', options: [['', 'Tous pays'], ['CI', 'Côte d\'Ivoire'], ['SN', 'Sénégal'], ['BF', 'Burkina'], ['CM', 'Cameroun'], ['GN', 'Guinée'], ['ML', 'Mali'], ['TG', 'Togo'], ['BJ', 'Bénin']] },
            ].map(({ key, options }) => (
              <select
                key={key}
                value={filters[key]}
                onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
              >
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            {Object.values(filters).some(Boolean) && (
              <button
                onClick={() => setFilters({ search: '', type: '', status: '', country: '', source: '' })}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                ✕ Effacer
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin w-8 h-8 border-4 border-purple-900 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 w-8">
                        <input
                          type="checkbox"
                          checked={selected.size === contacts.length && contacts.length > 0}
                          onChange={selectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">Société</th>
                      <th className="px-4 py-3 text-left font-semibold">Contact</th>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Statut</th>
                      <th className="px-4 py-3 text-left font-semibold">Pays</th>
                      <th className="px-4 py-3 text-left font-semibold">Source</th>
                      <th className="px-4 py-3 text-center font-semibold">BANT</th>
                      <th className="px-4 py-3 text-left font-semibold">Deals</th>
                      <th className="px-4 py-3 text-left font-semibold">Dernier contact</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {contacts.map(c => {
                      const type = TYPE_MAP[c.type] || { label: c.type, cls: 'bg-gray-100 text-gray-600' };
                      const status = STATUS_MAP[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={c.id} className={`hover:bg-gray-50 ${selected.has(c.id) ? 'bg-purple-50' : ''}`}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-purple-900 text-white rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {c.company_name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{c.company_name}</p>
                                <p className="text-xs text-gray-400">{c.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-700">{c.contact_name}</p>
                            {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${type.cls}`}>{type.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${status.cls}`}>{status.label}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{c.country || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{SOURCE_LABELS[c.source] || c.source}</td>
                          <td className="px-4 py-3 text-center">
                            {c.bant_score != null ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${BANT_COLOR(c.bant_score)}`} />
                                <span className="text-xs font-semibold">{c.bant_score}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{c.deals_count ?? 0}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(c.last_contact_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => router.visit(`/superadmin/crm/contacts/${c.id}`)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
                              >
                                Voir
                              </button>
                              <button
                                onClick={() => setEditContact(c)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => deleteContact(c.id)}
                                className="text-xs px-2 py-1.5 rounded-lg text-red-400 hover:bg-red-50"
                                title="Supprimer"
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {contacts.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-6 py-12 text-center text-gray-400">
                          Aucun contact trouvé.
                          <button onClick={() => setEditContact({})} className="ml-2 text-purple-700 font-semibold hover:underline">
                            Ajouter le premier →
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {meta.last_page > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {meta.current_page} / {meta.last_page} — {meta.total} contacts
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    ← Préc.
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                    disabled={page === meta.last_page}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Suiv. →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      {editContact !== null && (
        <ContactModal
          contact={editContact}
          onClose={() => setEditContact(null)}
          onSaved={() => { fetchContacts(); notify('Contact sauvegardé.'); }}
        />
      )}
      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { fetchContacts(); notify('Import terminé.'); }}
        />
      )}
    </>
  );
}
export { CrmContacts };
