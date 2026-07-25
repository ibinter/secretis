/**
 * Accueil/CheckIn.jsx — Interface d'accueil visiteurs
 *
 * Optimisée pour tablette/écran dédié à l'accueil :
 *  - Grand formulaire lisible à distance
 *  - Autocomplete pour la personne visitée
 *  - Liste temps réel des visiteurs présents (via Reverb)
 *  - Bouton départ par visiteur présent
 *  - Impression badge automatique à l'enregistrement
 *  - Alerte visuelle si visiteur liste noire détecté
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    UserPlusIcon,
    ArrowRightStartOnRectangleIcon,
    PrinterIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    PhoneIcon,
    BuildingOfficeIcon,
    ClockIcon,
    CheckCircleIcon,
    XMarkIcon,
    CameraIcon,
    UserIcon,
} from '@heroicons/react/24/outline';

// ─── Constante : objets de visite prédéfinis ─────────────────────────────────
const VISIT_PURPOSES = [
    'Réunion de travail',
    'Entretien / Recrutement',
    'Livraison / Prestation',
    'Rendez-vous commercial',
    'Maintenance / Réparation',
    'Formation',
    'Visite de courtoisie',
    'Dépôt de dossier / Documents',
    'Autre',
];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CheckIn({ presentVisitors: initialVisitors = [], hosts: initialHosts = [] }) {
    const { auth } = usePage().props;

    // ── Formulaire ──
    const [form, setForm]         = useState(defaultForm());
    const [hostSearch, setHostSearch] = useState('');
    const [hostResults, setHostResults] = useState(initialHosts);
    const [showHostDropdown, setShowHostDropdown] = useState(false);
    const [errors, setErrors]     = useState({});
    const [submitting, setSubmitting] = useState(false);

    // ── Visiteurs présents ──
    const [presentVisitors, setPresentVisitors] = useState(initialVisitors);
    const [checkingOut, setCheckingOut]         = useState(null);

    // ── Alertes ──
    const [blacklistAlert, setBlacklistAlert]   = useState(null);
    const [successMsg, setSuccessMsg]            = useState(null);

    const firstNameRef = useRef(null);
    const hostSearchRef = useRef(null);

    // ─── Connexion Reverb — Mise à jour temps réel ───────────────────────────

    useEffect(() => {
        if (!window.Echo) return;

        const channel = window.Echo.private(`org.${auth.user.organization_id}.accueil`);

        channel
            .listen('.visitor.checked_in', (e) => {
                setPresentVisitors(prev => [e.visitor, ...prev]);
            })
            .listen('.visitor.checked_out', (e) => {
                setPresentVisitors(prev => prev.filter(v => v.id !== e.visitor.id));
            });

        return () => {
            window.Echo.leave(`org.${auth.user.organization_id}.accueil`);
        };
    }, [auth.user.organization_id]);

    // ─── Recherche de l'hôte (autocomplete) ──────────────────────────────────

    useEffect(() => {
        if (!hostSearch || hostSearch.length < 2) {
            setHostResults(initialHosts.slice(0, 8));
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await axios.get('/api/users/search', {
                    params: { q: hostSearch, per_page: 10 },
                });
                setHostResults(res.data);
            } catch { /* ignorer les erreurs réseau */ }
        }, 300);

        return () => clearTimeout(timer);
    }, [hostSearch, initialHosts]);

    // ─── Mise à jour du formulaire ────────────────────────────────────────────

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
        }
    };

    const selectHost = (host) => {
        setForm(prev => ({ ...prev, host_id: host.id, host_name: host.name }));
        setHostSearch(host.name);
        setShowHostDropdown(false);
    };

    // ─── Enregistrement de l'arrivée ─────────────────────────────────────────

    const handleCheckIn = async (e) => {
        e.preventDefault();
        setErrors({});
        setBlacklistAlert(null);
        setSuccessMsg(null);

        // Validation basique côté client
        const clientErrors = {};
        if (!form.last_name.trim())  clientErrors.last_name  = 'Nom requis';
        if (!form.first_name.trim()) clientErrors.first_name = 'Prénom requis';
        if (!form.phone.trim())      clientErrors.phone      = 'Téléphone requis';
        if (!form.host_id)           clientErrors.host_id    = 'Personne visitée requise';
        if (!form.purpose)           clientErrors.purpose    = 'Objet de la visite requis';

        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            return;
        }

        setSubmitting(true);

        try {
            const res = await axios.post('/api/accueil/visitors/check-in', {
                first_name:   form.first_name.trim(),
                last_name:    form.last_name.trim().toUpperCase(),
                company:      form.company.trim() || null,
                phone:        form.phone.trim(),
                email:        form.email.trim() || null,
                host_id:      form.host_id,
                purpose:      form.purpose,
                id_type:      form.id_type || null,
                id_number:    form.id_number.trim() || null,
                vehicle_plate:form.vehicle_plate.trim() || null,
                consent_photo:false,
            });

            const { visitor, badge_url, blacklist_alert } = res.data;

            // Alerte liste noire
            if (blacklist_alert) {
                setBlacklistAlert(blacklist_alert);
            } else {
                setSuccessMsg(`${visitor.first_name} ${visitor.last_name} enregistré(e) avec succès ! Badge imprimé.`);
                // Auto-masquer après 5 secondes
                setTimeout(() => setSuccessMsg(null), 5000);
            }

            // Ajouter à la liste des présents
            setPresentVisitors(prev => [visitor, ...prev]);

            // Impression automatique du badge (ouvrir dans un nouvel onglet)
            if (!blacklist_alert) {
                setTimeout(() => window.open(badge_url, '_blank'), 500);
            }

            // Réinitialiser le formulaire
            setForm(defaultForm());
            setHostSearch('');
            firstNameRef.current?.focus();

        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {});
            } else {
                setErrors({ _general: 'Une erreur est survenue. Veuillez réessayer.' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Enregistrement du départ ─────────────────────────────────────────────

    const handleCheckOut = async (visitorId) => {
        setCheckingOut(visitorId);
        try {
            await axios.post(`/api/accueil/visitors/${visitorId}/check-out`);
            setPresentVisitors(prev => prev.filter(v => v.id !== visitorId));
        } catch (err) {
            console.error('Erreur check-out', err);
        } finally {
            setCheckingOut(null);
        }
    };

    // ─── Impression du badge ──────────────────────────────────────────────────

    const printBadge = (visitorId) => {
        window.open(`/api/accueil/visitors/${visitorId}/badge`, '_blank');
    };

    // ─── Rendu ───────────────────────────────────────────────────────────────

    return (
        <>
            <Head title="Enregistrement visiteur" />

            {/* Alerte liste noire (modal plein écran) */}
            {blacklistAlert && (
                <BlacklistAlertModal
                    alert={blacklistAlert}
                    onClose={() => setBlacklistAlert(null)}
                />
            )}

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6">

                {/* ── Header ── */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <UserPlusIcon className="h-7 w-7 text-purple-600" />
                            Accueil Visiteurs
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {new Date().toLocaleDateString('fr-FR', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </p>
                    </div>

                    {/* Compteur présents */}
                    <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="font-semibold text-lg">{presentVisitors.length}</span>
                        <span className="text-sm">présent{presentVisitors.length > 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* ── Succès ── */}
                {successMsg && (
                    <div className="mb-4 flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">{successMsg}</p>
                    </div>
                )}

                {/* ── Erreur globale ── */}
                {errors._general && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-sm text-red-600">{errors._general}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                    {/* ════════════════════════════════════════════════════════
                        FORMULAIRE D'ENREGISTREMENT
                    ═══════════════════════════════════════════════════════ */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <UserPlusIcon className="h-5 w-5 text-purple-600" />
                            Nouvelle arrivée
                        </h2>

                        <form onSubmit={handleCheckIn} className="space-y-4">

                            {/* Nom & Prénom */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Prénom *" error={errors.first_name}>
                                    <input
                                        ref={firstNameRef}
                                        type="text"
                                        value={form.first_name}
                                        onChange={e => handleChange('first_name', e.target.value)}
                                        placeholder="Jean"
                                        className={fieldClass(errors.first_name)}
                                        autoComplete="off"
                                    />
                                </FormField>

                                <FormField label="Nom *" error={errors.last_name}>
                                    <input
                                        type="text"
                                        value={form.last_name}
                                        onChange={e => handleChange('last_name', e.target.value)}
                                        placeholder="DUPONT"
                                        className={fieldClass(errors.last_name)}
                                        autoComplete="off"
                                    />
                                </FormField>
                            </div>

                            {/* Société */}
                            <FormField label="Société / Organisation" error={errors.company}>
                                <div className="relative">
                                    <BuildingOfficeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={form.company}
                                        onChange={e => handleChange('company', e.target.value)}
                                        placeholder="Nom de l'entreprise"
                                        className={`${fieldClass(errors.company)} pl-10`}
                                    />
                                </div>
                            </FormField>

                            {/* Téléphone */}
                            <FormField label="Téléphone *" error={errors.phone}>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => handleChange('phone', e.target.value)}
                                        placeholder="+225 07 00 00 00 00"
                                        className={`${fieldClass(errors.phone)} pl-10`}
                                    />
                                </div>
                            </FormField>

                            {/* Personne visitée — Autocomplete */}
                            <FormField label="Personne visitée *" error={errors.host_id}>
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                                    <input
                                        ref={hostSearchRef}
                                        type="text"
                                        value={hostSearch}
                                        onChange={e => {
                                            setHostSearch(e.target.value);
                                            setShowHostDropdown(true);
                                            if (!e.target.value) handleChange('host_id', null);
                                        }}
                                        onFocus={() => setShowHostDropdown(true)}
                                        placeholder="Rechercher un collaborateur..."
                                        className={`${fieldClass(errors.host_id)} pl-10`}
                                        autoComplete="off"
                                    />

                                    {/* Dropdown résultats */}
                                    {showHostDropdown && hostResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                                            {hostResults.map(host => (
                                                <button
                                                    key={host.id}
                                                    type="button"
                                                    onClick={() => selectHost(host)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-600 text-left transition-colors"
                                                >
                                                    <img
                                                        src={host.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(host.name)}&size=32`}
                                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                                        alt={host.name}
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{host.name}</p>
                                                        <p className="text-xs text-gray-500">{host.job_title} — {host.department?.name}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormField>

                            {/* Objet de la visite */}
                            <FormField label="Objet de la visite *" error={errors.purpose}>
                                <select
                                    value={form.purpose}
                                    onChange={e => handleChange('purpose', e.target.value)}
                                    className={fieldClass(errors.purpose)}
                                >
                                    <option value="">Sélectionner l'objet...</option>
                                    {VISIT_PURPOSES.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </FormField>

                            {/* Champs optionnels (accordéon) */}
                            <OptionalFields form={form} errors={errors} onChange={handleChange} />

                            {/* Bouton enregistrer */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className={`w-full py-4 rounded-xl font-semibold text-white text-lg transition-all flex items-center justify-center gap-3 ${
                                    submitting
                                        ? 'bg-purple-400 cursor-not-allowed'
                                        : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900'
                                }`}
                            >
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Enregistrement…
                                    </>
                                ) : (
                                    <>
                                        <UserPlusIcon className="h-6 w-6" />
                                        Enregistrer l'arrivée
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* ════════════════════════════════════════════════════════
                        LISTE DES VISITEURS PRÉSENTS (temps réel)
                    ═══════════════════════════════════════════════════════ */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                            Visiteurs présents
                            <span className="ml-auto text-sm font-normal text-gray-500">
                                {presentVisitors.length} présent{presentVisitors.length > 1 ? 's' : ''}
                            </span>
                        </h2>

                        {presentVisitors.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <UserIcon className="h-12 w-12 opacity-30 mb-3" />
                                <p className="text-sm">Aucun visiteur présent pour le moment</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                                {presentVisitors.map(visitor => (
                                    <VisitorCard
                                        key={visitor.id}
                                        visitor={visitor}
                                        onCheckOut={() => handleCheckOut(visitor.id)}
                                        onPrintBadge={() => printBadge(visitor.id)}
                                        checkingOut={checkingOut === visitor.id}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Sous-composant : Carte visiteur présent ──────────────────────────────────

function VisitorCard({ visitor, onCheckOut, onPrintBadge, checkingOut }) {
    const arrival  = new Date(visitor.checked_in_at);
    const duration = Math.floor((Date.now() - arrival) / 60000);
    const durationStr = duration < 60
        ? `${duration}min`
        : `${Math.floor(duration / 60)}h${String(duration % 60).padStart(2, '0')}`;

    return (
        <div className={`p-4 rounded-xl border transition-all ${
            visitor.is_blacklisted
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
        }`}>
            <div className="flex items-start gap-3">
                {/* Avatar / Photo */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 text-white font-bold">
                    {visitor.first_name?.charAt(0)}{visitor.last_name?.charAt(0)}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                {visitor.first_name} {visitor.last_name}
                                {visitor.is_blacklisted && (
                                    <span className="ml-2 text-xs text-red-600 font-bold">⚠ LISTE NOIRE</span>
                                )}
                            </p>
                            {visitor.company && (
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <BuildingOfficeIcon className="h-3 w-3" />
                                    {visitor.company}
                                </p>
                            )}
                        </div>

                        {/* Badge PRÉSENT */}
                        <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Présent
                        </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            → {visitor.host?.name}
                        </span>
                        <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {new Date(visitor.checked_in_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            <span className="text-gray-400">({durationStr})</span>
                        </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500 truncate">📋 {visitor.purpose}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
                <button
                    onClick={onCheckOut}
                    disabled={checkingOut}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        checkingOut
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200'
                    }`}
                >
                    {checkingOut ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                    )}
                    Départ
                </button>

                <button
                    onClick={onPrintBadge}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Ré-imprimer le badge"
                >
                    <PrinterIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Sous-composant : Champs optionnels ──────────────────────────────────────

function OptionalFields({ form, errors, onChange }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div>
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-purple-600 hover:underline flex items-center gap-1"
            >
                {expanded ? '− Masquer' : '+ Informations complémentaires'}
                <span className="text-xs text-gray-400">(optionnel)</span>
            </button>

            {expanded && (
                <div className="mt-3 space-y-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <FormField label="Email" error={errors.email}>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => onChange('email', e.target.value)}
                            placeholder="visiteur@exemple.com"
                            className={fieldClass(errors.email)}
                        />
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Type pièce d'identité" error={errors.id_type}>
                            <select value={form.id_type} onChange={e => onChange('id_type', e.target.value)} className={fieldClass()}>
                                <option value="">— Sélectionner —</option>
                                <option value="cni">CNI</option>
                                <option value="passport">Passeport</option>
                                <option value="permis">Permis de conduire</option>
                                <option value="autre">Autre</option>
                            </select>
                        </FormField>

                        <FormField label="Numéro pièce" error={errors.id_number}>
                            <input
                                type="text"
                                value={form.id_number}
                                onChange={e => onChange('id_number', e.target.value)}
                                placeholder="CI-XXXX-XXX"
                                className={fieldClass()}
                            />
                        </FormField>
                    </div>

                    <FormField label="Immatriculation véhicule" error={errors.vehicle_plate}>
                        <input
                            type="text"
                            value={form.vehicle_plate}
                            onChange={e => onChange('vehicle_plate', e.target.value)}
                            placeholder="XX-XXXX-XX"
                            className={fieldClass()}
                        />
                    </FormField>
                </div>
            )}
        </div>
    );
}

// ─── Sous-composant : Alerte liste noire ─────────────────────────────────────

function BlacklistAlertModal({ alert, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 ${
                alert.alert_level === 'danger' ? 'border-red-600' : 'border-orange-400'
            }`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-full ${alert.alert_level === 'danger' ? 'bg-red-100' : 'bg-orange-100'}`}>
                        <ExclamationTriangleIcon className={`h-8 w-8 ${alert.alert_level === 'danger' ? 'text-red-600' : 'text-orange-500'}`} />
                    </div>
                    <div>
                        <h2 className={`text-xl font-bold ${alert.alert_level === 'danger' ? 'text-red-700' : 'text-orange-600'}`}>
                            {alert.alert_level === 'danger' ? '⛔ VISITEUR INTERDIT' : '⚠️ VISITEUR SIGNALÉ'}
                        </h2>
                        <p className="text-sm text-gray-500">Ce visiteur est sur la liste noire</p>
                    </div>
                </div>

                <div className={`p-4 rounded-xl mb-4 ${alert.alert_level === 'danger' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Motif :</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{alert.reason}</p>
                    <p className="text-xs text-gray-400 mt-2">Ajouté le {new Date(alert.added_at).toLocaleDateString('fr-FR')}</p>
                </div>

                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-center text-gray-700 dark:text-gray-300">
                        Informez immédiatement votre responsable.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-800 dark:bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                    >
                        J'ai pris note — Fermer l'alerte
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FormField({ label, error, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

const fieldClass = (error) =>
    `w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors dark:bg-gray-700 dark:text-white ${
        error
            ? 'border-red-300 focus:ring-red-500 bg-red-50'
            : 'border-gray-200 dark:border-gray-600 focus:ring-purple-500'
    }`;

const defaultForm = () => ({
    first_name:    '',
    last_name:     '',
    company:       '',
    phone:         '',
    email:         '',
    host_id:       null,
    host_name:     '',
    purpose:       '',
    id_type:       '',
    id_number:     '',
    vehicle_plate: '',
});
export { CheckIn };
