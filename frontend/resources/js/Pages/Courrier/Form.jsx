import { useState, useRef, useCallback } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    PaperClipIcon,
    XMarkIcon,
    CloudArrowUpIcon,
    ArrowLeftIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_MB = 20;
const MAX_FILES        = 10;

const ACCEPTED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
].join(',');

// ---------------------------------------------------------------------------
// Composants réutilisables
// ---------------------------------------------------------------------------

function FormField({ label, required, error, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {children}
            {error && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <ExclamationCircleIcon className="h-3.5 w-3.5" />
                    {error}
                </p>
            )}
        </div>
    );
}

function Input({ className = '', ...props }) {
    return (
        <input
            className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-colors focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 ${className}`}
            {...props}
        />
    );
}

function Select({ children, className = '', ...props }) {
    return (
        <select
            className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}

function FileItem({ file, onRemove }) {
    const sizeKB = (file.size / 1024).toFixed(0);
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);

    return (
        <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
            <PaperClipIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700">{file.name}</p>
                <p className="text-xs text-gray-400">{sizeMB > 1 ? `${sizeMB} Mo` : `${sizeKB} Ko`}</p>
            </div>
            <button
                type="button"
                onClick={onRemove}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
                <XMarkIcon className="h-4 w-4" />
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Zone de drop de fichiers
// ---------------------------------------------------------------------------

function DropZone({ files, onChange }) {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    const handleFiles = useCallback((newFiles) => {
        const validFiles = Array.from(newFiles).filter(file => {
            if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
                alert(`${file.name} dépasse la limite de ${MAX_FILE_SIZE_MB} Mo`);
                return false;
            }
            return true;
        });

        const combined = [...files, ...validFiles].slice(0, MAX_FILES);
        onChange(combined);
    }, [files, onChange]);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleRemove = (index) => {
        onChange(files.filter((_, i) => i !== index));
    };

    return (
        <div>
            {/* Zone de drop */}
            <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                    isDragging
                        ? 'border-purple-400 bg-purple-50'
                        : 'border-gray-200 bg-gray-50 hover:border-purple-300 hover:bg-purple-50'
                }`}
            >
                <CloudArrowUpIcon className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-600">
                    Glissez-déposez vos fichiers ici
                </p>
                <p className="mt-1 text-xs text-gray-400">
                    ou <span className="text-purple-600 underline">parcourir</span> — PDF, Word, Excel, images
                </p>
                <p className="mt-1 text-xs text-gray-400">
                    Max {MAX_FILE_SIZE_MB} Mo par fichier — {MAX_FILES} fichiers max
                </p>

                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_MIME_TYPES}
                    className="hidden"
                    onChange={e => handleFiles(e.target.files)}
                />
            </div>

            {/* Liste des fichiers sélectionnés */}
            {files.length > 0 && (
                <div className="mt-3 space-y-2">
                    {files.map((file, index) => (
                        <FileItem
                            key={`${file.name}-${index}`}
                            file={file}
                            onRemove={() => handleRemove(index)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Formulaire principal
// ---------------------------------------------------------------------------

export default function CourrierForm({ departments = [], users = [], editMode = false, courrier = null }) {
    const urlParams   = new URLSearchParams(window.location.search);
    const defaultType = courrier?.type || urlParams.get('type') || 'incoming';

    const [files, setFiles] = useState([]);
    const [submitted, setSubmitted] = useState(false);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        type:                  defaultType,
        sender_name:           courrier?.sender_name || '',
        sender_org:            courrier?.sender_org || '',
        recipient_name:        courrier?.recipient_name || '',
        recipient_org:         courrier?.recipient_org || '',
        subject:               courrier?.subject || '',
        urgency:               courrier?.urgency || 'normal',
        received_at:           courrier?.received_at?.slice(0, 10) || '',
        sent_at:               courrier?.sent_at?.slice(0, 10) || '',
        department_id:         courrier?.department_id || '',
        assigned_to_id:        courrier?.assigned_to_id || '',
        notes:                 courrier?.notes || '',
        processing_delay_days: courrier?.processing_delay_days || 3,
    });

    const isIncoming = data.type === 'incoming';

    const handleSubmit = (e) => {
        e.preventDefault();

        const formData = new FormData();

        // Ajouter les champs
        Object.entries(data).forEach(([key, val]) => {
            if (val !== '' && val !== null) formData.append(key, val);
        });

        // Ajouter les fichiers
        files.forEach(file => formData.append('attachments[]', file));

        if (editMode && courrier?.id) {
            post(`/courrier/${courrier.id}`, {
                data: formData,
                onSuccess: () => setSubmitted(true),
            });
        } else {
            post('/courrier', {
                data: formData,
                onSuccess: () => setSubmitted(true),
            });
        }
    };

    if (submitted) {
        return (
            <AppLayout>
                <div className="flex min-h-[60vh] items-center justify-center">
                    <div className="text-center">
                        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
                        <h2 className="mt-4 text-xl font-semibold text-gray-800">Courrier enregistré !</h2>
                        <p className="mt-2 text-sm text-gray-500">Le courrier a été ajouté au registre avec succès.</p>
                        <div className="mt-6 flex justify-center gap-3">
                            <a href="/courrier" className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                Retour au registre
                            </a>
                            <button
                                onClick={() => { setSubmitted(false); reset(); setFiles([]); }}
                                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                            >
                                Nouveau courrier
                            </button>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <Head title={editMode ? 'Modifier le courrier' : 'Nouveau courrier'} />

            <div className="mx-auto max-w-3xl p-6">
                {/* En-tête */}
                <div className="mb-6 flex items-center gap-4">
                    <a href="/courrier" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </a>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {editMode ? 'Modifier le courrier' : 'Enregistrer un courrier'}
                        </h1>
                        <p className="mt-0.5 text-sm text-gray-500">
                            {editMode ? `Référence : ${courrier?.reference}` : 'La référence sera générée automatiquement'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Sélecteur de type */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                            Type de courrier
                        </h2>

                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { value: 'incoming', label: '← Courrier entrant', desc: 'Reçu d\'un expéditeur externe' },
                                { value: 'outgoing', label: '→ Courrier sortant', desc: 'Envoyé à un destinataire externe' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setData('type', opt.value)}
                                    disabled={editMode}
                                    className={`rounded-lg border-2 p-4 text-left transition-colors ${
                                        data.type === opt.value
                                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'
                                    } ${editMode ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                >
                                    <p className="font-semibold">{opt.label}</p>
                                    <p className="mt-0.5 text-xs opacity-75">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Informations principales */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                            Informations du courrier
                        </h2>

                        <div className="space-y-4">
                            <FormField label="Objet" required error={errors.subject}>
                                <Input
                                    value={data.subject}
                                    onChange={e => setData('subject', e.target.value)}
                                    placeholder="Objet du courrier"
                                    required
                                />
                            </FormField>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Urgence" required error={errors.urgency}>
                                    <Select
                                        value={data.urgency}
                                        onChange={e => setData('urgency', e.target.value)}
                                    >
                                        <option value="low">Faible</option>
                                        <option value="normal">Normale</option>
                                        <option value="high">Élevée</option>
                                        <option value="urgent">Urgente</option>
                                    </Select>
                                </FormField>

                                <FormField
                                    label={isIncoming ? 'Date de réception' : 'Date d\'envoi'}
                                    error={errors.received_at || errors.sent_at}
                                >
                                    <Input
                                        type="date"
                                        value={isIncoming ? data.received_at : data.sent_at}
                                        onChange={e => setData(isIncoming ? 'received_at' : 'sent_at', e.target.value)}
                                    />
                                </FormField>
                            </div>
                        </div>
                    </div>

                    {/* Correspondant */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                            {isIncoming ? 'Expéditeur' : 'Destinataire'}
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                label={isIncoming ? 'Nom de l\'expéditeur' : 'Nom du destinataire'}
                                error={errors.sender_name || errors.recipient_name}
                            >
                                <Input
                                    value={isIncoming ? data.sender_name : data.recipient_name}
                                    onChange={e => setData(isIncoming ? 'sender_name' : 'recipient_name', e.target.value)}
                                    placeholder="Prénom NOM"
                                />
                            </FormField>

                            <FormField
                                label="Organisation"
                                error={errors.sender_org || errors.recipient_org}
                            >
                                <Input
                                    value={isIncoming ? data.sender_org : data.recipient_org}
                                    onChange={e => setData(isIncoming ? 'sender_org' : 'recipient_org', e.target.value)}
                                    placeholder="Nom de l'organisation"
                                />
                            </FormField>
                        </div>
                    </div>

                    {/* Affectation interne */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                            Affectation interne
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Service destinataire" error={errors.department_id}>
                                <Select
                                    value={data.department_id}
                                    onChange={e => setData('department_id', e.target.value)}
                                >
                                    <option value="">Sélectionner un service</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </Select>
                            </FormField>

                            <FormField label="Assigné à" error={errors.assigned_to_id}>
                                <Select
                                    value={data.assigned_to_id}
                                    onChange={e => setData('assigned_to_id', e.target.value)}
                                >
                                    <option value="">Aucun agent assigné</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </Select>
                            </FormField>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <FormField label="Délai de traitement (jours)" error={errors.processing_delay_days}>
                                <Input
                                    type="number"
                                    min={1}
                                    max={90}
                                    value={data.processing_delay_days}
                                    onChange={e => setData('processing_delay_days', parseInt(e.target.value))}
                                />
                            </FormField>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                            Notes et observations
                        </h2>

                        <textarea
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                            placeholder="Notes internes, observations particulières…"
                            rows={4}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />

                        {errors.notes && (
                            <p className="mt-1 text-xs text-red-600">{errors.notes}</p>
                        )}
                    </div>

                    {/* Pièces jointes */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
                            Pièces jointes
                        </h2>

                        <DropZone files={files} onChange={setFiles} />

                        {errors.attachments && (
                            <p className="mt-2 text-xs text-red-600">{errors.attachments}</p>
                        )}
                    </div>

                    {/* Boutons */}
                    <div className="flex items-center justify-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                        <a
                            href="/courrier"
                            className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Annuler
                        </a>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60"
                        >
                            {processing && (
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            )}
                            {editMode ? 'Enregistrer les modifications' : 'Enregistrer le courrier'}
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
export { CourrierForm };
