import { useState } from 'react';
import {
    TagIcon,
    FolderOpenIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    PencilSquareIcon,
    SparklesIcon,
    LockClosedIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

/**
 * ClassificationPanel — Panneau de classification automatique d'un document
 *
 * Props :
 *   document         — objet document avec classification_suggestions
 *   onAccept         — callback(suggestions) : l'utilisateur accepte toutes les suggestions
 *   onUpdate         — callback(field, value) : l'utilisateur modifie un champ
 *   className        — classes CSS supplémentaires
 */

const CATEGORIES = [
    'CONTRAT', 'FACTURE', 'COURRIER', 'RAPPORT', 'PV_REUNION',
    'FICHE_RH', 'BON_COMMANDE', 'DEVIS', 'DECISION', 'AUTRE',
];

const CONFIDENTIALITY_LEVELS = [
    { value: 'public',       label: 'Public',        color: 'bg-green-100 text-green-800' },
    { value: 'internal',     label: 'Interne',       color: 'bg-blue-100 text-blue-800' },
    { value: 'confidential', label: 'Confidentiel',  color: 'bg-yellow-100 text-yellow-800' },
    { value: 'secret',       label: 'Secret',        color: 'bg-red-100 text-red-800' },
];

const CATEGORY_COLORS = {
    CONTRAT:      'bg-purple-100 text-purple-800',
    FACTURE:      'bg-blue-100 text-blue-800',
    COURRIER:     'bg-teal-100 text-teal-800',
    RAPPORT:      'bg-indigo-100 text-indigo-800',
    PV_REUNION:   'bg-orange-100 text-orange-800',
    FICHE_RH:     'bg-pink-100 text-pink-800',
    BON_COMMANDE: 'bg-cyan-100 text-cyan-800',
    DEVIS:        'bg-lime-100 text-lime-800',
    DECISION:     'bg-amber-100 text-amber-800',
    AUTRE:        'bg-gray-100 text-gray-800',
};

function ConfidenceBadge({ value }) {
    const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-yellow-500' : 'bg-red-500';
    return (
        <div className="flex items-center gap-1.5">
            <div className="relative w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`absolute inset-y-0 left-0 ${color} rounded-full transition-all`}
                    style={{ width: `${value}%` }}
                />
            </div>
            <span className="text-xs font-medium text-gray-600">{value} %</span>
        </div>
    );
}

export default function ClassificationPanel({
    document,
    onAccept,
    onUpdate,
    className = '',
}) {
    const suggestions = document?.classification_suggestions ?? {};
    const hasDuplicates = document?.has_duplicates || suggestions?.duplicates?.exact?.length > 0
        || suggestions?.duplicates?.similar?.length > 0;

    const [localCategory, setLocalCategory]       = useState(suggestions.category ?? 'AUTRE');
    const [localConf, setLocalConf]               = useState(suggestions.confidentiality ?? 'internal');
    const [localFolder, setLocalFolder]           = useState(suggestions.folder ?? '');
    const [localTags, setLocalTags]               = useState(suggestions.tags ?? []);
    const [newTag, setNewTag]                     = useState('');
    const [editingMeta, setEditingMeta]           = useState(false);
    const [localMeta, setLocalMeta]               = useState(suggestions.metadata ?? {});
    const [accepted, setAccepted]                 = useState(false);

    const confidence  = suggestions.confidence ?? 0;
    const method      = suggestions.method ?? 'regex';
    const classifiedAt = suggestions.classified_at;

    function handleAccept() {
        const payload = {
            category:        localCategory,
            confidentiality: localConf,
            folder:          localFolder,
            tags:            localTags,
            metadata:        localMeta,
        };
        onAccept?.(payload);
        setAccepted(true);
    }

    function addTag(e) {
        e.preventDefault();
        const tag = newTag.trim().toLowerCase();
        if (tag && !localTags.includes(tag)) {
            const next = [...localTags, tag];
            setLocalTags(next);
            onUpdate?.('tags', next);
        }
        setNewTag('');
    }

    function removeTag(tag) {
        const next = localTags.filter(t => t !== tag);
        setLocalTags(next);
        onUpdate?.('tags', next);
    }

    function updateMeta(key, value) {
        const next = { ...localMeta, [key]: value };
        setLocalMeta(next);
    }

    const confLevel = CONFIDENTIALITY_LEVELS.find(l => l.value === localConf)
        ?? CONFIDENTIALITY_LEVELS[1];

    if (!suggestions.category) {
        return (
            <div className={`rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center ${className}`}>
                <SparklesIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                    Classification en cours…<br />
                    Le document sera automatiquement analysé après le traitement OCR.
                </p>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* En-tête */}
            <div className="flex items-center gap-2 mb-1">
                <SparklesIcon className="h-5 w-5 text-indigo-500" />
                <h3 className="font-semibold text-gray-800">Classification automatique</h3>
                {method === 'llm' && (
                    <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        IA
                    </span>
                )}
            </div>

            {/* Alerte doublons */}
            {hasDuplicates && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-amber-800">Doublon potentiel détecté</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            {suggestions.duplicates?.exact?.length > 0
                                ? `${suggestions.duplicates.exact.length} document(s) identique(s) trouvé(s).`
                                : `${suggestions.duplicates?.similar?.length ?? 0} document(s) similaire(s) (≥ 90 %).`
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Catégorie */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Catégorie</span>
                    <ConfidenceBadge value={confidence} />
                </div>
                <select
                    value={localCategory}
                    onChange={e => {
                        setLocalCategory(e.target.value);
                        onUpdate?.('category', e.target.value);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c.replace('_', ' ')}</option>
                    ))}
                </select>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[localCategory]}`}>
                    {localCategory.replace('_', ' ')}
                </span>
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-1">
                    <TagIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {localTags.map(tag => (
                        <span
                            key={tag}
                            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full"
                        >
                            {tag}
                            <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                                <XMarkIcon className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
                <form onSubmit={addTag} className="flex gap-2">
                    <input
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        placeholder="Ajouter un tag…"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        type="submit"
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700"
                    >
                        +
                    </button>
                </form>
            </div>

            {/* Confidentialité */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-1">
                    <LockClosedIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confidentialité</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {CONFIDENTIALITY_LEVELS.map(level => (
                        <button
                            key={level.value}
                            onClick={() => {
                                setLocalConf(level.value);
                                onUpdate?.('access_level', level.value);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                                ${localConf === level.value
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                }`}
                        >
                            {localConf === level.value && (
                                <CheckCircleSolid className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            )}
                            <span className={`px-1.5 py-0.5 rounded ${level.color}`}>{level.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Dossier suggéré */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
                <div className="flex items-center gap-1">
                    <FolderOpenIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dossier GED suggéré</span>
                </div>
                <input
                    value={localFolder}
                    onChange={e => {
                        setLocalFolder(e.target.value);
                        onUpdate?.('folder', e.target.value);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Métadonnées extraites */}
            {Object.keys(localMeta).length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Métadonnées extraites
                        </span>
                        <button
                            onClick={() => setEditingMeta(!editingMeta)}
                            className="text-indigo-600 hover:text-indigo-800"
                        >
                            <PencilSquareIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <dl className="space-y-2">
                        {Object.entries(localMeta).map(([key, value]) => (
                            value != null && (
                                <div key={key} className="flex items-start gap-2">
                                    <dt className="w-32 shrink-0 text-xs text-gray-500 capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </dt>
                                    {editingMeta ? (
                                        <input
                                            value={Array.isArray(value) ? value.join(', ') : String(value)}
                                            onChange={e => updateMeta(key, e.target.value)}
                                            className="flex-1 rounded border border-gray-300 px-2 py-0.5 text-xs"
                                        />
                                    ) : (
                                        <dd className="flex-1 text-xs text-gray-800 font-medium break-words">
                                            {Array.isArray(value) ? value.join(', ') : String(value)}
                                        </dd>
                                    )}
                                </div>
                            )
                        ))}
                    </dl>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
                {accepted ? (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                        <CheckCircleSolid className="h-5 w-5" />
                        Suggestions acceptées
                    </div>
                ) : (
                    <button
                        onClick={handleAccept}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                    >
                        <CheckCircleIcon className="h-5 w-5" />
                        Accepter les suggestions
                    </button>
                )}
            </div>

            {classifiedAt && (
                <p className="text-center text-xs text-gray-400">
                    Classifié le {new Date(classifiedAt).toLocaleString('fr-FR')}
                    {method === 'llm' ? ' · par IA' : ' · par règles'}
                </p>
            )}
        </div>
    );
}
