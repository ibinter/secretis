import React, { useState, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLES = [
    { value: 'super_admin',  label: 'Super Administrateur', color: 'purple' },
    { value: 'admin',        label: 'Administrateur',       color: 'red' },
    { value: 'manager',      label: 'Manager',              color: 'blue' },
    { value: 'employe',      label: 'Employé',              color: 'green' },
    { value: 'consultant',   label: 'Consultant',           color: 'gray' },
];

const STATUTS = [
    { value: 'all',     label: 'Tous les statuts' },
    { value: 'actif',   label: 'Actif' },
    { value: 'inactif', label: 'Inactif' },
    { value: 'invite',  label: 'Invitation en attente' },
];

const ROLE_COLORS = {
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
    blue:   'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    green:  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
    gray:   'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(nom, prenom) {
    return `${(prenom?.[0] || '').toUpperCase()}${(nom?.[0] || '').toUpperCase()}`;
}

function avatarColor(email = '') {
    const colors = ['bg-purple-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500'];
    const idx = email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
    return colors[idx];
}

function RoleBadge({ role }) {
    const r = ROLES.find(r => r.value === role) || { label: role, color: 'gray' };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[r.color]}`}>
            {r.label}
        </span>
    );
}

function StatusDot({ statut }) {
    const map = {
        actif:   { color: 'bg-green-400', label: 'Actif' },
        inactif: { color: 'bg-gray-400', label: 'Inactif' },
        invite:  { color: 'bg-amber-400 animate-pulse', label: 'En attente' },
    };
    const s = map[statut] || map.inactif;
    return (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            {s.label}
        </span>
    );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none transition">✕</button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

function InviterModal({ open, onClose, services }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email:   '',
        role:    'employe',
        service: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('parametres.utilisateurs.inviter'), {
            preserveScroll: true,
            onSuccess: () => { reset(); onClose(); },
        });
    };

    return (
        <Modal open={open} onClose={onClose} title="Inviter un collaborateur">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email professionnel <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="prenom.nom@organisation.ci"
                        required
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                    />
                    {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Rôle <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={data.role}
                        onChange={(e) => setData('role', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                    >
                        {ROLES.filter(r => r.value !== 'super_admin').map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                    {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Service / Département</label>
                    <select
                        value={data.service}
                        onChange={(e) => setData('service', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                    >
                        <option value="">— Aucun service —</option>
                        {(services || []).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-300">
                    Un email d'invitation sera envoyé. Le lien est valable <strong>72 heures</strong>.
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                        Annuler
                    </button>
                    <button type="submit" disabled={processing}
                        className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition flex items-center gap-2">
                        {processing && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>}
                        Envoyer l'invitation
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function ModifierRoleModal({ open, onClose, utilisateur, services }) {
    const { data, setData, patch, processing, errors } = useForm({
        role:    utilisateur?.role || 'employe',
        service: utilisateur?.service || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('parametres.utilisateurs.role', utilisateur?.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Modal open={open} onClose={onClose} title={`Modifier — ${utilisateur?.prenom} ${utilisateur?.nom}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className={`w-10 h-10 rounded-full ${avatarColor(utilisateur?.email)} flex items-center justify-center text-white font-semibold text-sm`}>
                        {initials(utilisateur?.nom, utilisateur?.prenom)}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{utilisateur?.prenom} {utilisateur?.nom}</p>
                        <p className="text-xs text-gray-500">{utilisateur?.email}</p>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Rôle</label>
                    <select value={data.role} onChange={(e) => setData('role', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition">
                        {ROLES.filter(r => r.value !== 'super_admin').map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Service</label>
                    <select value={data.service} onChange={(e) => setData('service', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition">
                        <option value="">— Aucun service —</option>
                        {(services || []).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                        Annuler
                    </button>
                    <button type="submit" disabled={processing}
                        className="px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition">
                        Enregistrer
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function HistoriqueModal({ open, onClose, utilisateur, historique }) {
    return (
        <Modal open={open} onClose={onClose} title={`Connexions — ${utilisateur?.prenom} ${utilisateur?.nom}`}>
            <div className="space-y-2 max-h-80 overflow-y-auto">
                {(historique || []).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">Aucun historique disponible.</p>
                ) : historique.map((entry, i) => (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${entry.suspect ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' : 'bg-gray-50 dark:bg-gray-800'}`}>
                        <div className="flex-shrink-0 mt-0.5">
                            {entry.suspect
                                ? <span className="text-orange-500 text-lg">⚠</span>
                                : <span className="text-green-500 text-lg">✓</span>
                            }
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{entry.date}</p>
                            <p className="text-xs text-gray-500">{entry.ip} — {entry.appareil}</p>
                            {entry.suspect && <p className="text-xs text-orange-600 dark:text-orange-400">Connexion inhabituelle</p>}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-end pt-4">
                <button onClick={onClose}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                    Fermer
                </button>
            </div>
        </Modal>
    );
}

// ─── Actions Menu ─────────────────────────────────────────────────────────────

function ActionsMenu({ utilisateur, onModifier, onHistorique }) {
    const [open, setOpen] = useState(false);

    const handleToggle = (statut) => {
        router.patch(route('parametres.utilisateurs.toggle', utilisateur.id), { statut }, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    const handleResetMdp = () => {
        if (!confirm(`Réinitialiser le mot de passe de ${utilisateur.prenom} ${utilisateur.nom} ?`)) return;
        router.post(route('parametres.utilisateurs.reset-mdp', utilisateur.id), {}, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition"
            >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" />
                </svg>
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-50 mt-1 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button onClick={() => { setOpen(false); onModifier(utilisateur); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition">
                            ✏️ Modifier le rôle
                        </button>
                        <button onClick={() => { setOpen(false); onHistorique(utilisateur); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition">
                            🕐 Historique connexions
                        </button>
                        <button onClick={handleResetMdp}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition">
                            🔑 Réinitialiser le MDP
                        </button>
                        <div className="border-t border-gray-100 dark:border-gray-800" />
                        {utilisateur.statut === 'actif' ? (
                            <button onClick={() => handleToggle('inactif')}
                                className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2 transition">
                                ⏸ Suspendre le compte
                            </button>
                        ) : (
                            <button onClick={() => handleToggle('actif')}
                                className="w-full text-left px-4 py-2.5 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 transition">
                                ▶ Réactiver le compte
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Utilisateurs({ utilisateurs = [], services = [], flash }) {
    const [showInviter, setShowInviter]         = useState(false);
    const [userModifier, setUserModifier]       = useState(null);
    const [userHistorique, setUserHistorique]   = useState(null);
    const [historiqueData, setHistoriqueData]   = useState([]);
    const [filtreRole, setFiltreRole]           = useState('');
    const [filtreService, setFiltreService]     = useState('');
    const [filtreStatut, setFiltreStatut]       = useState('all');
    const [search, setSearch]                   = useState('');

    const filtered = useMemo(() => {
        return utilisateurs.filter(u => {
            const matchRole    = !filtreRole    || u.role === filtreRole;
            const matchService = !filtreService || u.service === filtreService;
            const matchStatut  = filtreStatut === 'all' || u.statut === filtreStatut;
            const matchSearch  = !search || `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(search.toLowerCase());
            return matchRole && matchService && matchStatut && matchSearch;
        });
    }, [utilisateurs, filtreRole, filtreService, filtreStatut, search]);

    const handleHistorique = async (u) => {
        setUserHistorique(u);
        try {
            const res = await fetch(route('parametres.utilisateurs.historique', u.id), { headers: { Accept: 'application/json' } });
            const data = await res.json();
            setHistoriqueData(data.historique || []);
        } catch {
            setHistoriqueData([]);
        }
    };

    return (
        <AppLayout title="Paramètres — Utilisateurs">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Utilisateurs</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {utilisateurs.length} utilisateur{utilisateurs.length > 1 ? 's' : ''} dans votre organisation
                        </p>
                    </div>
                    <button
                        onClick={() => setShowInviter(true)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition shadow-sm"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Inviter un utilisateur
                    </button>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Filtres */}
                <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-48">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher un utilisateur…"
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                        />
                    </div>
                    <select value={filtreRole} onChange={(e) => setFiltreRole(e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 outline-none transition">
                        <option value="">Tous les rôles</option>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <select value={filtreService} onChange={(e) => setFiltreService(e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 outline-none transition">
                        <option value="">Tous les services</option>
                        {services.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:border-purple-500 outline-none transition">
                        {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Utilisateur</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rôle</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Service</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Dernière connexion</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                            Aucun utilisateur ne correspond aux filtres sélectionnés.
                                        </td>
                                    </tr>
                                ) : filtered.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full ${avatarColor(u.email)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                                                    {u.avatar_url
                                                        ? <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                        : initials(u.nom, u.prenom)
                                                    }
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.prenom} {u.nom}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4"><RoleBadge role={u.role} /></td>
                                        <td className="px-4 py-4 hidden md:table-cell">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{u.service || '—'}</span>
                                        </td>
                                        <td className="px-4 py-4"><StatusDot statut={u.statut} /></td>
                                        <td className="px-4 py-4 hidden lg:table-cell">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{u.derniere_connexion || 'Jamais'}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <ActionsMenu
                                                utilisateur={u}
                                                onModifier={setUserModifier}
                                                onHistorique={handleHistorique}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length > 0 && (
                        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
                            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} sur {utilisateurs.length}
                        </div>
                    )}
                </div>

            </div>

            {/* Modals */}
            <InviterModal open={showInviter} onClose={() => setShowInviter(false)} services={services} />
            <ModifierRoleModal open={!!userModifier} onClose={() => setUserModifier(null)} utilisateur={userModifier} services={services} />
            <HistoriqueModal open={!!userHistorique} onClose={() => setUserHistorique(null)} utilisateur={userHistorique} historique={historiqueData} />
        </AppLayout>
    );
}
export { Utilisateurs };
