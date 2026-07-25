import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ─── Constants ───────────────────────────────────────────────────────────────

const AI_PROVIDERS = [
    {
        value: 'groq',
        label: 'Groq',
        logo: '⚡',
        hint: 'Très rapide, idéal pour la production. Obtenez votre clé sur console.groq.com',
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    },
    {
        value: 'openai',
        label: 'OpenAI',
        logo: '🤖',
        hint: 'GPT-4o recommandé pour la qualité. Obtenez votre clé sur platform.openai.com',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    },
    {
        value: 'anthropic',
        label: 'Anthropic (Claude)',
        logo: '🧠',
        hint: 'Claude Sonnet recommandé. Obtenez votre clé sur console.anthropic.com',
        models: ['claude-sonnet-4-5', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    },
];

const INTEGRATIONS = [
    {
        id: 'smtp',
        label: 'Email SMTP',
        description: 'Configurer le serveur d\'email pour les envois système',
        icon: '✉️',
        category: 'Communication',
    },
    {
        id: 'whatsapp',
        label: 'WhatsApp Business',
        description: 'Notifications et partage via WhatsApp Business API',
        icon: '💬',
        category: 'Communication',
    },
    {
        id: 's3',
        label: 'Stockage Cloud (S3)',
        description: 'Stocker les fichiers sur Amazon S3 ou compatible',
        icon: '☁️',
        category: 'Stockage',
    },
    {
        id: 'google_calendar',
        label: 'Google Calendar',
        description: 'Synchronisation bidirectionnelle de l\'agenda',
        icon: '🗓',
        category: 'Productivité',
    },
    {
        id: 'sara',
        label: 'IA SARA',
        description: 'Assistante IA — Groq, OpenAI ou Anthropic',
        icon: '🧠',
        category: 'Intelligence Artificielle',
    },
];

// ─── Modal base ───────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none transition">✕</button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────

function FormField({ label, error, required, children, hint }) {
    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

function Input({ className = '', ...props }) {
    return (
        <input
            className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition ${className}`}
            {...props}
        />
    );
}

function PasswordInput({ ...props }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <Input type={show ? 'text' : 'password'} {...props} className="pr-10" />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm"
                tabIndex={-1}
            >
                {show ? '🙈' : '👁'}
            </button>
        </div>
    );
}

function TestResult({ result }) {
    if (!result) return null;
    return (
        <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
            result.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
            <span className="text-base">{result.success ? '✅' : '❌'}</span>
            <span>{result.message}</span>
        </div>
    );
}

// ─── SMTP Modal ────────────────────────────────────────────────────────────────

function SmtpModal({ open, onClose, config }) {
    const { data, setData, post, processing, errors } = useForm({
        host:       config?.host || '',
        port:       config?.port || '587',
        username:   config?.username || '',
        password:   '',
        from_email: config?.from_email || '',
        from_name:  config?.from_name || '',
        encryption: config?.encryption || 'tls',
    });
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(route('parametres.integrations.test-smtp'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            setTestResult(json);
        } catch {
            setTestResult({ success: false, message: 'Erreur réseau lors du test.' });
        }
        setTesting(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('parametres.integrations.update', 'smtp'), { onSuccess: onClose });
    };

    return (
        <Modal open={open} onClose={onClose} title="Configuration Email SMTP">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Hôte SMTP" required error={errors.host}>
                        <Input value={data.host} onChange={(e) => setData('host', e.target.value)} placeholder="smtp.gmail.com" required />
                    </FormField>
                    <FormField label="Port" required error={errors.port}>
                        <select value={data.port} onChange={(e) => setData('port', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 outline-none">
                            <option value="587">587 (TLS recommandé)</option>
                            <option value="465">465 (SSL)</option>
                            <option value="25">25 (sans chiffrement)</option>
                        </select>
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Identifiant (login)" error={errors.username}>
                        <Input value={data.username} onChange={(e) => setData('username', e.target.value)} placeholder="votre@email.com" />
                    </FormField>
                    <FormField label="Mot de passe" hint="Laissez vide pour conserver le mot de passe actuel" error={errors.password}>
                        <PasswordInput value={data.password} onChange={(e) => setData('password', e.target.value)} placeholder="••••••••" />
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Email expéditeur" required error={errors.from_email}>
                        <Input type="email" value={data.from_email} onChange={(e) => setData('from_email', e.target.value)} placeholder="noreply@organisation.ci" required />
                    </FormField>
                    <FormField label="Nom expéditeur" error={errors.from_name}>
                        <Input value={data.from_name} onChange={(e) => setData('from_name', e.target.value)} placeholder="Mon Organisation" />
                    </FormField>
                </div>

                {testResult && <TestResult result={testResult} />}

                <div className="flex items-center justify-between pt-2">
                    <button type="button" onClick={handleTest} disabled={testing || !data.host}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition flex items-center gap-2">
                        {testing ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Test…</> : '🔌 Tester la connexion'}
                    </button>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Annuler</button>
                        <button type="submit" disabled={processing} className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition">Enregistrer</button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

// ─── WhatsApp Modal ────────────────────────────────────────────────────────────

function WhatsappModal({ open, onClose, config }) {
    const { data, setData, post, processing, errors } = useForm({
        phone_number_id:   config?.phone_number_id || '',
        access_token:      '',
        waba_id:           config?.waba_id || '',
        webhook_verify:    config?.webhook_verify || '',
    });

    return (
        <Modal open={open} onClose={onClose} title="Configuration WhatsApp Business">
            <form onSubmit={(e) => { e.preventDefault(); post(route('parametres.integrations.update', 'whatsapp'), { onSuccess: onClose }); }} className="space-y-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-300">
                    Obtenez ces informations sur <strong>developers.facebook.com</strong> &gt; WhatsApp &gt; Votre application.
                </div>
                <FormField label="Phone Number ID" required error={errors.phone_number_id}>
                    <Input value={data.phone_number_id} onChange={(e) => setData('phone_number_id', e.target.value)} placeholder="1234567890" required />
                </FormField>
                <FormField label="Access Token" hint="Laissez vide pour conserver le token actuel" error={errors.access_token}>
                    <PasswordInput value={data.access_token} onChange={(e) => setData('access_token', e.target.value)} placeholder="EAAxxxxxx…" />
                </FormField>
                <FormField label="WhatsApp Business Account ID" error={errors.waba_id}>
                    <Input value={data.waba_id} onChange={(e) => setData('waba_id', e.target.value)} placeholder="WABA ID" />
                </FormField>
                <FormField label="Webhook Verify Token" hint="Token de vérification pour votre webhook" error={errors.webhook_verify}>
                    <Input value={data.webhook_verify} onChange={(e) => setData('webhook_verify', e.target.value)} placeholder="mon_token_secret" />
                </FormField>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Annuler</button>
                    <button type="submit" disabled={processing} className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition">Enregistrer</button>
                </div>
            </form>
        </Modal>
    );
}

// ─── S3 Modal ─────────────────────────────────────────────────────────────────

function S3Modal({ open, onClose, config }) {
    const { data, setData, post, processing, errors } = useForm({
        driver:            config?.driver || 's3',
        key:               config?.key || '',
        secret:            '',
        region:            config?.region || 'eu-west-1',
        bucket:            config?.bucket || '',
        endpoint:          config?.endpoint || '',
    });

    return (
        <Modal open={open} onClose={onClose} title="Configuration Stockage Cloud (S3)">
            <form onSubmit={(e) => { e.preventDefault(); post(route('parametres.integrations.update', 's3'), { onSuccess: onClose }); }} className="space-y-4">
                <FormField label="Fournisseur">
                    <select value={data.driver} onChange={(e) => setData('driver', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 outline-none">
                        <option value="s3">Amazon S3</option>
                        <option value="minio">MinIO (auto-hébergé)</option>
                        <option value="scaleway">Scaleway Object Storage</option>
                        <option value="digitalocean">DigitalOcean Spaces</option>
                    </select>
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Access Key" required error={errors.key}>
                        <Input value={data.key} onChange={(e) => setData('key', e.target.value)} placeholder="AKIAIOSFODNN7EXAMPLE" required />
                    </FormField>
                    <FormField label="Secret Key" hint="Laissez vide pour conserver la clé actuelle" error={errors.secret}>
                        <PasswordInput value={data.secret} onChange={(e) => setData('secret', e.target.value)} placeholder="••••••••" />
                    </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Région" error={errors.region}>
                        <Input value={data.region} onChange={(e) => setData('region', e.target.value)} placeholder="eu-west-1" />
                    </FormField>
                    <FormField label="Bucket" required error={errors.bucket}>
                        <Input value={data.bucket} onChange={(e) => setData('bucket', e.target.value)} placeholder="mon-bucket-secretis" required />
                    </FormField>
                </div>
                {data.driver !== 's3' && (
                    <FormField label="Endpoint URL" hint="URL de votre serveur S3 compatible (ex : https://s3.fr-par.scw.cloud)" error={errors.endpoint}>
                        <Input value={data.endpoint} onChange={(e) => setData('endpoint', e.target.value)} placeholder="https://…" />
                    </FormField>
                )}
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Annuler</button>
                    <button type="submit" disabled={processing} className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition">Enregistrer</button>
                </div>
            </form>
        </Modal>
    );
}

// ─── Google Calendar Modal ────────────────────────────────────────────────────

function GoogleCalendarModal({ open, onClose, config }) {
    const handleConnect = () => {
        window.location.href = route('parametres.integrations.google-oauth');
    };

    return (
        <Modal open={open} onClose={onClose} title="Google Calendar — Connexion">
            <div className="space-y-5">
                {config?.connected ? (
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">✅</span>
                            <div>
                                <p className="text-sm font-medium text-green-700 dark:text-green-300">Connecté</p>
                                <p className="text-xs text-green-600 dark:text-green-400">Compte : {config.google_email}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center space-y-3">
                        <span className="text-4xl">🗓</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Connectez votre compte Google pour synchroniser l'agenda SECRETIS avec Google Calendar.
                        </p>
                        <button onClick={handleConnect}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-5 w-5" />
                            Se connecter avec Google
                        </button>
                    </div>
                )}

                {config?.connected && (
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Direction de synchronisation</label>
                        <div className="space-y-2">
                            {[
                                { value: 'bidirectional', label: '↔ Bidirectionnelle (recommandé)' },
                                { value: 'to_google',     label: '→ SECRETIS vers Google seulement' },
                                { value: 'from_google',   label: '← Google vers SECRETIS seulement' },
                            ].map(opt => (
                                <label key={opt.value} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-purple-400 transition">
                                    <input type="radio" name="sync_direction" value={opt.value} defaultChecked={config.sync_direction === opt.value}
                                        className="text-purple-600 focus:ring-purple-500" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                                </label>
                            ))}
                        </div>
                        <button onClick={() => router.delete(route('parametres.integrations.disconnect', 'google_calendar'), { onSuccess: onClose })}
                            className="text-sm text-red-600 dark:text-red-400 hover:underline">
                            Déconnecter Google Calendar
                        </button>
                    </div>
                )}

                <div className="flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Fermer</button>
                </div>
            </div>
        </Modal>
    );
}

// ─── SARA AI Modal ────────────────────────────────────────────────────────────

function SaraModal({ open, onClose, config }) {
    const [provider, setProvider] = useState(config?.provider || 'groq');
    const [testResult, setTestResult] = useState(null);
    const [testing, setTesting]       = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        provider:    config?.provider || 'groq',
        api_key:     '',
        model:       config?.model || '',
        temperature: config?.temperature ?? 0.7,
        max_tokens:  config?.max_tokens ?? 2048,
    });

    const selectedProvider = AI_PROVIDERS.find(p => p.value === data.provider);

    const handleProviderChange = (val) => {
        setProvider(val);
        setData(d => ({ ...d, provider: val, model: AI_PROVIDERS.find(p => p.value === val)?.models[0] || '' }));
        setTestResult(null);
    };

    const handleTest = async () => {
        if (!data.api_key) {
            setTestResult({ success: false, message: 'Veuillez saisir votre clé API avant de tester.' });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(route('parametres.integrations.test-ai'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content },
                body: JSON.stringify({ provider: data.provider, api_key: data.api_key, model: data.model }),
            });
            const json = await res.json();
            setTestResult(json);
        } catch {
            setTestResult({ success: false, message: 'Erreur réseau lors du test.' });
        }
        setTesting(false);
    };

    return (
        <Modal open={open} onClose={onClose} title="Configuration IA — SARA">
            <form onSubmit={(e) => { e.preventDefault(); post(route('parametres.integrations.update', 'sara'), { onSuccess: onClose }); }} className="space-y-5">

                {/* Provider Selector */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fournisseur IA</label>
                    <div className="grid grid-cols-3 gap-3">
                        {AI_PROVIDERS.map(p => (
                            <button
                                key={p.value}
                                type="button"
                                onClick={() => handleProviderChange(p.value)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition
                                    ${data.provider === p.value
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <span className="text-2xl">{p.logo}</span>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{p.label}</span>
                            </button>
                        ))}
                    </div>
                    {selectedProvider?.hint && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{selectedProvider.hint}</p>
                    )}
                </div>

                {/* API Key */}
                <FormField
                    label="Clé API"
                    required
                    hint="La clé est chiffrée avant stockage et n'est jamais affichée en clair ni journalisée."
                    error={errors.api_key}
                >
                    <PasswordInput
                        value={data.api_key}
                        onChange={(e) => setData('api_key', e.target.value)}
                        placeholder={config?.has_key ? '••••••• (clé configurée, laissez vide pour conserver)' : 'sk-…'}
                    />
                </FormField>

                {/* Model */}
                <FormField label="Modèle" required error={errors.model}>
                    <select
                        value={data.model}
                        onChange={(e) => setData('model', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 outline-none"
                    >
                        {selectedProvider?.models.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </FormField>

                {/* Parameters */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField label={`Température : ${data.temperature}`} hint="0 = déterministe, 1 = créatif">
                        <input type="range" min="0" max="1" step="0.1" value={data.temperature}
                            onChange={(e) => setData('temperature', parseFloat(e.target.value))}
                            className="w-full accent-blue-600" />
                    </FormField>
                    <FormField label="Max tokens" hint="Longueur maximale des réponses">
                        <input type="number" min="256" max="8192" step="256" value={data.max_tokens}
                            onChange={(e) => setData('max_tokens', parseInt(e.target.value))}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 outline-none" />
                    </FormField>
                </div>

                {/* Test Result */}
                {testResult && <TestResult result={testResult} />}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                    <button type="button" onClick={handleTest} disabled={testing}
                        className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition flex items-center gap-2">
                        {testing ? <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg> Test…</> : '🧪 Tester la connexion'}
                    </button>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">Annuler</button>
                        <button type="submit" disabled={processing} className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition">Enregistrer</button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({ integration, config, onConfigure }) {
    const isConfigured = config?.configured;

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-2xl border p-5 flex items-start gap-4 transition hover:shadow-md
            ${isConfigured
                ? 'border-gray-200 dark:border-gray-800'
                : 'border-dashed border-gray-300 dark:border-gray-700'
            }`}
        >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">
                {integration.icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{integration.label}</h3>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium
                        ${isConfigured
                            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {isConfigured ? 'Configuré' : 'Non configuré'}
                    </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{integration.description}</p>
                {isConfigured && config?.last_test && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Dernier test : {config.last_test}
                    </p>
                )}
            </div>
            <button
                onClick={() => onConfigure(integration.id)}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
                {isConfigured ? 'Modifier' : 'Configurer'}
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Integrations({ configs = {}, flash }) {
    const [activeModal, setActiveModal] = useState(null);

    const categories = [...new Set(INTEGRATIONS.map(i => i.category))];

    const MODAL_MAP = {
        smtp:            SmtpModal,
        whatsapp:        WhatsappModal,
        s3:              S3Modal,
        google_calendar: GoogleCalendarModal,
        sara:            SaraModal,
    };

    const ActiveModal = activeModal ? MODAL_MAP[activeModal] : null;

    return (
        <AppLayout title="Paramètres — Intégrations">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Intégrations</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Connectez IBIG SECRETIS à vos outils externes. Les clés API sont chiffrées et jamais journalisées.
                    </p>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Cards par catégorie */}
                {categories.map(cat => (
                    <div key={cat} className="space-y-3">
                        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">{cat}</h2>
                        <div className="space-y-3">
                            {INTEGRATIONS.filter(i => i.category === cat).map(integration => (
                                <IntegrationCard
                                    key={integration.id}
                                    integration={integration}
                                    config={configs[integration.id]}
                                    onConfigure={setActiveModal}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {/* Security notice */}
                <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-300 space-y-1">
                    <p className="font-semibold">🔒 Sécurité des credentials</p>
                    <p>Toutes les clés API et mots de passe sont chiffrés avec AES-256 avant stockage. Ils ne sont jamais affichés en clair dans les logs, les exports ou les emails. Seul le système interne peut les déchiffrer au moment de leur utilisation.</p>
                </div>

            </div>

            {/* Active Modal */}
            {ActiveModal && (
                <ActiveModal
                    open={!!activeModal}
                    onClose={() => setActiveModal(null)}
                    config={configs[activeModal] || {}}
                />
            )}
        </AppLayout>
    );
}
export { Integrations };
