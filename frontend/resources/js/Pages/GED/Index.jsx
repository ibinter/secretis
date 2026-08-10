/**
 * GED/Index.jsx — Gestion électronique des documents
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier STRICTEMENT inchangée : mêmes props Inertia, mêmes routes
 * (`GET /ged`, `POST /api/ged/folders`, `POST /api/ged/documents`,
 * `PUT /ged/documents/{id}`, `GET /api/ged/documents/{id}/preview|download`,
 * `POST /api/ged/documents/{id}/share`), mêmes états locaux, mêmes payloads.
 *
 * Props (DocumentController@index) :
 *   documents : LengthAwarePaginator<{ id, title, description, file_name, file_path,
 *               mime_type, file_size, access_level, current_version, tags, category,
 *               updated_at, created_at, versions_count,
 *               author:{ id, name }, folder:{ id, name } }>
 *   folders   : Array<{ id, name }>            (dossiers racine de l'organisation)
 *   stats     : { total, month, shared, archived }
 *   filters   : { folder_id, category, access_level, author_id, search }
 */

import { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    Folder, FolderOpen, FileText, FileSpreadsheet, FileImage, FileType,
    UploadCloud, Plus, Search, MoreVertical, Download, Eye, Share2, Move,
    ChevronRight, LayoutGrid, List, X, Check, Lock, Copy, Archive,
    CalendarPlus, Layers,
} from 'lucide-react';
import AppLayout from '@/Layouts/AppLayout';
import {
    PageHeader, Button, Badge, Card, DataTable, EmptyState, StatCard,
    cx, CONTROL, CARD, SURFACE, SURFACE_SUNK, BORDER, TEXT_TITLE, TEXT_BODY,
    TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING, TONES,
} from '@/Components/UI';

/* ─── Niveaux de confidentialité ───────────────────────────────────────────── */
/* Un niveau d'accès est un statut : jamais l'accent violet, uniquement des
   tons sémantiques. `outline` distingue deux paliers partageant le même ton. */

const ACCESS_LEVEL_CONFIG = {
    public:       { label: 'Public',        tone: 'success', outline: false, locked: false },
    internal:     { label: 'Interne',       tone: 'info',    outline: false, locked: false },
    organization: { label: 'Organisation',  tone: 'info',    outline: true,  locked: false },
    department:   { label: 'Département',   tone: 'info',    outline: true,  locked: false },
    confidential: { label: 'Confidentiel',  tone: 'warning', outline: false, locked: true  },
    private:      { label: 'Privé',         tone: 'warning', outline: true,  locked: true  },
    top_secret:   { label: 'Secret',        tone: 'danger',  outline: false, locked: true  },
};

/** Ton d'icône par famille de fichier (tons sémantiques uniquement). */
function fileMeta(mime = '') {
    if (mime === 'application/pdf')
        return { Icon: FileType, tone: TONES.danger };
    if (mime.startsWith('image/'))
        return { Icon: FileImage, tone: TONES.warning };
    if (mime.includes('spreadsheet') || mime.includes('excel'))
        return { Icon: FileSpreadsheet, tone: TONES.success };
    if (mime.includes('word') || mime.includes('document'))
        return { Icon: FileText, tone: TONES.info };
    return { Icon: FileText, tone: TONES.neutral };
}

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

/* ─── Badge confidentialité ────────────────────────────────────────────────── */

function AccessBadge({ level }) {
    const config = ACCESS_LEVEL_CONFIG[level] ?? ACCESS_LEVEL_CONFIG.internal;
    return (
        <Badge variant={config.tone} outline={config.outline} icon={config.locked ? Lock : undefined}>
            {config.label}
        </Badge>
    );
}

/* ─── Coquille de modale partagée ──────────────────────────────────────────── */

function ModalShell({ title, subtitle, onClose, closeDisabled = false, footer, size = 'md', children }) {
    const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-5xl' : 'max-w-md';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 dark:bg-black/70">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={cx(
                    'flex w-full flex-col overflow-hidden rounded-xl border shadow-lg',
                    BORDER, SURFACE, width,
                    size === 'lg' && 'h-full max-h-[90vh]',
                )}
            >
                <header className={cx('flex items-start justify-between gap-3 border-b px-5 py-4', BORDER)}>
                    <div className="min-w-0">
                        <h2 className={cx('truncate text-base font-semibold tracking-tight', TEXT_TITLE)}>{title}</h2>
                        {subtitle && <p className={cx('mt-0.5 truncate text-sm', TEXT_MUTED)}>{subtitle}</p>}
                    </div>
                    <Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer"
                            onClick={onClose} disabled={closeDisabled} />
                </header>

                <div className={cx(size === 'lg' ? 'min-h-0 flex-1 overflow-hidden' : 'px-5 py-4')}>
                    {children}
                </div>

                {footer && (
                    <footer className={cx('flex flex-wrap justify-end gap-2 border-t px-5 py-3', BORDER, SURFACE_SUNK)}>
                        {footer}
                    </footer>
                )}
            </div>
        </div>
    );
}

const FIELD_LABEL = 'mb-1.5 block text-xs font-medium';

function ErrorNote({ children }) {
    if (!children) return null;
    return (
        <p className={cx(
            'rounded-lg border px-3 py-2 text-xs',
            TONES.danger.soft, TONES.danger.text, TONES.danger.border,
        )}>
            {children}
        </p>
    );
}

/* ─── Modal upload document ────────────────────────────────────────────────── */

function UploadModal({ file, uploading, error, onClose, onConfirm }) {
    const [title, setTitle]             = useState(file?.name ?? '');
    const [accessLevel, setAccessLevel] = useState('internal');

    const fmt = (bytes) => bytes < 1024 * 1024
        ? `${(bytes / 1024).toFixed(1)} Ko`
        : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;

    return (
        <ModalShell
            title="Uploader un document"
            onClose={onClose}
            closeDisabled={uploading}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={uploading}>Annuler</Button>
                    <Button
                        variant="primary"
                        icon={UploadCloud}
                        loading={uploading}
                        disabled={!title.trim()}
                        onClick={() => onConfirm(title, accessLevel)}
                    >
                        {uploading ? 'Envoi…' : 'Uploader'}
                    </Button>
                </>
            }
        >
            <div className={cx('mb-4 flex items-center gap-3 rounded-lg border px-3 py-2.5', BORDER, SURFACE_SUNK)}>
                <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', TONES.info.soft)}>
                    <FileText className={cx('h-5 w-5', TONES.info.icon)} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                    <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{file?.name}</p>
                    <p className={cx('text-xs', TEXT_MUTED, NUM)}>{fmt(file?.size ?? 0)}</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label className={cx(FIELD_LABEL, TEXT_MUTED)} htmlFor="ged-upload-title">Titre du document</label>
                    <input
                        id="ged-upload-title"
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        disabled={uploading}
                        className={cx(CONTROL, 'h-10')}
                    />
                </div>
                <div>
                    <label className={cx(FIELD_LABEL, TEXT_MUTED)} htmlFor="ged-upload-access">Niveau de confidentialité</label>
                    <select
                        id="ged-upload-access"
                        value={accessLevel}
                        onChange={e => setAccessLevel(e.target.value)}
                        disabled={uploading}
                        className={cx(CONTROL, 'h-10')}
                    >
                        <option value="public">Public</option>
                        <option value="internal">Interne</option>
                        <option value="confidential">Confidentiel</option>
                        <option value="top_secret">Secret</option>
                    </select>
                </div>
                <ErrorNote>{error}</ErrorNote>
            </div>
        </ModalShell>
    );
}

/* ─── Modal nouveau dossier ────────────────────────────────────────────────── */

function NewFolderModal({ parentId, onClose, onCreated }) {
    const [name, setName]               = useState('');
    const [accessLevel, setAccessLevel] = useState('internal');
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState(null);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const { default: axios } = await import('axios');
            await axios.post('/api/ged/folders', {
                name:         name.trim(),
                parent_id:    parentId,
                access_level: accessLevel,
            });
            onCreated?.();
        } catch (err) {
            setError(err?.response?.data?.message || 'Erreur lors de la création du dossier.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalShell
            title="Nouveau dossier"
            size="sm"
            onClose={onClose}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button variant="primary" icon={Plus} loading={loading} disabled={!name.trim()} onClick={handleCreate}>
                        Créer
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className={cx(FIELD_LABEL, TEXT_MUTED)} htmlFor="ged-folder-name">Nom du dossier</label>
                    <input
                        id="ged-folder-name"
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        placeholder="Ex : Contrats 2026"
                        className={cx(CONTROL, 'h-10')}
                    />
                </div>

                <div>
                    <label className={cx(FIELD_LABEL, TEXT_MUTED)} htmlFor="ged-folder-access">Niveau de confidentialité</label>
                    <select
                        id="ged-folder-access"
                        value={accessLevel}
                        onChange={e => setAccessLevel(e.target.value)}
                        className={cx(CONTROL, 'h-10')}
                    >
                        <option value="public">Public</option>
                        <option value="internal">Interne</option>
                        <option value="confidential">Confidentiel</option>
                        <option value="top_secret">Secret</option>
                    </select>
                </div>

                <ErrorNote>{error}</ErrorNote>
            </div>
        </ModalShell>
    );
}

/* ─── Modal déplacer document ──────────────────────────────────────────────── */

function MoveModal({ document, folders, onClose, onMoved }) {
    const [target, setTarget]   = useState(document.folder?.id ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);

    const handleMove = async () => {
        setLoading(true);
        setError(null);
        try {
            const { default: axios } = await import('axios');
            await axios.put(`/ged/documents/${document.id}`, {
                folder_id: target === '' ? null : target,
            }, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            onMoved?.();
        } catch (err) {
            setError(err?.response?.data?.message || 'Erreur lors du déplacement.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalShell
            title="Déplacer le document"
            subtitle={document.title}
            size="sm"
            onClose={onClose}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Annuler</Button>
                    <Button variant="primary" icon={Move} loading={loading} onClick={handleMove}>Déplacer</Button>
                </>
            }
        >
            <label className={cx(FIELD_LABEL, TEXT_MUTED)} htmlFor="ged-move-target">Dossier de destination</label>
            <select
                id="ged-move-target"
                value={target}
                onChange={e => setTarget(e.target.value)}
                className={cx(CONTROL, 'h-10')}
            >
                <option value="">Racine (aucun dossier)</option>
                {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                ))}
            </select>

            {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
        </ModalShell>
    );
}

/* ─── Menu contextuel document ─────────────────────────────────────────────── */

function DocumentMenu({ document, onClose, onDownload, onPreview, onShare, onMove }) {
    const item = cx(
        'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left',
        TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors',
    );

    return (
        <>
            {/* Zone de fermeture au clic extérieur */}
            <button
                type="button"
                aria-label="Fermer le menu"
                onClick={onClose}
                className="fixed inset-0 z-20 cursor-default"
            />
            <div className={cx(
                'absolute right-0 top-9 z-30 w-52 overflow-hidden rounded-xl border py-1 shadow-lg',
                BORDER, SURFACE,
            )}>
                <button type="button" onClick={() => onPreview(document)} className={item}>
                    <Eye className={cx('h-4 w-4', TEXT_FAINT)} aria-hidden="true" /> Prévisualiser
                </button>
                <button type="button" onClick={() => onDownload(document)} className={item}>
                    <Download className={cx('h-4 w-4', TEXT_FAINT)} aria-hidden="true" /> Télécharger
                </button>
                <button type="button" onClick={() => onShare(document)} className={item}>
                    <Share2 className={cx('h-4 w-4', TEXT_FAINT)} aria-hidden="true" /> Partager
                </button>
                <div className={cx('my-1 border-t', BORDER)} />
                <Link href={`/ged/documents/${document.id}`} className={item}>
                    <FileText className={cx('h-4 w-4', TEXT_FAINT)} aria-hidden="true" /> Ouvrir la fiche
                </Link>
                <button type="button" onClick={() => onMove(document)} className={item}>
                    <Move className={cx('h-4 w-4', TEXT_FAINT)} aria-hidden="true" /> Déplacer
                </button>
            </div>
        </>
    );
}

/* ─── Carte document (grille) ──────────────────────────────────────────────── */

function DocumentCard({ document, onDownload, onPreview, onShare, onMove }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const { Icon, tone } = fileMeta(document.mime_type);

    return (
        <div className={cx('group relative flex flex-col p-4 transition-colors',
            CARD, 'hover:bg-gray-50 dark:hover:bg-white/[0.03]')}>

            <div className="mb-3 flex items-start justify-between">
                <span className={cx('flex h-11 w-11 items-center justify-center rounded-lg', tone.soft)}>
                    <Icon className={cx('h-5 w-5', tone.icon)} aria-hidden="true" />
                </span>
                <div className="relative">
                    <Button
                        variant="ghost" size="sm" iconOnly icon={MoreVertical}
                        title="Actions sur le document"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(v => !v)}
                        className={cx('transition-opacity', !menuOpen && 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100')}
                    />
                    {menuOpen && (
                        <DocumentMenu
                            document={document}
                            onClose={() => setMenuOpen(false)}
                            onDownload={(d) => { setMenuOpen(false); onDownload(d); }}
                            onPreview={(d) => { setMenuOpen(false); onPreview(d); }}
                            onShare={(d) => { setMenuOpen(false); onShare(d); }}
                            onMove={(d) => { setMenuOpen(false); onMove(d); }}
                        />
                    )}
                </div>
            </div>

            <Link
                href={`/ged/documents/${document.id}`}
                className={cx(
                    'mb-2 line-clamp-2 rounded text-sm font-semibold transition-colors',
                    TEXT_TITLE, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING,
                )}
                title={document.title}
            >
                {document.title}
            </Link>

            <div className="mt-auto space-y-2 pt-2">
                <div className="flex items-center justify-between gap-2">
                    <AccessBadge level={document.access_level} />
                    {document.current_version > 1 && (
                        <span className={cx('inline-flex shrink-0 items-center gap-1 text-xs', TEXT_MUTED, NUM)}>
                            <Layers className="h-3.5 w-3.5" aria-hidden="true" /> v{document.current_version}
                        </span>
                    )}
                </div>
                <div className={cx('flex items-center justify-between text-xs', TEXT_MUTED, NUM)}>
                    <span>{formatBytes(document.file_size)}</span>
                    <span>{formatDate(document.updated_at)}</span>
                </div>
                <p className={cx('truncate text-xs', TEXT_FAINT)}>
                    {document.author?.name || '—'}
                </p>
            </div>
        </div>
    );
}

/* ─── Modal prévisualisation ───────────────────────────────────────────────── */

function PreviewModal({ document, onClose }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading]       = useState(true);

    useEffect(() => {
        let active = true;
        fetch(`/api/ged/documents/${document.id}/preview`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then(r => r.json())
            .then(data => { if (active) { setPreviewUrl(data.preview_url); setLoading(false); } })
            .catch(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [document.id]);

    const isPdf   = document.mime_type === 'application/pdf';
    const isImage = document.mime_type?.startsWith('image/');

    return (
        <ModalShell
            title={document.title}
            subtitle={`${formatBytes(document.file_size)}${document.current_version > 1 ? ` · v${document.current_version}` : ''}`}
            size="lg"
            onClose={onClose}
        >
            <div className="h-full w-full">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <EmptyState variant="loading" title="Chargement de l'aperçu…" description="" />
                    </div>
                ) : previewUrl && isPdf ? (
                    <iframe src={previewUrl} className="h-full w-full border-0" title={document.title} />
                ) : previewUrl && isImage ? (
                    <div className={cx('flex h-full items-center justify-center p-4', SURFACE_SUNK)}>
                        <img src={previewUrl} alt={document.title} className="max-h-full max-w-full rounded-lg object-contain" />
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <EmptyState
                            icon={FileText}
                            title="Aperçu non disponible"
                            description="Ce type de fichier ne peut pas être affiché dans le navigateur. Téléchargez-le pour le consulter."
                            action={
                                <Button variant="primary" icon={Download} href={`/api/ged/documents/${document.id}/download`}>
                                    Télécharger le fichier
                                </Button>
                            }
                        />
                    </div>
                )}
            </div>
        </ModalShell>
    );
}

/* ─── Modal partage ────────────────────────────────────────────────────────── */

function ShareModal({ document, onClose }) {
    const [hours, setHours]       = useState(24);
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
        <ModalShell
            title="Partager le document"
            subtitle={document.title}
            onClose={onClose}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Fermer</Button>
                    <Button variant="primary" icon={Share2} loading={loading} onClick={handleGenerate}>
                        {shareUrl ? 'Regénérer' : 'Générer le lien'}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className={cx(FIELD_LABEL, TEXT_MUTED)} htmlFor="ged-share-hours">Durée de validité du lien</label>
                    <select
                        id="ged-share-hours"
                        value={hours}
                        onChange={e => setHours(Number(e.target.value))}
                        className={cx(CONTROL, 'h-10')}
                    >
                        <option value={1}>1 heure</option>
                        <option value={6}>6 heures</option>
                        <option value={24}>24 heures</option>
                        <option value={48}>48 heures</option>
                        <option value={168}>7 jours</option>
                    </select>
                </div>

                {shareUrl ? (
                    <div>
                        <label className={cx(FIELD_LABEL, TEXT_MUTED)} htmlFor="ged-share-url">Lien de partage</label>
                        <div className="flex gap-2">
                            <input
                                id="ged-share-url"
                                readOnly
                                value={shareUrl}
                                onFocus={e => e.target.select()}
                                className={cx(CONTROL, 'h-10 flex-1 text-xs')}
                            />
                            <Button
                                variant={copied ? 'secondary' : 'subtle'}
                                icon={copied ? Check : Copy}
                                onClick={handleCopy}
                                className={copied ? 'text-emerald-600 dark:text-emerald-400' : undefined}
                            >
                                {copied ? 'Copié' : 'Copier'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className={cx('text-xs leading-relaxed', TEXT_MUTED)}>
                        Le lien généré donne un accès direct au document, sans authentification,
                        jusqu'à son expiration.
                    </p>
                )}
            </div>
        </ModalShell>
    );
}

/* ─── Page principale ──────────────────────────────────────────────────────── */

export default function GEDIndex({ documents, folders = [], stats = {}, filters: initialFilters = {} }) {
    const [currentFolderId, setCurrentFolderId] = useState(initialFilters.folder_id || null);
    const [viewMode, setViewMode]               = useState('grid');
    const [search, setSearch]                   = useState(initialFilters.search || '');
    const [showNewFolder, setShowNewFolder]     = useState(false);
    const [uploadState, setUploadState]         = useState(null);
    const [previewDoc, setPreviewDoc]           = useState(null);
    const [shareDoc, setShareDoc]               = useState(null);
    const [moveDoc, setMoveDoc]                 = useState(null);

    const fileInputRef = useRef(null);

    const activeFolder = folders.find(f => f.id === currentFolderId) || null;

    const handleFolderSelect = (folderId) => {
        setCurrentFolderId(folderId);
        router.get('/ged', { folder_id: folderId, search }, { preserveState: true, only: ['documents', 'stats', 'filters'] });
    };

    const handleSearch = () => {
        router.get('/ged', { folder_id: currentFolderId, search }, { preserveState: true, only: ['documents'] });
    };

    const handleUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setUploadState({ file, uploading: false, error: null });
    };

    const handleUploadConfirm = async (title, accessLevel) => {
        if (!uploadState?.file) return;
        setUploadState(s => ({ ...s, uploading: true, error: null }));
        try {
            const { default: axios } = await import('axios');
            const fd = new FormData();
            fd.append('file', uploadState.file);
            fd.append('title', title || uploadState.file.name);
            fd.append('access_level', accessLevel || 'internal');
            if (currentFolderId) fd.append('folder_id', currentFolderId);
            await axios.post('/api/ged/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setUploadState(null);
            router.reload({ only: ['documents', 'stats'] });
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || 'Erreur upload';
            setUploadState(s => ({ ...s, uploading: false, error: msg }));
        }
    };

    const handleDownload = (doc) => { window.location.href = `/api/ged/documents/${doc.id}/download`; };
    const handlePreview  = (doc) => setPreviewDoc(doc);
    const handleShare    = (doc) => setShareDoc(doc);
    const handleMove     = (doc) => setMoveDoc(doc);

    const openFilePicker = () => fileInputRef.current?.click();

    // Réinitialise recherche + dossier courant (même appel que handleFolderSelect,
    // mais avec la recherche vidée : `search` serait encore l'ancienne valeur).
    const resetFilters = () => {
        setSearch('');
        setCurrentFolderId(null);
        router.get('/ged', { folder_id: null, search: '' }, { preserveState: true, only: ['documents', 'stats', 'filters'] });
    };

    const docs      = documents?.data ?? [];
    const total     = documents?.total ?? docs.length;
    const isFiltered = Boolean(search || currentFolderId);

    /* ─── Colonnes du mode liste ───────────────────────────────────────────── */

    const columns = [
        {
            key: 'title',
            label: 'Document',
            render: (v, doc) => {
                const { Icon, tone } = fileMeta(doc.mime_type);
                return (
                    <div className="flex items-center gap-2.5">
                        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone.soft)}>
                            <Icon className={cx('h-4 w-4', tone.icon)} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 max-w-[280px]">
                            <Link
                                href={`/ged/documents/${doc.id}`}
                                className={cx('block truncate rounded font-medium transition-colors',
                                    TEXT_TITLE, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING)}
                                title={v}
                            >
                                {v}
                            </Link>
                            <p className={cx('truncate text-xs', TEXT_FAINT)}>
                                {doc.folder?.name || 'Racine'}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'access_level',
            label: 'Confidentialité',
            nowrap: true,
            render: (v) => <AccessBadge level={v} />,
        },
        {
            key: 'author',
            label: 'Auteur',
            nowrap: true,
            render: (_v, doc) => doc.author?.name
                ? <span className={cx('text-xs', TEXT_MUTED)}>{doc.author.name}</span>
                : <span className={TEXT_FAINT}>—</span>,
        },
        {
            key: 'file_size',
            label: 'Taille',
            nowrap: true,
            width: '100px',
            align: 'right',
            render: (v) => <span className={cx('text-xs', TEXT_MUTED, NUM)}>{formatBytes(v)}</span>,
        },
        {
            key: 'updated_at',
            label: 'Modifié',
            nowrap: true,
            width: '130px',
            render: (v) => <span className={cx('text-xs', TEXT_MUTED, NUM)}>{formatDate(v)}</span>,
        },
        {
            key: 'current_version',
            label: 'Version',
            nowrap: true,
            width: '90px',
            render: (v) => v > 1
                ? (
                    <span className={cx('inline-flex items-center gap-1 text-xs', TEXT_MUTED, NUM)}>
                        <Layers className="h-3.5 w-3.5" aria-hidden="true" /> v{v}
                    </span>
                )
                : <span className={TEXT_FAINT}>—</span>,
        },
    ];

    /* ─── États vides ──────────────────────────────────────────────────────── */

    const emptyState = isFiltered ? (
        <EmptyState
            variant="no-results"
            title="Aucun document ne correspond"
            description={activeFolder
                ? `Le dossier « ${activeFolder.name} » ne contient aucun document pour ces critères.`
                : 'Aucun document ne correspond à cette recherche. Essayez un autre mot-clé.'}
            action={
                <Button variant="primary" icon={UploadCloud} onClick={openFilePicker}>
                    Uploader un document
                </Button>
            }
            secondary={
                <Button variant="secondary" onClick={resetFilters}>
                    Voir tous les documents
                </Button>
            }
        />
    ) : (
        <EmptyState
            icon={FolderOpen}
            title="Aucun document dans la GED"
            description="Centralisez ici les contrats, factures, comptes rendus et pièces jointes de l'organisation. Chaque dépôt est versionné et tracé."
            hints={[
                'Le niveau de confidentialité contrôle qui peut ouvrir le document.',
                'Chaque nouvelle version est conservée : rien n\'est écrasé.',
                'Un lien de partage temporaire peut être généré depuis la fiche.',
            ]}
            action={
                <Button variant="primary" icon={UploadCloud} onClick={openFilePicker}>
                    Uploader un document
                </Button>
            }
            secondary={
                <Button variant="secondary" icon={Plus} onClick={() => setShowNewFolder(true)}>
                    Créer un dossier
                </Button>
            }
        />
    );

    /* ─── Pagination serveur (partagée grille / liste) ─────────────────────── */

    const pagination = documents?.last_page > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className={cx('text-xs', TEXT_MUTED, NUM)}>
                {documents.from}–{documents.to} sur {documents.total} documents
            </p>
            <div className="flex flex-wrap gap-1">
                {documents.links?.map((link, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                        disabled={!link.url}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                        className={cx(
                            'h-8 min-w-[32px] rounded-lg border px-2.5 text-xs font-medium transition-colors',
                            NUM, FOCUS_RING,
                            link.active
                                ? 'border-transparent bg-purple-600 text-white'
                                : cx(BORDER, SURFACE, TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                            !link.url && 'pointer-events-none opacity-40',
                        )}
                    />
                ))}
            </div>
        </div>
    ) : null;

    const viewOptions = [
        { key: 'grid', label: 'Grille', icon: LayoutGrid },
        { key: 'list', label: 'Liste',  icon: List },
    ];

    /* ─── Rendu ────────────────────────────────────────────────────────────── */

    return (
        <AppLayout>
            <Head title="GED — Gestion documentaire" />

            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

                <PageHeader
                    icon={FolderOpen}
                    title="Gestion documentaire"
                    breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'GED' }]}
                    subtitle={`${total} document${total !== 1 ? 's' : ''} · centralisez, sécurisez et partagez les documents de l'organisation`}
                    actions={
                        <>
                            <Button variant="secondary" icon={Plus} onClick={() => setShowNewFolder(true)}>
                                Nouveau dossier
                            </Button>
                            <Button variant="primary" icon={UploadCloud} onClick={openFilePicker}>
                                Uploader
                            </Button>
                        </>
                    }
                />

                {/* Champ fichier masqué — piloté par les boutons « Uploader » */}
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />

                {/* Indicateurs */}
                <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <StatCard label="Documents" value={stats?.total ?? 0}    icon={FileText}     tone="accent"  hint="total dans la GED" />
                    <StatCard label="Ce mois"   value={stats?.month ?? 0}    icon={CalendarPlus} tone="info"    hint="ajoutés ce mois-ci" />
                    <StatCard label="Partagés"  value={stats?.shared ?? 0}   icon={Share2}       tone="success" hint="documents publics" />
                    <StatCard label="Archivés"  value={stats?.archived ?? 0} icon={Archive}      tone="neutral" hint="sortis du circuit actif" />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">

                    {/* Dossiers */}
                    <aside className="lg:col-span-1">
                        <Card
                            title="Dossiers"
                            icon={Folder}
                            flush
                            actions={
                                <Button
                                    variant="ghost" size="sm" iconOnly icon={Plus}
                                    title="Nouveau dossier"
                                    onClick={() => setShowNewFolder(true)}
                                />
                            }
                        >
                            <div className="max-h-[420px] overflow-y-auto p-2">
                                <button
                                    type="button"
                                    onClick={() => handleFolderSelect(null)}
                                    aria-current={!currentFolderId ? 'true' : undefined}
                                    className={cx(
                                        'mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                                        FOCUS_RING,
                                        !currentFolderId
                                            ? cx('font-medium', TONES.accent.soft, TONES.accent.text)
                                            : cx(TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                                    )}
                                >
                                    <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    Tous les documents
                                </button>

                                {folders.map(folder => {
                                    const active = currentFolderId === folder.id;
                                    return (
                                        <button
                                            key={folder.id}
                                            type="button"
                                            onClick={() => handleFolderSelect(folder.id)}
                                            aria-current={active ? 'true' : undefined}
                                            className={cx(
                                                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                                                FOCUS_RING,
                                                active
                                                    ? cx('font-medium', TONES.accent.soft, TONES.accent.text)
                                                    : cx(TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                                            )}
                                        >
                                            <Folder className={cx('h-4 w-4 shrink-0', active ? '' : TEXT_FAINT)} aria-hidden="true" />
                                            <span className="truncate">{folder.name}</span>
                                            {folder.documents_count > 0 && (
                                                <Badge variant="neutral" className={cx('ml-auto shrink-0', NUM)}>
                                                    {folder.documents_count}
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })}

                                {folders.length === 0 && (
                                    <EmptyState
                                        compact
                                        icon={Folder}
                                        title="Aucun dossier"
                                        description="Rangez les documents par dossier pour retrouver l'essentiel plus vite."
                                        action={
                                            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setShowNewFolder(true)}>
                                                Créer un dossier
                                            </Button>
                                        }
                                    />
                                )}
                            </div>
                        </Card>
                    </aside>

                    {/* Documents */}
                    <main className="space-y-4 lg:col-span-3">

                        {/* Barre d'outils */}
                        <div className={cx('flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-sm sm:flex-row sm:items-center',
                            BORDER, SURFACE)}>

                            <nav aria-label="Fil d'ariane des dossiers" className="flex min-w-0 flex-1 items-center gap-1 text-sm">
                                <button
                                    type="button"
                                    onClick={() => handleFolderSelect(null)}
                                    className={cx('shrink-0 rounded px-0.5 transition-colors',
                                        TEXT_MUTED, 'hover:text-purple-600 dark:hover:text-purple-400', FOCUS_RING)}
                                >
                                    Documents
                                </button>
                                {activeFolder && (
                                    <span className="flex min-w-0 items-center gap-1">
                                        <ChevronRight className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                                        <span className={cx('max-w-[180px] truncate font-medium', TEXT_TITLE)}>
                                            {activeFolder.name}
                                        </span>
                                    </span>
                                )}
                            </nav>

                            <div className="relative sm:w-64">
                                <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
                                <input
                                    type="search"
                                    placeholder="Rechercher un document…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    aria-label="Rechercher un document"
                                    className={cx(CONTROL, 'h-10 pl-9')}
                                />
                            </div>

                            <div
                                role="tablist"
                                aria-label="Mode d'affichage"
                                className={cx('flex shrink-0 rounded-lg border p-1', BORDER)}
                            >
                                {viewOptions.map(opt => {
                                    const active = viewMode === opt.key;
                                    return (
                                        <button
                                            key={opt.key}
                                            type="button"
                                            role="tab"
                                            aria-selected={active}
                                            title={opt.label}
                                            onClick={() => setViewMode(opt.key)}
                                            className={cx(
                                                'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                                                FOCUS_RING,
                                                active
                                                    ? 'bg-purple-600 text-white'
                                                    : cx(TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                                            )}
                                        >
                                            <opt.icon className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Contenu */}
                        {docs.length === 0 ? (
                            <div className={cx('border border-dashed rounded-xl', BORDER, SURFACE)}>
                                {emptyState}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {docs.map(doc => (
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
                                {pagination && (
                                    <div className={cx('rounded-xl border shadow-sm', BORDER, SURFACE)}>
                                        {pagination}
                                    </div>
                                )}
                            </>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={docs}
                                rowKey="id"
                                pageSize={documents?.per_page ?? 24}
                                totalItems={total}
                                empty={emptyState}
                                footer={pagination}
                                actions={(doc) => (
                                    <>
                                        <Button variant="ghost" size="sm" iconOnly icon={Eye}
                                                title="Prévisualiser" onClick={() => handlePreview(doc)} />
                                        <Button variant="ghost" size="sm" iconOnly icon={Download}
                                                title="Télécharger" onClick={() => handleDownload(doc)} />
                                        <Button variant="ghost" size="sm" iconOnly icon={Share2}
                                                title="Partager" onClick={() => handleShare(doc)} />
                                        <Button variant="ghost" size="sm" iconOnly icon={Move}
                                                title="Déplacer" onClick={() => handleMove(doc)} />
                                        <Button as={Link} variant="ghost" size="sm" iconOnly icon={FileText}
                                                title="Ouvrir la fiche" href={`/ged/documents/${doc.id}`} />
                                    </>
                                )}
                            />
                        )}
                    </main>
                </div>
            </div>

            {/* Modales */}
            {showNewFolder && (
                <NewFolderModal
                    parentId={currentFolderId}
                    onClose={() => setShowNewFolder(false)}
                    onCreated={() => { setShowNewFolder(false); router.reload({ only: ['folders', 'documents', 'stats'] }); }}
                />
            )}

            {uploadState && (
                <UploadModal
                    file={uploadState.file}
                    uploading={uploadState.uploading}
                    error={uploadState.error}
                    onClose={() => setUploadState(null)}
                    onConfirm={handleUploadConfirm}
                />
            )}

            {previewDoc && <PreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />}
            {shareDoc && <ShareModal document={shareDoc} onClose={() => setShareDoc(null)} />}
            {moveDoc && (
                <MoveModal
                    document={moveDoc}
                    folders={folders}
                    onClose={() => setMoveDoc(null)}
                    onMoved={() => { setMoveDoc(null); router.reload({ only: ['documents', 'stats'] }); }}
                />
            )}
        </AppLayout>
    );
}

export { GEDIndex };
