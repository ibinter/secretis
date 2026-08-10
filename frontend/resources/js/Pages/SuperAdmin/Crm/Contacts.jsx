/**
 * SuperAdmin/Crm/Contacts.jsx — Base de contacts commerciaux
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`GET/POST/PUT/DELETE /superadmin/crm/contacts…`, import CSV multipart),
 * mêmes états locaux, même sélection multiple, même export CSV client,
 * même pagination serveur.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Users, Plus, Upload, Download, X, Loader2, ChevronLeft, ChevronRight, Search,
} from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, EmptyState,
  cx, SURFACE, SURFACE_SUNK, BORDER, CONTROL, TH,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Sémantique ───────────────────────────────────────────────────────────── */

const TYPE_MAP = {
  lead:     { label: 'Lead',       tone: 'neutral' },
  prospect: { label: 'Prospect',   tone: 'info' },
  client:   { label: 'Client',     tone: 'success' },
  partner:  { label: 'Partenaire', tone: 'accent' },
};

const STATUS_MAP = {
  new:         { label: 'Nouveau',     tone: 'info' },
  contacted:   { label: 'Contacté',    tone: 'info' },
  qualified:   { label: 'Qualifié',    tone: 'accent' },
  demo:        { label: 'Démo',        tone: 'accent' },
  proposal:    { label: 'Proposition', tone: 'warning' },
  negotiation: { label: 'Négociation', tone: 'warning' },
  won:         { label: 'Gagné',       tone: 'success' },
  lost:        { label: 'Perdu',       tone: 'danger' },
  inactive:    { label: 'Inactif',     tone: 'neutral' },
};

const SOURCE_LABELS = {
  web: 'Web', referral: 'Référence', partner: 'Partenaire',
  event: 'Événement', cold: 'Prospection froide', social: 'Réseaux sociaux', inbound: 'Inbound',
};

const COUNTRIES = [
  ['CI', "Côte d'Ivoire"], ['SN', 'Sénégal'], ['BF', 'Burkina Faso'], ['CM', 'Cameroun'],
  ['GN', 'Guinée'], ['ML', 'Mali'], ['TG', 'Togo'], ['BJ', 'Bénin'],
];

const bantDot = (s) =>
  s >= 75 ? 'bg-emerald-500' : s >= 50 ? 'bg-amber-500' : s >= 25 ? 'bg-orange-500' : 'bg-red-500';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

/* ─── Création / modification ──────────────────────────────────────────────── */

const FIELDS = [
  { label: 'Type',            key: 'type',           type: 'select', options: Object.entries(TYPE_MAP).map(([k, v]) => [k, v.label]) },
  { label: 'Source',          key: 'source',         type: 'select', options: Object.entries(SOURCE_LABELS) },
  { label: 'Société *',       key: 'company_name',   type: 'text',   placeholder: 'Banque Nationale CI', span: 2 },
  { label: 'Nom du contact *',key: 'contact_name',   type: 'text',   placeholder: 'Jean Kouassi' },
  { label: 'Email *',         key: 'email',          type: 'email',  placeholder: 'jean@banque.ci' },
  { label: 'Téléphone',       key: 'phone',          type: 'tel',    placeholder: '+225 07 00 00 00' },
  { label: 'Pays (ISO)',      key: 'country',        type: 'text',   placeholder: 'CI', maxLength: 2 },
  { label: 'Ville',           key: 'city',           type: 'text',   placeholder: 'Abidjan' },
  { label: 'Secteur',         key: 'sector',         type: 'text',   placeholder: 'Banque & finance' },
  { label: "Nombre d'employés", key: 'employee_count', type: 'number', placeholder: '50' },
  { label: 'CA annuel (XOF)', key: 'annual_revenue', type: 'number', placeholder: '50000000', span: 2 },
];

function ContactModal({ contact, onClose, onSaved }) {
  const isEdit = Boolean(contact?.id);
  const [form, setForm] = useState({
    type:           contact?.type           || 'lead',
    company_name:   contact?.company_name   || '',
    contact_name:   contact?.contact_name   || '',
    email:          contact?.email          || '',
    phone:          contact?.phone          || '',
    country:        contact?.country        || '',
    city:           contact?.city           || '',
    sector:         contact?.sector         || '',
    employee_count: contact?.employee_count || '',
    annual_revenue: contact?.annual_revenue || '',
    source:         contact?.source         || 'web',
    notes:          contact?.notes          || '',
  });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        employee_count: form.employee_count || null,
        annual_revenue: form.annual_revenue || null,
      };
      if (isEdit) await axios.put(`/superadmin/crm/contacts/${contact.id}`, payload);
      else        await axios.post('/superadmin/crm/contacts', payload);
      onSaved();
      onClose();
    } catch (e) {
      alert('Erreur : ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <div onClick={e => e.stopPropagation()} className="my-8 w-full max-w-2xl">
        <Card
          padded={false}
          className="shadow-xl"
          title={isEdit ? `Modifier — ${contact.company_name}` : 'Nouveau contact'}
          subtitle="Les champs marqués d'un astérisque sont obligatoires."
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Annuler</Button>
              <Button
                variant="primary"
                loading={saving}
                disabled={!form.company_name || !form.contact_name || !form.email}
                onClick={save}
              >
                {isEdit ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6">
            {FIELDS.map(({ label, key, type, placeholder, options, span, maxLength }) => (
              <label key={key} className={cx('flex flex-col gap-1.5', span === 2 && 'sm:col-span-2')}>
                <span className={cx('text-xs font-medium', TEXT_MUTED)}>{label}</span>
                {type === 'select' ? (
                  <select
                    value={form[key]}
                    onChange={e => f(key, e.target.value)}
                    className={cx(CONTROL, 'h-10')}
                  >
                    {options.map(([value, optLabel]) => (
                      <option key={value} value={value}>{optLabel}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={type}
                    value={form[key]}
                    maxLength={maxLength}
                    placeholder={placeholder}
                    onChange={e => f(key, e.target.value)}
                    className={cx(CONTROL, 'h-10')}
                  />
                )}
              </label>
            ))}

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>Notes</span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={e => f('notes', e.target.value)}
                className={cx(CONTROL, 'resize-none')}
              />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Import CSV ───────────────────────────────────────────────────────────── */

function CsvImportModal({ onClose, onImported }) {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const parsePreview = (csvText) => {
    const lines = csvText.split('\n').filter(Boolean);
    if (lines.length === 0) return;
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1, 6).map(l => {
      const cells = l.split(',').map(c => c.trim().replace(/"/g, ''));
      return headers.reduce((obj, h, i) => ({ ...obj, [h]: cells[i] || '' }), {});
    });
    setPreview(rows);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => parsePreview(ev.target.result);
    reader.readAsText(selected, 'UTF-8');
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-xl">
        <Card
          padded={false}
          className="shadow-xl"
          title="Import CSV de contacts"
          subtitle="Encodage UTF-8, séparateur virgule."
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>Annuler</Button>
              <Button variant="primary" loading={importing} disabled={!file} onClick={doImport}>
                Importer
              </Button>
            </div>
          }
        >
          <div className="space-y-4 px-4 py-5 sm:px-6">
            <p className={cx('text-xs', TEXT_MUTED)}>
              Colonnes attendues :{' '}
              <code className={cx('rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-white/[0.06]', TEXT_BODY)}>
                company_name, contact_name, email, phone, country, city, sector, source
              </code>
            </p>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cx(
                'w-full rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                BORDER, 'hover:border-purple-400 hover:bg-purple-50/40 dark:hover:bg-purple-500/5',
                FOCUS_RING,
              )}
            >
              <span className={cx('block text-sm font-medium', TEXT_TITLE)}>
                {file ? file.name : 'Cliquez pour sélectionner un fichier CSV'}
              </span>
              <span className={cx('mt-1 block text-xs', TEXT_FAINT)}>Format .csv uniquement</span>
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

            {preview.length > 0 && (
              <div>
                <p className={cx('mb-2 text-xs font-medium', TEXT_MUTED)}>Aperçu des 5 premières lignes</p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {Object.keys(preview[0]).slice(0, 5).map(h => (
                          <th key={h} className={cx('border px-2 py-1.5 text-left', BORDER, SURFACE_SUNK, TH)}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).slice(0, 5).map((v, j) => (
                            <td key={j} className={cx('border px-2 py-1.5', BORDER, TEXT_BODY)}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function CrmContacts() {
  const [contacts, setContacts]         = useState([]);
  const [meta, setMeta]                 = useState({});
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState(new Set());
  const [filters, setFilters]           = useState({ search: '', type: '', status: '', country: '', source: '' });
  const [page, setPage]                 = useState(1);
  const [editContact, setEditContact]   = useState(null);
  const [showImport, setShowImport]     = useState(false);
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/superadmin/crm/contacts', {
        params: {
          ...filters, page,
          type:    filters.type    || undefined,
          status:  filters.status  || undefined,
          country: filters.country || undefined,
          source:  filters.source  || undefined,
          search:  filters.search  || undefined,
        },
      });
      setContacts(res.data.data || res.data);
      setMeta(res.data.meta || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, [filters, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    const headers = ['ID', 'Type', 'Société', 'Contact', 'Email', 'Téléphone', 'Pays', 'Statut', 'Source', 'Score BANT', 'Dernier contact'];
    const rows = contacts
      .filter(c => selected.size === 0 || selected.has(c.id))
      .map(c => [
        c.id, c.type, c.company_name, c.contact_name, c.email, c.phone || '',
        c.country || '', c.status, c.source, c.bant_score || '',
        c.last_contact_at ? new Date(c.last_contact_at).toLocaleDateString('fr-FR') : '',
      ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map(c => c.id)));
  };

  const deleteContact = async (id) => {
    if (!confirm('Supprimer ce contact ?')) return;
    try {
      await axios.delete(`/superadmin/crm/contacts/${id}`);
      notify('Contact supprimé.');
      fetchContacts();
    } catch {
      notify('Erreur lors de la suppression.', 'error');
    }
  };

  const isFiltered = Object.values(filters).some(Boolean);
  const resetFilters = () => setFilters({ search: '', type: '', status: '', country: '', source: '' });

  const SELECTS = [
    { key: 'type',    options: [['', 'Tous les types'], ...Object.entries(TYPE_MAP).map(([k, v]) => [k, v.label])] },
    { key: 'status',  options: [['', 'Tous les statuts'], ...Object.entries(STATUS_MAP).map(([k, v]) => [k, v.label])] },
    { key: 'source',  options: [['', 'Toutes les sources'], ...Object.entries(SOURCE_LABELS)] },
    { key: 'country', options: [['', 'Tous les pays'], ...COUNTRIES] },
  ];

  const allSelected = contacts.length > 0 && selected.size === contacts.length;

  const checkboxClass = cx(
    'h-4 w-4 rounded border-gray-300 text-purple-600 dark:border-gray-600',
    'bg-white dark:bg-[#0F1923] focus:ring-purple-500 cursor-pointer',
  );

  return (
    <SuperAdminLayout title="Contacts CRM">
      <Head title="Contacts CRM — SuperAdmin IBIG Soft" />

      {notification && (
        <div
          role="status"
          className={cx(
            'fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg',
            notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600',
          )}
        >
          {notification.msg}
        </div>
      )}

      <PageHeader
        icon={Users}
        title="Contacts CRM"
        subtitle={
          `${meta.total ?? contacts.length} contact${(meta.total ?? contacts.length) > 1 ? 's' : ''}`
          + (selected.size > 0 ? ` · ${selected.size} sélectionné${selected.size > 1 ? 's' : ''}` : '')
        }
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'CRM' }, { label: 'Contacts' }]}
        actions={
          <>
            {selected.size > 0 && (
              <select
                defaultValue=""
                aria-label="Actions groupées"
                onChange={async (e) => {
                  const action = e.target.value;
                  if (!action) return;
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
                className={cx(CONTROL, 'h-10 w-auto min-w-[180px]')}
              >
                <option value="">Actions groupées</option>
                <option value="assign_1">Assigner à moi</option>
              </select>
            )}
            <Button variant="secondary" icon={Upload} onClick={() => setShowImport(true)}>Import CSV</Button>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>Export CSV</Button>
            <Button variant="primary" icon={Plus} onClick={() => setEditContact({})}>Nouveau contact</Button>
          </>
        }
      />

      <div className="space-y-6">

        {/* ── Filtres ─────────────────────────────────────────────────────── */}
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
              <input
                type="text"
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Rechercher une société, un contact, un email…"
                aria-label="Rechercher un contact"
                className={cx(CONTROL, 'h-10 pl-9')}
              />
            </div>

            {SELECTS.map(({ key, options }) => (
              <select
                key={key}
                value={filters[key]}
                onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
                aria-label={`Filtrer par ${key}`}
                className={cx(CONTROL, 'h-10 w-auto min-w-[160px]')}
              >
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}

            {isFiltered && (
              <Button variant="ghost" icon={X} onClick={resetFilters}>Effacer</Button>
            )}
          </div>
        </Card>

        {/* ── Tableau ─────────────────────────────────────────────────────── */}
        <div className={cx(SURFACE, 'border', BORDER, 'overflow-hidden rounded-xl shadow-sm')}>
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-purple-600 dark:text-purple-400" />
            </div>
          ) : contacts.length === 0 ? (
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucun contact ne correspond"
                description="Aucun résultat pour cette recherche ou cette combinaison de filtres."
                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="Aucun contact enregistré"
                description="Centralisez ici les prospects, clients et partenaires suivis par l'équipe commerciale."
                action={<Button variant="primary" icon={Plus} onClick={() => setEditContact({})}>Ajouter le premier contact</Button>}
              />
            )
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className={SURFACE_SUNK}>
                  <tr className={cx('border-b', BORDER)}>
                    <th scope="col" className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={selectAll}
                        aria-label="Tout sélectionner"
                        className={checkboxClass}
                      />
                    </th>
                    {[
                      ['Société', 'text-left'], ['Contact', 'text-left'], ['Type', 'text-left'],
                      ['Statut', 'text-left'], ['Pays', 'text-left'], ['Source', 'text-left'],
                      ['BANT', 'text-center'], ['Opportunités', 'text-right'], ['Dernier contact', 'text-left'],
                    ].map(([label, align]) => (
                      <th
                        key={label}
                        scope="col"
                        className={cx('px-4 py-3 whitespace-nowrap', TH, align)}
                      >
                        {label}
                      </th>
                    ))}
                    <th scope="col" className={cx('px-4 py-3 text-right whitespace-nowrap', TH)}>Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                  {contacts.map(c => {
                    const type   = TYPE_MAP[c.type] ?? { label: c.type, tone: 'neutral' };
                    const status = STATUS_MAP[c.status] ?? { label: c.status, tone: 'neutral' };
                    const isSel  = selected.has(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={cx(
                          'transition-colors',
                          isSel
                            ? 'bg-purple-50 dark:bg-purple-500/10'
                            : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleSelect(c.id)}
                            aria-label={`Sélectionner ${c.company_name}`}
                            className={checkboxClass}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                              {String(c.company_name ?? '?').charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className={cx('truncate font-medium', TEXT_TITLE)}>{c.company_name}</p>
                              <p className={cx('truncate text-xs', TEXT_FAINT)}>{c.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <p className={TEXT_BODY}>{c.contact_name}</p>
                          {c.phone && <p className={cx('text-xs', TEXT_FAINT, NUM)}>{c.phone}</p>}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={type.tone}>{type.label}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant={status.tone} dot>{status.label}</Badge>
                        </td>
                        <td className={cx('px-4 py-3', TEXT_BODY)}>{c.country || '—'}</td>
                        <td className={cx('px-4 py-3 text-xs', TEXT_MUTED)}>
                          {SOURCE_LABELS[c.source] || c.source || '—'}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {c.bant_score != null ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className={cx('h-2 w-2 rounded-full', bantDot(c.bant_score))} />
                              <span className={cx('text-xs font-semibold', TEXT_BODY, NUM)}>{c.bant_score}</span>
                            </span>
                          ) : <span className={TEXT_FAINT}>—</span>}
                        </td>

                        <td className={cx('px-4 py-3 text-right font-medium', TEXT_TITLE, NUM)}>
                          {c.deals_count ?? 0}
                        </td>
                        <td className={cx('px-4 py-3 whitespace-nowrap text-xs', TEXT_MUTED, NUM)}>
                          {fmtDate(c.last_contact_at)}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="secondary" size="xs"
                              onClick={() => router.visit(`/superadmin/crm/contacts/${c.id}`)}
                            >
                              Voir
                            </Button>
                            <Button variant="subtle" size="xs" onClick={() => setEditContact(c)}>
                              Modifier
                            </Button>
                            <Button
                              variant="ghost" size="xs" iconOnly icon={X}
                              title="Supprimer le contact"
                              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                              onClick={() => deleteContact(c.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination serveur */}
          {meta.last_page > 1 && (
            <div className={cx('flex items-center justify-between gap-3 border-t px-4 py-3', BORDER, SURFACE_SUNK)}>
              <p className={cx('text-xs', TEXT_MUTED, NUM)}>
                Page {meta.current_page} sur {meta.last_page} · {meta.total} contacts
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary" size="sm" iconOnly icon={ChevronLeft}
                  title="Page précédente"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                />
                <Button
                  variant="secondary" size="sm" iconOnly icon={ChevronRight}
                  title="Page suivante"
                  disabled={page === meta.last_page}
                  onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                />
              </div>
            </div>
          )}
        </div>

      </div>

      {editContact !== null && (
        <ContactModal
          contact={editContact}
          onClose={() => setEditContact(null)}
          onSaved={() => { fetchContacts(); notify('Contact enregistré.'); }}
        />
      )}
      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { fetchContacts(); notify('Import terminé.'); }}
        />
      )}
    </SuperAdminLayout>
  );
}

export { CrmContacts };
