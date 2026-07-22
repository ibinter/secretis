import React, { useState, useCallback, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Données mock pipeline ────────────────────────────────────────────────────
const MOCK_PROSPECTS = [
  { id: 1,  name: 'Amadou Coulibaly',  company: 'Cabinet Comptable Plus', email: 'amadou@ccplus.ci',    phone: '+225 07 00 00 01', source: 'website',       status: 'new',            plan_interest: 'Pro',        created_at: '2026-07-15', notes_count: 0, demos_count: 0 },
  { id: 2,  name: 'Fatou Diallo',      company: 'ONG EduAfrique',         email: 'fdiallo@edu.org',      phone: '+225 07 00 00 02', source: 'linkedin',      status: 'contacted',      plan_interest: 'Starter',    created_at: '2026-07-12', notes_count: 2, demos_count: 0 },
  { id: 3,  name: 'Koffi Assouan',     company: 'Hotel Bassam Beach',     email: 'kassouan@bassam.ci',   phone: '+225 07 00 00 03', source: 'referral',      status: 'demo_scheduled', plan_interest: 'Enterprise', created_at: '2026-07-10', notes_count: 3, demos_count: 1 },
  { id: 4,  name: 'Marie Gnagne',      company: 'Clinique Sainte-Anne',   email: 'mgnagne@clinique.ci',  phone: '+225 07 00 00 04', source: 'event',         status: 'offer_sent',     plan_interest: 'Pro',        created_at: '2026-07-08', notes_count: 5, demos_count: 1 },
  { id: 5,  name: 'Ibrahim Touré',     company: 'Groupe Touré BTP',       email: 'itoure@groupe.ci',     phone: '+225 07 00 00 05', source: 'cold_outreach', status: 'won',            plan_interest: 'Enterprise', created_at: '2026-06-30', notes_count: 8, demos_count: 2 },
  { id: 6,  name: 'Akissi Bamba',      company: 'Auto-école Victoire',    email: 'abamba@victoire.ci',   phone: '+225 07 00 00 06', source: 'website',       status: 'lost',           plan_interest: 'Starter',    created_at: '2026-07-01', notes_count: 2, demos_count: 0 },
  { id: 7,  name: 'Seydou Konaté',     company: 'SCI Immobilière Ivoire', email: 'skonatelci@sci.ci',    phone: '+225 07 00 00 07', source: 'linkedin',      status: 'new',            plan_interest: 'Pro',        created_at: '2026-07-20', notes_count: 0, demos_count: 0 },
  { id: 8,  name: 'Roseline Yao',      company: 'École Privée Les Pins',  email: 'ryao@lespins.edu',     phone: '+225 07 00 00 08', source: 'referral',      status: 'contacted',      plan_interest: 'Starter',    created_at: '2026-07-18', notes_count: 1, demos_count: 0 },
  { id: 9,  name: 'Jacques Brou',      company: 'Transport Abidjan Sud',  email: 'jbrou@transabs.ci',    phone: '+225 07 00 00 09', source: 'event',         status: 'demo_scheduled', plan_interest: 'Pro',        created_at: '2026-07-14', notes_count: 2, demos_count: 1 },
  { id: 10, name: 'Mariam Sanogo',     company: 'Pharmacie Centrale',     email: 'msanogo@pharmaC.ci',   phone: '+225 07 00 00 10', source: 'website',       status: 'offer_sent',     plan_interest: 'Pro',        created_at: '2026-07-09', notes_count: 4, demos_count: 1 },
];

// ─── Configuration pipeline Kanban ───────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'new',            label: 'Nouveau',       color: 'blue',   bg: 'bg-blue-50',   border: 'border-blue-200',   header: 'bg-blue-100',   dot: 'bg-blue-500'   },
  { key: 'contacted',      label: 'Contacté',      color: 'yellow', bg: 'bg-yellow-50', border: 'border-yellow-200', header: 'bg-yellow-100', dot: 'bg-yellow-500' },
  { key: 'demo_scheduled', label: 'Démo planifiée',color: 'purple', bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-100', dot: 'bg-purple-500' },
  { key: 'offer_sent',     label: 'Offre envoyée', color: 'orange', bg: 'bg-orange-50', border: 'border-orange-200', header: 'bg-orange-100', dot: 'bg-orange-500' },
  { key: 'won',            label: 'Client',        color: 'green',  bg: 'bg-green-50',  border: 'border-green-200',  header: 'bg-green-100',  dot: 'bg-green-500'  },
  { key: 'lost',           label: 'Perdu',         color: 'red',    bg: 'bg-red-50',    border: 'border-red-200',    header: 'bg-red-100',    dot: 'bg-red-500'    },
];

const SOURCE_LABELS = {
  website:       'Site web',
  referral:      'Parrainage',
  cold_outreach: 'Prospection',
  linkedin:      'LinkedIn',
  event:         'Événement',
  other:         'Autre',
};

// ─── Icônes SVG ──────────────────────────────────────────────────────────────
const Icons = {
  User:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Building: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Mail:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Phone:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z" /></svg>,
  Calendar: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Note:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  Send:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  Star:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
  X:        () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Plus:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Filter:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>,
};

// ─── Carte prospect Kanban ────────────────────────────────────────────────────
function ProspectCard({ prospect, stage, onSelect, isDragging, onDragStart, onDragEnd }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, prospect)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(prospect)}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-grab active:cursor-grabbing
        hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 select-none
        ${isDragging ? 'opacity-50 rotate-2 shadow-xl' : ''}`}
    >
      {/* Plan badge */}
      {prospect.plan_interest && (
        <div className="flex justify-between items-start mb-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            prospect.plan_interest === 'Enterprise' ? 'bg-yellow-100 text-yellow-800' :
            prospect.plan_interest === 'Pro'        ? 'bg-indigo-100 text-indigo-700' :
                                                      'bg-gray-100 text-gray-600'
          }`}>
            {prospect.plan_interest}
          </span>
          <span className="text-xs text-gray-400">{prospect.source ? SOURCE_LABELS[prospect.source] : ''}</span>
        </div>
      )}

      {/* Nom & entreprise */}
      <div className="mb-2">
        <p className="font-semibold text-gray-900 text-sm leading-tight">{prospect.name}</p>
        {prospect.company && (
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
            <Icons.Building /> {prospect.company}
          </p>
        )}
      </div>

      {/* Email */}
      <p className="text-xs text-gray-400 flex items-center gap-1 mb-2 truncate">
        <Icons.Mail /> {prospect.email}
      </p>

      {/* Compteurs notes/démos */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        <div className="flex gap-2">
          {prospect.notes_count > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Icons.Note /> {prospect.notes_count}
            </span>
          )}
          {prospect.demos_count > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <Icons.Calendar /> {prospect.demos_count}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-300">
          {new Date(prospect.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
        </span>
      </div>
    </div>
  );
}

// ─── Colonne Kanban ───────────────────────────────────────────────────────────
function KanbanColumn({ stage, prospects, onSelectProspect, dragOver, onDragOver, onDrop, draggingId }) {
  return (
    <div
      className={`flex-shrink-0 w-64 rounded-2xl border-2 transition-colors duration-150 flex flex-col
        ${dragOver ? 'border-indigo-400 bg-indigo-50/40' : `${stage.border} ${stage.bg}`}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header colonne */}
      <div className={`px-3 py-2.5 rounded-t-xl ${stage.header} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${stage.dot}`}></span>
          <span className="font-semibold text-gray-800 text-sm">{stage.label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/70 text-gray-600`}>
          {prospects.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ minHeight: 120, maxHeight: 'calc(100vh - 280px)' }}>
        {prospects.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-300 border-2 border-dashed border-gray-200 rounded-xl">
            Déposer ici
          </div>
        )}
        {prospects.map(p => (
          <ProspectCard
            key={p.id}
            prospect={p}
            stage={stage}
            onSelect={onSelectProspect}
            isDragging={draggingId === p.id}
            onDragStart={(e, prospect) => {
              e.dataTransfer.setData('prospectId', prospect.id.toString());
              e.dataTransfer.setData('fromStatus', prospect.status);
            }}
            onDragEnd={() => {}}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Panneau latéral détail ───────────────────────────────────────────────────
function ProspectDetail({ prospect, onClose, onAddNote, onScheduleDemo, onSendOffer, onConvert }) {
  const [tab, setTab] = useState('notes');
  const [newNote, setNewNote]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!prospect) return null;

  const stage = PIPELINE_STAGES.find(s => s.key === prospect.status);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`/superadmin/prospects/${prospect.id}/notes`, { content: newNote });
      setNewNote('');
      onAddNote(prospect.id, newNote);
    } catch (e) {
      alert('Erreur lors de l\'ajout de la note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl border-l border-gray-100 z-40 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex items-start justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{prospect.name}</h3>
          {prospect.company && <p className="text-sm text-gray-500">{prospect.company}</p>}
          <div className="flex items-center gap-2 mt-2">
            {stage && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                stage.color === 'blue'   ? 'bg-blue-100 text-blue-700' :
                stage.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                stage.color === 'purple' ? 'bg-purple-100 text-purple-700' :
                stage.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                stage.color === 'green'  ? 'bg-green-100 text-green-700' :
                                           'bg-red-100 text-red-700'
              }`}>
                {stage.label}
              </span>
            )}
            {prospect.plan_interest && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {prospect.plan_interest}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
          <Icons.X />
        </button>
      </div>

      {/* Infos contact */}
      <div className="px-5 py-3 border-b border-gray-50 space-y-1.5">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Icons.Mail /> <a href={`mailto:${prospect.email}`} className="hover:text-indigo-600">{prospect.email}</a>
        </div>
        {prospect.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Icons.Phone /> {prospect.phone}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Icons.Filter />
          <span>{SOURCE_LABELS[prospect.source] || prospect.source}</span>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="px-5 py-3 border-b border-gray-100 grid grid-cols-3 gap-2">
        <button
          onClick={() => onScheduleDemo(prospect)}
          className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium transition-colors"
        >
          <Icons.Calendar />
          Démo
        </button>
        <button
          onClick={() => onSendOffer(prospect)}
          className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-medium transition-colors"
        >
          <Icons.Send />
          Offre
        </button>
        <button
          onClick={() => onConvert(prospect)}
          disabled={prospect.status === 'won'}
          className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icons.Star />
          Client
        </button>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-gray-100">
        {['notes', 'demos'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'notes' ? `Notes (${prospect.notes_count})` : `Démos (${prospect.demos_count})`}
          </button>
        ))}
      </div>

      {/* Contenu onglets */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {tab === 'notes' && (
          <>
            {prospect.notes_count === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Aucune note pour ce prospect</p>
            )}
            {/* Note fictive pour la démo */}
            {prospect.notes_count > 0 && Array.from({ length: Math.min(prospect.notes_count, 3) }).map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-sm text-gray-700">Note de suivi #{i + 1} — appel téléphonique effectué, intérêt confirmé pour le plan {prospect.plan_interest}.</p>
                <p className="text-xs text-gray-400 mt-1.5">SuperAdmin IBIG · il y a {i + 1} jour(s)</p>
              </div>
            ))}

            {/* Formulaire ajout note */}
            <div className="mt-4">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Ajouter une note de suivi..."
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || submitting}
                className="mt-2 w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {submitting ? 'Ajout...' : 'Ajouter la note'}
              </button>
            </div>
          </>
        )}

        {tab === 'demos' && (
          <>
            {prospect.demos_count === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Aucune démo planifiée</p>
            )}
            {prospect.demos_count > 0 && Array.from({ length: Math.min(prospect.demos_count, 2) }).map((_, i) => (
              <div key={i} className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Démo Zoom · 60 min</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Icons.Calendar /> {new Date(Date.now() + i * 86400000 * 3).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                    {i === 0 ? 'Confirmée' : 'Planifiée'}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal création prospect ──────────────────────────────────────────────────
function CreateProspectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', country: 'CI',
    source: 'website', plan_interest: 'Pro', notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const resp = await axios.post('/superadmin/prospects', form);
      onCreate(resp.data.prospect);
      onClose();
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        alert(Object.values(errors).flat().join('\n'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900">Nouveau prospect</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
              <input
                type="text" required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Amadou Coulibaly"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
              <input
                type="text" value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Cabinet XYZ"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="contact@entreprise.ci"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="+225 07 00 00 00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan d'intérêt</label>
              <select
                value={form.plan_interest}
                onChange={e => setForm(f => ({ ...f, plan_interest: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">-- Aucun --</option>
                <option value="Starter">Starter</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source *</label>
            <select
              required value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note initiale</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              placeholder="Informations complémentaires..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Création...' : 'Créer le prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Prospects({ prospects: initialProspects, stats: initialStats, filters = {} }) {
  const [prospects, setProspects] = useState(initialProspects?.data || MOCK_PROSPECTS);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dragOverStage, setDragOverStage] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [search, setSearch] = useState(filters.search || '');
  const [filterSource, setFilterSource] = useState(filters.source || '');

  // Filtrage local
  const filteredProspects = prospects.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.company || '').toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase());
    const matchSource = !filterSource || p.source === filterSource;
    return matchSearch && matchSource;
  });

  // Organisation par colonne
  const byStage = PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.key] = filteredProspects.filter(p => p.status === s.key);
    return acc;
  }, {});

  // Stats
  const stats = initialStats || PIPELINE_STAGES.reduce((acc, s) => {
    acc[s.key] = prospects.filter(p => p.status === s.key).length;
    return acc;
  }, {});

  // Drag & drop
  const handleDragOver = useCallback((e, stageKey) => {
    e.preventDefault();
    setDragOverStage(stageKey);
  }, []);

  const handleDrop = useCallback(async (e, toStatus) => {
    e.preventDefault();
    const prospectId = parseInt(e.dataTransfer.getData('prospectId'));
    const fromStatus = e.dataTransfer.getData('fromStatus');
    setDragOverStage(null);
    setDraggingId(null);

    if (fromStatus === toStatus) return;

    // Mise à jour optimiste
    setProspects(prev => prev.map(p =>
      p.id === prospectId ? { ...p, status: toStatus } : p
    ));

    // Mise à jour côté serveur
    try {
      await axios.patch(`/superadmin/prospects/${prospectId}`, { status: toStatus });
    } catch (e) {
      // Rollback
      setProspects(prev => prev.map(p =>
        p.id === prospectId ? { ...p, status: fromStatus } : p
      ));
    }
  }, []);

  const handleAddNote = (prospectId, content) => {
    setProspects(prev => prev.map(p =>
      p.id === prospectId ? { ...p, notes_count: p.notes_count + 1 } : p
    ));
  };

  const handleCreate = (newProspect) => {
    setProspects(prev => [newProspect, ...prev]);
  };

  return (
    <>
      <Head title="CRM Prospects — SuperAdmin SECRETIS" />

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between max-w-full">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pipeline CRM Prospects</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {filteredProspects.length} prospect(s) ·{' '}
                <span className="text-green-600 font-medium">{stats.won || 0} client(s)</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filtre source */}
              <select
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Toutes sources</option>
                {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>

              {/* Recherche */}
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Icons.Plus /> Nouveau prospect
              </button>
            </div>
          </div>
        </div>

        {/* Board Kanban */}
        <div className="px-6 py-5 overflow-x-auto">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {PIPELINE_STAGES.map(stage => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                prospects={byStage[stage.key] || []}
                onSelectProspect={setSelectedProspect}
                dragOver={dragOverStage === stage.key}
                draggingId={draggingId}
                onDragOver={(e) => handleDragOver(e, stage.key)}
                onDrop={(e) => handleDrop(e, stage.key)}
              />
            ))}
          </div>
        </div>

        {/* Panneau latéral */}
        {selectedProspect && (
          <>
            <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelectedProspect(null)} />
            <ProspectDetail
              prospect={selectedProspect}
              onClose={() => setSelectedProspect(null)}
              onAddNote={handleAddNote}
              onScheduleDemo={(p) => alert(`Planifier démo pour ${p.name}`)}
              onSendOffer={(p) => alert(`Envoyer offre à ${p.name}`)}
              onConvert={(p) => {
                if (confirm(`Convertir ${p.name} en client ?`)) {
                  router.post(`/superadmin/prospects/${p.id}/convert`, {
                    plan: p.plan_interest || 'Pro',
                    months: 12,
                  });
                }
              }}
            />
          </>
        )}

        {/* Modal création */}
        {showCreateModal && (
          <CreateProspectModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreate}
          />
        )}
      </div>
    </>
  );
}
