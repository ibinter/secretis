import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    DocumentTextIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    LockClosedIcon,
    CalendarIcon,
    ClockIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
}

function isNew(createdAt) {
    if (!createdAt) return false;
    const diff = (Date.now() - new Date(createdAt)) / 1000 / 60 / 60 / 24;
    return diff < 3; // moins de 3 jours
}

function getMimeLabel(mime) {
    const map = {
        'application/pdf': 'PDF',
        'application/msword': 'Word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
        'application/vnd.ms-excel': 'Excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
        'image/jpeg': 'Image',
        'image/png': 'Image',
    };
    return map[mime] ?? 'Fichier';
}

function getMimeColor(mime) {
    if (mime?.includes('pdf'))   return 'text-red-500 bg-red-50';
    if (mime?.includes('word'))  return 'text-blue-500 bg-blue-50';
    if (mime?.includes('excel') || mime?.includes('sheet')) return 'text-green-500 bg-green-50';
    if (mime?.includes('image')) return 'text-purple-500 bg-purple-50';
    return 'text-gray-500 bg-gray-100';
}

// ─── PreviewModal ─────────────────────────────────────────────────────────────

function PreviewModal({ doc, onClose }) {
    if (!doc) return null;

    const isPdf = doc.mime_type?.includes('pdf');

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
                 onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800 truncate">{doc.title}</h3>
                    <button onClick={onClose}
                            className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
                        Fermer
                    </button>
                </div>
                <div className="flex-1 overflow-hidden">
                    {isPdf ? (
                        <iframe
                            src={`/portal/documents/${doc.id}/preview`}
                            className="w-full h-full"
                            style={{ minHeight: '500px' }}
                            title={doc.title}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-64 text-gray-400">
                            <div className="text-center">
                                <DocumentTextIcon className="w-12 h-12 mx-auto mb-2"/>
                                <p className="text-sm">Prévisualisation non disponible pour ce type de fichier.</p>
                                {doc.can_download && (
                                    <a href={`/portal/documents/${doc.id}/download`}
                                       className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                                        <ArrowDownTrayIcon className="w-4 h-4"/>
                                        Télécharger
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── DocumentCard ─────────────────────────────────────────────────────────────

function DocumentCard({ doc, onPreview }) {
    const expired = isExpired(doc.expires_at);
    const isNewDoc = isNew(doc.created_at);
    const mimeColor = getMimeColor(doc.mime_type);
    const mimeLabel = getMimeLabel(doc.mime_type);

    return (
        <div className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${
            expired ? 'border-gray-200 opacity-60' : 'border-gray-200'
        }`}>
            {/* En-tête coloré */}
            <div className="h-1.5 bg-gradient-to-r from-indigo-400 to-blue-500"/>

            <div className="p-4">
                {/* Badges */}
                <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mimeColor}`}>
                        {mimeLabel}
                    </span>
                    {isNewDoc && !expired && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            Nouveau
                        </span>
                    )}
                    {expired && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            Expiré
                        </span>
                    )}
                </div>

                {/* Titre */}
                <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-3 line-clamp-2">
                    {doc.title}
                </h3>

                {/* Méta */}
                <div className="space-y-1 mb-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5"/>
                        Partagé le {formatDate(doc.created_at)}
                    </div>
                    {doc.expires_at && (
                        <div className={`flex items-center gap-1.5 ${expired ? 'text-red-500' : ''}`}>
                            <ClockIcon className="w-3.5 h-3.5"/>
                            {expired ? 'Expiré' : 'Expire'} le {formatDate(doc.expires_at)}
                        </div>
                    )}
                    {doc.view_count > 0 && (
                        <div className="flex items-center gap-1.5">
                            <EyeIcon className="w-3.5 h-3.5"/>
                            Vu {doc.view_count} fois
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <button
                        onClick={() => onPreview(doc)}
                        disabled={expired}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
                    >
                        <EyeIcon className="w-3.5 h-3.5"/>
                        Prévisualiser
                    </button>

                    {doc.can_download && !expired ? (
                        <a
                            href={`/portal/documents/${doc.id}/download`}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <ArrowDownTrayIcon className="w-3.5 h-3.5"/>
                            Télécharger
                        </a>
                    ) : (
                        <div className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 bg-gray-50 rounded-lg cursor-not-allowed">
                            <LockClosedIcon className="w-3.5 h-3.5"/>
                            Non téléchargeable
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ClientDocuments({ documents }) {
    const [search, setSearch]   = useState('');
    const [preview, setPreview] = useState(null);

    const items = documents?.data ?? documents ?? [];

    const filtered = items.filter(doc =>
        !search || doc.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <Head title="Mes documents"/>

            <div className="p-6">
                {/* En-tête */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Documents partagés</h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {items.length} document{items.length !== 1 ? 's' : ''} disponible{items.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    {/* Recherche */}
                    <div className="relative w-56">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Grille */}
                {filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <DocumentTextIcon className="w-14 h-14 text-gray-200 mx-auto mb-4"/>
                        <p className="text-gray-500">
                            {search ? 'Aucun document ne correspond à votre recherche.' : 'Aucun document partagé pour l\'instant.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(doc => (
                            <DocumentCard key={doc.id} doc={doc} onPreview={setPreview}/>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal prévisualisation */}
            <PreviewModal doc={preview} onClose={() => setPreview(null)}/>
        </>
    );
}
