import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, CardHeader, CardContent, Button, Input, Badge, Alert } from '@/Components/UI';
import {
    ShieldCheck, ShieldX, AlertTriangle, RefreshCw,
    Users, Calendar, Star, ExternalLink, Key, Copy, CheckCircle2
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';

// =============================================================================
// Page Informations de Licence On-Premise
// =============================================================================
export default function LicenseInfo({ license: initialLicense }) {
    const [license, setLicense]           = useState(initialLicense);
    const [newKey, setNewKey]             = useState('');
    const [activating, setActivating]     = useState(false);
    const [checking, setChecking]         = useState(false);
    const [activationError, setActivationError] = useState(null);
    const [activationSuccess, setActivationSuccess] = useState(false);
    const [copied, setCopied]             = useState(false);

    // -------------------------------------------------------------------------
    const handleActivate = async (e) => {
        e.preventDefault();
        setActivating(true);
        setActivationError(null);
        setActivationSuccess(false);

        try {
            const { data } = await axios.post(route('admin.license.activate'), {
                license_key: newKey.trim(),
            });
            setLicense(data.data);
            setActivationSuccess(true);
            setNewKey('');
        } catch (err) {
            setActivationError(
                err.response?.data?.error || 'Erreur lors de l\'activation. Vérifiez la clé.'
            );
        } finally {
            setActivating(false);
        }
    };

    const handleCheck = async () => {
        setChecking(true);
        try {
            const { data } = await axios.get(route('admin.license.check'));
            setLicense(data.data);
        } catch {
            // silencieux
        } finally {
            setChecking(false);
        }
    };

    const copyLicenseKey = () => {
        if (license?.raw_key) {
            navigator.clipboard.writeText(license.raw_key).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    // -------------------------------------------------------------------------
    const daysUntilExpiry = license?.valid_until
        ? differenceInDays(parseISO(license.valid_until), new Date())
        : null;

    const userPct = license?.user_usage_pct ?? 0;

    const statusColor = () => {
        if (!license?.valid) return 'destructive';
        if (license?.in_grace_period) return 'destructive';
        if (license?.expiring_soon) return 'warning';
        return 'success';
    };

    const StatusIcon = license?.valid
        ? (license?.in_grace_period || license?.expiring_soon ? AlertTriangle : ShieldCheck)
        : ShieldX;

    // -------------------------------------------------------------------------
    return (
        <AdminLayout>
            <Head title="Licence On-Premise — SECRETIS" />

            <div className="max-w-4xl mx-auto space-y-6 p-6">

                {/* ---- En-tête ---- */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Licence On-Premise
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Gestion et informations de votre licence SECRETIS ERP
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleCheck}
                        disabled={checking}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                        Vérifier
                    </Button>
                </div>

                {/* ---- Alerte expiration ---- */}
                {license?.warning && (
                    <Alert variant={license.in_grace_period ? 'danger' : 'warning'}>
                        <AlertTriangle className="h-4 w-4" />
                        <div className="flex items-center justify-between">
                            <span>{license.warning}</span>
                            <a
                                href={license.renewal_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-4 inline-flex items-center gap-1 underline font-medium"
                            >
                                Renouveler <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </Alert>
                )}

                {/* ---- Carte statut principal ---- */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                                license?.valid
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                                <StatusIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">
                                    {license?.valid ? 'Licence active' : 'Licence invalide'}
                                </h2>
                                {license?.organization && (
                                    <p className="text-sm text-gray-500">{license.organization}</p>
                                )}
                            </div>
                            {license?.valid && (
                                <Badge
                                    variant={statusColor()}
                                    className="ml-auto capitalize"
                                >
                                    {license.license_type}
                                </Badge>
                            )}
                        </div>
                    </CardHeader>

                    {license?.valid ? (
                        <CardContent className="space-y-6">

                            {/* Grille d'informations */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                                {/* Expiration */}
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs font-medium uppercase tracking-wide">Expiration</span>
                                    </div>
                                    <p className="text-lg font-semibold">{license.valid_until_human}</p>
                                    {daysUntilExpiry !== null && (
                                        <p className={`text-xs mt-1 ${
                                            daysUntilExpiry < 0 ? 'text-red-500' :
                                            daysUntilExpiry < 30 ? 'text-amber-500' :
                                            'text-gray-400'
                                        }`}>
                                            {daysUntilExpiry < 0
                                                ? `Expirée il y a ${Math.abs(daysUntilExpiry)}j`
                                                : `Dans ${daysUntilExpiry} jours`}
                                        </p>
                                    )}
                                </div>

                                {/* Utilisateurs */}
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <Users className="w-4 h-4" />
                                        <span className="text-xs font-medium uppercase tracking-wide">Utilisateurs</span>
                                    </div>
                                    <p className="text-lg font-semibold">
                                        {license.active_users}
                                        <span className="text-sm text-gray-400 font-normal">
                                            {license.max_users === -1 ? ' / ∞' : ` / ${license.max_users}`}
                                        </span>
                                    </p>
                                    {license.max_users > 0 && (
                                        <>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                                <div
                                                    className="h-full rounded-full bg-purple-600 transition-all"
                                                    style={{ width: `${Math.min(100, Math.max(0, userPct))}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">{userPct}% utilisé</p>
                                        </>
                                    )}
                                </div>

                                {/* Émission */}
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-gray-500 mb-1">
                                        <Key className="w-4 h-4" />
                                        <span className="text-xs font-medium uppercase tracking-wide">Émission</span>
                                    </div>
                                    <p className="text-lg font-semibold">
                                        {license.issued_at
                                            ? format(parseISO(license.issued_at), 'dd/MM/yyyy', { locale: fr })
                                            : '—'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Vérifiée le{' '}
                                        {license.validated_at
                                            ? format(parseISO(license.validated_at), 'dd/MM HH:mm', { locale: fr })
                                            : '—'}
                                    </p>
                                </div>
                            </div>

                            {/* Fonctionnalités */}
                            <div>
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
                                    <Star className="w-4 h-4" />
                                    <span className="text-sm font-medium">Fonctionnalités incluses</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(license.features ?? []).map((feature) => (
                                        <Badge key={feature} variant="secondary" className="gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                            {feature}
                                        </Badge>
                                    ))}
                                    {(license.features ?? []).length === 0 && (
                                        <span className="text-sm text-gray-400">Aucune fonctionnalité listée</span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyLicenseKey}
                                    className="gap-2"
                                >
                                    {copied
                                        ? <><CheckCircle2 className="w-4 h-4 text-green-500" /> Copié !</>
                                        : <><Copy className="w-4 h-4" /> Copier la clé</>
                                    }
                                </Button>
                                <a
                                    href={license.renewal_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button variant="secondary" size="sm" className="gap-2">
                                        <ExternalLink className="w-4 h-4" />
                                        Portail IBIG Soft
                                    </Button>
                                </a>
                            </div>
                        </CardContent>
                    ) : (
                        <CardContent>
                            <p className="text-red-600 dark:text-red-400 text-sm">
                                {license?.error ?? 'La licence n\'est pas configurée.'}
                            </p>
                        </CardContent>
                    )}
                </Card>

                {/* ---- Activation d'une nouvelle clé ---- */}
                <Card>
                    <CardHeader>
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Activer une nouvelle clé de licence
                        </h2>
                    </CardHeader>
                    <CardContent>
                        {activationSuccess && (
                            <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-900/20">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <div className="text-green-700 dark:text-green-300">
                                    Licence activée avec succès !
                                </div>
                            </Alert>
                        )}

                        {activationError && (
                            <Alert variant="danger" className="mb-4">
                                <AlertTriangle className="h-4 w-4" />
                                <div>{activationError}</div>
                            </Alert>
                        )}

                        <form onSubmit={handleActivate} className="flex gap-3">
                            <Input
                                value={newKey}
                                onChange={(e) => setNewKey(e.target.value)}
                                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                                className="flex-1 font-mono text-sm"
                                disabled={activating}
                            />
                            <Button type="submit" disabled={activating || !newKey.trim()}>
                                {activating ? (
                                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Activation...</>
                                ) : (
                                    'Activer'
                                )}
                            </Button>
                        </form>

                        <p className="text-xs text-gray-400 mt-2">
                            Clé fournie par IBIG Soft lors de votre achat.
                            Contactez <a href="mailto:license@ibigsoft.com" className="underline">license@ibigsoft.com</a> pour obtenir ou renouveler une licence.
                        </p>
                    </CardContent>
                </Card>

            </div>
        </AdminLayout>
    );
}
export { LicenseInfo };
