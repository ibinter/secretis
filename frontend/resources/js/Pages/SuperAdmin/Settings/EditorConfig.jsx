import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import axios from 'axios'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'

// ─── Icônes ──────────────────────────────────────────────────────────────────
const Ic = {
  Save: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>,
  Mail: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>,
  EyeOff: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>,
  Cpu: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/></svg>,
  Shield: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  Building: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
  Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Key: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>,
}

const SECTIONS = [
  { key: 'ibig', label: 'IBIG Soft', icon: <Ic.Building /> },
  { key: 'smtp', label: 'SMTP', icon: <Ic.Mail /> },
  { key: 'ai', label: 'IA / SARA', icon: <Ic.Cpu /> },
  { key: 'security', label: 'Sécurité', icon: <Ic.Shield /> },
  { key: 'trial', label: 'Essai gratuit', icon: <Ic.Clock /> },
  { key: 'license', label: 'Licences', icon: <Ic.Key /> },
]

const DEFAULT_CONFIG = {
  ibig: {
    company_name: 'IBIG Soft', logo_url: '', favicon_url: '', address: 'Abidjan, Côte d\'Ivoire',
    email_support: 'support@ibigsoft.com', phone: '+225 07 00 00 00', whatsapp: '+225 07 00 00 00',
    social_linkedin: '', social_twitter: '', social_facebook: '',
  },
  smtp: {
    host: 'smtp.mailgun.org', port: '587', username: 'postmaster@ibigsoft.com',
    password: '', from_name: 'SECRETIS', from_email: 'noreply@ibigsoft.com', encryption: 'tls',
  },
  ai: {
    provider: 'groq', model: 'llama3-70b-8192', temperature: '0.7',
    quota_global_monthly: '10000', quota_per_user: '500', quota_per_org: '2000',
    fallback_provider: 'openai', fallback_model: 'gpt-4o-mini',
  },
  security: {
    session_lifetime_minutes: '120', max_login_attempts: '5', mfa_policy: 'optional',
    superadmin_ips: '', password_min_length: '10',
  },
  trial: {
    default_duration_days: '14', trial_modules: ['rh', 'compta', 'ged'],
    welcome_message_fr: 'Bienvenue dans SECRETIS ! Votre essai de 14 jours commence maintenant.',
    welcome_message_en: 'Welcome to SECRETIS! Your 14-day trial starts now.',
  },
  license: {
    grace_period_days: '7', after_expiry_action: 'read_only',
    auto_suspend_after_days: '30',
  },
}

export default function EditorConfig({ config: propConfig }) {
  const [config, setConfig]   = useState(propConfig ?? DEFAULT_CONFIG)
  const [activeSection, setActiveSection] = useState('ibig')
  const [saving, setSaving]   = useState(null)
  const [success, setSuccess] = useState(null)
  const [smtpTesting, setSmtpTesting]   = useState(false)
  const [smtpResult, setSmtpResult]     = useState(null)
  const [showPasswords, setShowPasswords] = useState({})

  const setC = (section, key, val) => setConfig(c => ({ ...c, [section]: { ...c[section], [key]: val } }))

  const save = async (section) => {
    setSaving(section)
    try {
      await axios.put(`/superadmin/settings/${section}`, config[section])
      setSuccess(section)
      setTimeout(() => setSuccess(null), 3000)
    } catch { alert('Erreur sauvegarde') }
    finally { setSaving(null) }
  }

  const testSmtp = async () => {
    setSmtpTesting(true); setSmtpResult(null)
    try {
      const res = await axios.post('/superadmin/settings/smtp/test', config.smtp)
      setSmtpResult({ ok: true, msg: 'Email de test envoyé avec succès.' })
    } catch (e) {
      setSmtpResult({ ok: false, msg: e.response?.data?.message ?? 'Connexion SMTP échouée' })
    } finally { setSmtpTesting(false) }
  }

  const togglePwd = (key) => setShowPasswords(p => ({ ...p, [key]: !p[key] }))

  const INPUT = 'w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-transparent dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-[#9333EA]/30 outline-none'
  const LABEL = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

  return (
    <SuperAdminLayout title="Configuration éditeur">
      <Head title="Configuration — Super Admin" />

      <div className="flex gap-6">
        {/* ── Sidebar sections ─────────────────────────────────────────────── */}
        <div className="w-52 shrink-0">
          <nav className="space-y-1 sticky top-0">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={[
                  'flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  activeSection === s.key
                    ? 'bg-[#9333EA] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                {s.icon} {s.label}
                {success === s.key && <Ic.Check className="ml-auto text-green-400" />}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Contenu ──────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {activeSection === 'ibig' && (
            <Section title="IBIG Soft — Identité" onSave={() => save('ibig')} saving={saving === 'ibig'} success={success === 'ibig'}>
              <Grid2>
                <F label="Nom de la société"><input value={config.ibig.company_name} onChange={e => setC('ibig', 'company_name', e.target.value)} className={INPUT} /></F>
                <F label="Email support"><input value={config.ibig.email_support} onChange={e => setC('ibig', 'email_support', e.target.value)} className={INPUT} /></F>
                <F label="Adresse" cl="col-span-2"><input value={config.ibig.address} onChange={e => setC('ibig', 'address', e.target.value)} className={INPUT} /></F>
                <F label="Téléphone"><input value={config.ibig.phone} onChange={e => setC('ibig', 'phone', e.target.value)} className={INPUT} /></F>
                <F label="WhatsApp"><input value={config.ibig.whatsapp} onChange={e => setC('ibig', 'whatsapp', e.target.value)} className={INPUT} /></F>
                <F label="URL Logo"><input value={config.ibig.logo_url} onChange={e => setC('ibig', 'logo_url', e.target.value)} className={INPUT} placeholder="https://..." /></F>
                <F label="URL Favicon"><input value={config.ibig.favicon_url} onChange={e => setC('ibig', 'favicon_url', e.target.value)} className={INPUT} placeholder="https://..." /></F>
                <F label="LinkedIn"><input value={config.ibig.social_linkedin} onChange={e => setC('ibig', 'social_linkedin', e.target.value)} className={INPUT} /></F>
                <F label="Twitter / X"><input value={config.ibig.social_twitter} onChange={e => setC('ibig', 'social_twitter', e.target.value)} className={INPUT} /></F>
              </Grid2>
            </Section>
          )}

          {activeSection === 'smtp' && (
            <Section title="Configuration SMTP" onSave={() => save('smtp')} saving={saving === 'smtp'} success={success === 'smtp'}>
              <Grid2>
                <F label="Hôte SMTP"><input value={config.smtp.host} onChange={e => setC('smtp', 'host', e.target.value)} className={INPUT} /></F>
                <F label="Port">
                  <select value={config.smtp.port} onChange={e => setC('smtp', 'port', e.target.value)} className={INPUT}>
                    <option value="25">25</option>
                    <option value="465">465 (SSL)</option>
                    <option value="587">587 (TLS)</option>
                    <option value="2525">2525</option>
                  </select>
                </F>
                <F label="Nom d'expéditeur"><input value={config.smtp.from_name} onChange={e => setC('smtp', 'from_name', e.target.value)} className={INPUT} /></F>
                <F label="Email expéditeur"><input value={config.smtp.from_email} onChange={e => setC('smtp', 'from_email', e.target.value)} className={INPUT} /></F>
                <F label="Utilisateur SMTP"><input value={config.smtp.username} onChange={e => setC('smtp', 'username', e.target.value)} className={INPUT} /></F>
                <F label="Mot de passe SMTP">
                  <div className="relative">
                    <input
                      type={showPasswords.smtp ? 'text' : 'password'}
                      value={config.smtp.password}
                      onChange={e => setC('smtp', 'password', e.target.value)}
                      className={INPUT + ' pr-10'}
                    />
                    <button type="button" onClick={() => togglePwd('smtp')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPasswords.smtp ? <Ic.EyeOff /> : <Ic.Eye />}
                    </button>
                  </div>
                </F>
                <F label="Chiffrement" cl="col-span-2">
                  <select value={config.smtp.encryption} onChange={e => setC('smtp', 'encryption', e.target.value)} className={INPUT}>
                    <option value="none">Aucun</option>
                    <option value="tls">TLS (STARTTLS)</option>
                    <option value="ssl">SSL</option>
                  </select>
                </F>
              </Grid2>
              <div className="mt-4 flex items-center gap-3">
                <button onClick={testSmtp} disabled={smtpTesting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[#9333EA] text-[#9333EA] dark:border-purple-500 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-60 transition-colors">
                  <Ic.Mail /> {smtpTesting ? 'Test en cours…' : 'Tester la connexion'}
                </button>
                {smtpResult && (
                  <span className={`text-sm font-medium ${smtpResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                    {smtpResult.ok ? '✓' : '✗'} {smtpResult.msg}
                  </span>
                )}
              </div>
            </Section>
          )}

          {activeSection === 'ai' && (
            <Section title="IA / SARA — Configuration" onSave={() => save('ai')} saving={saving === 'ai'} success={success === 'ai'}>
              <Grid2>
                <F label="Fournisseur principal">
                  <select value={config.ai.provider} onChange={e => setC('ai', 'provider', e.target.value)} className={INPUT}>
                    <option value="groq">Groq</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="mistral">Mistral AI</option>
                  </select>
                </F>
                <F label="Modèle"><input value={config.ai.model} onChange={e => setC('ai', 'model', e.target.value)} className={INPUT} /></F>
                <F label="Température (0–1)">
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={1} step={0.1} value={config.ai.temperature} onChange={e => setC('ai', 'temperature', e.target.value)} className="flex-1 accent-[#9333EA]" />
                    <span className="text-sm font-bold text-[#9333EA] dark:text-purple-400 tabular-nums w-8">{config.ai.temperature}</span>
                  </div>
                </F>
                <F label="Fournisseur de secours">
                  <select value={config.ai.fallback_provider} onChange={e => setC('ai', 'fallback_provider', e.target.value)} className={INPUT}>
                    <option value="openai">OpenAI</option>
                    <option value="groq">Groq</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </F>
                <F label="Modèle de secours"><input value={config.ai.fallback_model} onChange={e => setC('ai', 'fallback_model', e.target.value)} className={INPUT} /></F>
                <F label="Quota global / mois (tokens)"><input type="number" value={config.ai.quota_global_monthly} onChange={e => setC('ai', 'quota_global_monthly', e.target.value)} className={INPUT} /></F>
                <F label="Quota / organisation (tokens)"><input type="number" value={config.ai.quota_per_org} onChange={e => setC('ai', 'quota_per_org', e.target.value)} className={INPUT} /></F>
                <F label="Quota / utilisateur (tokens)"><input type="number" value={config.ai.quota_per_user} onChange={e => setC('ai', 'quota_per_user', e.target.value)} className={INPUT} /></F>
              </Grid2>
            </Section>
          )}

          {activeSection === 'security' && (
            <Section title="Sécurité" onSave={() => save('security')} saving={saving === 'security'} success={success === 'security'}>
              <Grid2>
                <F label="Durée session (minutes)"><input type="number" value={config.security.session_lifetime_minutes} onChange={e => setC('security', 'session_lifetime_minutes', e.target.value)} className={INPUT} /></F>
                <F label="Tentatives max avant blocage"><input type="number" value={config.security.max_login_attempts} onChange={e => setC('security', 'max_login_attempts', e.target.value)} className={INPUT} /></F>
                <F label="Politique MFA">
                  <select value={config.security.mfa_policy} onChange={e => setC('security', 'mfa_policy', e.target.value)} className={INPUT}>
                    <option value="optional">Optionnel</option>
                    <option value="required_admins">Obligatoire pour les admins</option>
                    <option value="required_all">Obligatoire pour tous</option>
                  </select>
                </F>
                <F label="Longueur minimale mot de passe"><input type="number" value={config.security.password_min_length} onChange={e => setC('security', 'password_min_length', e.target.value)} className={INPUT} /></F>
                <F label="IPs autorisées pour le SuperAdmin" cl="col-span-2">
                  <textarea rows={3} value={config.security.superadmin_ips} onChange={e => setC('security', 'superadmin_ips', e.target.value)} className={INPUT} placeholder="Une IP par ligne (vide = toutes autorisées)" />
                </F>
              </Grid2>
            </Section>
          )}

          {activeSection === 'trial' && (
            <Section title="Essai gratuit" onSave={() => save('trial')} saving={saving === 'trial'} success={success === 'trial'}>
              <Grid2>
                <F label="Durée par défaut (jours)"><input type="number" value={config.trial.default_duration_days} onChange={e => setC('trial', 'default_duration_days', e.target.value)} className={INPUT} /></F>
                <F label="Modules accessibles en trial" cl="col-span-2">
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['rh', 'compta', 'ged', 'crm', 'fleet', 'budget', 'quality'].map(mod => (
                      <label key={mod} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.trial.trial_modules?.includes(mod)}
                          onChange={e => {
                            const mods = e.target.checked
                              ? [...(config.trial.trial_modules ?? []), mod]
                              : (config.trial.trial_modules ?? []).filter(m => m !== mod)
                            setC('trial', 'trial_modules', mods)
                          }}
                          className="rounded"
                        />
                        <span className="text-xs font-medium uppercase text-gray-700 dark:text-gray-300">{mod}</span>
                      </label>
                    ))}
                  </div>
                </F>
                <F label="Message de bienvenue (FR)" cl="col-span-2"><textarea rows={3} value={config.trial.welcome_message_fr} onChange={e => setC('trial', 'welcome_message_fr', e.target.value)} className={INPUT} /></F>
                <F label="Message de bienvenue (EN)" cl="col-span-2"><textarea rows={3} value={config.trial.welcome_message_en} onChange={e => setC('trial', 'welcome_message_en', e.target.value)} className={INPUT} /></F>
              </Grid2>
            </Section>
          )}

          {activeSection === 'license' && (
            <Section title="Licences — Comportement à l'expiration" onSave={() => save('license')} saving={saving === 'license'} success={success === 'license'}>
              <Grid2>
                <F label="Période de grâce (jours)"><input type="number" value={config.license.grace_period_days} onChange={e => setC('license', 'grace_period_days', e.target.value)} className={INPUT} /></F>
                <F label="Action après expiration">
                  <select value={config.license.after_expiry_action} onChange={e => setC('license', 'after_expiry_action', e.target.value)} className={INPUT}>
                    <option value="read_only">Lecture seule</option>
                    <option value="blocked">Accès bloqué</option>
                    <option value="degraded">Mode dégradé (exports uniquement)</option>
                  </select>
                </F>
                <F label="Suspension automatique après (jours)"><input type="number" value={config.license.auto_suspend_after_days} onChange={e => setC('license', 'auto_suspend_after_days', e.target.value)} className={INPUT} /></F>
              </Grid2>
            </Section>
          )}

        </div>
      </div>
    </SuperAdminLayout>
  )
}

// ─── Composants utilitaires ───────────────────────────────────────────────────
function Section({ title, onSave, saving, success, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button
          disabled={saving}
          onClick={onSave}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            success
              ? 'bg-green-500 text-white'
              : 'bg-[#9333EA] text-white hover:bg-[#122a45]'
          } disabled:opacity-60`}
        >
          {success ? <><Ic.Check /> Sauvegardé</> : saving ? 'Sauvegarde…' : <><Ic.Save /> Sauvegarder</>}
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Grid2({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
}

function F({ label, children, cl = '' }) {
  return (
    <div className={cl}>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}
export { EditorConfig };
