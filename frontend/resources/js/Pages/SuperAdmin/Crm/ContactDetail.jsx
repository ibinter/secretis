import React, { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Icônes SVG ───────────────────────────────────────────────────────────────
const Icon = {
  Phone:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  Mail:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  MapPin:   () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Calendar: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Users:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Check:    () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Plus:     () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  ArrowLeft:() => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  Building: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
};

// ─── Icônes activité ──────────────────────────────────────────────────────────
const ACTIVITY_ICONS = {
  call:      { icon: '📞', color: 'bg-purple-100 text-purple-700' },
  email:     { icon: '📧', color: 'bg-indigo-100 text-indigo-700' },
  meeting:   { icon: '🤝', color: 'bg-purple-100 text-purple-700' },
  demo:      { icon: '🖥️', color: 'bg-teal-100 text-teal-700' },
  proposal:  { icon: '📄', color: 'bg-amber-100 text-amber-700' },
  follow_up: { icon: '🔔', color: 'bg-orange-100 text-orange-700' },
  note:      { icon: '📝', color: 'bg-gray-100 text-gray-700' },
  task:      { icon: '✅', color: 'bg-green-100 text-green-700' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtXOF = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const BANT_COLOR = (s) => s >= 75 ? 'bg-green-500' : s >= 50 ? 'bg-amber-400' : s >= 25 ? 'bg-orange-400' : 'bg-red-400';

const STATUS_MAP = {
  new:         { label: 'Nouveau',      cls: 'bg-purple-100 text-purple-700' },
  contacted:   { label: 'Contacté',     cls: 'bg-indigo-100 text-indigo-700' },
  qualified:   { label: 'Qualifié',     cls: 'bg-purple-100 text-purple-700' },
  demo:        { label: 'Démo',         cls: 'bg-teal-100 text-teal-700' },
  proposal:    { label: 'Proposition',  cls: 'bg-amber-100 text-amber-700' },
  negotiation: { label: 'Négociation',  cls: 'bg-orange-100 text-orange-700' },
  won:         { label: 'Gagné',        cls: 'bg-green-100 text-green-700' },
  lost:        { label: 'Perdu',        cls: 'bg-red-100 text-red-700' },
  inactive:    { label: 'Inactif',      cls: 'bg-gray-100 text-gray-600' },
};

const EMAIL_STATUS = {
  sent:    { label: 'Envoyé',  cls: 'bg-purple-100 text-purple-700' },
  opened:  { label: 'Ouvert', cls: 'bg-green-100 text-green-700' },
  clicked: { label: 'Cliqué', cls: 'bg-purple-100 text-purple-700' },
  bounced: { label: 'Rejeté', cls: 'bg-red-100 text-red-700' },
  pending: { label: 'En attente', cls: 'bg-gray-100 text-gray-600' },
};

// ─── Modal activité ───────────────────────────────────────────────────────────
function ActivityModal({ contactId, deals, onClose, onSaved }) {
  const [form, setForm] = useState({
    type: 'call', subject: '', notes: '', scheduled_at: '',
    deal_id: '', outcome: '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await axios.post('/superadmin/crm/activities', { ...form, contact_id: contactId });
      onSaved();
      onClose();
    } catch (e) {
      alert('Erreur : ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">Planifier une activité</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
              >
                {Object.entries(ACTIVITY_ICONS).map(([k]) => (
                  <option key={k} value={k}>{k.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal associé</label>
              <select
                value={form.deal_id}
                onChange={e => setForm(f => ({ ...f, deal_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
              >
                <option value="">Aucun</option>
                {deals?.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sujet *</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
              placeholder="Appel de découverte..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Planifiée le</label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900 resize-none"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !form.subject}
            className="px-4 py-2 text-sm font-bold text-white bg-purple-900 rounded-lg hover:bg-purple-800 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal email ──────────────────────────────────────────────────────────────
function SendEmailModal({ contactId, templates, onClose, onSent }) {
  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await axios.post('/superadmin/crm/emails/send', { contact_id: contactId, template_id: templateId });
      onSent();
      onClose();
    } catch (e) {
      alert('Erreur : ' + (e.response?.data?.message || e.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Envoyer un email</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template *</label>
            <select
              value={templateId}
              onChange={e => setTemplateId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
            >
              <option value="">Choisir un template...</option>
              {templates?.map(t => (
                <option key={t.id} value={t.id}>[{t.category}] {t.name}</option>
              ))}
            </select>
          </div>
          {templateId && (
            <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-800">
              <strong>Sujet :</strong> {templates.find(t => t.id == templateId)?.subject}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">Annuler</button>
          <button
            onClick={send}
            disabled={sending || !templateId}
            className="px-4 py-2 text-sm font-bold text-white bg-purple-900 rounded-lg hover:bg-purple-800 disabled:opacity-50"
          >
            {sending ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ContactDetail({ contactId: propId }) {
  const contactId = propId || window.location.pathname.split('/').pop();

  const [contact, setContact]         = useState(null);
  const [templates, setTemplates]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [notes, setNotes]             = useState('');
  const [showActivity, setShowActivity] = useState(false);
  const [showEmail, setShowEmail]     = useState(false);
  const [notification, setNotification] = useState(null);
  const [converting, setConverting]   = useState(false);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchContact = async () => {
    try {
      const [cRes, tRes] = await Promise.all([
        axios.get(`/superadmin/crm/contacts/${contactId}`),
        axios.get('/superadmin/crm/email-templates'),
      ]);
      setContact(cRes.data);
      setNotes(cRes.data.notes || '');
      setTemplates(tRes.data);
    } catch (e) {
      notify('Erreur de chargement.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContact(); }, [contactId]);

  const saveNotes = async () => {
    try {
      await axios.put(`/superadmin/crm/contacts/${contactId}`, { notes });
      notify('Notes sauvegardées.');
    } catch (e) {
      notify('Erreur lors de la sauvegarde.', 'error');
    }
  };

  const convertToClient = async () => {
    if (!confirm(`Convertir ${contact.company_name} en client SECRETIS ?`)) return;
    setConverting(true);
    try {
      const res = await axios.post(`/superadmin/crm/contacts/${contactId}/convert`);
      notify(`Organisation #${res.data.organization.id} créée !`);
      fetchContact();
    } catch (e) {
      notify(e.response?.data?.message || 'Erreur de conversion.', 'error');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-900 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!contact) return null;

  const statusInfo = STATUS_MAP[contact.status] || { label: contact.status, cls: 'bg-gray-100 text-gray-600' };
  const canConvert = contact.status === 'won' && contact.type !== 'client';

  return (
    <>
      <Head title={`${contact.company_name} — CRM IBIG Soft`} />

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.msg}
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-purple-900 text-white">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <button
              onClick={() => router.visit('/superadmin/crm/contacts')}
              className="flex items-center gap-2 text-purple-200 hover:text-white text-sm mb-4 transition-colors"
            >
              <Icon.ArrowLeft /> Retour aux contacts
            </button>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center text-2xl font-black flex-shrink-0">
                  {contact.company_name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{contact.company_name}</h1>
                  <p className="text-purple-200 text-sm mt-0.5">{contact.contact_name}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                    {contact.country && (
                      <span className="flex items-center gap-1 text-xs text-purple-200">
                        <Icon.MapPin />{contact.city ? `${contact.city}, ` : ''}{contact.country}
                      </span>
                    )}
                    {contact.sector && (
                      <span className="text-xs text-purple-200">{contact.sector}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* BANT score */}
              <div className="flex-shrink-0 bg-white/10 rounded-xl p-4 text-center">
                <div className="text-3xl font-black">{contact.bant_score ?? '—'}</div>
                <div className="text-xs text-purple-200 mt-1">Score BANT</div>
                {contact.bant_score != null && (
                  <div className={`h-1.5 rounded-full mt-2 ${BANT_COLOR(contact.bant_score)}`} style={{ width: `${contact.bant_score}%`, minWidth: 8 }} />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Infos rapides + Actions */}
        <div className="max-w-6xl mx-auto px-6 -mt-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-center gap-4 justify-between">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-purple-900">
                <Icon.Mail /> {contact.email}
              </a>
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 hover:text-purple-900">
                  <Icon.Phone /> {contact.phone}
                </a>
              )}
              {contact.employee_count && (
                <span className="flex items-center gap-1.5">
                  <Icon.Users /> {contact.employee_count} employés
                </span>
              )}
              {contact.last_contact_at && (
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Icon.Calendar /> Dernier contact : {fmtDate(contact.last_contact_at)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEmail(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-900 bg-purple-50 rounded-lg hover:bg-purple-100"
              >
                <Icon.Mail /> Email
              </button>
              <button
                onClick={() => setShowActivity(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-900 rounded-lg hover:bg-purple-800"
              >
                <Icon.Plus /> Activité
              </button>
              {canConvert && (
                <button
                  onClick={convertToClient}
                  disabled={converting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Icon.Building /> Convertir en client
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Colonne gauche : Timeline + Emails */}
          <div className="xl:col-span-2 space-y-6">

            {/* Timeline activités */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Timeline des activités</h2>
                <span className="text-xs text-gray-400">{contact.activities?.length ?? 0} entrées</span>
              </div>
              <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                {contact.activities?.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Aucune activité pour l'instant.</p>
                )}
                {contact.activities?.map(act => {
                  const ai = ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.note;
                  return (
                    <div key={act.id} className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${ai.color}`}>
                        {ai.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900">{act.subject}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0">{fmtDateTime(act.completed_at || act.scheduled_at || act.created_at)}</span>
                        </div>
                        {act.notes && <p className="text-xs text-gray-500 mt-0.5">{act.notes}</p>}
                        {act.outcome && <p className="text-xs text-green-600 mt-0.5 font-medium">→ {act.outcome}</p>}
                        {!act.completed_at && act.scheduled_at && (
                          <span className="inline-flex items-center text-xs text-amber-600 mt-0.5">
                            <Icon.Calendar /> Planifié le {fmtDateTime(act.scheduled_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Historique emails */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Historique des emails</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {contact.email_logs?.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Aucun email envoyé.</p>
                )}
                {contact.email_logs?.map(log => {
                  const st = EMAIL_STATUS[log.status] || EMAIL_STATUS.pending;
                  return (
                    <div key={log.id} className="px-6 py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{log.subject}</p>
                        <p className="text-xs text-gray-400">{fmtDate(log.sent_at)}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Notes libres */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Notes</h2>
              </div>
              <div className="p-6">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={6}
                  placeholder="Notes libres sur ce contact..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900 focus:border-purple-900 resize-none"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={saveNotes}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-900 rounded-lg hover:bg-purple-800"
                  >
                    Sauvegarder les notes
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Colonne droite : Deals */}
          <div className="space-y-6">

            {/* Deals en cours */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Deals</h2>
                <span className="text-xs text-gray-400">{contact.deals?.length ?? 0}</span>
              </div>
              <div className="p-4 space-y-3">
                {contact.deals?.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Aucun deal associé.</p>
                )}
                {contact.deals?.map(deal => (
                  <div key={deal.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-gray-900">{deal.title}</p>
                      {deal.stage && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: deal.stage.color + '20', color: deal.stage.color }}>
                          {deal.stage.name}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-bold text-purple-900">{fmtXOF(deal.value)}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                      <span>{deal.plan?.toUpperCase()}</span>
                      {deal.close_date_expected && <span>{fmtDate(deal.close_date_expected)}</span>}
                    </div>
                    <div className="mt-2 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-purple-600 h-1.5 rounded-full"
                        style={{ width: `${deal.probability ?? 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{deal.probability ?? 0}% probabilité</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Infos BANT */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Qualification BANT</h2>
              </div>
              <div className="p-6 space-y-3">
                {[
                  { label: 'Budget', value: contact.annual_revenue ? fmtXOF(contact.annual_revenue) + '/an' : null, max: 25 },
                  { label: 'Authority', value: contact.contact_name, max: 25 },
                  { label: 'Need', value: contact.employee_count ? `${contact.employee_count} employés` : null, max: 25 },
                  { label: 'Timeline', value: contact.deals?.[0]?.close_date_expected ? fmtDate(contact.deals[0].close_date_expected) : null, max: 25 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-700 w-20">{label}</span>
                    {value
                      ? <span className="text-sm text-gray-900 flex-1 text-right">{value}</span>
                      : <span className="text-xs text-gray-400 flex-1 text-right">Non renseigné</span>
                    }
                    {value
                      ? <Icon.Check />
                      : <span className="w-4 h-4 text-gray-300">—</span>
                    }
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showActivity && (
        <ActivityModal
          contactId={contactId}
          deals={contact.deals}
          onClose={() => setShowActivity(false)}
          onSaved={fetchContact}
        />
      )}
      {showEmail && (
        <SendEmailModal
          contactId={contactId}
          templates={templates}
          onClose={() => setShowEmail(false)}
          onSent={() => { notify('Email envoyé !'); fetchContact(); }}
        />
      )}
    </>
  );
}
export { ContactDetail };
