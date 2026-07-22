import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

// ─── Sections de la landing page ─────────────────────────────────────────────
const SECTIONS = [
  { key: 'topbar',       label: 'Barre supérieure', icon: '📢', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'hero',         label: 'Hero',             icon: '🚀', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'pricing',      label: 'Tarifs',           icon: '💰', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'testimonials', label: 'Témoignages',      icon: '⭐', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { key: 'sara',         label: 'Section SARA',     icon: '🤖', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'faq',          label: 'FAQ',              icon: '❓', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'footer',       label: 'Footer',           icon: '🔗', color: 'bg-gray-50 text-gray-700 border-gray-200' },
];

// ─── Données mock landing ─────────────────────────────────────────────────────
const MOCK_ZONES = {
  topbar_phone:   { key: 'topbar_phone',   section: 'topbar', label: 'Téléphone contact',     type: 'text',   value: '+225 07 58 81 02 24', published: true,  updated_at: '2026-07-10' },
  topbar_email:   { key: 'topbar_email',   section: 'topbar', label: 'Email contact',         type: 'email',  value: 'contact@ibig.ci',     published: true,  updated_at: '2026-07-10' },
  topbar_promo:   { key: 'topbar_promo',   section: 'topbar', label: 'Message promotionnel',  type: 'text',   value: '🎉 30 jours d\'essai gratuit — aucune carte requise',  published: true,  updated_at: '2026-07-15' },

  hero_title:       { key: 'hero_title',       section: 'hero', label: 'Titre principal',     type: 'text', value: 'L\'ERP Intelligent pour les Entreprises Africaines', published: true,  updated_at: '2026-07-20' },
  hero_subtitle:    { key: 'hero_subtitle',    section: 'hero', label: 'Sous-titre',           type: 'text', value: 'Gérez votre organisation avec SARA, votre assistante IA intégrée. RH, Finance, Projets, Documents — tout en un.', published: true, updated_at: '2026-07-20' },
  hero_cta_primary: { key: 'hero_cta_primary', section: 'hero', label: 'Bouton CTA principal', type: 'text', value: 'Commencer gratuitement', published: true, updated_at: '2026-07-18' },
  hero_cta_secondary:{ key: 'hero_cta_secondary', section: 'hero', label: 'CTA secondaire', type: 'text', value: 'Voir une démonstration', published: true, updated_at: '2026-07-18' },
  hero_cta_url:     { key: 'hero_cta_url',     section: 'hero', label: 'URL CTA principal',   type: 'url',  value: 'https://app.secretis.ibig.ci/register', published: true, updated_at: '2026-07-18' },
  hero_badge:       { key: 'hero_badge',       section: 'hero', label: 'Badge',               type: 'text', value: 'Nouveau : SARA 2.0', published: false, updated_at: '2026-07-21' },

  pricing_title:         { key: 'pricing_title',         section: 'pricing', label: 'Titre tarifs',          type: 'text',   value: 'Des tarifs adaptés à votre croissance', published: true,  updated_at: '2026-07-01' },
  pricing_subtitle:      { key: 'pricing_subtitle',      section: 'pricing', label: 'Sous-titre tarifs',     type: 'text',   value: 'Commencez gratuitement, évoluez quand vous le souhaitez', published: true, updated_at: '2026-07-01' },
  pricing_starter_price: { key: 'pricing_starter_price', section: 'pricing', label: 'Prix Starter (XOF)',    type: 'number', value: '29000',  published: true,  updated_at: '2026-07-01' },
  pricing_pro_price:     { key: 'pricing_pro_price',     section: 'pricing', label: 'Prix Pro (XOF)',        type: 'number', value: '59000',  published: true,  updated_at: '2026-07-01' },
  pricing_enterprise_price:{ key: 'pricing_enterprise_price', section: 'pricing', label: 'Prix Enterprise (XOF)', type: 'number', value: '149000', published: true, updated_at: '2026-07-01' },
  pricing_features:      { key: 'pricing_features',      section: 'pricing', label: 'Features plans (JSON)', type: 'json',   value: null, published: true, updated_at: '2026-07-01' },

  testimonials_title:   { key: 'testimonials_title',   section: 'testimonials', label: 'Titre témoignages',  type: 'text', value: 'Ce que disent nos clients', published: true, updated_at: '2026-07-05' },
  testimonials_subtitle:{ key: 'testimonials_subtitle', section: 'testimonials', label: 'Sous-titre',         type: 'text', value: 'Plus de 150 organisations font confiance à SECRETIS ERP', published: true, updated_at: '2026-07-05' },
  testimonials_list:    { key: 'testimonials_list',    section: 'testimonials', label: 'Témoignages (JSON)', type: 'json', value: null, published: true, updated_at: '2026-07-10' },
  testimonials_pending: { key: 'testimonials_pending', section: 'testimonials', label: 'En attente',          type: 'json', value: null, published: false, updated_at: null },
  testimonials_cta:     { key: 'testimonials_cta',    section: 'testimonials', label: 'CTA témoignage',      type: 'text', value: 'Laisser un avis', published: true, updated_at: '2026-07-05' },

  sara_title:    { key: 'sara_title',    section: 'sara', label: 'Titre SARA',      type: 'text', value: 'SARA, votre assistante IA intégrée', published: true, updated_at: '2026-07-12' },
  sara_subtitle: { key: 'sara_subtitle', section: 'sara', label: 'Sous-titre SARA', type: 'text', value: 'Posez vos questions en langage naturel — SARA analyse vos données et vous répond instantanément', published: true, updated_at: '2026-07-12' },
  sara_features: { key: 'sara_features', section: 'sara', label: 'Features SARA',   type: 'json', value: null, published: true, updated_at: '2026-07-12' },
  sara_cta:      { key: 'sara_cta',      section: 'sara', label: 'CTA SARA',         type: 'text', value: 'Découvrir SARA', published: true, updated_at: '2026-07-12' },
  sara_cta_url:  { key: 'sara_cta_url',  section: 'sara', label: 'URL CTA SARA',     type: 'url',  value: '#sara-demo', published: true, updated_at: '2026-07-12' },

  faq_title:    { key: 'faq_title',    section: 'faq', label: 'Titre FAQ',     type: 'text', value: 'Questions fréquentes', published: true, updated_at: '2026-07-08' },
  faq_subtitle: { key: 'faq_subtitle', section: 'faq', label: 'Sous-titre FAQ', type: 'text', value: 'Tout ce que vous devez savoir sur SECRETIS ERP', published: true, updated_at: '2026-07-08' },
  faq_items:    { key: 'faq_items',    section: 'faq', label: 'Q&R FAQ (JSON)', type: 'json', value: null, published: true, updated_at: '2026-07-08' },
  faq_cta:      { key: 'faq_cta',      section: 'faq', label: 'CTA support',    type: 'text', value: 'Contacter le support', published: true, updated_at: '2026-07-08' },

  footer_tagline:    { key: 'footer_tagline',    section: 'footer', label: 'Tagline',       type: 'text', value: 'SECRETIS ERP — L\'intelligence au service de votre entreprise', published: true, updated_at: '2026-07-01' },
  footer_links:      { key: 'footer_links',      section: 'footer', label: 'Liens (JSON)',   type: 'json', value: null, published: true, updated_at: '2026-07-01' },
  footer_social:     { key: 'footer_social',     section: 'footer', label: 'Réseaux (JSON)', type: 'json', value: null, published: true, updated_at: '2026-07-01' },
  footer_legal:      { key: 'footer_legal',      section: 'footer', label: 'Copyright',      type: 'text', value: '© 2026 IBIG Technologies. Tous droits réservés.', published: true, updated_at: '2026-07-01' },
  footer_newsletter: { key: 'footer_newsletter', section: 'footer', label: 'CTA Newsletter',  type: 'text', value: 'S\'abonner aux actualités SECRETIS', published: true, updated_at: '2026-07-01' },
};

// ─── Champ d'édition contextuel ───────────────────────────────────────────────
function ZoneEditor({ zone, onSave, saving }) {
  const [value, setValue] = useState(
    zone.type === 'json' && zone.value
      ? JSON.stringify(zone.value, null, 2)
      : (zone.value || '')
  );
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(
      zone.type === 'json' && zone.value
        ? JSON.stringify(zone.value, null, 2)
        : (zone.value || '')
    );
    setError('');
  }, [zone.key]);

  const validate = () => {
    if (zone.type === 'email' && value && !/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
      setError('Adresse email invalide');
      return false;
    }
    if (zone.type === 'url' && value && !/^https?:\/\/.+/.test(value) && !value.startsWith('#')) {
      setError('URL invalide (doit commencer par https:// ou #)');
      return false;
    }
    if (zone.type === 'json' && value) {
      try {
        JSON.parse(value);
      } catch {
        setError('JSON invalide');
        return false;
      }
    }
    if (zone.type === 'number' && value && isNaN(Number(value))) {
      setError('Valeur numérique requise');
      return false;
    }
    setError('');
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;
    const parsed = zone.type === 'json' && value ? JSON.parse(value) : value;
    onSave(zone.key, parsed, false);
  };

  const handlePublish = () => {
    if (!validate()) return;
    const parsed = zone.type === 'json' && value ? JSON.parse(value) : value;
    onSave(zone.key, parsed, true);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900">{zone.label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Zone : <span className="font-mono">{zone.key}</span> · Type : {zone.type}
              {zone.updated_at && ` · Modifié le ${new Date(zone.updated_at).toLocaleDateString('fr-FR')}`}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            zone.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {zone.published ? 'Publié' : 'Brouillon'}
          </span>
        </div>

        {/* Champ d'édition selon le type */}
        {zone.type === 'json' ? (
          <div>
            <textarea
              value={value}
              onChange={e => { setValue(e.target.value); setError(''); }}
              rows={12}
              className={`w-full font-mono text-xs border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y ${
                error ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder='[{"key": "value"}]'
              spellCheck={false}
            />
            <p className="text-xs text-gray-400 mt-1">Éditeur JSON — assurez-vous que la syntaxe est valide</p>
          </div>
        ) : zone.type === 'number' ? (
          <input
            type="number"
            value={value}
            onChange={e => { setValue(e.target.value); setError(''); }}
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
              error ? 'border-red-300' : 'border-gray-200'
            }`}
            placeholder="Valeur numérique..."
          />
        ) : (value.length > 100 || zone.type === 'textarea') ? (
          <textarea
            value={value}
            onChange={e => { setValue(e.target.value); setError(''); }}
            rows={4}
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y ${
              error ? 'border-red-300' : 'border-gray-200'
            }`}
          />
        ) : (
          <input
            type={zone.type === 'email' ? 'email' : zone.type === 'url' ? 'url' : 'text'}
            value={value}
            onChange={e => { setValue(e.target.value); setError(''); }}
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
              error ? 'border-red-300' : 'border-gray-200'
            }`}
            placeholder={`Valeur pour "${zone.label}"...`}
          />
        )}

        {error && <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">⚠ {error}</p>}
      </div>

      {/* Aperçu texte simple */}
      {zone.type !== 'json' && value && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1.5 font-medium">Aperçu</p>
          <p className="text-sm text-gray-700">{value}</p>
        </div>
      )}

      {/* Boutons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Sauvegarde...' : 'Sauvegarder (brouillon)'}
        </button>
        <button
          onClick={handlePublish}
          disabled={saving}
          className="flex-1 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Publication...' : 'Publier'}
        </button>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function LandingEditor() {
  const [zones, setZones]               = useState(MOCK_ZONES);
  const [selectedSection, setSection]   = useState('hero');
  const [selectedZone, setZoneKey]      = useState('hero_title');
  const [saving, setSaving]             = useState(false);
  const [publishing, setPublishing]     = useState(false);
  const [toast, setToast]               = useState(null);
  const [showPreview, setShowPreview]   = useState(false);
  const iframeRef                       = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Zones de la section sélectionnée
  const sectionZones = Object.values(zones).filter(z => z.section === selectedSection);

  // Zone éditée
  const editingZone = zones[selectedZone];

  // Compteur modifications non publiées
  const unpublishedCount = Object.values(zones).filter(z => !z.published).length;

  const handleSave = async (key, value, publish) => {
    setSaving(true);
    try {
      await axios.put('/superadmin/landing', {
        zone_key: key,
        value,
        publish,
      });

      setZones(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          value,
          published: publish ? true : prev[key].published,
          updated_at: new Date().toISOString().split('T')[0],
        },
      }));

      showToast(publish ? 'Zone publiée avec succès !' : 'Brouillon sauvegardé.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de la sauvegarde';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishAll = async () => {
    if (!confirm(`Publier toutes les ${unpublishedCount} modification(s) non publiée(s) ?`)) return;
    setPublishing(true);
    try {
      const resp = await axios.post('/superadmin/landing/publish-all');
      setZones(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(k => { updated[k] = { ...updated[k], published: true }; });
        return updated;
      });
      showToast(`${resp.data.count || unpublishedCount} zone(s) publiée(s) avec succès !`);
    } catch (err) {
      showToast('Erreur lors de la publication', 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <Head title="Éditeur Landing Page — SuperAdmin SECRETIS" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 transition-all ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.type === 'error' ? '⚠' : '✓'} {toast.msg}
        </div>
      )}

      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Éditeur Landing Page</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              34 zones administrables ·{' '}
              {unpublishedCount > 0 ? (
                <span className="text-yellow-600 font-medium">{unpublishedCount} modification(s) non publiée(s)</span>
              ) : (
                <span className="text-green-600 font-medium">Tout est publié</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(p => !p)}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 font-medium text-gray-700 transition-colors"
            >
              {showPreview ? '✕ Fermer aperçu' : '👁 Aperçu live'}
            </button>
            {unpublishedCount > 0 && (
              <button
                onClick={handlePublishAll}
                disabled={publishing}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {publishing ? 'Publication...' : `🚀 Tout publier (${unpublishedCount})`}
              </button>
            )}
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>
          {/* Sidebar gauche — liste des sections/zones */}
          <div className="w-72 bg-white border-r border-gray-100 flex flex-col overflow-y-auto shrink-0">
            {SECTIONS.map(section => {
              const sZones = Object.values(zones).filter(z => z.section === section.key);
              const hasUnpublished = sZones.some(z => !z.published);
              const isActive = selectedSection === section.key;

              return (
                <div key={section.key}>
                  {/* En-tête section */}
                  <button
                    onClick={() => {
                      setSection(section.key);
                      setZoneKey(sZones[0]?.key || null);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      isActive ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{section.icon}</span>
                      <span className={`text-sm font-semibold ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                        {section.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasUnpublished && (
                        <span className="w-2 h-2 rounded-full bg-yellow-400" title="Modifications non publiées" />
                      )}
                      <span className="text-xs text-gray-400">{sZones.length}</span>
                    </div>
                  </button>

                  {/* Zones de la section (si section ouverte) */}
                  {isActive && (
                    <div className="bg-gray-50/50">
                      {sZones.map(zone => (
                        <button
                          key={zone.key}
                          onClick={() => setZoneKey(zone.key)}
                          className={`w-full flex items-center justify-between px-5 py-2.5 hover:bg-indigo-50 transition-colors text-left ${
                            selectedZone === zone.key ? 'bg-indigo-100' : ''
                          }`}
                        >
                          <span className={`text-xs font-medium truncate ${
                            selectedZone === zone.key ? 'text-indigo-700' : 'text-gray-600'
                          }`}>
                            {zone.label}
                          </span>
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                              zone.type === 'json' ? 'bg-purple-100 text-purple-600' :
                              zone.type === 'number' ? 'bg-blue-100 text-blue-600' :
                                                       'bg-gray-100 text-gray-500'
                            }`}>
                              {zone.type === 'json' ? 'JSON' : zone.type === 'number' ? '123' : 'txt'}
                            </span>
                            {!zone.published && (
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Zone centrale — formulaire d'édition */}
          <div className="flex-1 flex overflow-hidden">
            <div className={`overflow-y-auto p-8 ${showPreview ? 'w-1/2' : 'flex-1'}`}>
              {editingZone ? (
                <ZoneEditor
                  key={editingZone.key}
                  zone={editingZone}
                  onSave={handleSave}
                  saving={saving}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <p className="text-6xl mb-4">📝</p>
                    <p className="text-lg font-medium">Sélectionnez une zone à éditer</p>
                    <p className="text-sm mt-1">Choisissez une section puis une zone dans le menu de gauche</p>
                  </div>
                </div>
              )}
            </div>

            {/* Prévisualisation iframe */}
            {showPreview && (
              <div className="w-1/2 border-l border-gray-100 flex flex-col">
                <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">Aperçu Landing Page</span>
                  <button
                    onClick={() => iframeRef.current?.contentWindow?.location?.reload()}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Rafraîchir
                  </button>
                  <div className="flex gap-1.5 ml-auto">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                </div>
                <iframe
                  ref={iframeRef}
                  src="/"
                  className="flex-1 w-full border-0"
                  title="Aperçu landing page"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
