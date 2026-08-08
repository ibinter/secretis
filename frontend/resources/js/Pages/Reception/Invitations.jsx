/**
 * Reception/Invitations.jsx — Invitations visiteurs
 *
 * Présentation migrée sur `@/Components/UI`.
 * Logique métier inchangée : mêmes appels (`POST /reception/invitations`,
 * `DELETE /api/v1/visitors/invitations/{id}`), même génération de QR code,
 * mêmes états locaux et mêmes payloads de formulaire.
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import QRCode from 'qrcode';
import {
    Mail, Plus, QrCode, X, Download, Calendar, Clock, MapPin, CheckCircle2,
} from 'lucide-react';
import {
    PageHeader, Button, Badge, Card, DataTable, EmptyState,
    cx, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT,
} from '@/Components/UI';

/* ─── Statuts dérivés ───────────────────────────────────────────────────────── */

const STATUS_META = {
    used:    { label: 'Utilisée',   tone: 'success' },
    expired: { label: 'Expirée',    tone: 'danger'  },
    pending: { label: 'En attente', tone: 'warning' },
};

const fmtDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '—'; }
};

const fmtTime = (iso) => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return null; }
};

// ─── Gestion des invitations visiteurs ───────────────────────────────────────
export default function Invitations({ invitations = { data: [] } }) {
    const [showForm, setShowForm]     = useState(false);
    const [loading, setLoading]       = useState(false);
    const [qrModal, setQrModal]       = useState(null); // { invitation, qrDataUrl }
    const [errors, setErrors]         = useState({});
    const [form, setForm]             = useState({
        visitor_name: '', visitor_email: '', visit_date: '', visit_time_start: '', visit_time_end: '',
        purpose: '', location: '',
    });

    const rows = Array.isArray(invitations) ? invitations : (invitations?.data ?? []);

    const getStatus = (inv) => {
        if (inv.is_used) return 'used';
        if (new Date(inv.expires_at) < new Date()) return 'expired';
        return 'pending';
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const { data } = await axios.post('/reception/invitations', form);
            await showQr(data.invitation);
            setShowForm(false);
            setForm({ visitor_name:'', visitor_email:'', visit_date:'', visit_time_start:'', visit_time_end:'', purpose:'', location:'' });
            router.reload({ only: ['invitations'] });
        } catch (e) {
            if (e.response?.status === 422) setErrors(e.response.data.errors);
        } finally {
            setLoading(false);
        }
    };

    const showQr = async (invitation) => {
        const url  = `${window.location.origin}/visitor-invitation/${invitation.access_code}`;
        const qrDataUrl = await QRCode.toDataURL(url, { width: 256, margin: 2 });
        setQrModal({ invitation, qrDataUrl, url });
    };

    const downloadQr = () => {
        const a = document.createElement('a');
        a.href     = qrModal.qrDataUrl;
        a.download = `invitation-${qrModal.invitation.visitor_name.replace(/\s+/g,'-')}.png`;
        a.click();
    };

    const field = (key) => ({
        value:    form[key],
        onChange: (e) => setForm(p => ({ ...p, [key]: e.target.value })),
        className: cx(
            CONTROL, 'h-10',
            errors[key] && 'border-red-400 focus:ring-red-500 dark:border-red-500/60',
        ),
    });

    /* ─── Colonnes ─────────────────────────────────────────────────────────── */

    const columns = [
        {
            key: 'visitor_name',
            label: 'Visiteur',
            render: (v, inv) => (
                <div className="min-w-0">
                    <p className={cx('truncate font-medium', TEXT_TITLE)}>{v || '—'}</p>
                    <p className={cx('flex items-center gap-1 truncate text-xs', TEXT_MUTED)}>
                        {inv.visitor_email
                            ? <><Mail className="h-3 w-3 shrink-0" />{inv.visitor_email}</>
                            : <span className={TEXT_FAINT}>Email non renseigné</span>}
                    </p>
                </div>
            ),
        },
        {
            key: 'visit_date',
            label: 'Date & horaires',
            nowrap: true,
            render: (v, inv) => (
                <div className="tabular-nums">
                    <p className="flex items-center gap-1.5">
                        <Calendar className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                        {fmtDate(v)}
                    </p>
                    <p className={cx('flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
                        <Clock className="h-3 w-3 shrink-0" />
                        {inv.visit_time_start || '—'} — {inv.visit_time_end || '—'}
                    </p>
                </div>
            ),
        },
        {
            key: 'purpose',
            label: 'Objet & lieu',
            render: (v, inv) => (
                <div className="min-w-0">
                    <p className="truncate">{v || <span className={TEXT_FAINT}>—</span>}</p>
                    {inv.location && (
                        <p className={cx('flex items-center gap-1 truncate text-xs', TEXT_MUTED)}>
                            <MapPin className="h-3 w-3 shrink-0" />{inv.location}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Statut',
            nowrap: true,
            render: (_v, inv) => {
                const meta    = STATUS_META[getStatus(inv)] ?? STATUS_META.pending;
                const checkIn = fmtTime(inv.visit_log?.check_in_at);
                return (
                    <div className="space-y-1">
                        <Badge variant={meta.tone} dot>{meta.label}</Badge>
                        {checkIn && (
                            <p className="flex items-center gap-1 text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                Arrivée à {checkIn}
                            </p>
                        )}
                    </div>
                );
            },
        },
    ];

    /* ─── Rendu ────────────────────────────────────────────────────────────── */

    return (
        <AppLayout>
            <Head title="Mes invitations" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

                <PageHeader
                    icon={Mail}
                    title="Mes invitations visiteurs"
                    breadcrumbs={[{ label: 'Réception' }, { label: 'Invitations' }]}
                    subtitle={`${rows.length} invitation${rows.length !== 1 ? 's' : ''} · chaque invitation génère un code d'accès pour la borne`}
                    actions={
                        <Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>
                            Inviter un visiteur
                        </Button>
                    }
                />

                <DataTable
                    columns={columns}
                    data={rows}
                    rowKey="id"
                    pageSize={rows.length || 10}
                    actionsLabel="Actions"
                    actions={(inv) => {
                        if (getStatus(inv) !== 'pending') {
                            return <span className={cx('text-xs', TEXT_FAINT)}>—</span>;
                        }
                        return (
                            <>
                                <Button
                                    variant="ghost" size="sm" iconOnly icon={QrCode}
                                    title="Afficher le QR code d'accès"
                                    onClick={() => showQr(inv)}
                                    className="text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-500/10"
                                />
                                <Button
                                    variant="ghost" size="sm" iconOnly icon={X}
                                    title="Annuler l'invitation"
                                    onClick={async () => {
                                        if (confirm('Annuler cette invitation ?')) {
                                            await axios.delete(`/api/v1/visitors/invitations/${inv.id}`);
                                            router.reload({ only: ['invitations'] });
                                        }
                                    }}
                                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                />
                            </>
                        );
                    }}
                    empty={
                        <EmptyState
                            icon={Mail}
                            title="Aucune invitation créée"
                            description="Invitez un visiteur : il reçoit un email avec un QR code qui lui permet de s'enregistrer seul à la borne d'accueil."
                            hints={[
                                'Le code d\'accès expire automatiquement après le créneau réservé.',
                                'L\'heure d\'arrivée réelle remonte ici dès le check-in du visiteur.',
                            ]}
                            action={
                                <Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>
                                    Créer ma première invitation
                                </Button>
                            }
                        />
                    }
                />
            </div>

            {/* Modal formulaire invitation */}
            {showForm && (
                <div
                    onClick={() => setShowForm(false)}
                    className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
                >
                    <form
                        onClick={e => e.stopPropagation()}
                        onSubmit={handleSubmit}
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto"
                    >
                        <Card
                            padded={false}
                            className="shadow-xl"
                            title="Nouvelle invitation"
                            subtitle="Les champs marqués d'un astérisque sont obligatoires."
                            actions={
                                <Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer"
                                        onClick={() => setShowForm(false)} />
                            }
                            footer={
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                                        Annuler
                                    </Button>
                                    <Button type="submit" variant="primary" loading={loading}>
                                        Envoyer l'invitation
                                    </Button>
                                </div>
                            }
                        >
                            <div className="space-y-4 px-4 py-4 sm:px-6">
                                <Fld label="Nom du visiteur *" error={errors.visitor_name}>
                                    <input {...field('visitor_name')} placeholder="Jean Dupont" required />
                                </Fld>
                                <Fld label="Email du visiteur *" error={errors.visitor_email}>
                                    <input {...field('visitor_email')} type="email" placeholder="jean@exemple.com" required />
                                </Fld>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <Fld label="Date de visite *" error={errors.visit_date}>
                                        <input {...field('visit_date')} type="date" required min={new Date().toISOString().split('T')[0]} />
                                    </Fld>
                                    <Fld label="Heure de début *" error={errors.visit_time_start}>
                                        <input {...field('visit_time_start')} type="time" required />
                                    </Fld>
                                    <Fld label="Heure de fin *" error={errors.visit_time_end}>
                                        <input {...field('visit_time_end')} type="time" required />
                                    </Fld>
                                </div>

                                <Fld label="Objet de la visite" error={errors.purpose}>
                                    <input {...field('purpose')} placeholder="Ex. réunion de projet" />
                                </Fld>
                                <Fld label="Lieu / salle" error={errors.location}>
                                    <input {...field('location')} placeholder="Ex. salle Athéna, 2ᵉ étage" />
                                </Fld>
                            </div>
                        </Card>
                    </form>
                </div>
            )}

            {/* Modal QR code */}
            {qrModal && (
                <div
                    onClick={() => setQrModal(null)}
                    className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
                >
                    <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
                        <Card
                            padded={false}
                            className="shadow-xl"
                            title="QR code d'accès"
                            subtitle={qrModal.invitation.visitor_name}
                            actions={
                                <Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer"
                                        onClick={() => setQrModal(null)} />
                            }
                            footer={
                                <div className="flex justify-end gap-2">
                                    <Button variant="secondary" onClick={() => setQrModal(null)}>Fermer</Button>
                                    <Button variant="primary" icon={Download} onClick={downloadQr}>Télécharger</Button>
                                </div>
                            }
                        >
                            <div className="px-4 py-5 text-center sm:px-6">
                                <img
                                    src={qrModal.qrDataUrl}
                                    alt="QR code d'accès du visiteur"
                                    className="mx-auto rounded-xl border border-gray-200 bg-white p-2 dark:border-[#1E3048]"
                                />
                                <p className={cx('mt-4 text-xs font-medium uppercase tracking-wide', TEXT_MUTED)}>
                                    Code d'accès
                                </p>
                                <p className={cx('mt-1 font-mono text-lg tracking-widest tabular-nums', TEXT_TITLE)}>
                                    {qrModal.invitation.access_code?.substring(0, 8).toUpperCase() ?? '—'}
                                </p>
                                <p className={cx('mt-3 text-xs leading-relaxed', TEXT_FAINT)}>
                                    Le visiteur présente ce code à la borne d'accueil pour s'enregistrer sans passer par la réception.
                                </p>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

function Fld({ label, children, error }) {
    return (
        <div>
            <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>{label}</label>
            {children}
            {error && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {Array.isArray(error) ? error[0] : error}
                </p>
            )}
        </div>
    );
}
export { Invitations };
