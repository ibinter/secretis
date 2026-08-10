/**
 * Reception/VisitorLog.jsx — Journal des visites
 *
 * Présentation migrée sur `@/Components/UI`.
 * Logique métier inchangée : mêmes routes Inertia (`/reception/log`,
 * `/reception/log/export`, `/reception/reports/pdf`), mêmes filtres,
 * même appel `POST /visits/{id}/incident`.
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    ClipboardList, Download, FileText, Clock, LogOut, Timer, MapPin,
    Building2, User, AlertTriangle, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
    PageHeader, Button, Badge, Card, DataTable, EmptyState,
    cx, CONTROL, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT,
} from '@/Components/UI';

/* ─── Statuts ───────────────────────────────────────────────────────────────── */

const STATUS = {
    checked_in:  { label: 'Présent',  tone: 'success' },
    checked_out: { label: 'Parti',    tone: 'neutral' },
    no_show:     { label: 'No-show',  tone: 'danger'  },
    cancelled:   { label: 'Annulé',   tone: 'warning' },
    scheduled:   { label: 'Planifié', tone: 'info'    },
};

const STATUS_LABELS = Object.fromEntries(
    Object.entries(STATUS).map(([k, v]) => [k, v.label]),
);

/** Le modèle Visitor n'expose pas d'accesseur `full_name` : on le reconstruit. */
const displayName = (v) =>
    v?.full_name || [v?.first_name, v?.last_name].filter(Boolean).join(' ') || 'Visiteur';

const fmtTime = (iso) => {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return null; }
};

// ─── Journal des visites ──────────────────────────────────────────────────────
export default function VisitorLog({ visits = { data: [] }, filters = {}, hosts = [] }) {
    const [incident, setIncident] = useState(null);
    const [incidentNote, setIncidentNote] = useState('');

    const rows        = Array.isArray(visits?.data) ? visits.data : [];
    const total       = visits?.total ?? rows.length;
    const lastPage    = visits?.last_page ?? 1;
    const currentPage = visits?.current_page ?? 1;
    const hostOptions = Array.isArray(hosts) ? hosts : [];

    const duration = (visit) => {
        if (!visit.check_in_at || !visit.check_out_at) return '—';
        const diff = Math.floor((new Date(visit.check_out_at) - new Date(visit.check_in_at)) / 60000);
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return h > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${m} min`;
    };

    const handleFilter = (key, value) => {
        router.get('/reception/log', { ...filters, [key]: value }, { preserveState: true });
    };

    const exportCsv = () => {
        window.location.href = `/reception/log/export?${new URLSearchParams(filters)}`;
    };

    const exportPdf = () => {
        window.location.href = `/reception/reports/pdf?${new URLSearchParams(filters)}`;
    };

    const reportIncident = (visit) => {
        setIncident(visit);
        setIncidentNote('');
    };

    const isFiltered = Object.values(filters).some(Boolean);

    /* ─── Colonnes ─────────────────────────────────────────────────────────── */

    const columns = [
        {
            key: 'visitor',
            label: 'Visiteur',
            render: (_v, visit) => {
                const name = displayName(visit.visitor);
                return (
                    <div className="flex min-w-0 items-center gap-3">
                        {visit.visitor?.photo_path ? (
                            <img
                                src={`/storage/${visit.visitor.photo_path}`}
                                alt=""
                                className="h-8 w-8 shrink-0 rounded-full object-cover"
                            />
                        ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-300">
                                {name.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <div className="min-w-0">
                            <p className={cx('truncate font-medium', TEXT_TITLE)}>{name}</p>
                            <p className={cx('flex items-center gap-1 truncate text-xs', TEXT_MUTED)}>
                                {visit.visitor?.company
                                    ? <><Building2 className="h-3 w-3 shrink-0" />{visit.visitor.company}</>
                                    : <span className={TEXT_FAINT}>Société non renseignée</span>}
                            </p>
                        </div>
                        {(visit.visitor?.visit_count ?? 0) >= 5 && (
                            <Badge variant="accent" className="shrink-0">
                                n° {visit.visitor.visit_count}
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'host',
            label: 'Hôte',
            render: (_v, visit) => (
                <span className="inline-flex items-center gap-1.5">
                    <User className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                    {visit.host?.name ?? <span className={TEXT_FAINT}>—</span>}
                </span>
            ),
        },
        {
            key: 'check_in_at',
            label: 'Arrivée',
            nowrap: true,
            render: (v) => {
                const t = fmtTime(v);
                return t
                    ? <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <Clock className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />{t}
                      </span>
                    : <span className={TEXT_FAINT}>—</span>;
            },
        },
        {
            key: 'check_out_at',
            label: 'Départ',
            nowrap: true,
            render: (v) => {
                const t = fmtTime(v);
                return t
                    ? <span className="inline-flex items-center gap-1.5 tabular-nums">
                          <LogOut className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />{t}
                      </span>
                    : <span className={TEXT_FAINT}>—</span>;
            },
        },
        {
            key: 'duration',
            label: 'Durée',
            nowrap: true,
            render: (_v, visit) => (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Timer className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                    {duration(visit)}
                </span>
            ),
        },
        {
            key: 'purpose',
            label: 'Objet & lieu',
            render: (v, visit) => (
                <div className="min-w-0">
                    <p className="truncate">{v || <span className={TEXT_FAINT}>—</span>}</p>
                    {visit.location && (
                        <p className={cx('flex items-center gap-1 truncate text-xs', TEXT_MUTED)}>
                            <MapPin className="h-3 w-3 shrink-0" />{visit.location}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Statut',
            nowrap: true,
            render: (v) => {
                const s = STATUS[v];
                return s
                    ? <Badge variant={s.tone} dot>{s.label}</Badge>
                    : <span className={TEXT_FAINT}>—</span>;
            },
        },
    ];

    /* ─── Rendu ────────────────────────────────────────────────────────────── */

    return (
        <AppLayout>
            <Head title="Journal des visites" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

                <PageHeader
                    icon={ClipboardList}
                    title="Journal des visites"
                    breadcrumbs={[{ label: 'Réception' }, { label: 'Journal des visites' }]}
                    subtitle={`${total} visite${total !== 1 ? 's' : ''} enregistrée${total !== 1 ? 's' : ''} · historique des entrées et sorties`}
                    actions={
                        <>
                            <Button variant="secondary" icon={Download} onClick={exportCsv}>CSV</Button>
                            <Button variant="secondary" icon={FileText} onClick={exportPdf}>PDF</Button>
                        </>
                    }
                />

                {/* Filtres */}
                <div className={cx('mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 dark:bg-[#162032]', BORDER)}>
                    <div>
                        <label className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Date</label>
                        <input
                            type="date"
                            value={filters.date || ''}
                            onChange={e => handleFilter('date', e.target.value)}
                            className={cx(CONTROL, 'h-10 w-auto')}
                        />
                    </div>
                    <div>
                        <label className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Hôte</label>
                        <select
                            value={filters.host_id || ''}
                            onChange={e => handleFilter('host_id', e.target.value)}
                            className={cx(CONTROL, 'h-10 w-auto min-w-[170px]')}
                        >
                            <option value="">Tous les hôtes</option>
                            {hostOptions.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Statut</label>
                        <select
                            value={filters.status || ''}
                            onChange={e => handleFilter('status', e.target.value)}
                            className={cx(CONTROL, 'h-10 w-auto min-w-[150px]')}
                        >
                            <option value="">Tous les statuts</option>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    {isFiltered && (
                        <Button variant="ghost" onClick={() => router.get('/reception/log')}>
                            Réinitialiser
                        </Button>
                    )}
                </div>

                {/* Journal */}
                <DataTable
                    columns={columns}
                    data={rows}
                    rowKey="id"
                    pageSize={rows.length || 10}
                    totalItems={total}
                    actionsLabel="Actions"
                    actions={(visit) => (
                        <Button
                            variant="ghost" size="sm" iconOnly icon={AlertTriangle}
                            title="Signaler un incident"
                            onClick={() => reportIncident(visit)}
                            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                        />
                    )}
                    empty={
                        isFiltered ? (
                            <EmptyState
                                variant="no-results"
                                title="Aucune visite pour ces critères"
                                description="Aucune entrée du journal ne correspond à la date, à l'hôte ou au statut sélectionnés."
                                action={
                                    <Button variant="secondary" onClick={() => router.get('/reception/log')}>
                                        Réinitialiser les filtres
                                    </Button>
                                }
                            />
                        ) : (
                            <EmptyState
                                icon={ClipboardList}
                                title="Le journal est vide"
                                description="Chaque check-in réalisé à la borne d'accueil ou par la réception crée une ligne ici, avec l'heure d'arrivée, l'hôte et la durée de présence."
                                hints={[
                                    'La durée se calcule automatiquement au moment du départ.',
                                    'Le journal est exportable en CSV ou en PDF pour vos rapports de sécurité.',
                                ]}
                            />
                        )
                    }
                    footer={lastPage > 1 ? (
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
                                Page {currentPage} / {lastPage} · {total} visite{total > 1 ? 's' : ''}
                            </span>
                            <div className="flex gap-1">
                                <Button
                                    variant="secondary" size="sm" iconOnly icon={ChevronLeft}
                                    title="Page précédente"
                                    disabled={currentPage <= 1}
                                    onClick={() => router.get('/reception/log', { ...filters, page: currentPage - 1 })}
                                />
                                <Button
                                    variant="secondary" size="sm" iconOnly icon={ChevronRight}
                                    title="Page suivante"
                                    disabled={currentPage >= lastPage}
                                    onClick={() => router.get('/reception/log', { ...filters, page: currentPage + 1 })}
                                />
                            </div>
                        </div>
                    ) : null}
                />
            </div>

            {/* Modal signalement incident */}
            {incident && (
                <div
                    onClick={() => setIncident(null)}
                    className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
                >
                    <div onClick={e => e.stopPropagation()} className="w-full max-w-md">
                        <Card
                            padded={false}
                            className="shadow-xl"
                            title="Signaler un incident"
                            subtitle={`Visite de ${displayName(incident.visitor)}`}
                            actions={
                                <Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer"
                                        onClick={() => setIncident(null)} />
                            }
                            footer={
                                <div className="flex justify-end gap-2">
                                    <Button variant="secondary" onClick={() => setIncident(null)}>Annuler</Button>
                                    <Button
                                        variant="danger"
                                        icon={AlertTriangle}
                                        onClick={async () => {
                                            await axios.post(`/reception/visites/${incident.id}/incident`, { note: incidentNote });
                                            setIncident(null);
                                        }}
                                    >
                                        Envoyer le signalement
                                    </Button>
                                </div>
                            }
                        >
                            <div className="px-4 py-4 sm:px-6">
                                <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
                                    Description de l'incident
                                </label>
                                <textarea
                                    value={incidentNote}
                                    onChange={e => setIncidentNote(e.target.value)}
                                    rows={4}
                                    placeholder="Comportement, dégradation, non-respect des consignes…"
                                    className={cx(CONTROL, 'resize-none')}
                                />
                                <p className={cx('mt-2 text-xs', TEXT_FAINT)}>
                                    Le signalement est rattaché à la visite et reste consultable dans l'historique du visiteur.
                                </p>
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
export { VisitorLog };
