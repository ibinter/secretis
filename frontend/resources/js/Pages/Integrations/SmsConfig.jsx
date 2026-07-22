import { useState, useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    DevicePhoneMobileIcon,
    PaperAirplaneIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PROVIDERS = [
    {
        key:        'africas_talking',
        name:       "Africa's Talking",
        countries:  ['+254 Kenya', '+256 Uganda', '+255 Tanzania', '+234 Nigeria', '+233 Ghana'],
        logo:       '🇰🇪',
        website:    'https://africastalking.com',
        fields:     ['api_key', 'username'],
    },
    {
        key:        'orange',
        name:       'Orange SMS',
        countries:  ['+225 Côte d\'Ivoire', '+237 Cameroun', '+221 Sénégal', '+242 Congo'],
        logo:       '🟠',
        website:    'https://developer.orange.com',
        fields:     ['client_id', 'client_secret', 'sender_number'],
    },
    {
        key:        'mtn',
        name:       'MTN SMS',
        countries:  ['+237 Cameroun', '+225 Côte d\'Ivoire', '+233 Ghana'],
        logo:       '🟡',
        website:    'https://momodeveloper.mtn.com',
        fields:     ['api_key', 'api_user', 'environment'],
    },
    {
        key:        'vonage',
        name:       'Vonage / Nexmo',
        countries:  ['Europe', 'International'],
        logo:       '🔵',
        website:    'https://developer.vonage.com',
        fields:     ['api_key', 'api_secret', 'from'],
    },
    {
        key:        'twilio',
        name:       'Twilio',
        countries:  ['International (fallback)'],
        logo:       '🔴',
        website:    'https://twilio.com',
        fields:     ['account_sid', 'auth_token', 'from'],
    },
];

const TEMPLATES = [
    { key: 'rdv_reminder',   label: 'Rappel rendez-vous',    vars: ['{date}', '{heure}'] },
    { key: 'delivery_alert', label: 'Alerte livraison',       vars: ['{numero}', '{lien}'] },
    { key: 'otp',            label: 'Code OTP',               vars: ['{otp}'] },
    { key: 'task_assigned',  label: 'Tâche assignée',         vars: ['{tache}', '{date}'] },
    { key: 'invoice_due',    label: 'Rappel paiement facture', vars: ['{numero}', '{montant}', '{date}'] },
];

const DEFAULT_TEMPLATES = {
    rdv_reminder:   'Rappel : Votre rendez-vous est prévu le {date} à {heure}. SECRETIS ERP.',
    delivery_alert: 'Alerte livraison : Votre commande #{numero} a été expédiée. Suivi : {lien}',
    otp:            'SECRETIS : Votre code de vérification est {otp}. Ne le partagez jamais.',
    task_assigned:  'Nouvelle tâche assignée : "{tache}" — Échéance : {date}.',
    invoice_due:    'Rappel paiement : Facture #{numero} de {montant} FCFA échue le {date}.',
};

// ─── Fournisseur Card ─────────────────────────────────────────────────────────

function ProviderCard({ provider, isEnabled, onToggle, config, onConfigChange, credits }) {
    const [expanded, setExpanded] = useState(false);

    const FIELD_LABELS = {
        api_key:       'Clé API',
        username:      "Nom d'utilisateur",
        client_id:     'Client ID',
        client_secret: 'Client Secret',
        sender_number: 'Numéro expéditeur',
        api_user:      'Utilisateur API',
        environment:   'Environnement',
        api_secret:    'Secret API',
        account_sid:   'Account SID',
        auth_token:    'Auth Token',
        from:          'Numéro/Nom expéditeur',
    };

    return (
        <div className={[
            'border rounded-2xl transition-all',
            isEnabled
                ? 'border-blue-300 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-900/10'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
        ].join(' ')}>
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.logo}</span>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{provider.name}</h3>
                        <p className="text-xs text-gray-400">{provider.countries.join(' · ')}</p>
                    </div>
                    {credits?.[provider.key] != null && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full ml-2">
                            {credits[provider.key]} crédits
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setExpanded(e => !e)}
                        className="text-xs text-blue-600 hover:underline"
                    >
                        {expanded ? 'Masquer' : 'Configurer'}
                    </button>
                    {/* Toggle */}
                    <button
                        onClick={() => onToggle(provider.key)}
                        className={[
                            'w-10 h-5 rounded-full transition-colors relative',
                            isEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600',
                        ].join(' ')}
                    >
                        <span className={[
                            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                            isEnabled ? 'left-5' : 'left-0.5',
                        ].join(' ')} />
                    </button>
                </div>
            </div>

            {expanded && isEnabled && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                    {provider.fields.map(field => (
                        <div key={field}>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {FIELD_LABELS[field] ?? field}
                            </label>
                            {field === 'environment' ? (
                                <select
                                    value={config[`${provider.key}_${field}`] ?? 'sandbox'}
                                    onChange={e => onConfigChange(`${provider.key}_${field}`, e.target.value)}
                                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="sandbox">Sandbox (test)</option>
                                    <option value="production">Production</option>
                                </select>
                            ) : (
                                <input
                                    type={['api_key', 'client_secret', 'auth_token', 'api_secret'].includes(field) ? 'password' : 'text'}
                                    value={config[`${provider.key}_${field}`] ?? ''}
                                    onChange={e => onConfigChange(`${provider.key}_${field}`, e.target.value)}
                                    placeholder={['api_key', 'client_secret', 'auth_token', 'api_secret'].includes(field) ? '••••••••••••' : ''}
                                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            )}
                        </div>
                    ))}

                    <a
                        href={provider.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                    >
                        Obtenir mes clés API →
                    </a>
                </div>
            )}
        </div>
    );
}

// ─── Page SmsConfig ───────────────────────────────────────────────────────────

export default function SmsConfig({ initialConfig = {}, stats = null }) {
    const [activeTab,    setActiveTab]    = useState('providers');
    const [config,       setConfig]       = useState(initialConfig);
    const [enabledProvs, setEnabledProvs] = useState(initialConfig.enabled_providers ?? []);
    const [templates,    setTemplates]    = useState({ ...DEFAULT_TEMPLATES, ...(initialConfig.templates ?? {}) });
    const [testPhone,    setTestPhone]    = useState('');
    const [testMsg,      setTestMsg]      = useState('Ceci est un SMS de test depuis IBIG SECRETIS.');
    const [testProvider, setTestProvider] = useState('auto');
    const [testResult,   setTestResult]   = useState(null);
    const [testLoading,  setTestLoading]  = useState(false);
    const [saving,       setSaving]       = useState(false);
    const [saved,        setSaved]        = useState(false);
    const [credits,      setCredits]      = useState({});

    function handleConfigChange(key, value) {
        setConfig(c => ({ ...c, [key]: value }));
    }

    function handleToggleProvider(key) {
        setEnabledProvs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    }

    async function handleSave() {
        setSaving(true);
        try {
            await axios.put('/integrations/sms/config', {
                ...config,
                enabled_providers: enabledProvs,
                templates,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setSaving(false);
        }
    }

    async function handleTest() {
        if (!testPhone) return;
        setTestLoading(true);
        setTestResult(null);
        try {
            const { data } = await axios.post('/integrations/sms/test', {
                phone:    testPhone,
                message:  testMsg,
                provider: testProvider,
            });
            setTestResult({ success: data.success, message: data.message ?? 'SMS envoyé !' });
        } catch (err) {
            setTestResult({ success: false, message: err.response?.data?.message ?? 'Erreur lors de l\'envoi.' });
        } finally {
            setTestLoading(false);
        }
    }

    const TABS_SMS = [
        { key: 'providers', label: 'Fournisseurs' },
        { key: 'templates', label: 'Templates' },
        { key: 'test',      label: 'Test d\'envoi' },
        { key: 'stats',     label: 'Statistiques' },
    ];

    return (
        <AppLayout>
            <Head title="Configuration SMS" />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.visit('/integrations')} className="text-gray-400 hover:text-gray-600">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <DevicePhoneMobileIcon className="w-6 h-6 text-blue-600" />
                            Configuration SMS Multi-Provider
                        </h1>
                        <p className="text-sm text-gray-500">Routage automatique selon le pays du destinataire</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit flex-wrap">
                    {TABS_SMS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={[
                                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                                activeTab === tab.key
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700',
                            ].join(' ')}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Fournisseurs */}
                {activeTab === 'providers' && (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500 mb-4">
                            Activez les fournisseurs SMS disponibles dans vos régions cibles. Le routage est automatique selon l'indicatif du numéro.
                        </p>
                        {PROVIDERS.map(provider => (
                            <ProviderCard
                                key={provider.key}
                                provider={provider}
                                isEnabled={enabledProvs.includes(provider.key)}
                                onToggle={handleToggleProvider}
                                config={config}
                                onConfigChange={handleConfigChange}
                                credits={credits}
                            />
                        ))}

                        {/* Mapping pays → provider */}
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Routage automatique</h3>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                                {[
                                    ['🇨🇮 +225 Côte d\'Ivoire', 'Orange SMS'],
                                    ['🇨🇲 +237 Cameroun', 'Orange SMS'],
                                    ['🇸🇳 +221 Sénégal', 'Orange SMS'],
                                    ['🇰🇪 +254 Kenya', "Africa's Talking"],
                                    ['🇳🇬 +234 Nigeria', "Africa's Talking"],
                                    ['🇬🇭 +233 Ghana', "Africa's Talking"],
                                    ['🌍 Europe', 'Vonage'],
                                    ['🌐 International', 'Twilio (fallback)'],
                                ].map(([country, provider]) => (
                                    <div key={country} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded-lg">
                                        <span>{country}</span>
                                        <span className="font-medium text-blue-600">{provider}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            {saving
                                ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                : saved
                                    ? <CheckCircleIcon className="w-4 h-4" />
                                    : null
                            }
                            {saved ? 'Sauvegardé !' : 'Enregistrer la configuration'}
                        </button>
                    </div>
                )}

                {/* Templates */}
                {activeTab === 'templates' && (
                    <div className="space-y-5">
                        <p className="text-sm text-gray-500">Personnalisez les templates SMS. Les variables entre accolades {'{variable}'} sont remplacées automatiquement.</p>

                        {TEMPLATES.map(tpl => (
                            <div key={tpl.key} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-semibold text-gray-900 dark:text-white">{tpl.label}</label>
                                    <div className="flex gap-1">
                                        {tpl.vars.map(v => (
                                            <span key={v} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">{v}</span>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    value={templates[tpl.key] ?? ''}
                                    onChange={e => setTemplates(t => ({ ...t, [tpl.key]: e.target.value }))}
                                    rows={2}
                                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    {(templates[tpl.key] ?? '').length} caractères
                                    {(templates[tpl.key] ?? '').length > 160 && (
                                        <span className="text-amber-500 ml-2">⚠️ 2 SMS ({Math.ceil((templates[tpl.key] ?? '').length / 160)} crédits)</span>
                                    )}
                                </p>

                                {/* Prévisualisation */}
                                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-300 font-mono">
                                    {tpl.vars.reduce((msg, v) => msg.replace(v, `<${v.slice(1, -1)}>`), templates[tpl.key] ?? '')}
                                </div>
                            </div>
                        ))}

                        <button onClick={handleSave} disabled={saving} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors">
                            Enregistrer les templates
                        </button>
                    </div>
                )}

                {/* Test d'envoi */}
                {activeTab === 'test' && (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <PaperAirplaneIcon className="w-5 h-5 text-blue-600" />
                            Envoyer un SMS de test
                        </h3>

                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Numéro destinataire</label>
                            <input
                                type="tel"
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                                placeholder="+2250700000000"
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Message</label>
                            <textarea
                                value={testMsg}
                                onChange={e => setTestMsg(e.target.value)}
                                rows={3}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Fournisseur</label>
                            <select
                                value={testProvider}
                                onChange={e => setTestProvider(e.target.value)}
                                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="auto">Auto (selon pays)</option>
                                {PROVIDERS.filter(p => enabledProvs.includes(p.key)).map(p => (
                                    <option key={p.key} value={p.key}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {testResult && (
                            <div className={`p-3 rounded-xl text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {testResult.success ? '✅' : '❌'} {testResult.message}
                            </div>
                        )}

                        <button
                            onClick={handleTest}
                            disabled={testLoading || !testPhone}
                            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {testLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
                            Envoyer le SMS de test
                        </button>
                    </div>
                )}

                {/* Statistiques */}
                {activeTab === 'stats' && (
                    <div>
                        {!stats ? (
                            <p className="text-gray-400 text-sm text-center py-10">Aucune statistique disponible pour le moment.</p>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                    {[
                                        { label: 'SMS envoyés (30j)',  value: stats.total_sent    ?? 0 },
                                        { label: 'Taux de livraison',  value: `${stats.delivery_rate ?? 0}%` },
                                        { label: 'Crédits consommés',  value: stats.credits_used  ?? 0 },
                                        { label: 'OTP envoyés',        value: stats.otp_count     ?? 0 },
                                        { label: 'Rappels RDV',        value: stats.rdv_count     ?? 0 },
                                        { label: 'Alertes livraison',  value: stats.delivery_count ?? 0 },
                                    ].map(s => (
                                        <div key={s.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
                                            <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                                            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Répartition par provider */}
                                {stats.by_provider && (
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
                                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-2">
                                            <ChartBarIcon className="w-4 h-4 text-blue-600" /> Répartition par fournisseur
                                        </h4>
                                        <div className="space-y-2">
                                            {Object.entries(stats.by_provider).map(([key, count]) => {
                                                const pct = stats.total_sent > 0 ? Math.round(count / stats.total_sent * 100) : 0;
                                                const name = PROVIDERS.find(p => p.key === key)?.name ?? key;
                                                return (
                                                    <div key={key} className="flex items-center gap-3 text-sm">
                                                        <span className="w-28 text-gray-600 dark:text-gray-400 truncate">{name}</span>
                                                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                                            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="w-12 text-right text-gray-500 text-xs">{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
