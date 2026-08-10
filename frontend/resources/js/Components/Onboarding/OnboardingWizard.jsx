/**
 * SECRETIS ERP — Onboarding/OnboardingWizard.jsx
 * Wizard d'onboarding plein-écran redesigné — 4 étapes avec backdrop blur
 *
 * Étapes :
 *  1. Bienvenue — logo animé, message personnalisé
 *  2. Organisation — logo upload, nom, secteur, pays OHADA, taille
 *  3. Votre rôle — 6 cartes cliquables
 *  4. Démarrage — récap + 3 CTA selon le rôle
 *
 * Auto-skip si l'organisation est déjà configurée (isOrgConfigured=true).
 */

import React, { useState, useCallback } from 'react'
import { router } from '@inertiajs/react'
import axios from 'axios'

// ─── Données de référence ─────────────────────────────────────────────────────
const SECTEURS = [
  'Banque & Finance','Santé & Médecine','Éducation & Formation',
  'BTP & Immobilier','Industrie & Manufacture','Commerce & Distribution',
  'ONG & Associations','Hôtellerie & Tourisme','Transport & Logistique',
  'Médias & Communication','Agriculture & Agroalimentaire','Énergie & Mines',
  'Administration Publique','Consulting & Services','Technologie & IT',
]

const PAYS_OHADA = [
  "Bénin","Burkina Faso","Cameroun","Centrafrique","Comores","Congo",
  "Côte d'Ivoire","Gabon","Guinée","Guinée-Bissau","Guinée Équatoriale",
  "Mali","Niger","RD Congo","Sénégal","Tchad","Togo",
]

const TAILLES = [
  { value:'1-10',   label:'1 – 10' },
  { value:'11-50',  label:'11 – 50' },
  { value:'51-200', label:'51 – 200' },
  { value:'200+',   label:'200+' },
]

const ROLES = [
  { id:'secretaire', label:'Secrétaire / Assistante', icon:'📋', desc:'Agenda, courrier, accueil' },
  { id:'dirigeant',  label:'Dirigeant / PDG',          icon:'👔', desc:'Pilotage et KPIs' },
  { id:'rh',         label:'RH / DRH',                 icon:'👥', desc:'Gestion des talents' },
  { id:'comptable',  label:'Comptable / DAF',           icon:'💰', desc:'Finance & OHADA' },
  { id:'admin_it',   label:'Administrateur IT',         icon:'🖥️', desc:'Config & sécurité' },
  { id:'autre',      label:'Autre profil',              icon:'✨', desc:'Découvrir SECRETIS' },
]

const CTA_BY_ROLE = {
  secretaire: [
    { label:'Planifier une réunion', icon:'📅', href:'/agenda/create' },
    { label:'Gérer le courrier',     icon:'📮', href:'/courrier' },
    { label:'Accueil des visiteurs', icon:'🏢', href:'/reception' },
  ],
  dirigeant: [
    { label:'Tableau de bord',       icon:'📊', href:'/dashboard' },
    { label:'Rapports de performance',icon:'📈', href:'/rapports' },
    { label:'Inviter l\'équipe',     icon:'👥', href:'/parametres/utilisateurs' },
  ],
  rh: [
    { label:'Gérer les employés',    icon:'👤', href:'/rh/employes' },
    { label:'Planifier les congés',  icon:'🗓️', href:'/rh/conges' },
    { label:'Suivi des formations',  icon:'🎓', href:'/formation' },
  ],
  comptable: [
    { label:'Tableau financier',     icon:'💹', href:'/budget' },
    { label:'Saisir une dépense',    icon:'💳', href:'/budget/depenses' },
    { label:'Rapport OHADA',         icon:'📄', href:'/rapports/ohada' },
  ],
  admin_it: [
    { label:'Configurer les modules',icon:'⚙️', href:'/parametres/modules' },
    { label:'Gérer les utilisateurs',icon:'👥', href:'/parametres/utilisateurs' },
    { label:'Journal d\'audit',      icon:'📋', href:'/audit' },
  ],
  autre: [
    { label:'Explorer le dashboard', icon:'🎯', href:'/dashboard' },
    { label:'Lire le guide',         icon:'📖', href:'/aide/guide' },
    { label:'Parler à SARA',         icon:'🤖', href:'/sara' },
  ],
}

// ─── Composants utilitaires ───────────────────────────────────────────────────
function StepDots({ total, current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8" aria-label="Étapes">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`rounded-full transition-all duration-300 ${i === current ? 'w-8 h-2.5 bg-[#7e22ce]' : i < current ? 'w-2.5 h-2.5 bg-[#1E8449]' : 'w-2.5 h-2.5 bg-gray-200 dark:bg-gray-600'}`} />
      ))}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function OnboardingWizard({ user, isOrgConfigured = false, onComplete }) {
  const [visible, setVisible]   = useState(!isOrgConfigured)
  const [step, setStep]         = useState(0)
  const [saving, setSaving]     = useState(false)
  const [orgData, setOrgData]   = useState({ name:'', secteur:'', pays:"Côte d'Ivoire", taille:'1-10', logo:null, logoPreview:null })
  const [selectedRole, setSelectedRole] = useState(null)

  const TOTAL = 4

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOrgData(p => ({ ...p, logo: file, logoPreview: URL.createObjectURL(file) }))
  }

  const handleSkip = useCallback(async () => {
    try { await axios.post('/onboarding/skip') } catch {}
    setVisible(false)
    onComplete?.()
  }, [onComplete])

  const handleNext = useCallback(async () => {
    if (step < TOTAL - 1) { setStep(s => s + 1); return }
    // Étape finale — sauvegarder
    setSaving(true)
    try {
      const formData = new FormData()
      if (orgData.logo) formData.append('logo', orgData.logo)
      if (orgData.name) formData.append('name', orgData.name)
      if (orgData.secteur) formData.append('secteur', orgData.secteur)
      formData.append('pays', orgData.pays)
      formData.append('taille', orgData.taille)
      formData.append('role', selectedRole ?? 'autre')
      await axios.post('/onboarding/complete-wizard', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    } catch { /* non-bloquant */ }
    finally { setSaving(false) }
    setVisible(false)
    onComplete?.()
  }, [step, orgData, selectedRole, onComplete])

  if (!visible) return null

  const ctas = CTA_BY_ROLE[selectedRole] ?? CTA_BY_ROLE.autre

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Assistant de démarrage SECRETIS">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleSkip} aria-hidden="true" />

      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Barre de progression */}
        <div className="h-1 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
          <div className="h-full bg-gradient-to-r from-[#7e22ce] to-[#1E8449] transition-all duration-500" style={{ width:`${((step + 1) / TOTAL) * 100}%` }} />
        </div>

        {/* Corps scrollable */}
        <div className="overflow-y-auto flex-1 px-8 py-8">
          <StepDots total={TOTAL} current={step} />

          {/* ÉTAPE 1 — Bienvenue */}
          {step === 0 && (
            <div className="text-center">
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full bg-[#7e22ce]/20 animate-ping" aria-hidden="true" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#9333EA] to-[#7e22ce] flex items-center justify-center shadow-xl">
                  <span className="text-4xl font-black text-white select-none">S</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Bienvenue dans SECRETIS, {user?.first_name ?? user?.name?.split(' ')[0] ?? 'vous'} !
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-1">Votre ERP africain intelligent est prêt.</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">Configurons ensemble votre espace en 3 minutes.</p>
              <div className="flex items-center justify-center gap-8 mt-8">
                {[['⚡','10 modules ERP'],['🤖','SARA votre IA'],['🌍','Conforme OHADA']].map(([icon, label]) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl mb-1">{icon}</div>
                    <p className="text-xs text-gray-400 font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 2 — Organisation */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 text-center">Votre organisation</h2>
              <p className="text-gray-400 text-sm text-center mb-7">Ces informations personnalisent votre ERP.</p>
              <div className="space-y-5">

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Logo</label>
                  <div className="flex items-center gap-4">
                    {orgData.logoPreview
                      ? <img src={orgData.logoPreview} alt="Logo org" className="w-14 h-14 rounded-xl object-cover border-2 border-[#7e22ce]" />
                      : <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600"><span className="text-2xl">🏢</span></div>
                    }
                    <label className="cursor-pointer px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      Choisir un logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                    {orgData.logoPreview && (
                      <button type="button" onClick={() => setOrgData(p => ({...p, logo:null, logoPreview:null}))} className="text-sm text-red-500 hover:text-red-700">Supprimer</button>
                    )}
                  </div>
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nom commercial <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="ex : Banque Nationale CI" value={orgData.name} onChange={e => setOrgData(p => ({...p, name:e.target.value}))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#7e22ce] focus:outline-none text-sm" />
                </div>

                {/* Secteur + Pays */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Secteur <span className="text-red-500">*</span></label>
                    <select value={orgData.secteur} onChange={e => setOrgData(p => ({...p, secteur:e.target.value}))}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7e22ce] focus:outline-none text-sm">
                      <option value="">Sélectionner...</option>
                      {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Pays</label>
                    <select value={orgData.pays} onChange={e => setOrgData(p => ({...p, pays:e.target.value}))}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7e22ce] focus:outline-none text-sm">
                      {PAYS_OHADA.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {/* Taille */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Taille de l'équipe</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TAILLES.map(t => (
                      <button key={t.value} type="button" onClick={() => setOrgData(p => ({...p, taille:t.value}))}
                        className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${orgData.taille === t.value ? 'border-[#7e22ce] bg-[#7e22ce] text-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-[#7e22ce]'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — Rôle */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 text-center">Je suis principalement...</h2>
              <p className="text-gray-400 text-sm text-center mb-7">Votre sélection adapte les suggestions de démarrage.</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map(role => (
                  <button key={role.id} type="button" onClick={() => setSelectedRole(role.id)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${selectedRole === role.id ? 'border-[#7e22ce] bg-purple-50 dark:bg-purple-900/20 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                    <span className="text-2xl flex-shrink-0 mt-0.5">{role.icon}</span>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm ${selectedRole === role.id ? 'text-[#9333EA] dark:text-purple-300' : 'text-gray-900 dark:text-white'}`}>{role.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{role.desc}</p>
                    </div>
                    {selectedRole === role.id && (
                      <svg className="w-5 h-5 text-[#7e22ce] flex-shrink-0 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 4 — Démarrage */}
          {step === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-[#1E8449] to-[#7e22ce] flex items-center justify-center shadow-xl">
                <span className="text-4xl">🚀</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tout est prêt !</h2>
              <p className="text-gray-400 text-sm mb-7">Voici par où commencer selon votre profil :</p>

              {/* Récap */}
              {(orgData.name || orgData.secteur || selectedRole) && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 mb-6 text-left">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Récapitulatif</p>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    {orgData.name && <p>🏢 <strong>{orgData.name}</strong></p>}
                    {orgData.secteur && <p>📌 {orgData.secteur} · {orgData.pays}</p>}
                    {orgData.taille && <p>👤 {TAILLES.find(t => t.value === orgData.taille)?.label} personnes</p>}
                    {selectedRole && <p>✅ {ROLES.find(r => r.id === selectedRole)?.label}</p>}
                  </div>
                </div>
              )}

              {/* CTA prioritaires */}
              <div className="space-y-2.5">
                {ctas.map((cta, i) => (
                  <a key={i} href={cta.href}
                    className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl font-medium text-sm transition-all ${i === 0 ? 'bg-[#9333EA] hover:bg-[#7e22ce] text-white shadow-md' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-[#7e22ce] hover:text-[#7e22ce]'}`}>
                    <span className="text-xl">{cta.icon}</span>
                    {cta.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer — Navigation */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
          <button type="button" onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Passer
          </button>
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep(s => s - 1)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Retour
              </button>
            )}
            <button type="button" onClick={handleNext}
              disabled={saving || (step === 2 && !selectedRole)}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#7e22ce] hover:bg-[#9333EA] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              {saving ? 'Enregistrement...' : step === TOTAL - 1 ? 'Commencer !' : 'Suivant →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export { OnboardingWizard };
