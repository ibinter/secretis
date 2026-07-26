/**
 * Notifications/Preferences.jsx — Préférences de notifications granulaires SECRETIS
 * Route : GET /notifications/preferences
 * Sauvegarde : PUT /api/v1/notifications/preferences
 */

import React, { useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

// ─── Types de notifications groupés par catégorie ─────────────────────────────
const GROUPS = [
  {
    key: 'agenda',
    emoji: '📅',
    label: 'Agenda & Réunions',
    types: [
      { key: 'event_reminder',      label: "Rappel d'événement",      defaultEmail: true,  defaultSms: false, defaultWA: true },
      { key: 'event_invitation',    label: 'Invitation à un event',    defaultEmail: true,  defaultSms: false, defaultWA: false },
      { key: 'event_modified',      label: 'Modification event',       defaultEmail: true,  defaultSms: false, defaultWA: false },
      { key: 'meeting_minutes',     label: 'Compte-rendu disponible',  defaultEmail: true,  defaultSms: false, defaultWA: false },
    ],
  },
  {
    key: 'tasks',
    emoji: '✅',
    label: 'Tâches',
    types: [
      { key: 'task_assigned',   label: 'Tâche assignée',       defaultEmail: true,  defaultSms: false, defaultWA: true },
      { key: 'task_deadline',   label: 'Date limite approche', defaultEmail: true,  defaultSms: false, defaultWA: false },
      { key: 'task_commented',  label: 'Tâche commentée',      defaultEmail: false, defaultSms: false, defaultWA: false },
    ],
  },
  {
    key: 'documents',
    emoji: '📄',
    label: 'Documents',
    types: [
      { key: 'doc_shared',     label: 'Partagé avec moi',       defaultEmail: true,  defaultSms: false, defaultWA: false },
      { key: 'doc_validation', label: 'Validation demandée',    defaultEmail: true,  defaultSms: false, defaultWA: true },
      { key: 'doc_reviewed',   label: 'Validé / refusé',        defaultEmail: true,  defaultSms: false, defaultWA: false },
    ],
  },
  {
    key: 'visitors',
    emoji: '🧑',
    label: 'Visiteurs',
    types: [
      { key: 'visitor_arrived',   label: 'Visiteur arrivé pour moi', defaultEmail: true, defaultSms: true, defaultWA: true },
      { key: 'invitation_confirmed', label: 'Invitation confirmée',  defaultEmail: true, defaultSms: false, defaultWA: false },
    ],
  },
  {
    key: 'communication',
    emoji: '💬',
    label: 'Communication',
    types: [
      { key: 'direct_message', label: 'Nouveau message direct', defaultEmail: true,  defaultSms: false, defaultWA: true },
      { key: 'mentioned',      label: 'Mentionné',              defaultEmail: true,  defaultSms: false, defaultWA: false },
    ],
  },
  {
    key: 'security',
    emoji: '🔒',
    label: 'Sécurité',
    types: [
      { key: 'suspicious_login', label: 'Connexion suspecte', alwaysOn: true },
      { key: 'new_device',       label: 'Nouveau appareil',   defaultEmail: true,  defaultSms: false, defaultWA: false },
    ],
  },
  {
    key: 'system',
    emoji: '⚙️',
    label: 'Système',
    types: [
      { key: 'maintenance',   label: 'Maintenance',             alwaysOn: true,  smsAlways: false, waAlways: false },
      { key: 'announcement',  label: 'Annonce SECRETIS',        defaultEmail: true,  defaultSms: false, defaultWA: false },
      { key: 'license_expiry',label: 'Licence bientôt expirée', alwaysOn: true,  smsAlways: true,  waAlways: true },
    ],
  },
];

// ─── Canaux disponibles ────────────────────────────────────────────────────────
const CHANNELS = [
  { key: 'email',    label: 'Email',    emoji: '📧' },
  { key: 'sms',      label: 'SMS',      emoji: '📱' },
  { key: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
];

const REMINDER_OPTIONS = [
  { key: '15min', label: '15 min' },
  { key: '30min', label: '30 min' },
  { key: '1h',    label: '1 heure' },
  { key: '1day',  label: '1 jour' },
];

// ─── Construire les préférences initiales ──────────────────────────────────────
function buildDefaults(propPrefs = {}) {
  const prefs = {};
  GROUPS.forEach(g => {
    g.types.forEach(t => {
      prefs[t.key] = {
        inapp:    true,
        email:    t.alwaysOn ? true  : (propPrefs[t.key]?.email    ?? t.defaultEmail ?? false),
        sms:      t.alwaysOn ? (t.smsAlways ?? false) : (propPrefs[t.key]?.sms      ?? t.defaultSms   ?? false),
        whatsapp: t.alwaysOn ? (t.waAlways  ?? false) : (propPrefs[t.key]?.whatsapp ?? t.defaultWA    ?? false),
      };
    });
  });
  return prefs;
}

// ─── Toggle compact ───────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
        ${checked ? 'bg-[#9333EA]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ─── Canal Card (Section 1) ───────────────────────────────────────────────────
function ChannelCard({ emoji, label, description, locked, enabled, onToggle }) {
  return (
    <div className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-4
      ${locked ? 'border-gray-100' : 'border-gray-200'}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <div className="text-sm font-semibold text-gray-800">{label}</div>
          <div className="text-xs text-gray-400 mt-0.5">{description}</div>
        </div>
      </div>
      {locked ? (
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Toujours actif
        </div>
      ) : (
        <Toggle checked={enabled} onChange={onToggle} />
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function NotificationsPreferences({ preferences: propPrefs, userEmail, channelsAvailable }) {
  const [prefs, setPrefs]             = useState(buildDefaults(propPrefs));
  const [openGroups, setOpenGroups]   = useState(Object.fromEntries(GROUPS.map(g => [g.key, true])));
  const [channelEmail, setChannelEmail]   = useState(propPrefs?.channels?.email ?? true);
  const [channelSms, setChannelSms]       = useState(propPrefs?.channels?.sms ?? false);
  const [channelWA, setChannelWA]         = useState(propPrefs?.channels?.whatsapp ?? false);
  const [digestEnabled, setDigestEnabled] = useState(propPrefs?.digest?.enabled ?? false);
  const [digestHour, setDigestHour]       = useState(propPrefs?.digest?.hour ?? '8');
  const [reminders, setReminders]         = useState(propPrefs?.reminders ?? ['15min', '1h']);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState(null);

  const smsAvailable = channelsAvailable?.sms ?? false;
  const waAvailable  = channelsAvailable?.whatsapp ?? false;

  const togglePref = useCallback((typeKey, channel) => {
    setPrefs(prev => ({
      ...prev,
      [typeKey]: { ...prev[typeKey], [channel]: !prev[typeKey][channel] },
    }));
  }, []);

  const toggleGroup = key => setOpenGroups(p => ({ ...p, [key]: !p[key] }));

  const toggleReminder = key => {
    setReminders(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await axios.put('/api/v1/notifications/preferences', {
        types: prefs,
        channels: { email: channelEmail, sms: channelSms, whatsapp: channelWA },
        digest: { enabled: digestEnabled, hour: digestHour },
        reminders,
      });
      setToast({ type: 'success', msg: 'Préférences enregistrées !' });
    } catch {
      setToast({ type: 'error', msg: 'Erreur lors de la sauvegarde.' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  // Calcul cellule tableau
  const renderCell = (type, channel) => {
    if (type.alwaysOn) {
      const isOn = channel === 'email' ? true : (channel === 'sms' ? (type.smsAlways ?? false) : (type.waAlways ?? false));
      return (
        <div className="flex justify-center">
          {isOn ? (
            <span title="Toujours actif" className="text-gray-400">
              <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
          ) : (
            <span className="text-gray-200 select-none">—</span>
          )}
        </div>
      );
    }

    const disabled = channel === 'sms' ? !smsAvailable : channel === 'whatsapp' ? !waAvailable : false;
    const val = prefs[type.key]?.[channel] ?? false;

    if (disabled) {
      return <div className="flex justify-center"><span className="text-gray-200 select-none text-xs">N/D</span></div>;
    }

    return (
      <div className="flex justify-center">
        <Toggle checked={val} onChange={() => togglePref(type.key, channel)} />
      </div>
    );
  };

  return (
    <>
      <Head title="Préférences de notifications — SECRETIS" />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Préférences de notifications</h1>
          <p className="text-gray-500 text-sm">Configurez comment et quand vous souhaitez être notifié.</p>
        </div>

        {/* ── Section 1 : Canaux actifs ─────────────────────────────────── */}
        <section className="bg-gray-50 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Canaux actifs</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <ChannelCard
              emoji="📱"
              label="Notifications in-app"
              description="Toujours actives dans l'application"
              locked
              enabled
            />
            <ChannelCard
              emoji="📧"
              label="Email"
              description={userEmail ? `Envoyé à ${userEmail}` : 'Votre adresse email'}
              enabled={channelEmail}
              onToggle={v => setChannelEmail(v)}
            />
            <ChannelCard
              emoji="📱"
              label="SMS"
              description={smsAvailable ? 'Disponible sur votre compte' : 'Disponible si configuré par votre admin'}
              enabled={channelSms}
              onToggle={v => setChannelSms(v)}
            />
            <ChannelCard
              emoji="💬"
              label="WhatsApp"
              description={waAvailable ? 'Disponible sur votre compte' : 'Disponible si configuré par votre admin'}
              enabled={channelWA}
              onToggle={v => setChannelWA(v)}
            />
          </div>
        </section>

        {/* ── Section 2 : Tableau types × canaux ───────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Notifications par type</h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
              <span>
                <svg className="w-3 h-3 inline mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                = Toujours actif
              </span>
              <span>— = Non disponible</span>
              <span>N/D = Non disponible sur votre plan</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wide w-full">Type</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide text-center min-w-[80px]">In-app</th>
                  {CHANNELS.map(c => (
                    <th key={c.key} className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide text-center min-w-[80px]">
                      {c.emoji} {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROUPS.map(g => (
                  <React.Fragment key={g.key}>
                    {/* Sous-header groupe */}
                    <tr className="bg-gray-50/70 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleGroup(g.key)}>
                      <td colSpan={5} className="py-2.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{g.emoji}</span>
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{g.label}</span>
                          <svg
                            className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${openGroups[g.key] ? '' : '-rotate-90'}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </td>
                    </tr>

                    {openGroups[g.key] && g.types.map((type, i) => (
                      <tr key={type.key} className={`border-b border-gray-50 hover:bg-purple-50/30 transition-colors ${i === g.types.length - 1 ? 'border-b-2 border-gray-100' : ''}`}>
                        <td className="py-2.5 px-6 text-gray-700 pl-10">{type.label}</td>
                        {/* In-app : toujours actif */}
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex justify-center">
                            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                        </td>
                        {CHANNELS.map(c => (
                          <td key={c.key} className="py-2.5 px-4 text-center">
                            {renderCell(type, c.key)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 3 : Résumé quotidien ─────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Résumé quotidien</h2>
          <div className="flex items-start gap-4">
            <Toggle checked={digestEnabled} onChange={setDigestEnabled} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-800">Recevoir un résumé quotidien par email</div>
              <p className="text-xs text-gray-400 mt-0.5">
                Un email récapitulatif de vos événements, tâches et notifications du jour.
              </p>
              {digestEnabled && (
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-sm text-gray-600 font-medium">Heure d'envoi :</label>
                  <select
                    value={digestHour}
                    onChange={e => setDigestHour(e.target.value)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[{ v: '6', l: '06:00' }, { v: '8', l: '08:00' }, { v: '12', l: '12:00' }, { v: '18', l: '18:00' }].map(o => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Section 4 : Rappels d'événements ─────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Rappels d'événements</h2>
          <p className="text-sm text-gray-500 mb-4">Me rappeler X avant le début d'un événement :</p>
          <div className="flex flex-wrap gap-3">
            {REMINDER_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminders.includes(opt.key)}
                  onChange={() => toggleReminder(opt.key)}
                  className="w-4 h-4 accent-[#9333EA] rounded"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* ── Bouton Sauvegarder ────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">
            Les modifications sont appliquées immédiatement après l'enregistrement.
          </p>
          <button
            onClick={save}
            disabled={saving}
            className="px-8 py-3 bg-[#9333EA] text-white font-bold rounded-xl hover:bg-[#7e22ce] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Enregistrement…
              </>
            ) : 'Enregistrer mes préférences'}
          </button>
        </div>

      </div>
    </>
  );
}
export { NotificationsPreferences };
