/**
 * Courrier/Form.jsx — Enregistrement / modification d'un courrier
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier STRICTEMENT inchangée : mêmes champs `useForm`, même
 * `transform()` (renommage sender_org → sender_organization,
 * assigned_to_id → assigned_to), même `POST /courrier` en création
 * (forceFormData pour les pièces jointes) et même `PUT /courrier/{id}`
 * via axios en édition.
 */

import { useState, useRef, useCallback } from 'react';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    Paperclip, X, UploadCloud, CheckCircle2, AlertCircle, Plus,
    ArrowDownLeft, ArrowUpRight, Mail, FileText, Users,
} from 'lucide-react';
import {
    PageHeader, Button, Card,
    cx, CONTROL, BORDER, SURFACE_SUNK, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

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
// Champs de formulaire
// ---------------------------------------------------------------------------

function Field({ label, required, error, hint, children }) {
    return (
        <div>
            <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
                {label}
                {required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            {children}
            {hint && !error && <p className={cx('mt-1 text-xs', TEXT_FAINT)}>{hint}</p>}
            {error && (
                <p className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {error}
                </p>
            )}
        </div>
    );
}

const Input  = ({ className = '', ...props }) => <input  className={cx(CONTROL, 'h-10', className)} {...props} />;
const Select = ({ className = '', ...props }) => <select className={cx(CONTROL, 'h-10', className)} {...props} />;

function FileItem({ file, onRemove }) {
    const sizeKB = (file.size / 1024).toFixed(0);
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);

    return (
        <li className={cx('flex items-center gap-3 rounded-lg border px-3 py-2.5', BORDER, SURFACE_SUNK)}>
            <Paperclip className={cx('h-4 w-4 shrink-0', TEXT_FAINT)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className={cx('truncate text-sm font-medium', TEXT_TITLE)}>{file.name}</p>
                <p className={cx('text-xs', TEXT_MUTED, NUM)}>{sizeMB > 1 ? `${sizeMB} Mo` : `${sizeKB} Ko`}</p>
            </div>
            <Button
                type="button" variant="ghost" size="sm" iconOnly icon={X}
                title={`Retirer ${file.name}`}
                onClick={onRemove}
                className="hover:text-red-600 dark:hover:text-red-400"
            />
        </li>
    );
}

// ---------------------------------------------------------------------------
// Zone de dépôt de fichiers
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
            <button
                type="button"
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cx(
                    'w-full rounded-xl border border-dashed px-6 py-8 text-center transition-colors',
                    FOCUS_RING,
                    isDragging
                        ? 'border-purple-400 bg-purple-50 dark:border-purple-500/60 dark:bg-purple-500/10'
                        : cx(BORDER, SURFACE_SUNK, 'hover:border-purple-300 dark:hover:border-purple-500/40'),
                )}
            >
                <UploadCloud className={cx('mx-auto h-8 w-8', TEXT_FAINT)} strokeWidth={1.75} aria-hidden="true" />
                <span className={cx('mt-3 block text-sm font-medium', TEXT_TITLE)}>
                    Glissez-déposez vos fichiers ici
                </span>
                <span className={cx('mt-1 block text-xs', TEXT_MUTED)}>
                    ou <span className="font-medium text-purple-600 dark:text-purple-400">parcourez votre ordinateur</span>
                    {' '}— PDF, Word, Excel, images
                </span>
                <span className={cx('mt-1 block text-xs', TEXT_FAINT, NUM)}>
                    {MAX_FILE_SIZE_MB} Mo maximum par fichier · {MAX_FILES} fichiers au total
                </span>
            </button>

            <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_MIME_TYPES}
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
            />

            {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {files.map((file, index) => (
                        <FileItem
                            key={`${file.name}-${index}`}
                            file={file}
                            onRemove={() => handleRemove(index)}
                        />
                    ))}
                </ul>
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
    const [saving, setSaving] = useState(false);

    const { data, setData, post, processing, errors, reset, transform } = useForm({
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

    // Le contrôleur attend `sender_organization` / `recipient_organization` /
    // `assigned_to` : on renomme ici. `department_id` est désormais une vraie
    // colonne (migration 2026_08_08_000005) — il était jusqu'ici supprimé de la
    // charge utile, si bien que le champ « Service destinataire » de l'écran
    // n'était jamais enregistré.
    transform((d) => ({
        type:                  d.type,
        subject:               d.subject,
        urgency:               d.urgency,
        sender_name:           d.sender_name,
        sender_organization:   d.sender_org,
        recipient_name:        d.recipient_name,
        recipient_organization: d.recipient_org,
        received_at:           d.received_at || null,
        sent_at:               d.sent_at || null,
        assigned_to:           d.assigned_to_id || null,
        department_id:         d.department_id || null,
        notes:                 d.notes,
        processing_delay_days: d.processing_delay_days,
        attachments:           files,
    }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (editMode && courrier?.id) {
            // PUT /courrier/{id} renvoie du JSON → axios plutôt qu'Inertia.
            setSaving(true);
            try {
                await axios.put(`/courrier/${courrier.id}`, {
                    subject:      data.subject,
                    urgency:      data.urgency,
                    sender_name:  data.sender_name,
                    sender_organization: data.sender_org,
                    recipient_name: data.recipient_name,
                    recipient_organization: data.recipient_org,
                    received_at:  data.received_at || null,
                    sent_at:      data.sent_at || null,
                    notes:        data.notes,
                    // Champs éditables à l'écran : ils étaient jusqu'ici perdus à l'enregistrement.
                    type:         data.type,
                    assigned_to:  data.assigned_to_id || null,
                    department_id: data.department_id || null,
                    processing_delay_days: data.processing_delay_days || null,
                });
                setSubmitted(true);
            } catch (err) {
                alert(err.response?.data?.message ?? 'Erreur lors de la mise à jour du courrier.');
            } finally {
                setSaving(false);
            }
            return;
        }

        // Création : POST /courrier renvoie une redirection Inertia.
        post('/courrier', {
            forceFormData: true,
            onSuccess: () => setSubmitted(true),
        });
    };

    /* ─── Écran de confirmation ─────────────────────────────────────────────── */

    if (submitted) {
        return (
            <AppLayout>
                <Head title={editMode ? 'Courrier mis à jour' : 'Courrier enregistré'} />

                <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
                    <Card>
                        <div className="flex flex-col items-center px-2 py-6 text-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                                <CheckCircle2
                                    className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                />
                            </span>

                            <h2 className={cx('mt-4 text-lg font-semibold tracking-tight', TEXT_TITLE)}>
                                {editMode ? 'Courrier mis à jour' : 'Courrier enregistré'}
                            </h2>
                            <p className={cx('mt-1.5 max-w-sm text-sm leading-relaxed', TEXT_MUTED)}>
                                {editMode
                                    ? 'Les modifications ont bien été enregistrées dans le registre.'
                                    : 'Le courrier a été ajouté au registre. Sa référence a été générée automatiquement.'}
                            </p>

                            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                                <Button variant="secondary" href="/courrier">Retour au registre</Button>
                                {!editMode && (
                                    <Button
                                        variant="primary"
                                        icon={Plus}
                                        onClick={() => { setSubmitted(false); reset(); setFiles([]); }}
                                    >
                                        Enregistrer un autre courrier
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    /* ─── Formulaire ────────────────────────────────────────────────────────── */

    const typeOptions = [
        { value: 'incoming', label: 'Courrier entrant', desc: "Reçu d'un expéditeur externe", icon: ArrowDownLeft },
        { value: 'outgoing', label: 'Courrier sortant', desc: 'Envoyé à un destinataire externe', icon: ArrowUpRight },
    ];

    const busy = processing || saving;

    return (
        <AppLayout>
            <Head title={editMode ? 'Modifier le courrier' : 'Nouveau courrier'} />

            <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">

                <PageHeader
                    icon={Mail}
                    title={editMode ? 'Modifier le courrier' : 'Enregistrer un courrier'}
                    breadcrumbs={[
                        { label: 'Courrier', href: '/courrier' },
                        { label: editMode ? (courrier?.reference || 'Modification') : 'Nouveau' },
                    ]}
                    subtitle={editMode
                        ? `Référence ${courrier?.reference ?? '—'}`
                        : 'La référence du courrier sera générée automatiquement à l\'enregistrement.'}
                />

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Type de courrier */}
                    <Card title="Type de courrier" subtitle={editMode ? 'Le sens du courrier ne peut plus être modifié.' : "Choisissez le sens du courrier à enregistrer."}>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {typeOptions.map(({ value, label, desc, icon: Icon }) => {
                                const active = data.type === value;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setData('type', value)}
                                        disabled={editMode}
                                        aria-pressed={active}
                                        className={cx(
                                            'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                                            FOCUS_RING,
                                            active
                                                ? 'border-purple-300 bg-purple-50 dark:border-purple-500/50 dark:bg-purple-500/10'
                                                : cx(BORDER, SURFACE_SUNK, 'hover:bg-gray-100 dark:hover:bg-white/[0.05]'),
                                            editMode && 'cursor-not-allowed opacity-60',
                                        )}
                                    >
                                        <Icon
                                            className={cx(
                                                'mt-0.5 h-4 w-4 shrink-0',
                                                active ? 'text-purple-600 dark:text-purple-400' : TEXT_FAINT,
                                            )}
                                            aria-hidden="true"
                                        />
                                        <span className="min-w-0">
                                            <span className={cx(
                                                'block text-sm font-medium',
                                                active ? 'text-purple-700 dark:text-purple-300' : TEXT_TITLE,
                                            )}>
                                                {label}
                                            </span>
                                            <span className={cx('mt-0.5 block text-xs', TEXT_MUTED)}>{desc}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Informations principales */}
                    <Card title="Informations du courrier" icon={FileText}>
                        <div className="space-y-4">
                            <Field label="Objet" required error={errors.subject}>
                                <Input
                                    value={data.subject}
                                    onChange={e => setData('subject', e.target.value)}
                                    placeholder="Objet du courrier"
                                    required
                                />
                            </Field>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Urgence" required error={errors.urgency}>
                                    <Select
                                        value={data.urgency}
                                        onChange={e => setData('urgency', e.target.value)}
                                    >
                                        <option value="low">Faible</option>
                                        <option value="normal">Normale</option>
                                        <option value="high">Élevée</option>
                                        <option value="urgent">Urgente</option>
                                    </Select>
                                </Field>

                                <Field
                                    label={isIncoming ? 'Date de réception' : 'Date d\'envoi'}
                                    error={errors.received_at || errors.sent_at}
                                >
                                    <Input
                                        type="date"
                                        className={NUM}
                                        value={isIncoming ? data.received_at : data.sent_at}
                                        onChange={e => setData(isIncoming ? 'received_at' : 'sent_at', e.target.value)}
                                    />
                                </Field>
                            </div>
                        </div>
                    </Card>

                    {/* Correspondant */}
                    <Card
                        title={isIncoming ? 'Expéditeur' : 'Destinataire'}
                        subtitle={isIncoming
                            ? "Qui vous a adressé ce courrier ?"
                            : 'À qui ce courrier est-il adressé ?'}
                    >
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field
                                label={isIncoming ? 'Nom de l\'expéditeur' : 'Nom du destinataire'}
                                error={errors.sender_name || errors.recipient_name}
                            >
                                <Input
                                    value={isIncoming ? data.sender_name : data.recipient_name}
                                    onChange={e => setData(isIncoming ? 'sender_name' : 'recipient_name', e.target.value)}
                                    placeholder="Prénom NOM"
                                />
                            </Field>

                            <Field
                                label="Organisation"
                                error={errors.sender_org || errors.recipient_org}
                            >
                                <Input
                                    value={isIncoming ? data.sender_org : data.recipient_org}
                                    onChange={e => setData(isIncoming ? 'sender_org' : 'recipient_org', e.target.value)}
                                    placeholder="Nom de l'organisation"
                                />
                            </Field>
                        </div>
                    </Card>

                    {/* Affectation interne */}
                    <Card title="Affectation interne" icon={Users}>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Service destinataire" error={errors.department_id}>
                                <Select
                                    value={data.department_id}
                                    onChange={e => setData('department_id', e.target.value)}
                                >
                                    <option value="">Sélectionner un service</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </Select>
                            </Field>

                            <Field label="Assigné à" error={errors.assigned_to_id}>
                                <Select
                                    value={data.assigned_to_id}
                                    onChange={e => setData('assigned_to_id', e.target.value)}
                                >
                                    <option value="">Aucun agent assigné</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </Select>
                            </Field>

                            <Field
                                label="Délai de traitement"
                                hint="En jours ouvrés — sert à calculer l'échéance."
                                error={errors.processing_delay_days}
                            >
                                <Input
                                    type="number"
                                    min={1}
                                    max={90}
                                    className={NUM}
                                    value={data.processing_delay_days}
                                    onChange={e => setData('processing_delay_days', parseInt(e.target.value))}
                                />
                            </Field>
                        </div>
                    </Card>

                    {/* Notes */}
                    <Card title="Notes et observations">
                        <Field label="Notes internes" error={errors.notes}>
                            <textarea
                                value={data.notes}
                                onChange={e => setData('notes', e.target.value)}
                                placeholder="Notes internes, observations particulières…"
                                rows={4}
                                className={cx(CONTROL, 'resize-y')}
                            />
                        </Field>
                    </Card>

                    {/* Pièces jointes */}
                    <Card
                        title="Pièces jointes"
                        icon={Paperclip}
                        subtitle={files.length > 0
                            ? `${files.length} fichier${files.length > 1 ? 's' : ''} sélectionné${files.length > 1 ? 's' : ''}`
                            : 'Numérisations, annexes et justificatifs du courrier.'}
                    >
                        <DropZone files={files} onChange={setFiles} />

                        {errors.attachments && (
                            <p className="mt-2 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                {errors.attachments}
                            </p>
                        )}
                    </Card>

                    {/* Barre d'actions */}
                    <Card padded={false}>
                        <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 sm:px-6">
                            <Button variant="secondary" href="/courrier">Annuler</Button>
                            <Button type="submit" variant="primary" loading={busy}>
                                {editMode ? 'Enregistrer les modifications' : 'Enregistrer le courrier'}
                            </Button>
                        </div>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
export { CourrierForm };
