import { useState, useCallback } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    DocumentIcon,
    UserPlusIcon,
    XMarkIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ArrowsUpDownIcon,
    PaperAirplaneIcon,
    EyeIcon,
    CalendarDaysIcon,
    ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';

// ── Composant principal ─────────────────────────────────────────────────────

export default function SignatureRequestForm({ documents = [], users = [] }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        document_id:   '',
        title:         '',
        message:       '',
        signing_order: 'parallel',
        expires_at:    '',
        signers:       [],
    });

    const [step, setStep]   = useState(1); // 1: doc, 2: signers, 3: preview
    const [showPreview, setShowPreview] = useState(false);

    // Signataire externe en cours de saisie
    const [externalSigner, setExternalSigner] = useState({ name: '', email: '' });
    const [signerError, setSignerError] = useState('');

    // ── Sélection du document ──────────────────────────────────────────────
    const selectedDoc = documents.find(d => d.id === parseInt(data.document_id));

    // ── Gestion des signataires ────────────────────────────────────────────
    const addInternalSigner = useCallback((user) => {
        if (data.signers.some(s => s.user_id === user.id)) return;
        setData('signers', [
            ...data.signers,
            {
                user_id: user.id,
                name:    user.name,
                email:   user.email,
                order:   data.signers.length + 1,
            },
        ]);
    }, [data.signers, setData]);

    const addExternalSigner = useCallback(() => {
        setSignerError('');
        if (!externalSigner.name.trim()) {
            setSignerError('Le nom est requis.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(externalSigner.email)) {
            setSignerError('Adresse email invalide.');
            return;
        }
        if (data.signers.some(s => s.email === externalSigner.email)) {
            setSignerError('Ce signataire est déjà dans la liste.');
            return;
        }
        setData('signers', [
            ...data.signers,
            {
                user_id: null,
                name:    externalSigner.name.trim(),
                email:   externalSigner.email.trim(),
                order:   data.signers.length + 1,
            },
        ]);
        setExternalSigner({ name: '', email: '' });
    }, [data.signers, externalSigner, setData]);

    const removeSigner = useCallback((index) => {
        const updated = data.signers.filter((_, i) => i !== index)
            .map((s, i) => ({ ...s, order: i + 1 }));
        setData('signers', updated);
    }, [data.signers, setData]);

    const moveSigner = useCallback((index, direction) => {
        const arr = [...data.signers];
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= arr.length) return;
        [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
        setData('signers', arr.map((s, i) => ({ ...s, order: i + 1 })));
    }, [data.signers, setData]);

    // ── Soumission ────────────────────────────────────────────────────────
    const handleSubmit = (e) => {
        e.preventDefault();
        post('/signatures/requests', {
            onSuccess: () => router.visit('/signatures/requests'),
        });
    };

    // ── Validation étape ─────────────────────────────────────────────────
    const step1Valid = data.document_id && data.title.trim();
    const step2Valid = data.signers.length > 0;

    return (
        <AppLayout>
            <Head title="Nouvelle demande de signature" />

            <div className="max-w-4xl mx-auto px-4 py-6">

                {/* ── En-tête ── */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Nouvelle demande de signature</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Sélectionnez un document et invitez des signataires.
                    </p>
                </div>

                {/* ── Indicateur d'étapes ── */}
                <div className="flex items-center gap-3 mb-8">
                    {[
                        { n: 1, label: 'Document' },
                        { n: 2, label: 'Signataires' },
                        { n: 3, label: 'Confirmation' },
                    ].map(({ n, label }) => (
                        <div key={n} className="flex items-center gap-2">
                            <button
                                onClick={() => step > n && setStep(n)}
                                className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center transition-colors
                                    ${step === n ? 'bg-purple-600 text-white' :
                                      step > n  ? 'bg-green-500 text-white cursor-pointer' :
                                      'bg-gray-100 text-gray-400 cursor-default'}`}
                            >
                                {step > n ? '✓' : n}
                            </button>
                            <span className={`text-sm font-medium hidden sm:block
                                ${step === n ? 'text-purple-600' : step > n ? 'text-green-600' : 'text-gray-400'}`}>
                                {label}
                            </span>
                            {n < 3 && <div className="w-8 h-px bg-gray-200 hidden sm:block" />}
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit}>

                    {/* ═══════════════════════════════════════════════
                        ÉTAPE 1 — DOCUMENT & PARAMÈTRES
                    ═══════════════════════════════════════════════ */}
                    {step === 1 && (
                        <div className="space-y-6">

                            {/* Sélection du document */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <DocumentIcon className="w-5 h-5 text-purple-500" />
                                    Document à signer
                                </h2>

                                {documents.length === 0 ? (
                                    <p className="text-gray-400 text-sm">Aucun document disponible dans la GED.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                                        {documents.map(doc => (
                                            <button
                                                key={doc.id}
                                                type="button"
                                                onClick={() => {
                                                    setData('document_id', doc.id);
                                                    if (!data.title) setData('title', `Signature — ${doc.title}`);
                                                }}
                                                className={`text-left p-3 rounded-xl border-2 transition-all
                                                    ${data.document_id === doc.id
                                                        ? 'border-purple-500 bg-purple-50'
                                                        : 'border-gray-100 hover:border-purple-200 bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">📄</span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                                                        <p className="text-xs text-gray-400 truncate">{doc.file_name}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {errors.document_id && <p className="text-red-500 text-xs mt-2">{errors.document_id}</p>}
                            </div>

                            {/* Titre & message */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Titre de la demande *
                                    </label>
                                    <input
                                        type="text"
                                        value={data.title}
                                        onChange={e => setData('title', e.target.value)}
                                        placeholder="Ex : Contrat de prestation — Société ACME"
                                        maxLength={255}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400
                                                   focus:ring-2 focus:ring-purple-100 outline-none text-sm transition-colors"
                                    />
                                    {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                        <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                                        Message aux signataires
                                    </label>
                                    <textarea
                                        value={data.message}
                                        onChange={e => setData('message', e.target.value)}
                                        rows={3}
                                        placeholder="Instructions ou contexte pour les signataires..."
                                        maxLength={2000}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400
                                                   focus:ring-2 focus:ring-purple-100 outline-none text-sm resize-none transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Ordre de signature */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Ordre de signature
                                        </label>
                                        <select
                                            value={data.signing_order}
                                            onChange={e => setData('signing_order', e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400
                                                       focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                                        >
                                            <option value="parallel">Parallèle — tous signent en même temps</option>
                                            <option value="sequential">Séquentiel — dans l'ordre défini</option>
                                        </select>
                                    </div>

                                    {/* Date d'expiration */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                            <CalendarDaysIcon className="w-4 h-4" />
                                            Date d'expiration
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={data.expires_at}
                                            onChange={e => setData('expires_at', e.target.value)}
                                            min={new Date().toISOString().slice(0, 16)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400
                                                       focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    disabled={!step1Valid}
                                    onClick={() => setStep(2)}
                                    className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-sm
                                               hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Suivant : Signataires →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════
                        ÉTAPE 2 — SIGNATAIRES
                    ═══════════════════════════════════════════════ */}
                    {step === 2 && (
                        <div className="space-y-6">

                            {/* Signataires internes */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <UserPlusIcon className="w-5 h-5 text-purple-500" />
                                    Signataires internes (annuaire)
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                                    {users.map(user => {
                                        const added = data.signers.some(s => s.user_id === user.id);
                                        return (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => added ? null : addInternalSigner(user)}
                                                disabled={added}
                                                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-sm
                                                    ${added
                                                        ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
                                                        : 'border-gray-100 hover:border-purple-200 bg-gray-50 text-gray-700'
                                                    }`}
                                            >
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                                                    ${added ? 'bg-green-500 text-white' : 'bg-purple-100 text-purple-700'}`}>
                                                    {added ? '✓' : user.name?.[0]?.toUpperCase()}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate">{user.name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Signataire externe */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                <h2 className="font-semibold text-gray-800 mb-4">Ajouter un signataire externe</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        value={externalSigner.name}
                                        onChange={e => setExternalSigner(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Nom complet"
                                        className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400
                                                   focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                                    />
                                    <input
                                        type="email"
                                        value={externalSigner.email}
                                        onChange={e => setExternalSigner(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="Email"
                                        className="px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400
                                                   focus:ring-2 focus:ring-purple-100 outline-none text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={addExternalSigner}
                                        className="px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium
                                                   hover:bg-gray-700 transition-colors"
                                    >
                                        + Ajouter
                                    </button>
                                </div>
                                {signerError && <p className="text-red-500 text-xs mt-2">{signerError}</p>}
                            </div>

                            {/* Liste des signataires ajoutés */}
                            {data.signers.length > 0 && (
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                    <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <ArrowsUpDownIcon className="w-5 h-5 text-gray-400" />
                                        Ordre de signature
                                        {data.signing_order === 'sequential' && (
                                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                                Séquentiel — glissez pour réordonner
                                            </span>
                                        )}
                                    </h2>
                                    <div className="space-y-2">
                                        {data.signers.map((signer, i) => (
                                            <div
                                                key={`${signer.email}-${i}`}
                                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                                            >
                                                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold
                                                                 flex items-center justify-center flex-shrink-0">
                                                    {signer.order}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-800">{signer.name}</p>
                                                    <p className="text-xs text-gray-400">{signer.email}</p>
                                                </div>
                                                {data.signing_order === 'sequential' && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <button type="button" onClick={() => moveSigner(i, -1)} disabled={i === 0}
                                                            className="p-0.5 text-gray-400 hover:text-purple-600 disabled:opacity-30">
                                                            <ChevronUpIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button type="button" onClick={() => moveSigner(i, 1)} disabled={i === data.signers.length - 1}
                                                            className="p-0.5 text-gray-400 hover:text-purple-600 disabled:opacity-30">
                                                            <ChevronDownIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                                <button type="button" onClick={() => removeSigner(i)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                                                    <XMarkIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {errors.signers && <p className="text-red-500 text-sm">{errors.signers}</p>}

                            <div className="flex justify-between">
                                <button type="button" onClick={() => setStep(1)}
                                    className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
                                    ← Retour
                                </button>
                                <button type="button" disabled={!step2Valid} onClick={() => setStep(3)}
                                    className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-sm
                                               hover:bg-purple-700 disabled:opacity-50 transition-colors">
                                    Suivant : Confirmer →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════
                        ÉTAPE 3 — PRÉVISUALISATION & ENVOI
                    ═══════════════════════════════════════════════ */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                                <h2 className="font-semibold text-gray-800 mb-2">Récapitulatif</h2>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Document</p>
                                        <p className="font-medium">{selectedDoc?.title ?? '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Titre</p>
                                        <p className="font-medium">{data.title}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Ordre</p>
                                        <p className="font-medium">{data.signing_order === 'sequential' ? 'Séquentiel' : 'Parallèle'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Expire</p>
                                        <p className="font-medium">
                                            {data.expires_at
                                                ? new Date(data.expires_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                                                : 'Dans 30 jours'}
                                        </p>
                                    </div>
                                </div>

                                {data.message && (
                                    <div className="bg-purple-50 rounded-xl p-3 text-sm text-purple-800 border border-purple-100">
                                        {data.message}
                                    </div>
                                )}

                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">
                                        {data.signers.length} signataire{data.signers.length > 1 ? 's' : ''}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {data.signers.map((s, i) => (
                                            <span key={i}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                                <span className="w-4 h-4 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                                                    {s.order}
                                                </span>
                                                {s.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                                <strong>Important :</strong> Un email sera envoyé immédiatement à chaque signataire avec un lien
                                de signature sécurisé. Vérifiez les informations avant d'envoyer.
                            </div>

                            <div className="flex justify-between">
                                <button type="button" onClick={() => setStep(2)}
                                    className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
                                    ← Retour
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl
                                               font-medium text-sm hover:bg-green-700 disabled:opacity-60 transition-colors"
                                >
                                    {processing ? (
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <PaperAirplaneIcon className="w-4 h-4" />
                                    )}
                                    Envoyer les invitations
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </AppLayout>
    );
}
export { SignatureRequestForm };
