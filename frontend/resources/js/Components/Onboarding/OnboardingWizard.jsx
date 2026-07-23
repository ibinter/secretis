/**
 * SECRETIS ERP — Onboarding/OnboardingWizard.jsx
 * Wizard d'onboarding en 6 étapes — affiché à la première connexion
 *
 * Étapes :
 *  1. Bienvenue
 *  2. Votre organisation (logo, nom, pays, langue, devise, fuseau)
 *  3. Invitez votre équipe
 *  4. Votre premier module (6 cards cliquables)
 *  5. SARA vous accompagne
 *  6. C'est parti ! (checklist de démarrage)
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// ─── Modules disponibles ──────────────────────────────────────────────────────
const MODULES = [
  { id: 'agenda',     label: 'Gérer l\'agenda',       emoji: '📅', route: '/agenda',     color: 'border-blue-300 bg-blue-50 hover:bg-blue-100' },
  { id: 'courrier',   label: 'Organiser les courriers',emoji: '📮', route: '/courrier',   color: 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100' },
  { id: 'reunions',   label: 'Planifier les réunions', emoji: '🤝', route: '/reunions',   color: 'border-green-300 bg-green-50 hover:bg-green-100' },
  { id: 'taches',     label: 'Suivre les tâches',      emoji: '✅', route: '/taches',     color: 'border-orange-300 bg-orange-50 hover:bg-orange-100' },
  { id: 'reception',  label: 'Accueillir les visiteurs',emoji: '👋', route: '/reception',  color: 'border-purple-300 bg-purple-50 hover:bg-purple-100' },
  { id: 'ressources', label: 'Piloter les ressources', emoji: '🏢', route: '/ressources', color: 'border-teal-300 bg-teal-50 hover:bg-teal-100' },
];

const TIMEZONES = [
  'Africa/Abidjan', 'Africa/Accra', 'Africa/Bamako', 'Africa/Bangui',
  'Africa/Banjul', 'Africa/Bissau', 'Africa/Brazzaville', 'Africa/Bujumbura',
  'Africa/Cairo', 'Africa/Casablanca', 'Africa/Conakry', 'Africa/Dakar',
  'Africa/Douala', 'Africa/Freetown', 'Africa/Kinshasa', 'Africa/Lagos',
  'Africa/Libreville', 'Africa/Lome', 'Africa/Luanda', 'Africa/Lusaka',
  'Africa/Monrovia', 'Africa/Nairobi', 'Africa/Niamey', 'Africa/Nouakchott',
  'Africa/Ouagadougou', 'Africa/Porto-Novo', 'Africa/Tunis',
  'Europe/Paris', 'Europe/London', 'America/New_York',
];

const CURRENCIES = [
  { code: 'XOF', label: 'Franc CFA (UEMOA) — XOF' },
  { code: 'XAF', label: 'Franc CFA (CEMAC) — XAF' },
  { code: 'GNF', label: 'Franc guinéen — GNF' },
  { code: 'CDF', label: 'Franc congolais — CDF' },
  { code: 'MGA', label: 'Ariary malgache — MGA' },
  { code: 'MAD', label: 'Dirham marocain — MAD' },
  { code: 'DZD', label: 'Dinar algérien — DZD' },
  { code: 'TND', label: 'Dinar tunisien — TND' },
  { code: 'NGN', label: 'Naira nigérian — NGN' },
  { code: 'KES', label: 'Shilling kényan — KES' },
  { code: 'ZAR', label: 'Rand sud-africain — ZAR' },
  { code: 'EUR', label: 'Euro — EUR' },
  { code: 'USD', label: 'Dollar américain — USD' },
  { code: 'GBP', label: 'Livre sterling — GBP' },
];

const SARA_MESSAGES = [
  'Bonjour ! Je suis SARA, votre assistante IA.',
  'Je suis là pour vous aider à tout moment — en langage naturel.',
  'Posez-moi une question sur n\'importe quel module SECRETIS.',
  'Par exemple : "Comment créer un événement récurrent ?"',
  'Ou : "Où se trouve le module de gestion des congés ?"',
  'Cliquez sur le bouton SARA en bas à droite pour m\'ouvrir.',
];

const CHECKLIST = [
  { key: 'organization_profile',    label: 'Configurer l\'organisation' },
  { key: 'invite_users',            label: 'Ajouter votre premier utilisateur' },
  { key: 'create_first_event',      label: 'Créer votre premier événement agenda' },
  { key: 'upload_first_document',   label: 'Importer un document' },
  { key: 'discover_sara',           label: 'Explorer le tableau de bord' },
];

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Icon = {
  Check: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

// ─── Barre de progression ─────────────────────────────────────────────────────
function ProgressBar({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs
                           font-semibold transition-all
                           ${i + 1 < step ? 'bg-blue-600 text-white' :
                             i + 1 === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                             'bg-gray-100 text-gray-400'}`}>
            {i + 1 < step ? <Icon.Check /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 rounded transition-all
                             ${i + 1 < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function OnboardingWizard({ orgName = 'votre organisation', user }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 6;

  // Données étape 2
  const [orgData, setOrgData] = useState({
    logo: null, logoPreview: null,
    full_name: orgName, country: '', language: 'fr', currency: 'XOF', timezone: 'Africa/Abidjan',
  });
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgErrors, setOrgErrors] = useState({});

  // Données étape 3
  const [invites, setInvites] = useState([{ email: '', role: 'employee' }]);
  const [inviteSending, setInviteSending] = useState(false);

  // Étape 4 — module choisi
  const [chosenModule, setChosenModule] = useState(null);

  // Étape 5 — animation SARA
  const [saraIndex, setSaraIndex] = useState(0);
  const saraIntervalRef = React.useRef(null);

  React.useEffect(() => {
    if (step === 5) {
      saraIntervalRef.current = setInterval(() => {
        setSaraIndex(i => (i + 1) % SARA_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(saraIntervalRef.current);
  }, [step]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  // ── Sauvegarder l'organisation (étape 2) ─────────────────────────────────
  const saveOrg = async () => {
    const errs = {};
    if (!orgData.full_name.trim()) errs.full_name = 'Le nom est obligatoire.';
    if (!orgData.country.trim())   errs.country   = 'Le pays est obligatoire.';
    setOrgErrors(errs);
    if (Object.keys(errs).length) return;

    setOrgSaving(true);
    try {
      const fd = new FormData();
      Object.entries(orgData).forEach(([k, v]) => {
        if (k !== 'logo' && k !== 'logoPreview' && v) fd.append(k, v);
      });
      if (orgData.logo) fd.append('logo', orgData.logo);

      await axios.put('/api/v1/onboarding/organization', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      next();
    } catch (err) {
      setOrgErrors({ general: err.response?.data?.message ?? 'Erreur lors de la sauvegarde.' });
    } finally {
      setOrgSaving(false);
    }
  };

  // ── Envoyer les invitations (étape 3) ────────────────────────────────────
  const sendInvites = async () => {
    const validInvites = invites.filter(i => i.email.trim());
    if (!validInvites.length) { next(); return; } // passer si vide

    setInviteSending(true);
    try {
      await axios.post('/api/v1/onboarding/invitations', { invitations: validInvites });
    } catch {}
    finally {
      setInviteSending(false);
      next();
    }
  };

  // ── Finir l'onboarding (étape 6) ─────────────────────────────────────────
  const finish = async () => {
    try {
      await axios.post('/api/v1/onboarding/complete', {
        primary_module: chosenModule,
      });
    } catch {}

    const route = MODULES.find(m => m.id === chosenModule)?.route ?? '/dashboard';
    navigate(route);
  };

  // ── Logo upload (étape 2) ─────────────────────────────────────────────────
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setOrgErrors(errs => ({ ...errs, logo: 'Le logo ne doit pas dépasser 2 MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setOrgData(d => ({ ...d, logo: file, logoPreview: ev.target.result }));
    };
    reader.readAsDataURL(file);
    setOrgErrors(errs => ({ ...errs, logo: undefined }));
  };

  // ─── Rendu par étape ──────────────────────────────────────────────────────

  // ── Étape 1 : Bienvenue ───────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Bienvenue sur IBIG SECRETIS,{' '}
        <span className="text-blue-600">{orgName}</span> !
      </h2>
      <p className="text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
        Vous êtes sur le point de configurer votre espace de gestion administrative.
        Cette procédure ne prend que <strong>2 minutes</strong>.
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-10 text-sm text-gray-600">
        {[['⚙️', 'Configuration', 'de votre organisation'],
          ['👥', 'Invitez', 'votre équipe'],
          ['🚀', 'Démarrez', 'votre premier module']].map(([emoji, title, desc]) => (
          <div key={title} className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-xl">
            <span className="text-2xl">{emoji}</span>
            <span className="font-medium">{title}</span>
            <span className="text-xs text-gray-400 text-center">{desc}</span>
          </div>
        ))}
      </div>
      <button onClick={next}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                   font-semibold text-base transition-colors shadow-lg shadow-blue-200">
        Commencer la configuration →
      </button>
    </div>
  );

  // ── Étape 2 : Organisation ────────────────────────────────────────────────
  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Votre organisation</h2>
      <p className="text-gray-500 text-sm mb-6">Ces informations apparaîtront sur vos documents.</p>

      {orgErrors.general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
          {orgErrors.general}
        </div>
      )}

      {/* Logo */}
      <div className="flex items-center gap-4 mb-5">
        <div className={`w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center
                         bg-gray-50 overflow-hidden ${orgErrors.logo ? 'border-red-300' : 'border-gray-300'}`}>
          {orgData.logoPreview
            ? <img src={orgData.logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
            : <span className="text-gray-300 text-2xl">🏢</span>}
        </div>
        <div>
          <label className="cursor-pointer text-sm text-blue-600 hover:underline font-medium">
            {orgData.logo ? 'Changer le logo' : 'Ajouter votre logo'}
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </label>
          <p className="text-xs text-gray-400 mt-0.5">PNG ou SVG recommandé · Max 2 MB</p>
          {orgErrors.logo && <p className="text-xs text-red-500 mt-0.5">{orgErrors.logo}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nom complet */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom complet de l'organisation <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={orgData.full_name}
            onChange={e => { setOrgData(d => ({...d, full_name: e.target.value})); setOrgErrors(er => ({...er, full_name: undefined})); }}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${orgErrors.full_name ? 'border-red-300' : 'border-gray-200'}`}
            placeholder="Ex : ACME Côte d'Ivoire SA"
          />
          {orgErrors.full_name && <p className="text-xs text-red-500 mt-1">{orgErrors.full_name}</p>}
        </div>

        {/* Pays */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pays <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={orgData.country}
            onChange={e => { setOrgData(d => ({...d, country: e.target.value})); setOrgErrors(er => ({...er, country: undefined})); }}
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${orgErrors.country ? 'border-red-300' : 'border-gray-200'}`}
            placeholder="Ex : Côte d'Ivoire"
          />
          {orgErrors.country && <p className="text-xs text-red-500 mt-1">{orgErrors.country}</p>}
        </div>

        {/* Langue */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
          <select
            value={orgData.language}
            onChange={e => setOrgData(d => ({...d, language: e.target.value}))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Devise */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
          <select
            value={orgData.currency}
            onChange={e => setOrgData(d => ({...d, currency: e.target.value}))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>

        {/* Fuseau horaire */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fuseau horaire</label>
          <select
            value={orgData.timezone}
            onChange={e => setOrgData(d => ({...d, timezone: e.target.value}))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  // ── Étape 3 : Invitations ─────────────────────────────────────────────────
  const renderStep3 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Invitez votre équipe</h2>
      <p className="text-gray-500 text-sm mb-6">
        Ajoutez les membres de votre organisation. Vous pourrez en ajouter d'autres plus tard.
      </p>

      <div className="space-y-3 mb-4">
        {invites.map((invite, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <input
              type="email"
              value={invite.email}
              onChange={e => {
                const upd = [...invites];
                upd[idx].email = e.target.value;
                setInvites(upd);
              }}
              placeholder="email@exemple.com"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={invite.role}
              onChange={e => {
                const upd = [...invites];
                upd[idx].role = e.target.value;
                setInvites(upd);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employé</option>
              <option value="receptionist">Réceptionniste</option>
              <option value="reader">Lecteur</option>
            </select>
            {invites.length > 1 && (
              <button
                type="button"
                onClick={() => setInvites(prev => prev.filter((_, i) => i !== idx))}
                className="p-2.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Icon.Trash />
              </button>
            )}
          </div>
        ))}
      </div>

      {invites.length < 10 && (
        <button
          type="button"
          onClick={() => setInvites(prev => [...prev, { email: '', role: 'employee' }])}
          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <Icon.Plus />
          Ajouter une personne
        </button>
      )}
    </div>
  );

  // ── Étape 4 : Premier module ──────────────────────────────────────────────
  const renderStep4 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Votre premier module</h2>
      <p className="text-gray-500 text-sm mb-6">Quel est votre besoin le plus urgent ?</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {MODULES.map(mod => (
          <button
            key={mod.id}
            type="button"
            onClick={() => setChosenModule(mod.id)}
            className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl
                         transition-all text-center
                         ${chosenModule === mod.id
                           ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 shadow-md'
                           : mod.color + ' border-transparent'}`}
          >
            <span className="text-3xl">{mod.emoji}</span>
            <span className="text-sm font-medium text-gray-800 leading-tight">{mod.label}</span>
          </button>
        ))}
      </div>

      {chosenModule && (
        <p className="mt-4 text-sm text-blue-600 text-center">
          Vous serez redirigé vers{' '}
          <strong>{MODULES.find(m => m.id === chosenModule)?.label}</strong> à la fin de la configuration.
        </p>
      )}
    </div>
  );

  // ── Étape 5 : SARA ────────────────────────────────────────────────────────
  const renderStep5 = () => (
    <div className="text-center">
      <div className="text-6xl mb-4">🤖</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">SARA vous accompagne</h2>
      <p className="text-gray-500 text-sm mb-8">
        Votre assistante IA intégrée est disponible à tout moment, depuis n'importe quelle page.
      </p>

      {/* Fenêtre de chat simulée */}
      <div className="max-w-sm mx-auto bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        {/* En-tête */}
        <div className="bg-blue-600 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">
            S
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">SARA</p>
            <p className="text-blue-200 text-xs">Assistante IA · En ligne</p>
          </div>
        </div>

        {/* Message animé */}
        <div className="p-4">
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs">
              🤖
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[80%]">
              <p className="text-sm text-gray-800 transition-all duration-500">
                {SARA_MESSAGES[saraIndex]}
              </p>
            </div>
          </div>
        </div>

        {/* Exemples de questions rapides */}
        <div className="px-4 pb-4 space-y-2">
          {[
            'Comment créer un événement récurrent ?',
            'Où trouver les rapports d\'absentéisme ?',
          ].map(q => (
            <div key={q}
              className="flex justify-end">
              <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2 text-xs max-w-[80%]">
                {q}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-gray-400">
        Cliquez sur l'icône <strong>SARA</strong> en bas à droite pour l'ouvrir à tout moment.
      </p>
    </div>
  );

  // ── Étape 6 : C'est parti ! ───────────────────────────────────────────────
  const renderStep6 = () => (
    <div className="text-center">
      <div className="text-6xl mb-4">🎊</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">C'est parti !</h2>
      <p className="text-gray-500 text-sm mb-8">
        Voici quelques actions pour bien démarrer avec SECRETIS.
      </p>

      <div className="max-w-sm mx-auto mb-8 space-y-3 text-left">
        {CHECKLIST.map((item, i) => (
          <div key={item.key}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                        ${i === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
                             ${i === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i === 0 ? <Icon.Check /> : i + 1}
            </div>
            <span className={`text-sm ${i === 0 ? 'text-green-800 font-medium line-through' : 'text-gray-700'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mb-6">
        Le widget de progression restera visible pendant 30 jours pour vous guider.
      </p>

      <button
        onClick={finish}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl
                   font-semibold text-base transition-colors shadow-lg shadow-blue-200"
      >
        Ouvrir mon tableau de bord 🚀
      </button>
    </div>
  );

  const STEP_RENDERERS = [null, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];

  const handleNext = () => {
    if (step === 2) { saveOrg(); return; }
    if (step === 3) { sendInvites(); return; }
    next();
  };

  const showNextBtn = step > 1 && step < TOTAL_STEPS;
  const showPrevBtn = step > 1 && step < TOTAL_STEPS;

  return (
    /* Overlay plein écran */
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* En-tête */}
        <div className="px-8 pt-8">
          {step > 1 && <ProgressBar step={step} total={TOTAL_STEPS} />}
        </div>

        {/* Contenu */}
        <div className="px-8 pb-8">
          {STEP_RENDERERS[step]?.()}
        </div>

        {/* Pied de page */}
        {(showPrevBtn || showNextBtn) && (
          <div className="flex items-center justify-between px-8 py-5 border-t border-gray-100 bg-gray-50">
            <button
              onClick={prev}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Précédent
            </button>
            <div className="flex items-center gap-4">
              {step === 3 && (
                <button onClick={() => { setInvites([{ email: '', role: 'employee' }]); next(); }}
                  className="text-sm text-gray-400 hover:text-gray-600">
                  Je ferai ça plus tard
                </button>
              )}
              {step !== 6 && step !== 1 && (
                <button
                  onClick={handleNext}
                  disabled={orgSaving || inviteSending}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                             text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {orgSaving || inviteSending ? 'Enregistrement...' : 'Suivant →'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
