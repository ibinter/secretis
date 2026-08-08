/**
 * Reception/Blacklist.jsx — Liste noire visiteurs
 *
 * Présentation migrée sur `@/Components/UI`.
 * Logique métier inchangée : mêmes routes Inertia (`/reception/blacklist`,
 * `/reception/log`), mêmes appels axios
 * (`POST|DELETE /api/v1/visitors/{id}/blacklist`), mêmes états locaux.
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    Ban, ShieldCheck, ShieldAlert, Search, ClipboardList, Building2,
    X, ChevronLeft, ChevronRight, Users,
} from 'lucide-react';
import {
    PageHeader, Button, Badge, Card, DataTable, EmptyState, StatCard,
    cx, CONTROL, BORDER, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT,
} from '@/Components/UI';

// ─── Gestion de la liste noire ────────────────────────────────────────────────
export default function Blacklist({ visitors = [], filters = {} }) {
    // Le contrôleur renvoie soit une collection brute, soit un paginateur.
    const rows      = Array.isArray(visitors) ? visitors : (visitors?.data ?? []);
    const total     = Array.isArray(visitors) ? visitors.length : (visitors?.total ?? rows.length);
    const lastPage  = Array.isArray(visitors) ? 1 : (visitors?.last_page ?? 1);
    const curPage   = Array.isArray(visitors) ? 1 : (visitors?.current_page ?? 1);

    const [search, setSearch]         = useState(filters.search || '');
    const [actionModal, setActionModal] = useState(null); // { visitor, action: 'add'|'remove' }
    const [reason, setReason]         = useState('');
    const [loading, setLoading]       = useState(false);

    // Le modèle Visitor n'expose pas d'accesseur full_name : on le reconstruit.
    const displayName = (v) => v.full_name || [v.first_name, v.last_name].filter(Boolean).join(' ') || '—';

    const blacklistedCount = rows.filter(v => v.is_blacklisted).length;

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            router.get('/reception/blacklist', { ...filters, search, blacklisted: filters.blacklisted }, { preserveState: true });
        }
    };

    const handleAction = async () => {
        if (actionModal.action === 'add' && !reason.trim()) return;
        setLoading(true);
        try {
            if (actionModal.action === 'add') {
                await axios.post(`/api/v1/visitors/${actionModal.visitor.id}/blacklist`, { reason });
            } else {
                await axios.delete(`/api/v1/visitors/${actionModal.visitor.id}/blacklist`);
            }
            setActionModal(null);
            setReason('');
            router.reload({ only: ['visitors'] });
        } catch {
            alert('Une erreur est survenue.');
        } finally {
            setLoading(false);
        }
    };

    /* ─── Colonnes ─────────────────────────────────────────────────────────── */

    const columns = [
        {
            key: 'last_name',
            label: 'Visiteur',
            render: (_v, v) => {
                const name = displayName(v);
                return (
                    <div className="flex min-w-0 items-center gap-3">
                        {v.photo_path ? (
                            <img src={`/storage/${v.photo_path}`} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                        ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                                {name.charAt(0).toUpperCase()}
                            </span>
                        )}
                        <div className="min-w-0">
                            <p className={cx('truncate font-medium', TEXT_TITLE)}>{name}</p>
                            <p className={cx('flex items-center gap-1 truncate text-xs', TEXT_MUTED)}>
                                {v.company
                                    ? <><Building2 className="h-3 w-3 shrink-0" />{v.company}</>
                                    : <span className={TEXT_FAINT}>Société non renseignée</span>}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'id_number',
            label: 'Pièce d\'identité',
            nowrap: true,
            render: (v, row) => (
                (row.id_type || v)
                    ? <span className={cx('font-mono text-xs tabular-nums', TEXT_MUTED)}>
                          {[row.id_type, v].filter(Boolean).join(' — ')}
                      </span>
                    : <span className={TEXT_FAINT}>—</span>
            ),
        },
        {
            key: 'blacklist_reason',
            label: 'Motif',
            className: 'max-w-[260px]',
            render: (v, row) => (
                row.is_blacklisted
                    ? <span className="line-clamp-2 text-xs text-red-700 dark:text-red-300" title={v || undefined}>
                          {v || 'Motif non renseigné'}
                      </span>
                    : <span className={TEXT_FAINT}>—</span>
            ),
        },
        {
            key: 'visit_count',
            label: 'Visites',
            align: 'center',
            nowrap: true,
            render: (v) => (
                <Badge variant={(v ?? 0) >= 5 ? 'accent' : 'neutral'} className="tabular-nums">
                    {v ?? 0}
                </Badge>
            ),
        },
        {
            key: 'last_visit_at',
            label: 'Dernière visite',
            nowrap: true,
            render: (v) => (
                v
                    ? <span className="tabular-nums">{new Date(v).toLocaleDateString('fr-FR')}</span>
                    : <span className={TEXT_FAINT}>—</span>
            ),
        },
        {
            key: 'is_blacklisted',
            label: 'Statut',
            nowrap: true,
            render: (v) => v
                ? <Badge variant="danger" dot>Liste noire</Badge>
                : <Badge variant="success" dot>Autorisé</Badge>,
        },
    ];

    /* ─── Rendu ────────────────────────────────────────────────────────────── */

    return (
        <AppLayout>
            <Head title="Liste noire visiteurs" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

                <PageHeader
                    icon={ShieldAlert}
                    title="Liste noire visiteurs"
                    breadcrumbs={[{ label: 'Réception' }, { label: 'Liste noire' }]}
                    subtitle="Visiteurs dont l'accès aux locaux est refusé, avec le motif conservé pour la traçabilité."
                    actions={
                        <Button variant="secondary" icon={ClipboardList} onClick={() => router.get('/reception/log')}>
                            Journal des visites
                        </Button>
                    }
                />

                {/* Indicateurs */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                    <StatCard label="Visiteurs listés" value={total}           icon={Users} tone="neutral" />
                    <StatCard label="Sur liste noire"  value={blacklistedCount} icon={Ban}  tone={blacklistedCount > 0 ? 'danger' : 'neutral'} hint="sur cette page" />
                </div>

                {/* Filtres */}
                <div className={cx('mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4 dark:bg-[#162032]', BORDER)}>
                    <div className="min-w-[220px] flex-1">
                        <label className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Rechercher</label>
                        <div className="relative">
                            <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={handleSearch}
                                placeholder="Nom, n° de pièce, société… (Entrée pour valider)"
                                className={cx(CONTROL, 'h-10 pl-9')}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={filters.blacklisted ? 'primary' : 'secondary'}
                            icon={Ban}
                            onClick={() => router.get('/reception/blacklist', { blacklisted: true, search })}
                        >
                            Blacklistés seulement
                        </Button>
                        <Button
                            variant="secondary"
                            icon={Users}
                            onClick={() => router.get('/reception/log', { search })}
                        >
                            Tous les visiteurs
                        </Button>
                    </div>
                </div>

                {/* Liste */}
                <DataTable
                    columns={columns}
                    data={rows}
                    rowKey="id"
                    pageSize={rows.length || 10}
                    totalItems={total}
                    actionsLabel="Actions"
                    rowClassName={(v) => v.is_blacklisted ? 'bg-red-50/50 dark:bg-red-500/[0.06]' : undefined}
                    actions={(v) => (
                        v.is_blacklisted ? (
                            <Button
                                variant="ghost" size="sm" icon={ShieldCheck}
                                title="Retirer de la liste noire"
                                onClick={() => { setActionModal({ visitor: v, action: 'remove' }); setReason(''); }}
                                className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                            >
                                Retirer
                            </Button>
                        ) : (
                            <Button
                                variant="ghost" size="sm" icon={Ban}
                                title="Ajouter à la liste noire"
                                onClick={() => { setActionModal({ visitor: v, action: 'add' }); setReason(''); }}
                                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            >
                                Blacklister
                            </Button>
                        )
                    )}
                    empty={
                        filters.search || filters.blacklisted ? (
                            <EmptyState
                                variant="no-results"
                                title="Aucun visiteur ne correspond"
                                description="Aucun visiteur ne correspond à cette recherche ou à ce filtre."
                                action={
                                    <Button variant="secondary" onClick={() => router.get('/reception/blacklist')}>
                                        Réinitialiser les filtres
                                    </Button>
                                }
                            />
                        ) : (
                            <EmptyState
                                icon={ShieldCheck}
                                title="Aucun visiteur sur liste noire"
                                description="Aucun accès n'est actuellement refusé. Un visiteur peut être blacklisté depuis cette page ou depuis le journal des visites."
                                hints={[
                                    'Le motif de blacklistage est obligatoire et reste consultable.',
                                    'La borne d\'accueil refuse automatiquement le check-in d\'un visiteur listé.',
                                ]}
                                action={
                                    <Button variant="secondary" icon={ClipboardList} onClick={() => router.get('/reception/log')}>
                                        Ouvrir le journal des visites
                                    </Button>
                                }
                            />
                        )
                    }
                    footer={lastPage > 1 ? (
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
                                Page {curPage} / {lastPage} · {total} visiteur{total > 1 ? 's' : ''}
                            </span>
                            <div className="flex gap-1">
                                <Button
                                    variant="secondary" size="sm" iconOnly icon={ChevronLeft}
                                    title="Page précédente"
                                    disabled={curPage <= 1}
                                    onClick={() => router.get('/reception/blacklist', { ...filters, page: curPage - 1 })}
                                />
                                <Button
                                    variant="secondary" size="sm" iconOnly icon={ChevronRight}
                                    title="Page suivante"
                                    disabled={curPage >= lastPage}
                                    onClick={() => router.get('/reception/blacklist', { ...filters, page: curPage + 1 })}
                                />
                            </div>
                        </div>
                    ) : null}
                />
            </div>

            {/* Modal confirmation action */}
            {actionModal && (
                <div
                    onClick={() => setActionModal(null)}
                    className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
                >
                    <div onClick={e => e.stopPropagation()} className="w-full max-w-md">
                        <Card
                            padded={false}
                            className="shadow-xl"
                            title={actionModal.action === 'add' ? 'Ajouter à la liste noire' : 'Retirer de la liste noire'}
                            subtitle={`Visiteur : ${displayName(actionModal.visitor)}`}
                            actions={
                                <Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer"
                                        onClick={() => setActionModal(null)} />
                            }
                            footer={
                                <div className="flex justify-end gap-2">
                                    <Button variant="secondary" onClick={() => setActionModal(null)}>Annuler</Button>
                                    <Button
                                        variant={actionModal.action === 'add' ? 'danger' : 'primary'}
                                        icon={actionModal.action === 'add' ? Ban : ShieldCheck}
                                        loading={loading}
                                        disabled={actionModal.action === 'add' && !reason.trim()}
                                        onClick={handleAction}
                                    >
                                        Confirmer
                                    </Button>
                                </div>
                            }
                        >
                            <div className="px-4 py-4 sm:px-6">
                                {actionModal.action === 'add' ? (
                                    <>
                                        <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>
                                            Motif de blacklistage *
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                            rows={3}
                                            placeholder="Expliquez la raison du blacklistage…"
                                            className={cx(CONTROL, 'resize-none')}
                                        />
                                        <p className={cx('mt-2 text-xs', TEXT_FAINT)}>
                                            Ce motif est conservé pour la traçabilité et reste visible par l'équipe d'accueil.
                                        </p>
                                    </>
                                ) : (
                                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                        Ce visiteur pourra à nouveau être accueilli dans vos locaux.
                                    </p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
export { Blacklist };
