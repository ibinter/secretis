import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Mock ─────────────────────────────────────────────────────────────────────
const MOCK_ANNOUNCEMENTS = [
  { id: 1, title: 'Maintenance programmée — Samedi 26 juillet 02h-04h', content: '<p>Une maintenance est planifiée ce samedi de <strong>02h00 à 04h00</strong>. La plateforme sera indisponible pendant environ 2 heures. Nous vous invitons à planifier vos travaux en conséquence.</p><p>Merci de votre compréhension — L\'équipe IBIG Soft.</p>', type: 'maintenance', target_plans: ['all'], scheduled_at: '2026-07-24T02:00:00Z', expires_at: '2026-07-26T04:00:00Z', is_published: true,  creator_name: 'Patrice Kouakou', created_at: '2026-07-20T10:00:00Z', is_active: false },
  { id: 2, title: 'Nouvelle fonctionnalité : Assistant IA SARA disponible !', content: '<p>Nous sommes ravis de vous annoncer le lancement de <strong>SARA</strong>, votre nouvel assistant IA intégré. SARA peut vous aider à rédiger des emails, résumer des documents et répondre à vos questions sur la plateforme.</p>', type: 'feature', target_plans: ['pro','enterprise'], scheduled_at: '2026-07-15T08:00:00Z', expires_at: '2026-08-15T08:00:00Z', is_published: true,  creator_name: 'Patrice Kouakou', created_at: '2026-07-14T16:00:00Z', is_active: true },
  { id: 3, title: 'Mise à jour des CGU — Entrée en vigueur le 1er août 2026', content: '<p>Nos Conditions Générales d\'Utilisation ont été mises à jour. Les changements concernent principalement la politique de traitement des données personnelles.</p>', type: 'warning', target_plans: ['all'], scheduled_at: null, expires_at: null, is_published: false, creator_name: 'Patrice Kouakou', created_at: '2026-07-22T09:00:00Z', is_active: false },
];

const TYPE_CONFIG = {
  info:        { label: 'Information', color: 'bg-blue-100 text-blue-800 border-blue-200',    banner: 'bg-blue-50 border-blue-200 text-blue-900',   icon: 'ℹ️' },
  warning:     { label: 'Avertissement', color: 'bg-amber-100 text-amber-800 border-amber-200', banner: 'bg-amber-50 border-amber-200 text-amber-900', icon: '⚠️' },
  maintenance: { label: 'Maintenance',  color: 'bg-red-100 text-red-800 border-red-200',       banner: 'bg-red-50 border-red-200 text-red-900',      icon: '🔧' },
  feature:     { label: 'Nouveauté',    color: 'bg-green-100 text-green-800 border-green-200', banner: 'bg-green-50 border-green-200 text-green-900',icon: '✨' },
};

// ─── Éditeur de texte simple (sans dépendance TipTap) ─────────────────────────
function RichEditor({ value, onChange }) {
  const [mode, setMode] = useState('visual'); // 'visual' | 'html'

  const strip = (html) => html.replace(/<[^>]*>/g, '');
  const visual = strip(value);

  if (mode === 'html') {
    return (
      <div>
        <div className="flex justify-end mb-1.5">
          <button onClick={() => setMode('visual')} className="text-xs text-blue-700 hover:underline">Vue visuelle</button>
        </div>
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-900 resize-y"
          placeholder="<p>Contenu HTML...</p>"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
          {[
            ['B', text => `<strong>${text}</strong>`],
            ['I', text => `<em>${text}</em>`],
            ['U', text => `<u>${text}</u>`],
          ].map(([label, wrap]) => (
            <button
              key={label}
              onMouseDown={e => { e.preventDefault(); onChange(value + wrap(label === 'B' ? 'texte en gras' : label === 'I' ? 'texte en italique' : 'texte souligné')); }}
              className="w-7 h-7 rounded text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm"
            >
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setMode('html')} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">{'</>'} HTML</button>
      </div>
      <div
        className="min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-900 focus:outline-none"
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={e => onChange(e.currentTarget.innerHTML)}
        suppressContentEditableWarning
      />
    </div>
  );
}

// ─── Aperçu bandeau ───────────────────────────────────────────────────────────
function BannerPreview({ announcement }) {
  if (!announcement.type) return null;
  const cfg = TYPE_CONFIG[announcement.type];
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${cfg.banner}`}>
      <span className="text-lg flex-shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{announcement.title || 'Titre de l\'annonce'}</p>
        {announcement.content && (
          <div className="text-xs mt-0.5 opacity-80" dangerouslySetInnerHTML={{ __html: announcement.content }} />
        )}
      </div>
      <button className="text-xs opacity-60 hover:opacity-100 flex-shrink-0">✕</button>
    </div>
  );
}

// ─── Modal créer/modifier ─────────────────────────────────────────────────────
function AnnouncementModal({ announcement, onClose, onSave }) {
  const [form, setForm] = useState(announcement || {
    title: '', content: '', type: 'info', target_plans: ['all'],
    scheduled_at: '', expires_at: '', is_published: false,
  });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  };

  const togglePlan = (plan) => {
    if (plan === 'all') { setForm(f => ({ ...f, target_plans: ['all'] })); return; }
    setForm(f => {
      const plans = f.target_plans.filter(p => p !== 'all');
      return { ...f, target_plans: plans.includes(plan) ? plans.filter(p => p !== plan) : [...plans, plan] };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{announcement?.id ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type d'annonce</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: key }))}
                  className={`py-2.5 px-3 rounded-lg border-2 text-xs font-semibold transition-all text-center ${form.type === key ? 'border-blue-900 bg-blue-50 text-blue-900' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <div className="text-lg">{cfg.icon}</div>
                  <div>{cfg.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Titre de l'annonce..." className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-900" />
          </div>

          {/* Contenu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contenu</label>
            <RichEditor value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} />
          </div>

          {/* Ciblage plans */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ciblage par plan</label>
            <div className="flex items-center gap-2 flex-wrap">
              {[['all', 'Tous'], ['starter', 'Starter'], ['pro', 'Pro'], ['enterprise', 'Enterprise']].map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => togglePlan(val)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${(form.target_plans || []).includes(val) ? 'border-blue-900 bg-blue-50 text-blue-900' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Planification */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Planifié à</label>
              <input type="datetime-local" value={form.scheduled_at || ''} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Expire à</label>
              <input type="datetime-local" value={form.expires_at || ''} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-900" />
            </div>
          </div>

          {/* Aperçu */}
          <div>
            <button onClick={() => setShowPreview(p => !p)} className="text-sm text-blue-700 font-medium hover:underline mb-3 block">
              {showPreview ? '▲ Masquer' : '▼ Aperçu du bandeau'}
            </button>
            {showPreview && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Aperçu dans l'application</p>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <BannerPreview announcement={form} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
          <button onClick={handleSave} disabled={!form.title || saving} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Announcements({ announcements: propAnnouncements }) {
  const [announcements, setAnnouncements] = useState(propAnnouncements || MOCK_ANNOUNCEMENTS);
  const [editing, setEditing]             = useState(null);
  const [notification, setNotif]          = useState(null);

  const notify = (type, msg) => { setNotif({ type, msg }); setTimeout(() => setNotif(null), 4000); };

  const handleSave = async (form) => {
    try {
      if (form.id) {
        const res = await axios.put(`/superadmin/announcements/${form.id}`, form);
        setAnnouncements(prev => prev.map(a => a.id === form.id ? res.data : a));
      } else {
        const res = await axios.post('/superadmin/announcements', form);
        setAnnouncements(prev => [res.data, ...prev]);
      }
      notify('success', 'Annonce enregistrée.');
    } catch (e) {
      notify('error', e.response?.data?.error || 'Erreur lors de la sauvegarde.');
      throw e;
    }
  };

  const handlePublish = async (ann) => {
    try {
      const res = await axios.post(`/superadmin/announcements/${ann.id}/publish`);
      setAnnouncements(prev => prev.map(a => a.id === ann.id ? res.data.announcement : a));
      notify('success', res.data.message);
    } catch (e) {
      notify('error', e.response?.data?.error || 'Erreur lors de la publication.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    try {
      await axios.delete(`/superadmin/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      notify('success', 'Annonce supprimée.');
    } catch {
      notify('error', 'Erreur lors de la suppression.');
    }
  };

  return (
    <>
      <Head title="Annonces — SuperAdmin IBIG Soft" />

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.msg}
        </div>
      )}

      <div className="min-h-screen bg-gray-50">

        {/* Header */}
        <header className="bg-blue-900 text-white shadow-lg">
          <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.visit('/superadmin/saas-dashboard')} className="text-blue-200 hover:text-white text-sm">← Dashboard</button>
              <span className="text-blue-400">/</span>
              <h1 className="text-lg font-bold">Annonces plateforme</h1>
              <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">SUPER ADMIN</span>
            </div>
            <button
              onClick={() => setEditing({ title: '', content: '', type: 'info', target_plans: ['all'], scheduled_at: '', expires_at: '' })}
              className="px-4 py-2 bg-white text-blue-900 text-sm font-bold rounded-lg hover:bg-blue-50"
            >
              + Nouvelle annonce
            </button>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-8 space-y-4">
          {announcements.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
              <p className="text-lg font-medium">Aucune annonce</p>
              <p className="text-sm mt-1">Créez une annonce pour informer vos clients.</p>
            </div>
          )}
          {announcements.map(ann => {
            const cfg = TYPE_CONFIG[ann.type] || TYPE_CONFIG.info;
            return (
              <div key={ann.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${ann.is_active ? 'border-l-4 border-l-green-500' : ''}`}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl flex-shrink-0">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>{cfg.label}</span>
                        {ann.is_active && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">En ligne</span>}
                        {ann.is_published && !ann.is_active && <span className="text-xs text-gray-400">Publiée</span>}
                        {!ann.is_published && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Brouillon</span>}
                      </div>
                      <div className="text-xs text-gray-400 mb-2">
                        Plans : {(ann.target_plans || []).join(', ')} ·
                        {ann.scheduled_at ? ` Du ${new Date(ann.scheduled_at).toLocaleDateString('fr-FR')}` : ' Immédiat'}
                        {ann.expires_at ? ` au ${new Date(ann.expires_at).toLocaleDateString('fr-FR')}` : ''}
                        · {ann.creator_name}
                      </div>
                      <BannerPreview announcement={ann} />
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!ann.is_published && (
                        <button onClick={() => handlePublish(ann)} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700">
                          Publier
                        </button>
                      )}
                      {!ann.is_published && (
                        <button onClick={() => setEditing(ann)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      <button onClick={() => handleDelete(ann.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </main>
      </div>

      {editing && <AnnouncementModal announcement={editing?.id ? editing : null} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}
