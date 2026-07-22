/**
 * Preferences.jsx — Préférences de notifications granulaires SECRETIS
 *
 * Permet à l'utilisateur de configurer :
 *  - Les canaux par type d'événement (tableau toggle email/push/WhatsApp/Reverb)
 *  - Les heures de silence par jour de semaine
 *  - La fréquence du digest quotidien
 *  - Le mode "Ne pas déranger"
 *  - Les sons de notification
 *
 * Route : GET /notifications/preferences
 */

import { useCallback, useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    BellIcon,
    BellSlashIcon,
    ClockIcon,
    DevicePhoneMobileIcon,
    EnvelopeIcon,
    MoonIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useNotificationPreferences } from '@/hooks/useNotificationCenter';

// ─── Types de notifications avec libellés ──────────────────────────────────────

const NOTIFICATION_TYPES = [
    { key: 'task_assigned',    label: 'Tâche assignée',        category: 'Tâches' },
    { key: 'task_overdue',     label: 'Tâche en retard',       category: 'Tâches' },
    { key: 'message',          label: 'Message interne',       category: 'Messages' },
    { key: 'mail_urgent',      label: 'Courrier urgent',       category: 'Courrier' },
    { key: 'mail_received',    label: 'Courrier reçu',         category: 'Courrier' },
    { key: 'meeting_reminder', label: 'Rappel réunion',        category: 'Agenda' },
    { key: 'event_created',    label: 'Nouvel événement',      category: 'Agenda' },
    { key: 'visitor_arrived',  label: 'Visiteur arrivé',       category: 'Accueil' },
    { key: 'circular',         label: 'Circulaire',            category: 'Messages' },
    { key: 'stock_alert',      label: 'Alerte stock',          category: 'Ressources' },
    { key: 'birthday',         label: 'Anniversaire entreprise', category: 'RH' },
    { key: 'digest',           label: 'Digest quotidien',      category: 'Système' },
];

const CHANNELS = [
    { key: 'push',      label: 'Push',       icon: DevicePhoneMobileIcon, color: 'text-blue-600' },
    { key: 'email',     label: 'Email',      icon: EnvelopeIcon,          color: 'text-green-600' },
    { key: 'whatsapp',  label: 'WhatsApp',   icon: DevicePhoneMobileIcon, color: 'text-emerald-600' },
    { key: 'reverb',    label: 'App',        icon: BellIcon,              color: 'text-purple-600' },
];

const DAYS_FR = [
    { key: 'monday',    label: 'Lun' },
    { key: 'tuesday',   label: 'Mar' },
    { key: 'wednesday', label: 'Mer' },
    { key: 'thursday',  label: 'Jeu' },
    { key: 'friday',    label: 'Ven' },
    { key: 'saturday',  label: 'Sam' },
    { key: 'sunday',    label: 'Dim' },
];

// =============================================================================
// Page principale
// =============================================================================

export default function NotificationPreferences() {
    const { preferences, isLoading, update, isSaving, saveSuccess } = useNotificationPreferences();
    const [form, setForm] = useState(null);
    const [saved, setSaved] = useState(false);

    // Initialiser le formulaire avec les préférences chargées
    useEffect(() => {
        if (preferences && !form) {
            setForm({
                do_not_disturb: preferences.do_not_disturb ?? false,
                daily_digest:   preferences.daily_digest ?? true,
                digest_time:    preferences.digest_time ?? '07:30',
                sound_enabled:  preferences.sound_enabled ?? true,
                silent_hours:   preferences.silent_hours ?? [
                    { days: ['all'], start: '22:00', end: '07:00' },
                ],
                channels:       preferences.channels ?? {},
            });
        }
    }, [preferences, form]);

    useEffect(() => {
        if (saveSuccess) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        }
    }, [saveSuccess]);

    const setField = useCallback((key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    }, []);

    const toggleChannel = useCallback((type, channel) => {
        setForm((prev) => {
            const current  = prev.channels[type] ?? ['push', 'email'];
            const updated  = current.includes(channel)
                ? current.filter((c) => c !== channel)
                : [...current, channel];
            return { ...prev, channels: { ...prev.channels, [type]: updated } };
        });
    }, []);

    const handleSave = useCallback(() => {
        if (form) update(form);
    }, [form, update]);

    if (isLoading || !form) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    // Grouper les types par catégorie
    const byCategory = NOTIFICATION_TYPES.reduce((acc, t) => {
        if (!acc[t.category]) acc[t.category] = [];
        acc[t.category].push(t);
        return acc;
    }, {});

    return (
        <>
            <Head title="Préférences de notifications" />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="max-w-4xl mx-auto px-4 py-8">

                    {/* ── En-tête ────────────────────────────────────────────── */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BellIcon className="h-7 w-7 text-blue-600" />
                                Préférences de notifications
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Configurez vos canaux, heures de silence et digest quotidien.
                            </p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {saved ? (
                                <><CheckCircleIcon className="h-4 w-4" /> Sauvegardé</>
                            ) : isSaving ? 'Sauvegarde…' : 'Sauvegarder'}
                        </button>
                    </div>

                    <div className="space-y-6">

                        {/* ── Bascules globales ───────────────────────────────── */}
                        <Section title="Paramètres globaux">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Toggle
                                    label="Mode Ne Pas Déranger"
                                    description="Bloque toutes les notifications non-urgentes"
                                    icon={BellSlashIcon}
                                    iconColor="text-red-500"
                                    checked={form.do_not_disturb}
                                    onChange={(v) => setField('do_not_disturb', v)}
                                />
                                <Toggle
                                    label="Son de notification"
                                    description="Joue un son lors des nouvelles notifications"
                                    icon={form.sound_enabled ? SpeakerWaveIcon : SpeakerXMarkIcon}
                                    iconColor="text-blue-500"
                                    checked={form.sound_enabled}
                                    onChange={(v) => setField('sound_enabled', v)}
                                />
                                <Toggle
                                    label="Digest quotidien"
                                    description="Résumé personnalisé envoyé chaque matin"
                                    icon={BellIcon}
                                    iconColor="text-green-500"
                                    checked={form.daily_digest}
                                    onChange={(v) => setField('daily_digest', v)}
                                />
                                {form.daily_digest && (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                                        <ClockIcon className="h-5 w-5 text-gray-400" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Heure du digest</p>
                                            <input
                                                type="time"
                                                value={form.digest_time}
                                                onChange={(e) => setField('digest_time', e.target.value)}
                                                className="mt-1 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* ── Heures de silence ──────────────────────────────── */}
                        <Section
                            title="Heures de silence"
                            description="Aucune notification non-urgente pendant ces plages horaires."
                            icon={MoonIcon}
                        >
                            <SilentHoursEditor
                                value={form.silent_hours}
                                onChange={(v) => setField('silent_hours', v)}
                            />
                        </Section>

                        {/* ── Canaux par type ─────────────────────────────────── */}
                        <Section
                            title="Canaux par type de notification"
                            description="Choisissez comment recevoir chaque type de notification."
                        >
                            {Object.entries(byCategory).map(([category, types]) => (
                                <div key={category} className="mb-6">
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h3>
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                        {/* En-tête colonnes */}
                                        <div className="grid grid-cols-[1fr_repeat(4,80px)] px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                            <span>Type</span>
                                            {CHANNELS.map((c) => (
                                                <span key={c.key} className="text-center">{c.label}</span>
                                            ))}
                                        </div>
                                        {types.map((type, i) => (
                                            <div
                                                key={type.key}
                                                className={`grid grid-cols-[1fr_repeat(4,80px)] px-4 py-3 items-center ${
                                                    i < types.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''
                                                }`}
                                            >
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{type.label}</span>
                                                {CHANNELS.map((channel) => {
                                                    const enabled = (form.channels[type.key] ?? ['push', 'email']).includes(channel.key);
                                                    return (
                                                        <div key={channel.key} className="flex justify-center">
                                                            <button
                                                                onClick={() => toggleChannel(type.key, channel.key)}
                                                                className={`w-8 h-5 rounded-full transition-colors relative ${
                                                                    enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                                                                }`}
                                                                aria-label={`${enabled ? 'Désactiver' : 'Activer'} ${channel.label} pour ${type.label}`}
                                                            >
                                                                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                                                                    enabled ? 'left-3.5' : 'left-0.5'
                                                                }`} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </Section>
                    </div>

                    {/* ── Bouton Save bas de page ────────────────────────────── */}
                    <div className="flex justify-end mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {isSaving ? 'Sauvegarde en cours…' : 'Sauvegarder les préférences'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

// =============================================================================
// Sous-composants
// =============================================================================

function Section({ title, description, icon: Icon, children }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-start gap-3 mb-5">
                {Icon && <Icon className="h-5 w-5 text-gray-400 mt-0.5" />}
                <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
                    {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

function Toggle({ label, description, icon: Icon, iconColor, checked, onChange }) {
    return (
        <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
            <div className="flex items-center gap-3">
                {Icon && <Icon className={`h-5 w-5 ${iconColor}`} />}
                <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
                    {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
                </div>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                aria-checked={checked}
                role="switch"
            >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
    );
}

function SilentHoursEditor({ value, onChange }) {
    const rules = Array.isArray(value) ? value : [{ days: ['all'], start: '22:00', end: '07:00' }];

    const updateRule = (idx, field, val) => {
        const updated = rules.map((r, i) => i === idx ? { ...r, [field]: val } : r);
        onChange(updated);
    };

    const addRule = () => onChange([...rules, { days: ['all'], start: '22:00', end: '07:00' }]);
    const removeRule = (idx) => onChange(rules.filter((_, i) => i !== idx));

    return (
        <div className="space-y-3">
            {rules.map((rule, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <div className="flex items-center gap-1.5">
                        {DAYS_FR.map((d) => {
                            const active = rule.days.includes('all') || rule.days.includes(d.key);
                            return (
                                <button
                                    key={d.key}
                                    onClick={() => {
                                        const current = rule.days.includes('all') ? DAYS_FR.map(x => x.key) : rule.days;
                                        const updated = current.includes(d.key)
                                            ? current.filter(x => x !== d.key)
                                            : [...current, d.key];
                                        updateRule(idx, 'days', updated.length === 7 ? ['all'] : updated);
                                    }}
                                    className={`w-8 h-8 text-xs rounded-full font-medium transition-colors ${
                                        active ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                                    }`}
                                >
                                    {d.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="time" value={rule.start}
                            onChange={(e) => updateRule(idx, 'start', e.target.value)}
                            className="text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-2 py-1.5"
                        />
                        <span className="text-xs text-gray-400">à</span>
                        <input type="time" value={rule.end}
                            onChange={(e) => updateRule(idx, 'end', e.target.value)}
                            className="text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-2 py-1.5"
                        />
                    </div>
                    {rules.length > 1 && (
                        <button onClick={() => removeRule(idx)} className="text-red-400 hover:text-red-600 text-sm">
                            Supprimer
                        </button>
                    )}
                </div>
            ))}
            <button onClick={addRule}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                + Ajouter une plage de silence
            </button>
        </div>
    );
}
