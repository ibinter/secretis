import { useState, useEffect } from 'react';
import {
    ArchiveBoxIcon,
    ShieldCheckIcon,
    ShieldExclamationIcon,
    ArrowDownTrayIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    CalendarDaysIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';

/**
 * ArchiveView — Vue des archives légales
 *
 * Fonctionnalités :
 *   - Liste des documents archivés avec dates d'archivage et d'expiration
 *   - Filtres par catégorie et période
 *   - Barre de progression vers la date d'expiration
 *   - Bouton "Récupérer" (URL temporaire)
 *   - Vérification d'intégrité (icône cadenas vert/rouge)
 *   - Export CSV du registre
 */

const CATEGORIES = [
    { value: '', label: 'Toutes les catégories' },
    { value: 'CONTRAT',      label: 'Contrat' },
    { value: 'FACTURE',      label: 'Facture' },
    { value: 'COURRIER',     label: 'Courrier' },
    { value: 'RAPPORT',      label: 'Rapport' },
    { value: 'PV_REUNION',   label: 'PV Réunion' },
    { value: 'FICHE_RH',     label: 'Fiche RH' },
    { value: 'BON_COMMANDE', label: 'Bon de commande' },
    { value: 'DEVIS',        label: 'Devis' },
    { value: 'DECISION',     label: 'Décision' },
    { value: 'AUTRE',        label: 'Autre' },
];

function RetentionBar({ archiveDate, expiryDate }) {
    const start   = new Date(archiveDate).getTime();
    const end     = new Date(expiryDate).getTime();
    const now     = Date.now();
    const total   = end - start;
    const elapsed = now - start;
    const pct     = Math.min(100, Math.max(0, (elapsed / total) * 100));

    const yearsLeft = Math.max(0, Math.round((end - now) / (365.25 * 24 * 3600 * 1000)));
    const isExpiringSoon = yearsLeft <= 1;
    const isExpired      = now > end;

    const barColor = isExpired ? 'bg-red-500'
        : isExpiringSoon ? 'bg-amber-500'
        : 'bg-green-500';

    const textColor = isExpired ? 'text-red-600'
        : isExpiringSoon ? 'text-amber-600'
        : 'text-gray-500';

    return (
        <div className="space-y-1">
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${barColor} rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className={`text-xs ${textColor}`}>
                {isExpired ? 'Expiré' : `Expire dans ${yearsLeft} an${yearsLeft > 1 ? 's' : ''}`}
                {' · '}{new Date(expiryDate).toLocaleDateString('fr-FR')}
            </p>
        </div>
    );
}

function IntegrityBadge({ verified, onVerify, verifying }) {
    if (verified === null || verified === undefined) {
        return (
            <button
                onClick={onVerify}
                disabled={verifying}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
            >
                <ShieldCheckIcon className="h-4 w-4" />
                {verifying ? 'Vérification…' : 'Vérifier'}
            </button>
        );
    }

    return verified ? (
        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <ShieldCheckIcon className="h-4 w-4" />
            Intègre
        </span>
    ) : (
        <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
            <ShieldExclamationIcon className="h-4 w-4" />
            Altéré !
        </span>
    );
}

export default function ArchiveView() {
    const [archives, setArchives]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [filterCat, setFilterCat]     = useState('');
    const [filterYear, setFilterYear]   = useState('');
    const [search, setSearch]           = useState('');
    const [retrieving, setRetrieving]   = useState(null);
    const [verifying, setVerifying]     = useState(null);
    const [integrities, setIntegrities] = useState({});
    const [exporting, setExporting]     = useState(false);
    const [page, setPage]               = useState(1);
    const PER_PAGE = 20;

    useEffect(() => {
        fetchArchives();
    }, [filterCat, filterYear]);

    async function fetchArchives() {
        setLoading(true);
        try {
            const res = await axios.get('/api/documents/archives', {
                params: { category: filterCat || undefined, year: filterYear || undefined },
            });
            setArchives(res.data?.data ?? res.data ?? []);
        } finally {
            setLoading(false);
        }
    }

    async function handleRetrieve(docId) {
        setRetrieving(docId);
        try {
            const res = await axios.post(`/api/documents/${docId}/archive/retrieve`);
            const url = res.data?.url;
            if (url) {
                window.open(url, '_blank');
            }
        } catch (e) {
            alert(e.response?.data?.message ?? 'Erreur lors de la récupération.');
        } finally {
            setRetrieving(null);
        }
    }

    async function handleVerify(docId) {
        setVerifying(docId);
        try {
            const res = await axios.post(`/api/documents/${docId}/archive/verify`);
            setIntegrities(prev => ({ ...prev, [docId]: res.data?.integrity ?? false }));
        } finally {
            setVerifying(null);
        }
    }

    async function exportCSV() {
        setExporting(true);
        try {
            const res = await axios.get('/api/documents/archives/export', {
                responseType: 'blob',
                params: { category: filterCat || undefined },
            });
            const url  = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href  = url;
            link.setAttribute('download', `registre-archives-${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } finally {
            setExporting(false);
        }
    }

    const filtered = archives.filter(a => {
        const title = (a.document?.title ?? '').toLowerCase();
        return title.includes(search.toLowerCase());
    });

    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const totalPages = Math.ceil(filtered.length / PER_PAGE);

    const years = [...new Set(archives.map(a => new Date(a.archive_date).getFullYear()))].sort((x, y) => y - x);

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Archives légales</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Registre OHADA des documents archivés — {archives.length} documents
                    </p>
                </div>
                <button
                    onClick={exportCSV}
                    disabled={exporting}
                    className="flex items-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    {exporting ? 'Export…' : 'Exporter CSV'}
                </button>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Rechercher un document…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <select
                    value={filterCat}
                    onChange={e => { setFilterCat(e.target.value); setPage(1); }}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>

                <select
                    value={filterYear}
                    onChange={e => { setFilterYear(e.target.value); setPage(1); }}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Toutes les années</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total archivés', value: archives.length, icon: ArchiveBoxIcon, color: 'text-indigo-600 bg-indigo-50' },
                    { label: 'Expirant dans 1 an', value: archives.filter(a => {
                        const d = new Date(a.expiry_date);
                        return d > new Date() && d < new Date(Date.now() + 365 * 24 * 3600 * 1000);
                    }).length, icon: CalendarDaysIcon, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Intégrité vérifiée', value: archives.filter(a => a.integrity_verified).length, icon: ShieldCheckIcon, color: 'text-green-600 bg-green-50' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${color}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                            <p className="text-xs text-gray-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Liste */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : paginated.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    <ArchiveBoxIcon className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <p>Aucun document archivé trouvé.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {paginated.map(archive => (
                        <div
                            key={archive.id}
                            className="rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                                    <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                                </div>

                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-start justify-between gap-2 flex-wrap">
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">
                                                {archive.document?.title ?? `Document #${archive.document_id}`}
                                            </p>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                {archive.category && (
                                                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                                        {archive.category.replace('_', ' ')}
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-500">
                                                    Archivé le {new Date(archive.archive_date).toLocaleDateString('fr-FR')}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {archive.retention_years} ans de conservation
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <IntegrityBadge
                                                verified={integrities[archive.document_id] ?? archive.integrity_verified ?? null}
                                                onVerify={() => handleVerify(archive.document_id)}
                                                verifying={verifying === archive.document_id}
                                            />
                                            <button
                                                onClick={() => handleRetrieve(archive.document_id)}
                                                disabled={retrieving === archive.document_id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-300 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                                            >
                                                <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                                {retrieving === archive.document_id ? 'Récupération…' : 'Récupérer'}
                                            </button>
                                        </div>
                                    </div>

                                    <RetentionBar
                                        archiveDate={archive.archive_date}
                                        expiryDate={archive.expiry_date}
                                    />

                                    <p className="text-xs text-gray-400 font-mono">
                                        SHA-256 : {archive.sha256_hash?.slice(0, 24)}…
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                    >
                        Précédent
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
                    >
                        Suivant
                    </button>
                </div>
            )}
        </div>
    );
}
export { ArchiveView };
