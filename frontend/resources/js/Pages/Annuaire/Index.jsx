/**
 * Annuaire/Index.jsx — Répertoire des contacts
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * La logique métier est inchangée : mêmes props Inertia, mêmes routes
 * (`/annuaire`, `/api/v1/contacts`), mêmes états locaux.
 */

import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    Contact, Plus, Search, Pencil, Trash2, Building2, Mail, Phone, X,
} from 'lucide-react';
import {
    PageHeader, Button, Badge, DataTable, EmptyState, Card,
    cx, CONTROL, BORDER, SURFACE, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, FOCUS_RING,
} from '@/Components/UI';

const TYPE_LABELS = { person: 'Personne', organization: 'Organisation', supplier: 'Fournisseur', partner: 'Partenaire', other: 'Autre' };
const TYPE_OPTIONS = Object.entries(TYPE_LABELS);
const EMPTY_FORM = { last_name: '', first_name: '', email: '', phone: '', company: '', job_title: '', type: 'person' };

// Un type de contact est une donnée métier : ton sémantique, jamais l'accent violet.
const TYPE_TONE = {
    person:       'info',
    organization: 'accent',
    supplier:     'warning',
    partner:      'success',
    other:        'neutral',
};

const FIELDS = [
    ['last_name', 'Nom *'], ['first_name', 'Prénom'],
    ['email', 'Email'], ['phone', 'Téléphone'],
    ['company', 'Entreprise'], ['job_title', 'Fonction'],
];

export default function AnnuaireIndex() {
    const { contacts = { data: [] }, stats = { total: 0 }, filters = {} } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [type, setType]     = useState(filters.type || '');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm]     = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');
    const [editingId, setEditingId] = useState(null);

    const doSearch = (e) => {
        e.preventDefault();
        router.get('/annuaire', { search, type }, { preserveState: true, replace: true });
    };

    const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); };

    const openEdit = (c) => {
        setEditingId(c.id);
        setForm({
            last_name: c.last_name || '',
            first_name: c.first_name || '',
            email: c.email || '',
            phone: c.phone || c.mobile || '',
            company: c.company || '',
            job_title: c.job_title || '',
            type: c.type || 'person',
        });
        setError('');
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingId(null); };

    const submitContact = async (e) => {
        e.preventDefault();
        if (!form.last_name.trim()) { setError('Le nom est obligatoire.'); return; }
        setSaving(true); setError('');
        try {
            if (editingId) {
                await axios.put('/api/v1/contacts/' + editingId, form);
            } else {
                await axios.post('/api/v1/contacts', form);
            }
            setShowModal(false);
            setEditingId(null);
            router.reload({ only: ['contacts', 'stats'] });
        } catch (err) {
            const status = err?.response?.status;
            if (status === 403) setError(editingId ? "Vous n'avez pas la permission de modifier ce contact." : "Vous n'avez pas la permission de créer un contact.");
            else if (status === 422) setError(Object.values(err.response.data.errors || {}).flat()[0] || 'Données invalides.');
            else setError('Une erreur est survenue. Réessayez.');
        } finally {
            setSaving(false);
        }
    };

    const deleteContact = async (c) => {
        if (!window.confirm('Supprimer ce contact ?')) return;
        try {
            await axios.delete('/api/v1/contacts/' + c.id);
            router.reload({ only: ['contacts', 'stats'] });
        } catch (err) {
            const status = err?.response?.status;
            if (status === 403) alert("Vous n'avez pas la permission de supprimer ce contact.");
            else alert('Une erreur est survenue. Réessayez.');
        }
    };

    const initials = (c) => {
        const fn = c.first_name || '';
        const ln = c.last_name  || '';
        return ((fn[0] || '') + (ln[0] || '')).toUpperCase() || '?';
    };

    const fullName = (c) => [c.first_name, c.last_name].filter(Boolean).join(' ') || '—';

    const isFiltered = Boolean(search || type);

    const resetFilters = () => {
        setSearch(''); setType('');
        router.get('/annuaire', {}, { preserveState: true, replace: true });
    };

    /* ─── Colonnes ─────────────────────────────────────────────────────────── */

    const columns = [
        {
            key: 'last_name',
            label: 'Contact',
            render: (_v, c) => (
                <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-500/10 text-xs font-semibold text-purple-700 dark:text-purple-300">
                        {initials(c)}
                    </span>
                    <div className="min-w-0">
                        <p className={cx('font-medium truncate', TEXT_TITLE)}>{fullName(c)}</p>
                        <p className={cx('text-xs truncate', TEXT_MUTED)}>
                            {c.job_title || <span className={TEXT_FAINT}>Fonction non renseignée</span>}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'company',
            label: 'Entreprise',
            render: (v) => v
                ? (
                    <span className="inline-flex items-center gap-1.5">
                        <Building2 className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                        <span className="truncate">{v}</span>
                    </span>
                )
                : <span className={TEXT_FAINT}>—</span>,
        },
        {
            key: 'email',
            label: 'Email',
            render: (v) => v
                ? (
                    <a
                        href={`mailto:${v}`}
                        className={cx('inline-flex items-center gap-1.5 rounded hover:text-purple-600 dark:hover:text-purple-400 transition-colors', FOCUS_RING)}
                    >
                        <Mail className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                        <span className="truncate">{v}</span>
                    </a>
                )
                : <span className={TEXT_FAINT}>—</span>,
        },
        {
            key: 'phone',
            label: 'Téléphone',
            nowrap: true,
            render: (_v, c) => {
                const tel = c.phone || c.mobile;
                return tel
                    ? (
                        <span className="inline-flex items-center gap-1.5 tabular-nums">
                            <Phone className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} />
                            {tel}
                        </span>
                    )
                    : <span className={TEXT_FAINT}>—</span>;
            },
        },
        {
            key: 'type',
            label: 'Type',
            nowrap: true,
            render: (v) => (
                <Badge variant={TYPE_TONE[v] ?? 'neutral'} dot>
                    {TYPE_LABELS[v] || 'Personne'}
                </Badge>
            ),
        },
    ];

    /* ─── Rendu ────────────────────────────────────────────────────────────── */

    return (
        <AppLayout>
            <Head title="Annuaire — Contacts" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

                <PageHeader
                    icon={Contact}
                    title="Annuaire"
                    breadcrumbs={[{ label: 'Accueil', href: '/' }, { label: 'Annuaire' }]}
                    subtitle={`${stats.total} contact${stats.total !== 1 ? 's' : ''} enregistré${stats.total !== 1 ? 's' : ''}`}
                    actions={
                        <Button variant="primary" icon={Plus} onClick={openCreate}>
                            Nouveau contact
                        </Button>
                    }
                />

                {/* Filtres */}
                <form onSubmit={doSearch} className="mb-4 flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[220px] flex-1">
                        <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher un nom, un email, une entreprise…"
                            className={cx(CONTROL, 'h-10 pl-9')}
                        />
                    </div>
                    <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                        className={cx(CONTROL, 'h-10 w-auto min-w-[170px]')}
                    >
                        <option value="">Tous les types</option>
                        {TYPE_OPTIONS.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                    </select>
                    <Button type="submit" variant="secondary">Filtrer</Button>
                    {isFiltered && (
                        <Button type="button" variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
                    )}
                </form>

                {/* Tableau */}
                <DataTable
                    columns={columns}
                    data={contacts.data}
                    rowKey="id"
                    pageSize={contacts.per_page ?? 15}
                    totalItems={contacts.total ?? contacts.data.length}
                    actions={(c) => (
                        <>
                            <Button variant="ghost" size="sm" iconOnly icon={Pencil}
                                    title="Modifier" onClick={() => openEdit(c)} />
                            <Button variant="ghost" size="sm" iconOnly icon={Trash2}
                                    title="Supprimer" onClick={() => deleteContact(c)}
                                    className="hover:text-red-600 dark:hover:text-red-400" />
                        </>
                    )}
                    empty={
                        isFiltered ? (
                            <EmptyState
                                variant="no-results"
                                title="Aucun contact ne correspond"
                                description="Aucun résultat pour cette recherche. Essayez un autre mot-clé ou élargissez le type."
                                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
                            />
                        ) : (
                            <EmptyState
                                icon={Contact}
                                title="Votre annuaire est vide"
                                description="Centralisez ici les coordonnées de vos correspondants : administrations, clients, fournisseurs et partenaires."
                                hints={[
                                    'Un contact peut être une personne ou une organisation.',
                                    "Les contacts alimentent le courrier, l'agenda et les convocations.",
                                ]}
                                action={<Button variant="primary" icon={Plus} onClick={openCreate}>Créer le premier contact</Button>}
                            />
                        )
                    }
                    footer={contacts.last_page > 1 && contacts.links ? (
                        <div className="flex flex-wrap items-center justify-center gap-1 px-4 py-3">
                            {contacts.links.map((link, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={cx(
                                        'min-w-[32px] rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                                        link.active
                                            ? 'border-transparent bg-purple-600 text-white'
                                            : cx(BORDER, SURFACE, 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                                        !link.url && 'pointer-events-none opacity-40',
                                        FOCUS_RING,
                                    )}
                                />
                            ))}
                        </div>
                    ) : null}
                />
            </div>

            {/* Modal création / édition */}
            {showModal && (
                <div
                    onClick={closeModal}
                    className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
                >
                    <form
                        onClick={e => e.stopPropagation()}
                        onSubmit={submitContact}
                        className="w-full max-w-lg"
                    >
                        <Card
                            padded={false}
                            className="shadow-xl"
                            title={editingId ? 'Modifier le contact' : 'Nouveau contact'}
                            subtitle="Les champs marqués d'un astérisque sont obligatoires."
                            actions={
                                <Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={closeModal} />
                            }
                            footer={
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="secondary" onClick={closeModal}>Annuler</Button>
                                    <Button type="submit" variant="primary" loading={saving}>
                                        {editingId ? 'Enregistrer' : 'Créer'}
                                    </Button>
                                </div>
                            }
                        >
                            <div className="px-4 py-4 sm:px-6">
                                {error && (
                                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {FIELDS.map(([key, lbl]) => (
                                        <label key={key} className="flex flex-col gap-1.5">
                                            <span className={cx('text-xs font-medium', TEXT_MUTED)}>{lbl}</span>
                                            <input
                                                value={form[key]}
                                                onChange={e => setForm({ ...form, [key]: e.target.value })}
                                                className={cx(CONTROL, 'h-10')}
                                            />
                                        </label>
                                    ))}
                                    <label className="flex flex-col gap-1.5">
                                        <span className={cx('text-xs font-medium', TEXT_MUTED)}>Type</span>
                                        <select
                                            value={form.type}
                                            onChange={e => setForm({ ...form, type: e.target.value })}
                                            className={cx(CONTROL, 'h-10')}
                                        >
                                            {TYPE_OPTIONS.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </Card>
                    </form>
                </div>
            )}
        </AppLayout>
    );
}
