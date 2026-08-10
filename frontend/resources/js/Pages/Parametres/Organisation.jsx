import React, { useState, useRef, useCallback } from 'react';
import { useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEVISES = [
    { code: 'XOF', label: 'Franc CFA (BCEAO) — XOF' },
    { code: 'XAF', label: 'Franc CFA (BEAC) — XAF' },
    { code: 'GNF', label: 'Franc Guinéen — GNF' },
    { code: 'MAD', label: 'Dirham Marocain — MAD' },
    { code: 'DZD', label: 'Dinar Algérien — DZD' },
    { code: 'TND', label: 'Dinar Tunisien — TND' },
    { code: 'EGP', label: 'Livre Égyptienne — EGP' },
    { code: 'NGN', label: 'Naira Nigérian — NGN' },
    { code: 'KES', label: 'Shilling Kenyan — KES' },
    { code: 'GHS', label: 'Cedi Ghanéen — GHS' },
    { code: 'EUR', label: 'Euro — EUR' },
    { code: 'USD', label: 'Dollar US — USD' },
];

const FUSEAUX = [
    'Africa/Abidjan', 'Africa/Dakar', 'Africa/Douala', 'Africa/Nairobi',
    'Africa/Casablanca', 'Africa/Cairo', 'Africa/Lagos', 'Africa/Accra',
    'Africa/Bamako', 'Africa/Ouagadougou', 'Africa/Conakry', 'Europe/Paris',
];

const LOCALES = [
    { code: 'fr_FR', label: 'Français (France)' },
    { code: 'fr_SN', label: 'Français (Sénégal)' },
    { code: 'fr_CI', label: 'Français (Côte d\'Ivoire)' },
    { code: 'en_US', label: 'English (US)' },
    { code: 'en_GB', label: 'English (UK)' },
    { code: 'ar_MA', label: 'العربية (Maroc)' },
];

const ACCENT_COLORS = [
    '#1e40af', '#0f766e', '#7c3aed', '#b45309', '#be123c',
    '#15803d', '#0369a1', '#9333ea', '#c2410c', '#0d9488',
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ children }) {
    return (
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            {children}
        </h3>
    );
}

function FormField({ label, error, required, children, hint }) {
    return (
        <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}

function Input({ className = '', ...props }) {
    return (
        <input
            className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition ${className}`}
            {...props}
        />
    );
}

function Select({ children, className = '', ...props }) {
    return (
        <select
            className={`w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}

function SaveButton({ processing, dirty }) {
    return (
        <button
            type="submit"
            disabled={processing || !dirty}
            className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition flex items-center gap-2"
        >
            {processing && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
            )}
            {processing ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
    );
}

// ─── Logo Upload ──────────────────────────────────────────────────────────────

function LogoUploader({ logoUrl, onFileChange, onRemove }) {
    const inputRef = useRef();
    const [dragging, setDragging] = useState(false);
    const [preview, setPreview] = useState(logoUrl || null);

    const handleFile = (file) => {
        if (!file) return;
        if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
            alert('Format non supporté. Utilisez PNG, JPG, SVG ou WebP.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert('Le fichier dépasse 2 Mo. Choisissez une image plus légère.');
            return;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        onFileChange(file);
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
    }, []);

    return (
        <div className="flex items-start gap-6">
            <div
                className={`relative flex-shrink-0 w-32 h-20 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition
                    ${dragging ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
            >
                {preview ? (
                    <img src={preview} alt="Logo" className="max-h-full max-w-full object-contain rounded-lg p-1" />
                ) : (
                    <div className="text-center">
                        <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-gray-400 mt-1 block">Cliquez ou déposez</span>
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                />
            </div>
            <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo de l'organisation</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, SVG ou WebP — max 2 Mo<br />Recommandé : fond transparent, 400×200 px minimum</p>
                <div className="flex gap-2">
                    <button type="button" onClick={() => inputRef.current?.click()}
                        className="text-xs px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300">
                        Changer le logo
                    </button>
                    {preview && (
                        <button type="button" onClick={() => { setPreview(null); onRemove(); }}
                            className="text-xs px-3 py-1.5 rounded-md border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                            Supprimer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Departments Manager ──────────────────────────────────────────────────────

function DepartementsManager({ value, onChange }) {
    const [newName, setNewName] = useState('');

    const add = () => {
        const trimmed = newName.trim();
        if (!trimmed || value.includes(trimmed)) return;
        onChange([...value, trimmed]);
        setNewName('');
    };

    const remove = (dep) => onChange(value.filter(d => d !== dep));

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {value.map((dep) => (
                    <span key={dep} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm border border-purple-200 dark:border-purple-800">
                        {dep}
                        <button type="button" onClick={() => remove(dep)}
                            className="text-purple-400 hover:text-red-500 transition text-xs leading-none">
                            ✕
                        </button>
                    </span>
                ))}
                {value.length === 0 && (
                    <span className="text-sm text-gray-400 italic">Aucun service défini</span>
                )}
            </div>
            <div className="flex gap-2">
                <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
                    placeholder="Nom du service / département…"
                    className="max-w-xs"
                />
                <button type="button" onClick={add}
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium transition">
                    + Ajouter
                </button>
            </div>
            <p className="text-xs text-gray-500">Appuyez sur Entrée pour ajouter rapidement un service.</p>
        </div>
    );
}

// ─── Numérotation Section ─────────────────────────────────────────────────────

function NumerotationSection({ data, setData, errors }) {
    const fields = [
        { key: 'prefix_courrier_entrant', label: 'Courrier entrant', placeholder: 'CORR-ENT' },
        { key: 'prefix_courrier_sortant', label: 'Courrier sortant', placeholder: 'CORR-SORT' },
        { key: 'prefix_document',         label: 'Document GED',    placeholder: 'DOC' },
        { key: 'prefix_reunion',          label: 'Réunion',         placeholder: 'REU' },
    ];

    const preview = (prefix) =>
        `${prefix || 'PREFIX'}-${new Date().getFullYear()}-0001`;

    return (
        <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                <strong>Format :</strong> {'{PREFIX}'}-{'{ANNÉE}'}-{'{NUMÉRO}'} — ex : CORR-ENT-2025-0001
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map(({ key, label, placeholder }) => (
                    <FormField key={key} label={label} error={errors[key]}
                        hint={`Aperçu : ${preview(data[key] || placeholder)}`}>
                        <Input
                            value={data[key] || ''}
                            onChange={(e) => setData(key, e.target.value.toUpperCase())}
                            placeholder={placeholder}
                        />
                    </FormField>
                ))}
            </div>
            <FormField label="Remise à zéro du compteur" hint="Détermine quand le numéro séquentiel repart de 0001">
                <Select
                    value={data.numerotation_reset || 'annuel'}
                    onChange={(e) => setData('numerotation_reset', e.target.value)}
                >
                    <option value="annuel">Annuellement (1er janvier)</option>
                    <option value="jamais">Jamais (numérotation continue)</option>
                </Select>
            </FormField>
        </div>
    );
}

// ─── Accent Color Picker ──────────────────────────────────────────────────────

function AccentColorPicker({ value, onChange }) {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
                {ACCENT_COLORS.map((color) => (
                    <button
                        key={color}
                        type="button"
                        title={color}
                        onClick={() => onChange(color)}
                        style={{ backgroundColor: color }}
                        className={`w-8 h-8 rounded-full transition-all ${value === color ? 'ring-2 ring-offset-2 ring-gray-800 dark:ring-gray-200 scale-110' : 'hover:scale-105'}`}
                    />
                ))}
                <label className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center cursor-pointer overflow-hidden" title="Couleur personnalisée">
                    <input
                        type="color"
                        value={value || '#1e40af'}
                        onChange={(e) => onChange(e.target.value)}
                        className="opacity-0 absolute"
                    />
                    <span className="text-gray-400 text-lg">+</span>
                </label>
            </div>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg shadow-md" style={{ backgroundColor: value || '#1e40af' }} />
                <div>
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-400">{(value || '#1e40af').toUpperCase()}</p>
                    <p className="text-xs text-gray-500">Couleur d'accent principale</p>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Organisation({ organisation, flash }) {
    const { data, setData, post, processing, errors, isDirty, reset } = useForm({
        raison_sociale:            organisation?.raison_sociale || '',
        logo:                      null,
        logo_remove:               false,
        adresse:                   organisation?.adresse || '',
        telephone:                 organisation?.telephone || '',
        email:                     organisation?.email || '',
        site_web:                  organisation?.site_web || '',
        devise:                    organisation?.devise || 'XOF',
        fuseau_horaire:            organisation?.fuseau_horaire || 'Africa/Abidjan',
        locale:                    organisation?.locale || 'fr_FR',
        services:                  organisation?.services || [],
        prefix_courrier_entrant:   organisation?.prefix_courrier_entrant || 'CORR-ENT',
        prefix_courrier_sortant:   organisation?.prefix_courrier_sortant || 'CORR-SORT',
        prefix_document:           organisation?.prefix_document || 'DOC',
        prefix_reunion:            organisation?.prefix_reunion || 'REU',
        numerotation_reset:        organisation?.numerotation_reset || 'annuel',
        couleur_accent:            organisation?.couleur_accent || '#1e40af',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('parametres.organisation.update'), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout title="Paramètres — Organisation">
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Organisation</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Informations générales, structure et numérotation de votre organisation.
                    </p>
                </div>

                {/* Flash message */}
                {flash?.success && (
                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
                        <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {flash.success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* ── Section : Identité ──────────────────────────────── */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                        <SectionTitle>Identité de l'organisation</SectionTitle>

                        <LogoUploader
                            logoUrl={organisation?.logo_url}
                            onFileChange={(file) => setData('logo', file)}
                            onRemove={() => { setData('logo', null); setData('logo_remove', true); }}
                        />

                        <div className="grid grid-cols-1 gap-4">
                            <FormField label="Raison sociale" required error={errors.raison_sociale}>
                                <Input
                                    value={data.raison_sociale}
                                    onChange={(e) => setData('raison_sociale', e.target.value)}
                                    placeholder="Ex : Mairie de Yamoussoukro"
                                    required
                                />
                            </FormField>
                            <FormField label="Adresse complète" error={errors.adresse}>
                                <textarea
                                    value={data.adresse}
                                    onChange={(e) => setData('adresse', e.target.value)}
                                    rows={2}
                                    placeholder="Rue, Quartier, Ville, Pays"
                                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition resize-none"
                                />
                            </FormField>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FormField label="Téléphone" error={errors.telephone}>
                                <Input
                                    type="tel"
                                    value={data.telephone}
                                    onChange={(e) => setData('telephone', e.target.value)}
                                    placeholder="+225 27 21 00 00 00"
                                />
                            </FormField>
                            <FormField label="Email officiel" error={errors.email}>
                                <Input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="contact@organisation.ci"
                                />
                            </FormField>
                            <FormField label="Site web" error={errors.site_web}>
                                <Input
                                    type="url"
                                    value={data.site_web}
                                    onChange={(e) => setData('site_web', e.target.value)}
                                    placeholder="https://www.organisation.ci"
                                />
                            </FormField>
                        </div>
                    </div>

                    {/* ── Section : Localisation ──────────────────────────── */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-6">
                        <SectionTitle>Localisation & Devise</SectionTitle>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <FormField label="Devise principale" error={errors.devise}>
                                <Select
                                    value={data.devise}
                                    onChange={(e) => setData('devise', e.target.value)}
                                >
                                    {DEVISES.map((d) => (
                                        <option key={d.code} value={d.code}>{d.label}</option>
                                    ))}
                                </Select>
                            </FormField>
                            <FormField label="Fuseau horaire" error={errors.fuseau_horaire}>
                                <Select
                                    value={data.fuseau_horaire}
                                    onChange={(e) => setData('fuseau_horaire', e.target.value)}
                                >
                                    {FUSEAUX.map((tz) => (
                                        <option key={tz} value={tz}>{tz}</option>
                                    ))}
                                </Select>
                            </FormField>
                            <FormField label="Format régional (locale)" error={errors.locale}>
                                <Select
                                    value={data.locale}
                                    onChange={(e) => setData('locale', e.target.value)}
                                >
                                    {LOCALES.map((l) => (
                                        <option key={l.code} value={l.code}>{l.label}</option>
                                    ))}
                                </Select>
                            </FormField>
                        </div>
                    </div>

                    {/* ── Section : Structure ──────────────────────────────── */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                        <SectionTitle>Structure — Services & Départements</SectionTitle>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Définissez les services et départements de votre organisation. Ils seront disponibles lors de la création des utilisateurs et des courriers.
                        </p>
                        <DepartementsManager
                            value={data.services}
                            onChange={(v) => setData('services', v)}
                        />
                    </div>

                    {/* ── Section : Numérotation ───────────────────────────── */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                        <SectionTitle>Numérotation des références</SectionTitle>
                        <NumerotationSection data={data} setData={setData} errors={errors} />
                    </div>

                    {/* ── Section : Apparence ──────────────────────────────── */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
                        <SectionTitle>Apparence</SectionTitle>
                        <FormField
                            label="Couleur d'accent"
                            hint="Utilisée pour les boutons principaux, liens actifs et badges de votre organisation."
                            error={errors.couleur_accent}
                        >
                            <AccentColorPicker
                                value={data.couleur_accent}
                                onChange={(c) => setData('couleur_accent', c)}
                            />
                        </FormField>
                    </div>

                    {/* ── Actions ─────────────────────────────────────────── */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="button"
                            onClick={() => reset()}
                            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                        >
                            Annuler les modifications
                        </button>
                        <SaveButton processing={processing} dirty={isDirty} />
                    </div>

                </form>
            </div>
        </AppLayout>
    );
}
export { Organisation };
