/**
 * SuperAdmin/Settings/EditorConfig.jsx — Configuration de l'éditeur IBIG Soft
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`PUT /superadmin/settings/{section}`, `POST /superadmin/settings/smtp/test`),
 * mêmes états locaux, même prop Inertia `config`.
 *
 * Corrections d'affichage :
 *   - l'icône de validation de la barre latérale recevait un `className`
 *     qu'elle ignorait (composant SVG sans props) : elle ne se colorait
 *     jamais ;
 *   - constante `LABEL` déclarée et jamais utilisée, supprimée.
 */

import React, { useState } from 'react'
import { Head } from '@inertiajs/react'
import axios from 'axios'
import {
  Settings, Save, Mail, Check, X, Eye, EyeOff,
  Cpu, ShieldCheck, Building2, Clock, KeyRound,
} from 'lucide-react'
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout'
import {
  PageHeader, Button, Card,
  cx, CONTROL, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI'

/* ─── Sections ─────────────────────────────────────────────────────────────── */

const SECTIONS = [
  { key: 'ibig',     label: 'IBIG Soft',    icon: Building2,   title: 'IBIG Soft — identité' },
  { key: 'smtp',     label: 'SMTP',         icon: Mail,        title: 'Configuration SMTP' },
  { key: 'ai',       label: 'IA / SARA',    icon: Cpu,         title: 'IA / SARA — configuration' },
  { key: 'security', label: 'Sécurité',     icon: ShieldCheck, title: 'Sécurité' },
  { key: 'trial',    label: 'Essai gratuit', icon: Clock,      title: 'Essai gratuit' },
  { key: 'license',  label: 'Licences',     icon: KeyRound,    title: "Licences — comportement à l'expiration" },
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

const TRIAL_MODULES = ['rh', 'compta', 'ged', 'crm', 'fleet', 'budget', 'quality']

/* ─── Champs ───────────────────────────────────────────────────────────────── */

function Grid2({ children }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
}

function F({ label, children, span = false }) {
  return (
    <label className={cx('flex flex-col gap-1.5', span && 'md:col-span-2')}>
      <span className={cx('text-xs font-medium', TEXT_MUTED)}>{label}</span>
      {children}
    </label>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function EditorConfig({ config: propConfig }) {
  const [config, setConfig]               = useState(propConfig ?? DEFAULT_CONFIG)
  const [activeSection, setActiveSection] = useState('ibig')
  const [saving, setSaving]               = useState(null)
  const [success, setSuccess]             = useState(null)
  const [smtpTesting, setSmtpTesting]     = useState(false)
  const [smtpResult, setSmtpResult]       = useState(null)
  const [showPasswords, setShowPasswords] = useState({})

  const setC = (section, key, val) =>
    setConfig(c => ({ ...c, [section]: { ...c[section], [key]: val } }))

  const save = async (section) => {
    setSaving(section)
    try {
      await axios.put(`/superadmin/settings/${section}`, config[section])
      setSuccess(section)
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      alert('Erreur sauvegarde')
    } finally {
      setSaving(null)
    }
  }

  const testSmtp = async () => {
    setSmtpTesting(true); setSmtpResult(null)
    try {
      await axios.post('/superadmin/settings/smtp/test', config.smtp)
      setSmtpResult({ ok: true, msg: 'Email de test envoyé avec succès.' })
    } catch (e) {
      setSmtpResult({ ok: false, msg: e.response?.data?.message ?? 'Connexion SMTP échouée' })
    } finally {
      setSmtpTesting(false)
    }
  }

  const togglePwd = (key) => setShowPasswords(p => ({ ...p, [key]: !p[key] }))

  const current = SECTIONS.find(s => s.key === activeSection) ?? SECTIONS[0]

  const saveButton = (section) => (
    <Button
      variant={success === section ? 'secondary' : 'primary'}
      icon={success === section ? Check : Save}
      loading={saving === section}
      onClick={() => save(section)}
    >
      {success === section ? 'Enregistré' : 'Enregistrer'}
    </Button>
  )

  return (
    <SuperAdminLayout title="Configuration éditeur">
      <Head title="Configuration — Super Admin" />

      <PageHeader
        icon={Settings}
        title="Configuration de l'éditeur"
        subtitle="Paramètres globaux de la plateforme IBIG Soft."
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'Configuration' }]}
      />

      <div className="flex flex-col gap-6 lg:flex-row">

        {/* ── Navigation des sections ─────────────────────────────────────── */}
        <nav className="w-full shrink-0 lg:w-56" aria-label="Sections de configuration">
          <ul className="space-y-1">
            {SECTIONS.map(s => {
              const Icon = s.icon
              const active = activeSection === s.key
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => setActiveSection(s.key)}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                      active
                        ? 'bg-purple-600 text-white'
                        : cx(TEXT_BODY, 'hover:bg-gray-100 dark:hover:bg-white/[0.06]'),
                      FOCUS_RING,
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{s.label}</span>
                    {success === s.key && (
                      <Check className="ml-auto h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* ── Contenu ─────────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">

          {activeSection === 'ibig' && (
            <Card title={current.title} actions={saveButton('ibig')}>
              <Grid2>
                <F label="Nom de la société">
                  <input value={config.ibig.company_name} onChange={e => setC('ibig', 'company_name', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="Email du support">
                  <input value={config.ibig.email_support} onChange={e => setC('ibig', 'email_support', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="Adresse" span>
                  <input value={config.ibig.address} onChange={e => setC('ibig', 'address', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="Téléphone">
                  <input value={config.ibig.phone} onChange={e => setC('ibig', 'phone', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="WhatsApp">
                  <input value={config.ibig.whatsapp} onChange={e => setC('ibig', 'whatsapp', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="URL du logo">
                  <input value={config.ibig.logo_url} onChange={e => setC('ibig', 'logo_url', e.target.value)} placeholder="https://…" className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="URL du favicon">
                  <input value={config.ibig.favicon_url} onChange={e => setC('ibig', 'favicon_url', e.target.value)} placeholder="https://…" className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="LinkedIn">
                  <input value={config.ibig.social_linkedin} onChange={e => setC('ibig', 'social_linkedin', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="Twitter / X">
                  <input value={config.ibig.social_twitter} onChange={e => setC('ibig', 'social_twitter', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
              </Grid2>
            </Card>
          )}

          {activeSection === 'smtp' && (
            <Card title={current.title} actions={saveButton('smtp')}>
              <Grid2>
                <F label="Hôte SMTP">
                  <input value={config.smtp.host} onChange={e => setC('smtp', 'host', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="Port">
                  <select value={config.smtp.port} onChange={e => setC('smtp', 'port', e.target.value)} className={cx(CONTROL, 'h-10')}>
                    <option value="25">25</option>
                    <option value="465">465 (SSL)</option>
                    <option value="587">587 (TLS)</option>
                    <option value="2525">2525</option>
                  </select>
                </F>
                <F label="Nom de l'expéditeur">
                  <input value={config.smtp.from_name} onChange={e => setC('smtp', 'from_name', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="Email de l'expéditeur">
                  <input value={config.smtp.from_email} onChange={e => setC('smtp', 'from_email', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="Utilisateur SMTP">
                  <input value={config.smtp.username} onChange={e => setC('smtp', 'username', e.target.value)} className={cx(CONTROL, 'h-10')} />
                </F>
                <F label="Mot de passe SMTP">
                  <div className="relative">
                    <input
                      type={showPasswords.smtp ? 'text' : 'password'}
                      value={config.smtp.password}
                      onChange={e => setC('smtp', 'password', e.target.value)}
                      className={cx(CONTROL, 'h-10 pr-10')}
                    />
                    <button
                      type="button"
                      onClick={() => togglePwd('smtp')}
                      title={showPasswords.smtp ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className={cx('absolute right-3 top-1/2 -translate-y-1/2 rounded', TEXT_FAINT, 'hover:text-gray-600 dark:hover:text-gray-300', FOCUS_RING)}
                    >
                      {showPasswords.smtp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </F>
                <F label="Chiffrement" span>
                  <select value={config.smtp.encryption} onChange={e => setC('smtp', 'encryption', e.target.value)} className={cx(CONTROL, 'h-10')}>
                    <option value="none">Aucun</option>
                    <option value="tls">TLS (STARTTLS)</option>
                    <option value="ssl">SSL</option>
                  </select>
                </F>
              </Grid2>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="secondary" icon={Mail} loading={smtpTesting} onClick={testSmtp}>
                  Tester la connexion
                </Button>
                {smtpResult && (
                  <span
                    className={cx(
                      'inline-flex items-center gap-1.5 text-sm font-medium',
                      smtpResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {smtpResult.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {smtpResult.msg}
                  </span>
                )}
              </div>
            </Card>
          )}

          {activeSection === 'ai' && (
            <Card title={current.title} actions={saveButton('ai')}>
              <Grid2>
                <F label="Fournisseur principal">
                  <select value={config.ai.provider} onChange={e => setC('ai', 'provider', e.target.value)} className={cx(CONTROL, 'h-10')}>
                    <option value="groq">Groq</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="mistral">Mistral AI</option>
                  </select>
                </F>
                <F label="Modèle">
                  <input value={config.ai.model} onChange={e => setC('ai', 'model', e.target.value)} className={cx(CONTROL, 'h-10 font-mono')} />
                </F>
                <F label="Température (0 – 1)">
                  <div className="flex h-10 items-center gap-3">
                    <input
                      type="range" min={0} max={1} step={0.1}
                      value={config.ai.temperature}
                      onChange={e => setC('ai', 'temperature', e.target.value)}
                      className="flex-1 accent-purple-600"
                    />
                    <span className={cx('w-8 text-sm font-semibold text-purple-700 dark:text-purple-300', NUM)}>
                      {config.ai.temperature}
                    </span>
                  </div>
                </F>
                <F label="Fournisseur de secours">
                  <select value={config.ai.fallback_provider} onChange={e => setC('ai', 'fallback_provider', e.target.value)} className={cx(CONTROL, 'h-10')}>
                    <option value="openai">OpenAI</option>
                    <option value="groq">Groq</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </F>
                <F label="Modèle de secours">
                  <input value={config.ai.fallback_model} onChange={e => setC('ai', 'fallback_model', e.target.value)} className={cx(CONTROL, 'h-10 font-mono')} />
                </F>
                <F label="Quota global mensuel (jetons)">
                  <input type="number" value={config.ai.quota_global_monthly} onChange={e => setC('ai', 'quota_global_monthly', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                </F>
                <F label="Quota par organisation (jetons)">
                  <input type="number" value={config.ai.quota_per_org} onChange={e => setC('ai', 'quota_per_org', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                </F>
                <F label="Quota par utilisateur (jetons)">
                  <input type="number" value={config.ai.quota_per_user} onChange={e => setC('ai', 'quota_per_user', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                </F>
              </Grid2>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card title={current.title} actions={saveButton('security')}>
              <Grid2>
                <F label="Durée de session (minutes)">
                  <input type="number" value={config.security.session_lifetime_minutes} onChange={e => setC('security', 'session_lifetime_minutes', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                </F>
                <F label="Tentatives maximum avant blocage">
                  <input type="number" value={config.security.max_login_attempts} onChange={e => setC('security', 'max_login_attempts', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                </F>
                <F label="Politique MFA">
                  <select value={config.security.mfa_policy} onChange={e => setC('security', 'mfa_policy', e.target.value)} className={cx(CONTROL, 'h-10')}>
                    <option value="optional">Optionnelle</option>
                    <option value="required_admins">Obligatoire pour les administrateurs</option>
                    <option value="required_all">Obligatoire pour tous</option>
                  </select>
                </F>
                <F label="Longueur minimale du mot de passe">
                  <input type="number" value={config.security.password_min_length} onChange={e => setC('security', 'password_min_length', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                </F>
                <F label="Adresses IP autorisées pour le SuperAdmin" span>
                  <textarea
                    rows={3}
                    value={config.security.superadmin_ips}
                    onChange={e => setC('security', 'superadmin_ips', e.target.value)}
                    placeholder="Une adresse IP par ligne (vide = toutes autorisées)"
                    className={cx(CONTROL, 'resize-none font-mono')}
                  />
                </F>
              </Grid2>
            </Card>
          )}

          {activeSection === 'trial' && (
            <Card title={current.title} actions={saveButton('trial')}>
              <Grid2>
                <F label="Durée par défaut (jours)">
                  <input type="number" value={config.trial.default_duration_days} onChange={e => setC('trial', 'default_duration_days', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                </F>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Modules accessibles pendant l'essai</span>
                  <div className="flex flex-wrap gap-3">
                    {TRIAL_MODULES.map(mod => (
                      <label key={mod} className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={config.trial.trial_modules?.includes(mod) ?? false}
                          onChange={e => {
                            const mods = e.target.checked
                              ? [...(config.trial.trial_modules ?? []), mod]
                              : (config.trial.trial_modules ?? []).filter(m => m !== mod)
                            setC('trial', 'trial_modules', mods)
                          }}
                          className="h-4 w-4 cursor-pointer rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500 dark:border-gray-600 dark:bg-[#0F1923]"
                        />
                        <span className={cx('text-xs font-medium uppercase', TEXT_BODY)}>{mod}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <F label="Message de bienvenue (FR)" span>
                  <textarea rows={3} value={config.trial.welcome_message_fr} onChange={e => setC('trial', 'welcome_message_fr', e.target.value)} className={cx(CONTROL, 'resize-none')} />
                </F>
                <F label="Message de bienvenue (EN)" span>
                  <textarea rows={3} value={config.trial.welcome_message_en} onChange={e => setC('trial', 'welcome_message_en', e.target.value)} className={cx(CONTROL, 'resize-none')} />
                </F>
              </Grid2>
            </Card>
          )}

          {activeSection === 'license' && (
            <Card title={current.title} actions={saveButton('license')}>
              <Grid2>
                <F label="Période de grâce (jours)">
                  <input type="number" value={config.license.grace_period_days} onChange={e => setC('license', 'grace_period_days', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                </F>
                <F label="Action après expiration">
                  <select value={config.license.after_expiry_action} onChange={e => setC('license', 'after_expiry_action', e.target.value)} className={cx(CONTROL, 'h-10')}>
                    <option value="read_only">Lecture seule</option>
                    <option value="blocked">Accès bloqué</option>
                    <option value="degraded">Mode dégradé (exports uniquement)</option>
                  </select>
                </F>
                <F label="Suspension automatique après (jours)">
                  <input type="number" value={config.license.auto_suspend_after_days} onChange={e => setC('license', 'auto_suspend_after_days', e.target.value)} className={cx(CONTROL, 'h-10', NUM)} />
                </F>
              </Grid2>
            </Card>
          )}

        </div>
      </div>
    </SuperAdminLayout>
  )
}

export { EditorConfig };
