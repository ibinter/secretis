import { useState, useCallback, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import OcrResultPanel from '@/Components/GED/OcrResultPanel';
import {
    ArrowDownTrayIcon,
    ShareIcon,
    PencilSquareIcon,
    DocumentCheckIcon,
    XMarkIcon,
    DocumentTextIcon,
    InformationCircleIcon,
    TagIcon,
    CalendarDaysIcon,
    UserIcon,
    FolderIcon,
    LockClosedIcon,
    ChevronLeftIcon,
    ArrowTopRightOnSquareIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';

// ── Constantes ──────────────────────────────────────────────────────────────

const ACCESS_CONFIG = {
    public:       { label: 'Public',         color: 'bg-green-100 text-green-700' },
    organization: { label: 'Organisation',   color: 'bg-purple-100 text-purple-700' },
    department:   { label: 'Département',    color: 'bg-purple-100 text-purple-700' },
    private:      { label: 'Privé',          color: 'bg-red-100 text-red-700' },
    internal:     { label: 'Interne',        color: 'bg-purple-100 text-purple-700' },
    confidential: { label: 'Confidentiel',   color: 'bg-orange-100 text-orange-700' },
    top_secret:   { label: 'Secret',         color: 'bg-red-100 text-red-700' },
};

function formatBytes(b) {
    if (!b) return '—';
    if (b < 1024) return `${b} o`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
    return `${(b / 1024 / 1024).toFixed(1)} Mo`;
}

// ── Composant principal ─────────────────────────────────────────────────────

export default function DocumentViewer({ document, documentUrl, searchTerm = '' }) {
    const [rightPanel, setRightPanel]    = useState('meta');  // meta | ocr
    const [panelOpen, setPanelOpen]      = useState(true);
    const [fullscreen, setFullscreen]    = useState(false);
    const [ocrTriggering, setOcrTriggering] = useState(false);
    const [shareLoading, setShareLoading]   = useState(false);
    const [localDoc, setLocalDoc]        = useState(document);

    const isPdf   = localDoc?.mime_type === 'application/pdf';
    const isImage = localDoc?.mime_type?.startsWith('image/');

    // ── Déclencher l'OCR ──────────────────────────────────────────────────
    const handleTriggerOcr = useCallback(async () => {
        setOcrTriggering(true);
        try {
            const res = await fetch(`/documents/${localDoc.id}/ocr`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector?.('meta[name="csrf-token"]')?.content ?? '',
                    'Accept':       'application/json',
                },
            });
            if (res.ok) {
                setLocalDoc(prev => ({ ...prev, ocr_status: 'pending' }));
                setRightPanel('ocr');
                // Polling simple pour mise à jour
                const poll = setInterval(async () => {
                    const r = await fetch(`/documents/${localDoc.id}/ocr-text`, { headers: { Accept: 'application/json' } });
                    const data = await r.json();
                    if (data.ocr_status === 'done' || data.ocr_status === 'failed') {
                        setLocalDoc(prev => ({
                            ...prev,
                            ocr_status:   data.ocr_status,
                            text_content: data.text_content,
                            ocr_data:     data.ocr_data,
                        }));
                        clearInterval(poll);
                    }
                }, 3000);
                setTimeout(() => clearInterval(poll), 120000); // timeout 2 min
            }
        } finally {
            setOcrTriggering(false);
        }
    }, [localDoc.id]);

    // ── Téléchargement ────────────────────────────────────────────────────
    const handleDownload = useCallback(() => {
        window.open(`/documents/${localDoc.id}/download`, '_blank');
    }, [localDoc.id]);

    // ── Initier signature ─────────────────────────────────────────────────
    const handleSign = useCallback(() => {
        router.visit(`/signatures/requests/create?document_id=${localDoc.id}`);
    }, [localDoc.id]);

    // ── Partager ──────────────────────────────────────────────────────────
    const handleShare = useCallback(() => {
        router.visit(`/documents/${localDoc.id}/share`);
    }, [localDoc.id]);

    const accessCfg = ACCESS_CONFIG[localDoc?.access_level] ?? ACCESS_CONFIG.organization;

    return (
        <AppLayout>
            <Head title={`${localDoc?.title} — GED`} />

            <div className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-gray-900' : 'h-[calc(100vh-4rem)]'}`}>

                {/* ── Barre supérieure ── */}
                <div className={`flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0 flex-wrap gap-y-2
                    ${fullscreen ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100'}`}>

                    {/* Retour */}
                    <button
                        onClick={() => router.visit('/ged')}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-sm
                            ${fullscreen ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">GED</span>
                    </button>

                    {/* Titre */}
                    <div className="flex-1 min-w-0">
                        <h1 className={`font-semibold text-sm truncate ${fullscreen ? 'text-white' : 'text-gray-800'}`}>
                            {localDoc?.title}
                        </h1>
                        <p className={`text-xs truncate ${fullscreen ? 'text-gray-400' : 'text-gray-400'}`}>
                            {localDoc?.file_name} · {formatBytes(localDoc?.file_size)}
                        </p>
                    </div>

                    {/* Accès */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${accessCfg.color}`}>
                        <LockClosedIcon className="w-3 h-3" />
                        {accessCfg.label}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                        {/* OCR */}
                        <button
                            onClick={() => { setRightPanel('ocr'); setPanelOpen(true); }}
                            title="Texte OCR"
                            className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-medium
                                ${rightPanel === 'ocr' && panelOpen
                                    ? 'border-purple-500 bg-purple-50 text-purple-600'
                                    : fullscreen
                                        ? 'border-gray-600 text-gray-300 hover:border-gray-400'
                                        : 'border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600'
                                }`}
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span className="hidden md:inline">OCR</span>
                            {localDoc?.ocr_status === 'done' && (
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                        </button>

                        {/* Métadonnées */}
                        <button
                            onClick={() => { setRightPanel('meta'); setPanelOpen(p => rightPanel !== 'meta' ? true : !p); }}
                            title="Métadonnées"
                            className={`p-2 rounded-xl border transition-colors
                                ${rightPanel === 'meta' && panelOpen
                                    ? 'border-purple-500 bg-purple-50 text-purple-600'
                                    : fullscreen
                                        ? 'border-gray-600 text-gray-300 hover:border-gray-400'
                                        : 'border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600'
                                }`}
                        >
                            <InformationCircleIcon className="w-4 h-4" />
                        </button>

                        <div className={`w-px h-6 ${fullscreen ? 'bg-gray-600' : 'bg-gray-200'} mx-1`} />

                        {/* Signer */}
                        <button onClick={handleSign}
                            className={`p-2 rounded-xl border transition-colors
                                ${fullscreen ? 'border-gray-600 text-gray-300 hover:border-gray-400' :
                                  'border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600'}`}
                            title="Demander une signature"
                        >
                            <DocumentCheckIcon className="w-4 h-4" />
                        </button>

                        {/* Partager */}
                        <button onClick={handleShare}
                            className={`p-2 rounded-xl border transition-colors
                                ${fullscreen ? 'border-gray-600 text-gray-300 hover:border-gray-400' :
                                  'border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600'}`}
                            title="Partager"
                        >
                            <ShareIcon className="w-4 h-4" />
                        </button>

                        {/* Télécharger */}
                        <button onClick={handleDownload}
                            className={`p-2 rounded-xl border transition-colors
                                ${fullscreen ? 'border-gray-600 text-gray-300 hover:border-gray-400' :
                                  'border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600'}`}
                            title="Télécharger"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>

                        {/* Plein écran */}
                        <button
                            onClick={() => setFullscreen(f => !f)}
                            className={`p-2 rounded-xl border transition-colors
                                ${fullscreen ? 'border-gray-600 text-gray-300 hover:border-gray-400' :
                                  'border-gray-200 text-gray-500 hover:border-gray-400'}`}
                            title={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                        >
                            {fullscreen
                                ? <ArrowsPointingInIcon className="w-4 h-4" />
                                : <ArrowsPointingOutIcon className="w-4 h-4" />
                            }
                        </button>
                    </div>
                </div>

                {/* ── Corps — PDF + panneau droit ── */}
                <div className="flex flex-1 min-h-0">

                    {/* ── Visionneuse PDF / Image ── */}
                    <div className="flex-1 relative min-w-0 overflow-hidden">
                        {isPdf && documentUrl ? (
                            <iframe
                                src={`${documentUrl}#toolbar=1&navpanes=0`}
                                className="w-full h-full border-none block"
                                title={localDoc?.title}
                            />
                        ) : isImage && documentUrl ? (
                            <div className="flex items-center justify-center w-full h-full bg-gray-100 p-4">
                                <img
                                    src={documentUrl}
                                    alt={localDoc?.title}
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400 p-8 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                                    <DocumentTextIcon className="w-8 h-8 text-gray-300" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-600">Aperçu non disponible</p>
                                    <p className="text-sm mt-1">Ce type de fichier ne peut pas être prévisualisé dans le navigateur.</p>
                                </div>
                                <button
                                    onClick={handleDownload}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm
                                               font-medium hover:bg-purple-700 transition-colors"
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                    Télécharger le fichier
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Panneau droit ── */}
                    {panelOpen && (
                        <div className={`flex-shrink-0 border-l border-gray-100 flex flex-col overflow-hidden
                            ${fullscreen ? 'bg-gray-800 border-gray-700' : 'bg-white'}
                            w-80 xl:w-96`}
                        >
                            {rightPanel === 'ocr' ? (
                                <OcrResultPanel
                                    document={localDoc}
                                    searchTerm={searchTerm}
                                    onTriggerOcr={ocrTriggering ? null : handleTriggerOcr}
                                    onClose={() => setPanelOpen(false)}
                                    className="flex-1 min-h-0"
                                />
                            ) : (
                                <MetadataPanel
                                    document={localDoc}
                                    onClose={() => setPanelOpen(false)}
                                    onSign={handleSign}
                                    fullscreen={fullscreen}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

// ── Panneau de métadonnées ──────────────────────────────────────────────────

function MetadataPanel({ document: doc, onClose, onSign, fullscreen }) {
    const accessCfg = ACCESS_CONFIG[doc?.access_level] ?? ACCESS_CONFIG.organization;
    const tags = Array.isArray(doc?.tags) ? doc.tags : (doc?.tags ? JSON.parse(doc.tags) : []);

    const rows = [
        { icon: UserIcon,         label: 'Créé par',    value: doc?.creator?.name ?? '—' },
        { icon: CalendarDaysIcon, label: 'Créé le',     value: doc?.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
        { icon: FolderIcon,       label: 'Dossier',     value: doc?.folder?.name ?? 'Racine' },
        { icon: DocumentTextIcon, label: 'Type',        value: doc?.mime_type ?? '—' },
        { icon: InformationCircleIcon, label: 'Version', value: `v${doc?.current_version ?? 1}` },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* En-tête */}
            <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0
                ${fullscreen ? 'border-gray-700' : 'border-gray-100'}`}>
                <span className={`font-semibold text-sm ${fullscreen ? 'text-white' : 'text-gray-800'}`}>
                    Métadonnées
                </span>
                <button onClick={onClose}
                    className={`p-1.5 rounded-lg transition-colors
                        ${fullscreen ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Corps */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

                {/* Accès */}
                <div>
                    <p className={`text-xs uppercase tracking-wide mb-2 ${fullscreen ? 'text-gray-400' : 'text-gray-400'}`}>
                        Niveau d'accès
                    </p>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${accessCfg.color}`}>
                        <LockClosedIcon className="w-3.5 h-3.5" />
                        {accessCfg.label}
                    </span>
                </div>

                {/* Infos */}
                <div className="space-y-3">
                    {rows.map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-start gap-3">
                            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${fullscreen ? 'text-gray-500' : 'text-gray-400'}`} />
                            <div>
                                <p className={`text-xs ${fullscreen ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
                                <p className={`text-sm font-medium ${fullscreen ? 'text-gray-200' : 'text-gray-700'}`}>{value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Description */}
                {doc?.description && (
                    <div>
                        <p className={`text-xs uppercase tracking-wide mb-1 ${fullscreen ? 'text-gray-400' : 'text-gray-400'}`}>
                            Description
                        </p>
                        <p className={`text-sm leading-relaxed ${fullscreen ? 'text-gray-300' : 'text-gray-600'}`}>
                            {doc.description}
                        </p>
                    </div>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                    <div>
                        <p className={`text-xs uppercase tracking-wide mb-2 flex items-center gap-1 ${fullscreen ? 'text-gray-400' : 'text-gray-400'}`}>
                            <TagIcon className="w-3.5 h-3.5" />
                            Étiquettes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag, i) => (
                                <span key={i}
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium
                                        ${fullscreen ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Statut OCR */}
                <div>
                    <p className={`text-xs uppercase tracking-wide mb-1 ${fullscreen ? 'text-gray-400' : 'text-gray-400'}`}>
                        OCR
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${{
                            none:       'bg-gray-100 text-gray-500',
                            pending:    'bg-yellow-100 text-yellow-700',
                            processing: 'bg-purple-100 text-purple-700',
                            done:       'bg-green-100 text-green-700',
                            failed:     'bg-red-100 text-red-700',
                        }[doc?.ocr_status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {{
                            none:       'Non traité',
                            pending:    'En attente',
                            processing: 'En cours',
                            done:       'Texte extrait',
                            failed:     'Échec',
                        }[doc?.ocr_status] ?? 'Inconnu'}
                    </span>
                </div>
            </div>

            {/* Actions en pied */}
            <div className={`p-4 border-t flex-shrink-0 space-y-2 ${fullscreen ? 'border-gray-700' : 'border-gray-100'}`}>
                <button
                    onClick={onSign}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white
                               rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                    <DocumentCheckIcon className="w-4 h-4" />
                    Demander une signature
                </button>
            </div>
        </div>
    );
}
export { DocumentViewer };
