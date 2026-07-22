import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Cloud,
    Calendar,
    Video,
    FolderOpen,
    CheckCircle,
    XCircle,
    RefreshCw,
    LogOut,
    ExternalLink,
    AlertCircle,
    Loader2,
} from 'lucide-react';

/**
 * Microsoft365 — Page de gestion de l'intégration Microsoft 365
 *
 * Affiche :
 *  - Statut de connexion du compte Microsoft
 *  - Paramètres Outlook Calendar (sync bidirectionnel)
 *  - Paramètres Teams (création automatique)
 *  - Paramètres OneDrive (sync GED)
 */
export default function Microsoft365({ auth, microsoftStatus = null }) {
    const { flash } = usePage().props;
    const user = auth.user;

    // État local de la page
    const [syncing, setSyncing]       = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);
    const [settings, setSettings]     = useState({
        outlook_sync_enabled:   microsoftStatus?.outlook_sync  ?? false,
        teams_auto_create:      microsoftStatus?.teams_auto    ?? false,
        onedrive_sync_enabled:  microsoftStatus?.onedrive_sync ?? false,
        onedrive_folder_id:     microsoftStatus?.onedrive_folder_id ?? null,
    });

    const isConnected   = !!microsoftStatus?.connected;
    const microsoftEmail = microsoftStatus?.email ?? null;
    const microsoftId    = microsoftStatus?.microsoft_id ?? null;

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------

    const handleConnect = () => {
        window.location.href = route('integrations.outlook.auth');
    };

    const handleDisconnect = async () => {
        if (! window.confirm('Êtes-vous sûr de vouloir déconnecter votre compte Microsoft ? La synchronisation Outlook, Teams et OneDrive sera désactivée.')) {
            return;
        }

        router.delete(route('integrations.outlook.disconnect'), {
            onSuccess: () => {
                setSyncMessage({ type: 'success', text: 'Compte Microsoft déconnecté.' });
            },
        });
    };

    const handleSyncNow = async () => {
        setSyncing(true);
        setSyncMessage(null);

        try {
            const response = await fetch(route('integrations.outlook.sync'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });

            const data = await response.json();

            if (data.success) {
                setSyncMessage({ type: 'success', text: data.message });
            } else {
                setSyncMessage({ type: 'error', text: data.error });
            }
        } catch (error) {
            setSyncMessage({ type: 'error', text: 'Erreur réseau lors de la synchronisation.' });
        } finally {
            setSyncing(false);
        }
    };

    const toggleSetting = async (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));

        await fetch(route('parametres.integrations.update'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
            },
            body: JSON.stringify({ key, value }),
        });
    };

    // -------------------------------------------------------------------------
    // Composants UI
    // -------------------------------------------------------------------------

    const StatusBadge = ({ connected }) => (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
            connected
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        }`}>
            {connected
                ? <><CheckCircle className="w-4 h-4" /> Connecté</>
                : <><XCircle className="w-4 h-4" /> Non connecté</>
            }
        </span>
    );

    const Toggle = ({ checked, onChange, disabled = false }) => (
        <button
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                    transition duration-200 ease-in-out
                    ${checked ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    );

    const SectionCard = ({ icon: Icon, title, description, iconColor = 'text-blue-600', children }) => (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-700 ${iconColor}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                    </div>
                </div>
            </div>
            <div className="p-6 space-y-4">{children}</div>
        </div>
    );

    const SettingRow = ({ label, description, children }) => (
        <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                {description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                )}
            </div>
            <div className="flex-shrink-0">{children}</div>
        </div>
    );

    // -------------------------------------------------------------------------
    // Rendu principal
    // -------------------------------------------------------------------------

    return (
        <AuthenticatedLayout user={user} header="Intégration Microsoft 365">
            <Head title="Microsoft 365 — Intégrations" />

            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

                {/* Notifications flash */}
                {flash?.success && (
                    <div className="flex items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">{flash.error}</span>
                    </div>
                )}
                {syncMessage && (
                    <div className={`flex items-center gap-2 p-4 rounded-lg border text-sm ${
                        syncMessage.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                    }`}>
                        {syncMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {syncMessage.text}
                    </div>
                )}

                {/* ---- Statut de connexion ---- */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            {/* Logo Microsoft simplifié */}
                            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
                                <svg viewBox="0 0 21 21" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                                    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Microsoft 365
                                </h2>
                                {isConnected && microsoftEmail ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Connecté en tant que <span className="font-medium text-gray-700 dark:text-gray-300">{microsoftEmail}</span>
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Connectez votre compte pour activer Outlook, Teams et OneDrive
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <StatusBadge connected={isConnected} />

                            {isConnected ? (
                                <button
                                    onClick={handleDisconnect}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Déconnecter
                                </button>
                            ) : (
                                <button
                                    onClick={handleConnect}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
                                >
                                    <Cloud className="w-4 h-4" />
                                    Connecter avec Microsoft
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Scopes accordés */}
                    {isConnected && microsoftStatus?.scopes && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Permissions accordées :</p>
                            <div className="flex flex-wrap gap-2">
                                {microsoftStatus.scopes.map(scope => (
                                    <span key={scope} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-md font-mono">
                                        {scope}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ---- Outlook Calendar ---- */}
                <SectionCard
                    icon={Calendar}
                    title="Outlook Calendar"
                    description="Synchronisez vos événements SECRETIS avec votre calendrier Outlook"
                    iconColor="text-blue-600"
                >
                    <SettingRow
                        label="Synchronisation bidirectionnelle"
                        description="Les événements SECRETIS apparaissent dans Outlook, et vice versa"
                    >
                        <Toggle
                            checked={settings.outlook_sync_enabled}
                            onChange={val => toggleSetting('outlook_sync_enabled', val)}
                            disabled={!isConnected}
                        />
                    </SettingRow>

                    {isConnected && (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Dernière synchronisation : <span className="font-medium">{microsoftStatus?.last_sync ?? 'Jamais'}</span>
                                </p>
                            </div>
                            <button
                                onClick={handleSyncNow}
                                disabled={syncing}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
                            >
                                {syncing
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Synchronisation...</>
                                    : <><RefreshCw className="w-4 h-4" /> Synchroniser maintenant</>
                                }
                            </button>
                        </div>
                    )}

                    {!isConnected && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                            Connectez votre compte Microsoft pour activer la synchronisation Outlook.
                        </p>
                    )}
                </SectionCard>

                {/* ---- Microsoft Teams ---- */}
                <SectionCard
                    icon={Video}
                    title="Microsoft Teams"
                    description="Créez automatiquement des réunions Teams depuis SECRETIS"
                    iconColor="text-purple-600"
                >
                    <SettingRow
                        label="Créer automatiquement une réunion Teams"
                        description="Chaque nouvelle réunion SECRETIS génère un lien de réunion Teams"
                    >
                        <Toggle
                            checked={settings.teams_auto_create}
                            onChange={val => toggleSetting('teams_auto_create', val)}
                            disabled={!isConnected}
                        />
                    </SettingRow>

                    {settings.teams_auto_create && isConnected && (
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                            <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                                Les nouvelles réunions planifiées dans SECRETIS auront automatiquement un bouton
                                <strong> "Rejoindre sur Teams"</strong>.
                            </p>
                        </div>
                    )}

                    {!isConnected && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                            Connectez votre compte Microsoft pour activer l'intégration Teams.
                        </p>
                    )}
                </SectionCard>

                {/* ---- OneDrive ---- */}
                <SectionCard
                    icon={FolderOpen}
                    title="OneDrive"
                    description="Synchronisez vos documents SECRETIS avec OneDrive"
                    iconColor="text-cyan-600"
                >
                    <SettingRow
                        label="Synchronisation OneDrive"
                        description="Les documents importés depuis OneDrive apparaissent dans la GED SECRETIS"
                    >
                        <Toggle
                            checked={settings.onedrive_sync_enabled}
                            onChange={val => toggleSetting('onedrive_sync_enabled', val)}
                            disabled={!isConnected}
                        />
                    </SettingRow>

                    {settings.onedrive_sync_enabled && isConnected && (
                        <SettingRow
                            label="Dossier OneDrive de synchronisation"
                            description="Dossier OneDrive à synchroniser (vide = racine de votre OneDrive)"
                        >
                            <input
                                type="text"
                                placeholder="Identifiant du dossier (optionnel)"
                                value={settings.onedrive_folder_id ?? ''}
                                onChange={e => {
                                    const val = e.target.value || null;
                                    setSettings(prev => ({ ...prev, onedrive_folder_id: val }));
                                    toggleSetting('onedrive_folder_id', val);
                                }}
                                className="w-64 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </SettingRow>
                    )}

                    {isConnected && (
                        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <a
                                href={route('integrations.onedrive.files')}
                                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Parcourir mes fichiers OneDrive
                            </a>
                        </div>
                    )}

                    {!isConnected && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                            Connectez votre compte Microsoft pour activer la synchronisation OneDrive.
                        </p>
                    )}
                </SectionCard>

                {/* ---- Aide ---- */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Configuration requise
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                L'intégration Microsoft 365 nécessite une application Azure AD configurée par votre administrateur.
                                Consultez le{' '}
                                <a href="/docs/microsoft-365-integration" className="text-blue-600 dark:text-blue-400 hover:underline">
                                    guide de configuration Microsoft 365
                                </a>{' '}
                                pour les étapes détaillées.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
