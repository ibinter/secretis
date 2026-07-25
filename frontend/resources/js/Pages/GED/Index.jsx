import { useState, useCallback, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    FolderIcon,
    FolderOpenIcon,
    DocumentIcon,
    ArrowUpTrayIcon,
    PlusIcon,
    MagnifyingGlassIcon,
    EllipsisVerticalIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    ShareIcon,
    ArrowRightCircleIcon,
    ChevronRightIcon,
    Squares2X2Icon,
    ListBulletIcon,
    XMarkIcon,
    CheckIcon,
    LockClosedIcon,
    DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { FolderIcon as FolderSolidIcon } from '@heroicons/react/24/solid';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const ACCESS_LEVEL_CONFIG = {
    public:        { label: 'Public',         color: 'bg-green-100 text-green-700 border-green-200' },
    internal:      { label: 'Interne',        color: 'bg-purple-100 text-purple-700 border-purple-200' },
    confidential:  { label: 'Confidentiel',   color: 'bg-orange-100 text-orange-700 border-orange-200' },
    top_secret:    { label: 'Secret',         color: 'bg-red-100 text-red-700 border-red-200' },
};

const FILE_ICON_COLORS = {
    'application/pdf':     'text-red-500',
    'application/msword':  'text-purple-500',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'text-purple-500',
    'application/vnd.ms-excel': 'text-green-500',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'text-green-500',
    'image/jpeg':          'text-purple-500',
    'image/png':           'text-purple-500',
};

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Badge confidentialité
// ---------------------------------------------------------------------------

function AccessBadge({ level }) {
    const config = ACCESS_LEVEL_CONFIG[level] || ACCESS_LEVEL_CONFIG.internal;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.color}`}>
            {level === 'top_secret' && <LockClosedIcon className="h-3 w-3" />}
            {config.label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Arborescence dossiers (panneau gauche)
// ---------------------------------------------------------------------------

function FolderTreeItem({ folder, currentFolderId, onSelect, depth = 0 }) {
    const [expanded, setExpanded] = useState(
        currentFolderId === folder.id || folder.children?.some(c => c.id === currentFolderId)
    );
    const isActive   = currentFolderId === folder.id;
    const hasChildren = folder.children?.length > 0;

    return (
        <div>
            <div
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                    isActive
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
                onClick={() => { onSelect(folder.id); if (hasChildren) setExpanded(v => !v); }}
            >
                {hasChildren ? (
                    <ChevronRightIcon
                        className={`h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                    />
                ) : (
                    <span className="h-3.5 w-3.5" />
                )}

                {expanded && isActive
                    ? <FolderOpenIcon className="h-4 w-4 flex-shrink-0 text-purple-500" />
                    : <FolderIcon className="h-4 w-4 flex-shrink-0 text-yellow-500" />
                }

                <span className="truncate">{folder.name}</span>

                {folder.documents_count > 0 && (
                    <span className="ml-auto flex-shrink-0 rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600">
                        {folder.documents_count}
                    </span>
                )}
            </div>

            {expanded && hasChildren && (
                <div>
                    {folder.children.map(child => (
                        <FolderTreeItem
                            key={child.id}
                            folder={child}
                            currentFolderId={currentFolderId}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Modal nouveau dossier
// ---------------------------------------------------------------------------

function NewFolderModal({ parentId, onClose, onCreated }) {
    const [name, setName]               = useState('');
    const [accessLevel, setAccessLevel] = useState('internal');
    const [loading, setLoading]         = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);

        try {
            await router.post('/api/ged/folders', {
                name:         name.trim(),
                parent_id:    parentId,
                access_level: accessLevel,
            }, { onSuccess: onCreated });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Nouveau dossier</h2>
                    <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom du dossier</label>
                        <input
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            placeholder="Ex : Contrats 2026"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Niveau de confidentialité</label>
                        <select
                            value={accessLevel}
                            onChange={e => setAccessLevel(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                            <option value="public">Public</option>
                            <option value="internal">Interne</option>
                            <option value="confidential">Confidentiel</option>
                            <option value="top_secret">Secret</option>
                        </select>
                    </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Annuler
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim() || loading}
                        className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
                    >
                        {loading && <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>}
                        Créer
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Menu contextuel document
// ---------------------------------------------------------------------------

function DocumentMenu({ document, onDownload, onPreview, onShare, onMove }) {
    return (
        <div className="absolute right-0 top-7 z-20 w-48 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
            <button
                onClick={() => onPreview(document)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
                <EyeIcon className="h-4 w-4 text-gray-400" />
                Prévisualiser
            </button>
            <button
                onClick={() => onDownload(document)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
                <ArrowDownTrayIcon className="h-4 w-4 text-gray-400" />
                Télécharger
            </button>
            <button
                onClick={() => onShare(document)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
                <ShareIcon className="h-4 w-4 text-gray-400" />
                Partager
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
                onClick={() => onMove(document)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
                <ArrowRightCircleIcon className="h-4 w-4 text-gray-400" />
                Déplacer
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Carte document (vue grille)
// ---------------------------------------------------------------------------

function DocumentCard({ document, onDownload, onPreview, onShare, onMove }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const iconColor = FILE_ICON_COLORS[document.mime_type] || 'text-gray-400';

    return (
        <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
            {/* Icône fichier */}
            <div className="mb-3 flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 ${iconColor}`}>
                    <DocumentIcon className="h-7 w-7" />
                </div>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(v => !v)}
                        className="rounded p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700"
                    >
                        <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>

                    {menuOpen && (
                        <DocumentMenu
                            document={document}
                            onDownload={(d) => { setMenuOpen(false); onDownload(d); }}
                            onPreview={(d) => { setMenuOpen(false); onPreview(d); }}
                            onShare={(d) => { setMenuOpen(false); onShare(d); }}
                            onMove={(d) => { setMenuOpen(false); onMove(d); }}
                        />
                    )}
                </div>
            </div>

            {/* Titre */}
            <p className="mb-1 line-clamp-2 text-sm font-medium text-gray-800" title={document.title}>
                {document.title}
            </p>

            {/* Méta */}
            <div className="mt-auto space-y-2">
                <div className="flex items-center justify-between">
                    <AccessBadge level={document.access_level} />
                    {document.current_version > 1 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                            <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                            v{document.current_version}
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatBytes(document.file_size)}</span>
                    <span>{formatDate(document.updated_at)}</span>
                </div>

                {document.author && (
                    <p className="truncate text-xs text-gray-400">{document.author.name}</p>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Ligne document (vue liste)
// ---------------------------------------------------------------------------

function DocumentRow({ document, onDownload, onPreview, onShare, onMove }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const iconColor = FILE_ICON_COLORS[document.mime_type] || 'text-gray-400';

    return (
        <tr className="group border-b border-gray-100 hover:bg-gray-50">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <DocumentIcon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">{document.title}</p>
                        {document.folder && (
                            <p className="text-xs text-gray-400">{document.folder.name}</p>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <AccessBadge level={document.access_level} />
            </td>
            <td className="px-4 py-3 text-xs text-gray-500">{document.author?.name || '—'}</td>
            <td className="px-4 py-3 text-xs text-gray-500">{formatBytes(document.file_size)}</td>
            <td className="px-4 py-3 text-xs text-gray-500">{formatDate(document.updated_at)}</td>
            <td className="px-4 py-3 text-xs text-gray-500">
                {document.current_version > 1 && (
                    <span className="flex items-center gap-1">
                        <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                        v{document.current_version}
                    </span>
                )}
            </td>
            <td className="px-4 py-3">
                <div className="relative flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onPreview(document)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Prévisualiser">
                        <EyeIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDownload(document)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Télécharger">
                        <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                    <div className="relative">
                        <button onClick={() => setMenuOpen(v => !v)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                            <EllipsisVerticalIcon className="h-4 w-4" />
                        </button>
                        {menuOpen && (
                            <DocumentMenu
                                document={document}
                                onDownload={(d) => { setMenuOpen(false); onDownload(d); }}
                                onPreview={(d) => { setMenuOpen(false); onPreview(d); }}
                                onShare={(d) => { setMenuOpen(false); onShare(d); }}
                                onMove={(d) => { setMenuOpen(false); onMove(d); }}
                            />
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
}

// ---------------------------------------------------------------------------
// Modal prévisualisation
// ---------------------------------------------------------------------------

function PreviewModal({ document, onClose }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading]       = useState(true);

    useState(() => {
        fetch(`/api/ged/documents/${document.id}/preview`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        })
            .then(r => r.json())
            .then(data => { setPreviewUrl(data.preview_url); setLoading(false); })
            .catch(() => setLoading(false));
    }, [document.id]);

    const isPdf   = document.mime_type === 'application/pdf';
    const isImage = document.mime_type?.startsWith('image/');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-gray-900">{document.title}</h2>
                        <p className="text-xs text-gray-400">{formatBytes(document.file_size)} — v{document.current_version}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={`/api/ged/documents/${document.id}/download`}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Télécharger
                        </a>
                        <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Contenu */}
                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <svg className="h-8 w-8 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                        </div>
                    ) : previewUrl && isPdf ? (
                        <iframe src={previewUrl} className="h-full w-full" title={document.title} />
                    ) : previewUrl && isImage ? (
                        <div className="flex h-full items-center justify-center bg-gray-100 p-4">
                            <img src={previewUrl} alt={document.title} className="max-h-full max-w-full rounded object-contain shadow-lg" />
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
                            <DocumentIcon className="h-16 w-16" />
                            <p className="text-sm">Prévisualisation non disponible pour ce type de fichier.</p>
                            <a
                                href={`/api/ged/documents/${document.id}/download`}
                                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                            >
                                Télécharger le fichier
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Modal partage
// ---------------------------------------------------------------------------

function ShareModal({ document, onClose }) {
    const [hours, setHours]   = useState(24);
    const [shareUrl, setShareUrl] = useState(null);
    const [loading, setLoading]   = useState(false);
    const [copied, setCopied]     = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/ged/documents/${document.id}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ expires_in_hours: hours }),
            });
            const data = await res.json();
            setShareUrl(data.share_url);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Partager le document</h2>
                    <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <p className="mb-4 text-sm text-gray-500 truncate">{document.title}</p>

                <div className="mb-4">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Durée de validité du lien</label>
                    <select
                        value={hours}
                        onChange={e => setHours(Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none"
                    >
                        <option value={1}>1 heure</option>
                        <option value={6}>6 heures</option>
                        <option value={24}>24 heures</option>
                        <option value={48}>48 heures</option>
                        <option value={168}>7 jours</option>
                    </select>
                </div>

                {shareUrl ? (
                    <div className="mb-4">
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Lien de partage</label>
                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={shareUrl}
                                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700"
                            />
                            <button
                                onClick={handleCopy}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                    copied ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                }`}
                            >
                                {copied ? <CheckIcon className="h-4 w-4" /> : null}
                                {copied ? 'Copié !' : 'Copier'}
                            </button>
                        </div>
                    </div>
                ) : null}

                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        Fermer
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
                    >
                        {loading && <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
                        {shareUrl ? 'Regénérer' : 'Générer le lien'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page principale GED
// ---------------------------------------------------------------------------

export default function GEDIndex({ documents, folders = [], filters: initialFilters = {} }) {
    const [currentFolderId, setCurrentFolderId] = useState(initialFilters.folder_id || null);
    const [viewMode, setViewMode]               = useState('grid'); // 'grid' | 'list'
    const [search, setSearch]                   = useState(initialFilters.search || '');
    const [showNewFolder, setShowNewFolder]     = useState(false);
    const [previewDoc, setPreviewDoc]           = useState(null);
    const [shareDoc, setShareDoc]               = useState(null);

    const fileInputRef = useRef(null);

    // Breadcrumb : construire le chemin depuis currentFolderId
    const buildBreadcrumb = useCallback((folderId, allFolders) => {
        if (!folderId) return [];
        const path = [];
        const findFolder = (id, list) => {
            for (const f of list) {
                if (f.id === id) { path.unshift(f); return true; }
                if (f.children?.length && findFolder(id, f.children)) {
                    path.unshift(f);
                    return true;
                }
            }
            return false;
        };
        findFolder(folderId, allFolders);
        return path;
    }, []);

    const breadcrumb = buildBreadcrumb(currentFolderId, folders);

    const handleFolderSelect = (folderId) => {
        setCurrentFolderId(folderId);
        router.get('/ged', { folder_id: folderId, search }, { preserveState: true, only: ['documents', 'filters'] });
    };

    const handleSearch = () => {
        router.get('/ged', { folder_id: currentFolderId, search }, { preserveState: true, only: ['documents'] });
    };

    const handleUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Rediriger vers la page d'upload avec le dossier courant pré-sélectionné
        router.visit(`/ged/upload?folder_id=${currentFolderId || ''}`);
    };

    const handleDownload = (doc) => {
        window.location.href = `/api/ged/documents/${doc.id}/download`;
    };

    const handlePreview = (doc) => {
        setPreviewDoc(doc);
    };

    const handleShare = (doc) => {
        setShareDoc(doc);
    };

    const handleMove = (doc) => {
        // TODO: ouvrir modal de déplacement avec sélecteur de dossier
        console.log('Déplacer', doc.title);
    };

    return (
        <AppLayout>
            <Head title="GED — Gestion Documentaire" />

            <div className="flex h-full overflow-hidden">
                {/* ---------------------------------------------------------------- */}
                {/* Panneau gauche — Arborescence dossiers                          */}
                {/* ---------------------------------------------------------------- */}
                <aside className="flex w-64 flex-shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between p-4">
                        <h2 className="text-sm font-semibold text-gray-700">Dossiers</h2>
                        <button
                            onClick={() => setShowNewFolder(true)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                            title="Nouveau dossier"
                        >
                            <PlusIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 pb-4">
                        {/* Racine */}
                        <button
                            onClick={() => handleFolderSelect(null)}
                            className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                !currentFolderId
                                    ? 'bg-purple-50 text-purple-700 font-medium'
                                    : 'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <FolderSolidIcon className="h-4 w-4 flex-shrink-0 text-yellow-400" />
                            Tous les documents
                        </button>

                        {folders.map(folder => (
                            <FolderTreeItem
                                key={folder.id}
                                folder={folder}
                                currentFolderId={currentFolderId}
                                onSelect={handleFolderSelect}
                            />
                        ))}
                    </div>
                </aside>

                {/* ---------------------------------------------------------------- */}
                {/* Zone principale                                                  */}
                {/* ---------------------------------------------------------------- */}
                <main className="flex flex-1 flex-col overflow-hidden">
                    {/* Barre d'outils */}
                    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-3">
                        {/* Breadcrumb */}
                        <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
                            <button
                                onClick={() => handleFolderSelect(null)}
                                className="flex-shrink-0 text-gray-500 hover:text-gray-800"
                            >
                                Documents
                            </button>
                            {breadcrumb.map((crumb, i) => (
                                <span key={crumb.id} className="flex items-center gap-1">
                                    <ChevronRightIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                                    <button
                                        onClick={() => handleFolderSelect(crumb.id)}
                                        className={`max-w-[150px] truncate ${
                                            i === breadcrumb.length - 1
                                                ? 'font-medium text-gray-900'
                                                : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                    >
                                        {crumb.name}
                                    </button>
                                </span>
                            ))}
                        </nav>

                        {/* Recherche */}
                        <div className="relative w-64">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>

                        {/* Vue */}
                        <div className="flex rounded-lg border border-gray-200 p-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                            >
                                <Squares2X2Icon className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                            >
                                <ListBulletIcon className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Actions */}
                        <button
                            onClick={() => setShowNewFolder(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <PlusIcon className="h-4 w-4" />
                            Nouveau dossier
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                        >
                            <ArrowUpTrayIcon className="h-4 w-4" />
                            Upload
                        </button>
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 overflow-auto p-6">
                        {documents?.data?.length === 0 ? (
                            <div className="flex h-64 flex-col items-center justify-center text-gray-400">
                                <FolderOpenIcon className="h-16 w-16 text-gray-200" />
                                <p className="mt-4 text-sm font-medium">Ce dossier est vide</p>
                                <p className="mt-1 text-xs">Uploadez des documents ou créez un sous-dossier</p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-4 flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                                >
                                    <ArrowUpTrayIcon className="h-4 w-4" />
                                    Uploader un document
                                </button>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {documents.data.map(doc => (
                                    <DocumentCard
                                        key={doc.id}
                                        document={doc}
                                        onDownload={handleDownload}
                                        onPreview={handlePreview}
                                        onShare={handleShare}
                                        onMove={handleMove}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Document</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Confidentialité</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Auteur</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Taille</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Modifié</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Version</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.data.map(doc => (
                                            <DocumentRow
                                                key={doc.id}
                                                document={doc}
                                                onDownload={handleDownload}
                                                onPreview={handlePreview}
                                                onShare={handleShare}
                                                onMove={handleMove}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {documents?.last_page > 1 && (
                            <div className="mt-4 flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                    {documents.from}–{documents.to} sur {documents.total} documents
                                </p>
                                <div className="flex gap-1">
                                    {documents.links?.map((link, i) => (
                                        <button
                                            key={i}
                                            onClick={() => link.url && router.get(link.url)}
                                            disabled={!link.url}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`rounded px-3 py-1 text-xs ${
                                                link.active
                                                    ? 'bg-purple-600 text-white'
                                                    : link.url
                                                        ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                        : 'text-gray-300 cursor-not-allowed'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Modales */}
            {showNewFolder && (
                <NewFolderModal
                    parentId={currentFolderId}
                    onClose={() => setShowNewFolder(false)}
                    onCreated={() => { setShowNewFolder(false); router.reload({ only: ['folders', 'documents'] }); }}
                />
            )}

            {previewDoc && (
                <PreviewModal
                    document={previewDoc}
                    onClose={() => setPreviewDoc(null)}
                />
            )}

            {shareDoc && (
                <ShareModal
                    document={shareDoc}
                    onClose={() => setShareDoc(null)}
                />
            )}
        </AppLayout>
    );
}
export { GEDIndex };
