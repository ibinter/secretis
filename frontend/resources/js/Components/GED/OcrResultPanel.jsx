import { useState, useCallback, useRef } from 'react';
import {
    DocumentTextIcon,
    ClipboardDocumentIcon,
    ArrowPathIcon,
    CheckIcon,
    XMarkIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
    ExclamationTriangleIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';

/**
 * OcrResultPanel — Panneau latéral d'affichage du texte OCR extrait
 *
 * Props :
 *   document      — objet document (id, title, ocr_status, text_content, ocr_data)
 *   searchTerm    — terme à surligner dans le texte (depuis une recherche globale)
 *   onTriggerOcr  — callback pour relancer l'OCR
 *   onClose       — callback pour fermer le panneau
 *   className     — classes supplémentaires
 */
export default function OcrResultPanel({
    document,
    searchTerm = '',
    onTriggerOcr,
    onClose,
    className = '',
}) {
    const [copied, setCopied]         = useState(false);
    const [localSearch, setLocalSearch] = useState('');
    const [activeTab, setActiveTab]   = useState('text'); // text | structured
    const textRef = useRef(null);

    const ocrStatus   = document?.ocr_status ?? 'none';
    const textContent = document?.text_content ?? '';
    const ocrData     = document?.ocr_data ?? {};

    const effectiveSearch = localSearch || searchTerm;

    // ── Copier le texte ────────────────────────────────────────────────────
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(textContent).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [textContent]);

    // ── Surligner les occurrences du terme recherché ─────────────────────
    const highlightText = useCallback((text, term) => {
        if (!term || !text) return text;
        const regex  = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const parts  = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part)
                ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{part}</mark>
                : part
        );
    }, []);

    // ── Nombre d'occurrences ───────────────────────────────────────────────
    const occurrenceCount = useCallback(() => {
        if (!effectiveSearch || !textContent) return 0;
        const regex = new RegExp(effectiveSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        return (textContent.match(regex) || []).length;
    }, [effectiveSearch, textContent])();

    // ── Données structurées (factures) ────────────────────────────────────
    const structuredData = ocrData?.structured;

    return (
        <div className={`flex flex-col h-full bg-white border-l border-gray-100 ${className}`}>

            {/* ── En-tête ── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold text-gray-800 text-sm">Contenu OCR</span>
                    <OcrStatusBadge status={ocrStatus} />
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <XMarkIcon className="w-4 h-4" />
                </button>
            </div>

            {/* ── Métadonnées OCR ── */}
            {ocrData && (ocrData.confidence || ocrData.language || ocrData.pages) && (
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                    {ocrData.confidence && (
                        <span title="Confiance de l'OCR">
                            {ocrData.confidence >= 95 ? '🟢' : ocrData.confidence >= 75 ? '🟡' : '🔴'} {Math.round(ocrData.confidence)}%
                        </span>
                    )}
                    {ocrData.language && (
                        <span>🌐 {ocrData.language === 'fr' ? 'Français' : 'Anglais'}</span>
                    )}
                    {ocrData.pages && (
                        <span>📄 {ocrData.pages} page{ocrData.pages > 1 ? 's' : ''}</span>
                    )}
                    {ocrData.processed_at && (
                        <span title={`Traité le ${new Date(ocrData.processed_at).toLocaleString('fr-FR')}`}>
                            <ClockIcon className="w-3 h-3 inline" /> {new Date(ocrData.processed_at).toLocaleDateString('fr-FR')}
                        </span>
                    )}
                </div>
            )}

            {/* ── Onglets ── */}
            {structuredData && (
                <div className="flex border-b border-gray-100 flex-shrink-0">
                    {[
                        { id: 'text',       label: 'Texte brut' },
                        { id: 'structured', label: 'Données extraites' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 text-xs font-medium transition-colors border-b-2
                                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Corps selon le statut ── */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">

                {/* STATUT : none */}
                {ocrStatus === 'none' && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
                        <DocumentTextIcon className="w-12 h-12 text-gray-200" />
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Texte non extrait</p>
                            <p className="text-gray-400 text-xs mt-1">L'OCR n'a pas encore été lancé sur ce document.</p>
                        </div>
                        {onTriggerOcr && (
                            <button
                                onClick={onTriggerOcr}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm
                                           font-medium hover:bg-blue-700 transition-colors"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                Lancer l'OCR
                            </button>
                        )}
                    </div>
                )}

                {/* STATUT : pending / processing */}
                {(ocrStatus === 'pending' || ocrStatus === 'processing') && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-gray-600 text-sm font-medium">
                            {ocrStatus === 'pending' ? 'En attente de traitement...' : 'Extraction du texte en cours...'}
                        </p>
                        <p className="text-gray-400 text-xs">Vous serez notifié quand le traitement sera terminé.</p>
                    </div>
                )}

                {/* STATUT : failed */}
                {ocrStatus === 'failed' && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                        </div>
                        <div>
                            <p className="text-gray-700 text-sm font-medium">Échec de l'extraction</p>
                            <p className="text-gray-400 text-xs mt-1">
                                {ocrData?.error ?? 'Une erreur est survenue lors du traitement OCR.'}
                            </p>
                        </div>
                        {onTriggerOcr && (
                            <button
                                onClick={onTriggerOcr}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm
                                           font-medium hover:bg-red-700 transition-colors"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                Réessayer
                            </button>
                        )}
                    </div>
                )}

                {/* STATUT : done */}
                {ocrStatus === 'done' && (
                    <>
                        {/* Barre de recherche locale */}
                        <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    value={localSearch}
                                    onChange={e => setLocalSearch(e.target.value)}
                                    placeholder="Rechercher dans le texte..."
                                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg
                                               focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                                />
                                {effectiveSearch && (
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                        {occurrenceCount} rés.
                                    </span>
                                )}
                            </div>
                        </div>

                        {activeTab === 'text' && (
                            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
                                {/* Barre d'actions */}
                                <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-50 flex-shrink-0">
                                    <span className="text-xs text-gray-400">
                                        {textContent.length.toLocaleString('fr-FR')} caractères
                                    </span>
                                    <button
                                        onClick={handleCopy}
                                        disabled={!textContent}
                                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
                                    >
                                        {copied
                                            ? <><CheckIcon className="w-3.5 h-3.5 text-green-500" /> Copié</>
                                            : <><ClipboardDocumentIcon className="w-3.5 h-3.5" /> Copier</>
                                        }
                                    </button>
                                </div>

                                {/* Texte extrait */}
                                <div ref={textRef} className="flex-1 overflow-y-auto p-4">
                                    {textContent ? (
                                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
                                            {effectiveSearch
                                                ? highlightText(textContent, effectiveSearch)
                                                : textContent
                                            }
                                        </p>
                                    ) : (
                                        <p className="text-gray-400 text-xs italic text-center mt-8">
                                            Aucun texte n'a pu être extrait de ce document.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'structured' && structuredData && (
                            <div className="flex-1 overflow-y-auto p-4">
                                <StructuredDataView data={structuredData} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Footer — relancer OCR ── */}
            {ocrStatus === 'done' && onTriggerOcr && (
                <div className="px-4 py-2 border-t border-gray-100 flex-shrink-0">
                    <button
                        onClick={onTriggerOcr}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-400
                                   hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        Relancer l'extraction
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Sous-composant : badge de statut ────────────────────────────────────────

function OcrStatusBadge({ status }) {
    const config = {
        none:       { label: 'Non traité',   color: 'bg-gray-100 text-gray-500' },
        pending:    { label: 'En attente',   color: 'bg-yellow-100 text-yellow-700' },
        processing: { label: 'En cours...',  color: 'bg-blue-100 text-blue-700' },
        done:       { label: 'Extrait',      color: 'bg-green-100 text-green-700' },
        failed:     { label: 'Échec',        color: 'bg-red-100 text-red-700' },
    }[status] ?? { label: status, color: 'bg-gray-100 text-gray-500' };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {status === 'processing' && (
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1" />
            )}
            {config.label}
        </span>
    );
}

// ── Sous-composant : données structurées ────────────────────────────────────

function StructuredDataView({ data }) {
    const labels = {
        invoice_number: 'N° Facture',
        date:           'Date',
        due_date:       'Échéance',
        supplier:       'Fournisseur',
        client:         'Client',
        total_ht:       'Montant HT',
        tax_rate:       'Taux TVA',
        tva_amount:     'Montant TVA',
        total_ttc:      'Total TTC',
        currency:       'Devise',
        subject:        'Objet',
        sender:         'Expéditeur',
        recipient:      'Destinataire',
        reference:      'Référence',
        start_date:     'Date début',
        end_date:       'Date fin',
        amount:         'Montant',
    };

    const entries = Object.entries(data).filter(([k, v]) => k !== 'type' && v !== null && v !== '');

    if (entries.length === 0) {
        return <p className="text-gray-400 text-xs italic text-center mt-8">Aucune donnée structurée extraite.</p>;
    }

    return (
        <div className="space-y-2">
            {data.type && (
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                    {data.type === 'invoice' ? 'Facture' : data.type === 'letter' ? 'Courrier' : 'Contrat'}
                </p>
            )}
            {entries.map(([key, value]) => (
                <div key={key} className="flex gap-2 py-1.5 border-b border-gray-50">
                    <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">
                        {labels[key] ?? key}
                    </span>
                    <span className="text-xs font-medium text-gray-800 flex-1">
                        {typeof value === 'number'
                            ? value.toLocaleString('fr-FR')
                            : String(value)}
                    </span>
                </div>
            ))}
        </div>
    );
}
