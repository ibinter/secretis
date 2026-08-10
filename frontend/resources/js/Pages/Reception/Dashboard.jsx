/**
 * Reception/Dashboard.jsx — Poste d'accueil, vue temps réel
 *
 * Présentation migrée sur `@/Components/UI`.
 * Logique métier inchangée : mêmes props Inertia, même canal Echo
 * (`organization.{id}` / `.visitor.checked_in` / `.visitor.checked_out`),
 * même appel `POST /reception/visits/{id}/check-out`, mêmes états.
 */

import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    LayoutDashboard, Users, ClipboardList, Mail, LogOut, Clock, MapPin,
    AlertTriangle, Building2, User, CalendarClock, DoorOpen,
} from 'lucide-react';
import {
    PageHeader, Button, Badge, DataTable, EmptyState, StatCard,
    cx, SURFACE, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT,
} from '@/Components/UI';

/** Le modèle Visitor n'expose pas d'accesseur `full_name` : on le reconstruit. */
const displayName = (v) =>
    v?.full_name || [v?.first_name, v?.last_name].filter(Boolean).join(' ') || 'Visiteur';

const fmtTime = (iso) => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
};

// ─── Dashboard Receptionniste — vue temps reel ────────────────────────────────
export default function Dashboard({ present: initialPresent = [], scheduled = [], today_total = 0, pending_inv = 0 }) {
    const [present, setPresent]     = useState(initialPresent);
    const [checkingOut, setCheckingOut] = useState(null);
    const [now, setNow]             = useState(new Date());

    // Horloge
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(t);
    }, []);

    // WebSocket Reverb — mises a jour temps reel
    useEffect(() => {
        const channel = window.Echo?.channel(`organization.${window.__ORG_ID__}`);
        if (!channel) return;

        channel.listen('.visitor.checked_in',  (e) => {
            setPresent(prev => [...prev.filter(v => v.id !== e.visit.id), e.visit]);
        });
        channel.listen('.visitor.checked_out', (e) => {
            setPresent(prev => prev.filter(v => v.id !== e.visit_id));
        });

        return () => { window.Echo?.leave(`organization.${window.__ORG_ID__}`); };
    }, []);

    const handleCheckOut = async (visitId) => {
        setCheckingOut(visitId);
        try {
            await axios.post(`/reception/visits/${visitId}/check-out`);
            setPresent(prev => prev.filter(v => v.id !== visitId));
        } catch {
            alert('Erreur lors du check-out. Veuillez réessayer.');
        } finally {
            setCheckingOut(null);
        }
    };

    const duration = (checkInAt) => {
        const diff = Math.floor((now - new Date(checkInAt)) / 60000);
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return h > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${m} min`;
    };

    const isOverstay = (checkInAt) => {
        return (now - new Date(checkInAt)) > 4 * 60 * 60 * 1000;
    };

    const overstayCount = present.filter(v => isOverstay(v.check_in_at)).length;

    /* ─── Colonnes des visites planifiées ──────────────────────────────────── */

    const scheduledColumns = [
        {
            key: 'visitor_name',
            label: 'Visiteur',
            render: (v) => <span className={cx('font-medium', TEXT_TITLE)}>{v || '—'}</span>,
        },
        {
            key: 'invited_by',
            label: 'Hôte',
            render: (_v, inv) => (
                <span className="inline-flex items-center gap-1.5">
                    <User className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                    {inv.invited_by?.name ?? <span className={TEXT_FAINT}>—</span>}
                </span>
            ),
        },
        {
            key: 'visit_time_start',
            label: 'Horaires',
            nowrap: true,
            render: (_v, inv) => (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Clock className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                    {inv.visit_time_start || '—'} — {inv.visit_time_end || '—'}
                </span>
            ),
        },
        {
            key: 'purpose',
            label: 'Objet',
            render: (v) => v || <span className={TEXT_FAINT}>—</span>,
        },
        {
            key: 'location',
            label: 'Lieu',
            render: (v) => v || <span className={TEXT_FAINT}>—</span>,
        },
        {
            key: 'status',
            label: 'Statut',
            nowrap: true,
            render: () => <Badge variant="warning" dot>En attente</Badge>,
        },
    ];

    /* ─── Rendu ────────────────────────────────────────────────────────────── */

    return (
        <AppLayout>
            <Head title="Réception — Tableau de bord" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

                <PageHeader
                    icon={LayoutDashboard}
                    title="Poste d'accueil"
                    breadcrumbs={[{ label: 'Réception' }, { label: 'Tableau de bord' }]}
                    subtitle="Visiteurs présents, départs à enregistrer et visites attendues aujourd'hui."
                    meta={
                        <Badge variant="success" dot>
                            Mise à jour automatique
                        </Badge>
                    }
                />

                {/* Indicateurs */}
                <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <StatCard label="Visiteurs présents"    value={present.length} icon={Users}          tone="success" />
                    <StatCard label="Visites aujourd'hui"   value={today_total}    icon={ClipboardList}  tone="accent"  />
                    <StatCard label="Invitations en attente" value={pending_inv}   icon={Mail}           tone="warning" />
                    <StatCard
                        label="Dépassements"
                        value={overstayCount}
                        icon={AlertTriangle}
                        tone={overstayCount > 0 ? 'danger' : 'neutral'}
                        hint="présence > 4 h"
                    />
                </div>

                {/* Visiteurs présents */}
                <section className="mb-8">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className={cx('text-lg font-semibold tracking-tight', TEXT_TITLE)}>
                            Visiteurs actuellement présents
                        </h2>
                        <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
                            {present.length} personne{present.length > 1 ? 's' : ''} dans les locaux
                        </span>
                    </div>

                    {present.length === 0 ? (
                        <EmptyState
                            bordered
                            icon={DoorOpen}
                            title="Aucun visiteur dans les locaux"
                            description="Les arrivées enregistrées à la borne ou à l'accueil apparaissent ici en temps réel."
                            hints={[
                                'Une fiche visiteur s\'ajoute dès la validation du check-in.',
                                'Au-delà de 4 h de présence, la fiche passe en alerte de dépassement.',
                            ]}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {present.map(visit => {
                                const overstay = isOverstay(visit.check_in_at);
                                const name     = displayName(visit.visitor);
                                return (
                                    <article
                                        key={visit.id}
                                        className={cx(
                                            SURFACE, 'flex flex-col gap-4 rounded-xl border p-4 shadow-sm transition-colors',
                                            overstay
                                                ? 'border-red-300 dark:border-red-500/40'
                                                : BORDER,
                                        )}
                                    >
                                        {overstay && (
                                            <div className="inline-flex items-center gap-1.5 self-start rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                <span className="tabular-nums">Dépassement — {duration(visit.check_in_at)}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3">
                                            {visit.visitor?.photo_path ? (
                                                <img
                                                    src={`/storage/${visit.visitor.photo_path}`}
                                                    alt={name}
                                                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                                                    {name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                            <div className="min-w-0">
                                                <p className={cx('truncate font-medium', TEXT_TITLE)}>{name}</p>
                                                {visit.visitor?.company && (
                                                    <p className={cx('flex items-center gap-1 truncate text-xs', TEXT_MUTED)}>
                                                        <Building2 className="h-3 w-3 shrink-0" />
                                                        {visit.visitor.company}
                                                    </p>
                                                )}
                                                {visit.visitor?.visit_count > 4 && (
                                                    <Badge variant="accent" className="mt-1">
                                                        Visite n° {visit.visitor.visit_count}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <dl className={cx('space-y-1.5 text-sm', TEXT_MUTED)}>
                                            <div className="flex items-center gap-2">
                                                <User className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                                                <dt className="sr-only">Hôte</dt>
                                                <dd className="truncate">
                                                    {visit.host?.name ?? <span className={TEXT_FAINT}>Hôte non renseigné</span>}
                                                </dd>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                                                <dt className="sr-only">Arrivée</dt>
                                                <dd className="tabular-nums">
                                                    Arrivée {fmtTime(visit.check_in_at)}
                                                    {' · '}
                                                    <span className={overstay
                                                        ? 'font-medium text-red-600 dark:text-red-400'
                                                        : 'font-medium text-emerald-600 dark:text-emerald-400'}>
                                                        {duration(visit.check_in_at)}
                                                    </span>
                                                </dd>
                                            </div>
                                            {visit.location && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                                                    <dt className="sr-only">Lieu</dt>
                                                    <dd className="truncate">
                                                        {visit.location}{visit.floor ? `, étage ${visit.floor}` : ''}
                                                    </dd>
                                                </div>
                                            )}
                                        </dl>

                                        <Button
                                            variant="primary"
                                            block
                                            icon={LogOut}
                                            loading={checkingOut === visit.id}
                                            onClick={() => handleCheckOut(visit.id)}
                                        >
                                            Enregistrer le départ
                                        </Button>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Prochaines visites planifiées */}
                <section>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 className={cx('text-lg font-semibold tracking-tight', TEXT_TITLE)}>
                            Visites planifiées aujourd'hui
                        </h2>
                        <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
                            {scheduled.length} attendue{scheduled.length > 1 ? 's' : ''}
                        </span>
                    </div>

                    <DataTable
                        columns={scheduledColumns}
                        data={scheduled}
                        rowKey="id"
                        pageSize={scheduled.length || 10}
                        empty={
                            <EmptyState
                                icon={CalendarClock}
                                title="Aucune visite attendue aujourd'hui"
                                description="Les invitations confirmées par les collaborateurs pour la journée s'afficheront dans ce tableau."
                                hints={[
                                    'Une invitation crée automatiquement un code d\'accès pour la borne.',
                                    'Le visiteur attendu bascule dans « présents » dès son check-in.',
                                ]}
                            />
                        }
                    />
                </section>
            </div>
        </AppLayout>
    );
}
export { Dashboard };
