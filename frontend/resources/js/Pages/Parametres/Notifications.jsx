import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
    {
        id: 'courrier',
        label: 'Courrier & GED',
        icon: '📬',
        evenements: [
            { id: 'courrier_recu',       label: 'Nouveau courrier entrant reçu' },
            { id: 'courrier_attribue',   label: 'Courrier attribué à moi' },
            { id: 'courrier_urgence',    label: 'Courrier marqué urgent' },
            { id: 'document_partage',    label: 'Document partagé avec moi' },
            { id: 'document_expire',     label: 'Document bientôt expiré' },
        ],
    },
    {
        id: 'reunion',
        label: 'Réunions',
        icon: '📅',
        evenements: [
            { id: 'reunion_invitation',  label: 'Invitation à une réunion' },
            { id: 'reunion_rappel_30',   label: 'Rappel 30 min avant réunion' },
            { id: 'reunion_rappel_24h',  label: 'Rappel 24h avant réunion' },
            { id: 'cr_publie',           label: 'Compte rendu publié' },
            { id: 'signature_demandee',  label: 'Signature demandée sur un CR' },
        ],
    },
    {
        id: 'taches',
        label: 'Tâches',
        icon: '✅',
        evenements: [
            { id: 'tache_assignee',      label: 'Tâche assignée à moi' },
            { id: 'tache_echeance',      label: 'Tâche bientôt échue (48h)' },
            { id: 'tache_retard',        label: 'Tâche en retard' },
            { id: 'tache_commentaire',   label: 'Commentaire sur une de mes tâches' },
            { id: 'tache_terminee',      label: 'Tâche que j\'ai créée terminée' },
        ],
    },
    {
        id: 'agenda',
        label: 'Agenda',
        icon: '🗓',
        evenements: [
            { id: 'rdv_30',              label: 'RDV dans 30 minutes' },
            { id: 'rdv_modifie',         label: 'RDV modifié ou annulé' },
            { id: 'invitation_externe',  label: 'Invitation externe acceptée / refusée' },
        ],
    },
    {
        id: 'rh',
        label: 'RH',
        icon: '👥',
        evenements: [
            { id: 'conge_approuve',      label: 'Congé approuvé' },
            { id: 'conge_refuse',        label: 'Congé refusé' },
            { id: 'visiteur_arrive',     label: 'Visiteur arrivé à l\'accueil' },
        ],
    },
    {
        id: 'comptabilite',
        label: 'Comptabilité',
        icon: '💰',
        evenements: [
            { id: 'facture_emise',       label: 'Nouvelle facture disponible' },
            { id: 'facture_payee',       label: 'Facture payée' },
        ],
    },
    {
        id: 'systeme',
        label: 'Système & Sécurité',
        icon: '🔐',
        evenements: [
            { id: 'connexion_nouvelle',  label: 'Connexion depuis un nouvel appareil' },
            { id: 'mdp_change',          label: 'Mot de passe modifié', locked: true },
            { id: 'abonnement_expire',   label: 'Abonnement bientôt expiré', locked: true },
            { id: 'sauvegarde_echouee',  label: 'Échec de sauvegarde', locked: true },
        ],
    },
];

const CANAUX = [
    { id: 'app',       label: 'App',       icon: '🔔', desc: 'Notification dans l\'application' },
    { id: 'push',      label: 'Push',      icon: '📲', desc: 'Notification push navigateur' },
    { id: 'email',     label: 'Email',     icon: '✉️',  desc: 'Email à votre adresse' },
    { id: 'whatsapp',  label: 'WhatsApp',  icon: '💬', desc: 'Message WhatsApp (numéro requis)' },
];

const FREQUENCES_DIGEST = [
    { value: 'jamais',        label: 'Jamais (notifications en temps réel)' },
    { value: 'quotidien_8h',  label: 'Quotidien — 8h00' },
    { value: 'quotidien_18h', label: 'Quotidien — 18h00' },
    { value: 'hebdo_lundi',   label: 'Hebdomadaire — Lundi matin' },
];

const HOURS = Array.from({ length: 24 }, (_, i) =>
    `${String(i).padStart(2, '0')}:00`
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDefaultPrefs(server) {
    const prefs = {};
    CATEGORIES.forEach(cat => {
        cat.evenements.forEach(ev => {
            CANAUX.forEach(canal => {
                const key = `${ev.id}_${canal.id}`;
                prefs[key] = server?.[key] ?? (canal.id === 'app');
            });
        });
    });
    return prefs;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckCell({ checked, onChange, disabled }) {
    return (
        <td className="px-4 py-3 text-center">
            {disabled ? (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-purple-100 dark:bg-purple-900/40">
                    <svg className="h-3 w-3 text-purple-600 dark:text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" />
                    </svg>
                </span>
            ) : (
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
            )}
        </td>
    );
}

function Toggle({ checked, onChange, label, description }) {
    return (
        <label className="flex items-start gap-3 cursor-pointer select-none">
            <div
                className={`relative mt-0.5 w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                onClick={() => onChange(!checked)}
            >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
            </div>
            <div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</div>
                {description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>}
            </div>
        </label>
    );
}

// ─── Section : Push Notifications ─────────────────────────────────────────────

function PushSection() {
    const { subscribe, unsubscribe, isSubscribed, isSupported, isLoading, error, permission } = usePushNotifications();
    const [testing, setTesting]     = useState(false);
    const [testResult, setTestResult] = useState(null);

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            await axios.post('/push/test');
            setTestResult('success');
        } catch {
            setTestResult('error');
        } finally {
            setTesting(false);
            setTimeout(() => setTestResult(null), 4000);
        }
    };

    if (!isSupported) {
        return (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Navigateur non compatible</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Votre navigateur ne supporte pas les notifications push. Utilisez Chrome, Firefox, Edge ou Safari 16+ pour activer cette fonctionnalité.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Statut actuel */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isSubscribed ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {isSubscribed ? 'Notifications push activées' : 'Notifications push désactivées'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isSubscribed
                                ? 'Vous recevez des notifications même lorsque l\'onglet est fermé.'
                                : permission === 'denied'
                                    ? 'Bloqué par le navigateur — autorisez dans les paramètres du site.'
                                    : 'Cliquez sur Activer pour recevoir des notifications push.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isSubscribed && (
                        <button
                            type="button"
                            onClick={handleTest}
                            disabled={testing}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
                        >
                            {testing ? 'Envoi...' : 'Tester'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={isSubscribed ? unsubscribe : subscribe}
                        disabled={isLoading || permission === 'denied'}
                        className={`relative px-4 py-1.5 text-sm font-medium rounded-lg transition overflow-hidden
                            ${isSubscribed
                                ? 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40'
                                : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                {isSubscribed ? 'Désactivation...' : 'Activation...'}
                            </span>
                        ) : (
                            isSubscribed ? 'Désactiver' : 'Activer'
                        )}
                    </button>
                </div>
            </div>

            {/* Feedback */}
            {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}
            {testResult === 'success' && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-300">
                    Notification de test envoyée ! Vérifiez votre navigateur.
                </div>
            )}
            {testResult === 'error' && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                    Échec de l'envoi du test. Vérifiez la configuration VAPID.
                </div>
            )}
        </div>
    );
}

// ─── Section : Do Not Disturb ─────────────────────────────────────────────────

function DndSection({ dndEnabled, dndStart, dndEnd, onChange }) {
    return (
        <div className="space-y-4">
            <Toggle
                checked={dndEnabled}
                onChange={(v) => onChange('dnd_enabled', v)}
                label="Activer les heures de silence"
                description="Aucune notification ne sera envoyée pendant ces heures (sauf urgences verrouillées)."
            />

            {dndEnabled && (
                <div className="flex items-center gap-4 ml-14">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">De</label>
                        <select
                            value={dndStart}
                            onChange={(e) => onChange('dnd_start', e.target.value)}
                            className="block w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 py-1.5 px-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            {HOURS.map(h => <option key={h}>{h}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">À</label>
                        <select
                            value={dndEnd}
                            onChange={(e) => onChange('dnd_end', e.target.value)}
                            className="block w-28 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 py-1.5 px-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            {HOURS.map(h => <option key={h}>{h}</option>)}
                        </select>
                    </div>
                    <div className="pt-5 text-xs text-gray-500 dark:text-gray-400">
                        {dndStart && dndEnd ? `Silence de ${dndStart} à ${dndEnd}` : ''}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Canal Test Button ─────────────────────────────────────────────────────────

function TestCanalButton({ canal }) {
    const [state, setState] = useState('idle'); // idle | loading | success | error

    const handleTest = async () => {
        setState('loading');
        try {
            await axios.post('/parametres/notifications/test-canal', { canal: canal.id });
            setState('success');
        } catch {
            setState('error');
        } finally {
            setTimeout(() => setState('idle'), 3000);
        }
    };

    const colors = {
        idle:    'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        loading: 'text-gray-400 dark:text-gray-500 cursor-not-allowed',
        success: 'text-green-600 dark:text-green-400',
        error:   'text-red-600 dark:text-red-400',
    };

    const labels = {
        idle: 'Tester',
        loading: '...',
        success: '✓ Envoyé',
        error: '✗ Échec',
    };

    return (
        <button
            type="button"
            onClick={handleTest}
            disabled={state === 'loading'}
            className={`text-xs font-medium transition ${colors[state]}`}
        >
            {labels[state]}
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Notifications({ preferences: serverPrefs, flash }) {
    const defaultPrefs = buildDefaultPrefs(serverPrefs);

    const { data, setData, patch, processing, isDirty } = useForm({
        ...defaultPrefs,
        son_notification: serverPrefs?.son_notification ?? true,
        digest:           serverPrefs?.digest ?? 'jamais',
        dnd_enabled:      serverPrefs?.dnd_enabled ?? false,
        dnd_start:        serverPrefs?.dnd_start ?? '22:00',
        dnd_end:          serverPrefs?.dnd_end ?? '07:00',
    });

    const toggle = (key, val) => setData(key, val);

    const toggleAll = (canalId, value) => {
        const updates = {};
        CATEGORIES.forEach(cat => {
            cat.evenements.forEach(ev => {
                if (!ev.locked) updates[`${ev.id}_${canalId}`] = value;
            });
        });
        setData(prev => ({ ...prev, ...updates }));
    };

    const isCanalAllChecked = (canalId) =>
        CATEGORIES.every(cat =>
            cat.evenements.every(ev => ev.locked || data[`${ev.id}_${canalId}`])
        );

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('parametres.notifications.update'), { preserveScroll: true });
    };

    return (
        <AppLayout title="Paramètres — Notifications">
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Configurez les événements qui déclenchent une notification et les canaux utilisés.
                    </p>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
                        {flash.success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* ── Tableau principal ────────────────────────────────── */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        {/* Légende canaux + boutons test */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-6">
                            {CANAUX.map(canal => (
                                <div key={canal.id} className="flex items-center gap-2">
                                    <span className="text-base">{canal.icon}</span>
                                    <div>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{canal.label}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{canal.desc}</span>
                                            <TestCanalButton canal={canal} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-64">
                                            Événement
                                        </th>
                                        {CANAUX.map(canal => (
                                            <th key={canal.id} className="px-4 py-4 text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <span className="text-lg">{canal.icon}</span>
                                                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                                        {canal.label}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAll(canal.id, !isCanalAllChecked(canal.id))}
                                                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                                                    >
                                                        {isCanalAllChecked(canal.id) ? 'Tout décocher' : 'Tout cocher'}
                                                    </button>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {CATEGORIES.map(cat => (
                                        <React.Fragment key={cat.id}>
                                            <tr className="bg-gray-50/60 dark:bg-gray-800/30">
                                                <td colSpan={CANAUX.length + 1} className="px-6 py-2.5">
                                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                                        <span>{cat.icon}</span>
                                                        {cat.label}
                                                    </span>
                                                </td>
                                            </tr>
                                            {cat.evenements.map(ev => (
                                                <tr key={ev.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{ev.label}</span>
                                                            {ev.locked && (
                                                                <span className="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                                                    🔒 Obligatoire
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {CANAUX.map(canal => (
                                                        <CheckCell
                                                            key={canal.id}
                                                            checked={ev.locked ? true : !!data[`${ev.id}_${canal.id}`]}
                                                            onChange={(v) => toggle(`${ev.id}_${canal.id}`, v)}
                                                            disabled={ev.locked}
                                                        />
                                                    ))}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Push Notifications ───────────────────────────────── */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-200 dark:border-gray-700">
                                Notifications Push (navigateur)
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Recevez des notifications même quand l'onglet SECRETIS est fermé, directement dans votre navigateur.
                            </p>
                        </div>
                        <PushSection />
                    </div>

                    {/* ── Préférences personnelles ─────────────────────────── */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-200 dark:border-gray-700">
                            Préférences personnelles
                        </h3>

                        <Toggle
                            checked={data.son_notification}
                            onChange={(v) => setData('son_notification', v)}
                            label="Son de notification"
                            description="Jouer un son lors de l'arrivée d'une nouvelle notification."
                        />

                        {/* Heures de silence (DND) */}
                        <DndSection
                            dndEnabled={data.dnd_enabled}
                            dndStart={data.dnd_start}
                            dndEnd={data.dnd_end}
                            onChange={(key, val) => setData(key, val)}
                        />

                        {/* Digest email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Fréquence des emails de synthèse (digest)
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Au lieu de recevoir chaque notification individuellement, recevez un résumé groupé.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {FREQUENCES_DIGEST.map(f => (
                                    <label key={f.value}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition
                                            ${data.digest === f.value
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="digest"
                                            value={f.value}
                                            checked={data.digest === f.value}
                                            onChange={() => setData('digest', f.value)}
                                            className="text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{f.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Info SMS/WhatsApp */}
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                            <strong>WhatsApp :</strong> Ce canal nécessite que votre numéro de téléphone soit renseigné dans votre profil et que l'intégration WhatsApp Business soit configurée dans{' '}
                            <a href="/parametres/integrations" className="underline font-medium">Paramètres &gt; Intégrations</a>.
                        </div>
                    </div>

                    {/* ── Actions ──────────────────────────────────────────── */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={processing || !isDirty}
                            className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition flex items-center gap-2"
                        >
                            {processing && (
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            )}
                            Enregistrer les préférences
                        </button>
                    </div>

                </form>
            </div>
        </AppLayout>
    );
}
export { Notifications };
