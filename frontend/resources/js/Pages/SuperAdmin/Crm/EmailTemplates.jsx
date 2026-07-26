import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORIES = {
  outreach:         { label: 'Prospection',       cls: 'bg-purple-100 text-purple-700' },
  follow_up:        { label: 'Suivi',             cls: 'bg-indigo-100 text-indigo-700' },
  demo:             { label: 'Démo',              cls: 'bg-teal-100 text-teal-700' },
  proposal:         { label: 'Proposition',       cls: 'bg-amber-100 text-amber-700' },
  onboarding:       { label: 'Onboarding',        cls: 'bg-green-100 text-green-700' },
  churn_prevention: { label: 'Anti-churn',        cls: 'bg-red-100 text-red-700' },
};

const VARIABLES_DISPO = [
  { key: '{{contact_name}}', desc: 'Prénom/nom du contact' },
  { key: '{{company}}',      desc: 'Nom de la société' },
  { key: '{{plan}}',         desc: 'Plan SECRETIS' },
  { key: '{{trial_days}}',   desc: 'Durée du trial (jours)' },
  { key: '{{email}}',        desc: 'Email du contact' },
  { key: '{{country}}',      desc: 'Pays' },
];

const OPEN_RATE = (log) => {
  if (!log?.total) return 0;
  return Math.round((log.opened_count / log.total) * 100);
};

// ─── Éditeur simple (sans TipTap — compatible SSR) ───────────────────────────
function HtmlEditor({ value, onChange }) {
  const [tab, setTab] = useState('code'); // 'code' | 'preview'

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={() => setTab('code')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'code' ? 'text-purple-900 border-b-2 border-purple-900 bg-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          HTML
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'preview' ? 'text-purple-900 border-b-2 border-purple-900 bg-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Prévisualisation
        </button>
      </div>
      {tab === 'code' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={16}
          className="w-full p-4 font-mono text-sm focus:outline-none resize-y"
          placeholder="<p>Bonjour {{contact_name}},</p>..."
        />
      ) : (
        <div
          className="p-4 min-h-64 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: value || '<p class="text-gray-400">Aucun contenu à prévisualiser</p>' }}
        />
      )}
    </div>
  );
}

// ─── Modal template ───────────────────────────────────────────────────────────
function TemplateModal({ template, onClose, onSaved }) {
  const isEdit = !!template?.id;
  const [form, setForm] = useState({
    name:      template?.name      || '',
    subject:   template?.subject   || '',
    category:  template?.category  || 'outreach',
    body_html: template?.body_html || '',
    body_text: template?.body_text || '',
    variables: template?.variables || [],
  });
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const insertVar = (v) => {
    f('body_html', form.body_html + v);
    f('subject', form.subject + v);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        await axios.put(`/superadmin/crm/email-templates/${template.id}`, form);
      } else {
        await axios.post('/superadmin/crm/email-templates', form);
      }
      onSaved();
      onClose();
    } catch (e) {
      alert('Erreur : ' + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail) return alert('Saisissez un email de test.');
    setTesting(true);
    try {
      // Créer un contact fictif et envoyer
      alert(`Test envoyé à ${testEmail} (à implémenter côté serveur avec /superadmin/crm/emails/test)`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">
            {isEdit ? 'Modifier le template' : 'Nouveau template'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Nom + Catégorie */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => f('name', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
                placeholder="Prospection initiale..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={form.category}
                onChange={e => f('category', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
              >
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sujet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sujet *</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => f('subject', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
              placeholder="Découvrez SECRETIS ERP — La solution pour {{company}}"
            />
          </div>

          {/* Variables */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Variables disponibles</label>
            <div className="flex flex-wrap gap-2">
              {VARIABLES_DISPO.map(v => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVar(v.key)}
                  className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 font-mono font-medium transition-colors"
                  title={v.desc}
                >
                  {v.key}
                </button>
              ))}
            </div>
          </div>

          {/* Body HTML */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Corps de l'email (HTML) *</label>
            <HtmlEditor value={form.body_html} onChange={(v) => f('body_html', v)} />
          </div>

          {/* Test d'envoi */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Envoyer un test à</label>
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900"
                placeholder="patriceky@gmail.com"
              />
            </div>
            <button
              type="button"
              onClick={sendTest}
              disabled={testing}
              className="px-4 py-2 text-sm font-medium text-purple-900 bg-purple-100 rounded-lg hover:bg-purple-200 disabled:opacity-50"
            >
              {testing ? 'Envoi...' : 'Tester'}
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !form.name || !form.subject || !form.body_html}
            className="px-4 py-2 text-sm font-bold text-white bg-purple-900 rounded-lg hover:bg-purple-800 disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : isEdit ? 'Mettre à jour' : 'Créer le template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [editTemplate, setEditTemplate] = useState(null); // null = closed, {} = new, obj = edit
  const [preview, setPreview]     = useState(null);
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/superadmin/crm/email-templates', { params: { category: filterCat || undefined } });
      setTemplates(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, [filterCat]);

  const toggleActive = async (t) => {
    try {
      await axios.put(`/superadmin/crm/email-templates/${t.id}`, { is_active: !t.is_active });
      notify(t.is_active ? 'Template désactivé.' : 'Template activé.');
      fetchTemplates();
    } catch (e) {
      notify('Erreur.', 'error');
    }
  };

  const filtered = filterCat ? templates.filter(t => t.category === filterCat) : templates;

  return (
    <>
      <Head title="Templates Email CRM — SuperAdmin IBIG Soft" />

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.msg}
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-purple-900 text-white px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Templates Email CRM</h1>
              <p className="text-purple-200 text-xs mt-0.5">{templates.length} templates disponibles</p>
            </div>
            <button
              onClick={() => setEditTemplate({})}
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-900 rounded-lg text-sm font-bold hover:bg-purple-50"
            >
              + Nouveau template
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Filtres catégorie */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setFilterCat('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!filterCat ? 'bg-purple-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              Tous
            </button>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setFilterCat(k)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterCat === k ? 'bg-purple-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-8 h-8 border-4 border-purple-900 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map(t => {
                const cat = CATEGORIES[t.category] || { label: t.category, cls: 'bg-gray-100 text-gray-600' };
                const openRate = t.email_logs_count > 0
                  ? Math.round((t.opened_count / t.email_logs_count) * 100)
                  : 0;

                return (
                  <div key={t.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col ${!t.is_active ? 'opacity-60' : ''}`}>
                    <div className="p-5 flex-1">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cat.cls}`}>
                          {cat.label}
                        </span>
                        <button
                          onClick={() => toggleActive(t)}
                          className={`text-xs px-2 py-0.5 rounded font-medium ${t.is_active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'}`}
                        >
                          {t.is_active ? 'Actif' : 'Inactif'}
                        </button>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{t.name}</h3>
                      <p className="text-sm text-gray-500 truncate mb-3">{t.subject}</p>

                      {/* Statistiques */}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{t.email_logs_count ?? 0} envois</span>
                        <span className={openRate >= 30 ? 'text-green-600 font-medium' : ''}>
                          {openRate}% ouverture
                        </span>
                      </div>

                      {/* Barre taux d'ouverture */}
                      {t.email_logs_count > 0 && (
                        <div className="mt-2 bg-gray-100 rounded-full h-1">
                          <div
                            className="bg-green-500 h-1 rounded-full"
                            style={{ width: `${openRate}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="p-4 border-t border-gray-50 flex items-center gap-2">
                      <button
                        onClick={() => setPreview(t)}
                        className="flex-1 text-xs text-center py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors"
                      >
                        Prévisualiser
                      </button>
                      <button
                        onClick={() => setEditTemplate(t)}
                        className="flex-1 text-xs text-center py-1.5 rounded-lg bg-purple-900 text-white hover:bg-purple-800 font-medium transition-colors"
                      >
                        Modifier
                      </button>
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="col-span-3 text-center py-16 text-gray-400">
                  <p className="text-lg">Aucun template pour cette catégorie.</p>
                  <button
                    onClick={() => setEditTemplate({})}
                    className="mt-4 text-sm text-purple-700 font-semibold hover:underline"
                  >
                    Créer le premier template →
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modal édition */}
      {editTemplate !== null && (
        <TemplateModal
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
          onSaved={() => { fetchTemplates(); notify('Template sauvegardé.'); }}
        />
      )}

      {/* Modal prévisualisation */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{preview.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">Sujet : {preview.subject}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div
              className="p-6 prose prose-sm max-w-none border-b border-gray-100"
              dangerouslySetInnerHTML={{ __html: preview.body_html }}
            />
            <div className="p-4 flex justify-end">
              <button
                onClick={() => { setPreview(null); setEditTemplate(preview); }}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-900 rounded-lg hover:bg-purple-800"
              >
                Modifier ce template
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export { EmailTemplates };
