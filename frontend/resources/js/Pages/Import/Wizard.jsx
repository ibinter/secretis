/**
 * Import/Wizard.jsx — Wizard d'import universel CSV/XLSX SECRETIS ERP
 *
 * Étape 1 : Sélection module + upload fichier
 * Étape 2 : Mappage des colonnes
 * Étape 3 : Validation (affichage des erreurs)
 * Étape 4 : Importation + résultat
 */

import { useState, useRef, useCallback } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    CloudArrowUpIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    ArrowDownTrayIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    ArrowPathIcon,
    DocumentArrowDownIcon,
    CalendarDaysIcon,
    ClipboardDocumentListIcon,
    UsersIcon,
    IdentificationIcon,
    BanknotesIcon,
    BookOpenIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, ExclamationCircleIcon } from '@heroicons/react/24/solid';

// ─── Config ──────────────────────────────────────────────────────────────────

const MODULE_ICONS = {
    events:     { icon: CalendarDaysIcon,         color: 'text-purple-500',   bg: 'bg-purple-50 dark:bg-purple-900/20' },
    tasks:      { icon: ClipboardDocumentListIcon, color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    visitors:   { icon: UsersIcon,                 color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    hr:         { icon: IdentificationIcon,         color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    contacts:   { icon: BookOpenIcon,               color: 'text-pink-500',   bg: 'bg-pink-50 dark:bg-pink-900/20' },
    accounting: { icon: BanknotesIcon,              color: 'text-teal-500',   bg: 'bg-teal-50 dark:bg-teal-900/20' },
};

const STEPS = [
    { id: 1, label: 'Fichier' },
    { id: 2, label: 'Mappage' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Import' },
];

// ─── Composants helpers ───────────────────────────────────────────────────────

function StepIndicator({ current }) {
    return (
        <div className="flex items-center justify-center gap-0 mb-8">
            {STEPS.map((step, i) => (
                <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                            step.id < current  ? 'bg-green-500 text-white' :
                            step.id === current ? 'bg-[#7e22ce] text-white ring-4 ring-[#7e22ce]/20' :
                            'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        }`}>
                            {step.id < current ? <CheckCircleSolid className="w-4 h-4" /> : step.id}
                        </div>
                        <span className={`mt-1 text-xs font-medium ${
                            step.id === current
                                ? 'text-[#7e22ce]'
                                : 'text-gray-400 dark:text-gray-500'
                        }`}>{step.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                        <div className={`w-16 h-0.5 mx-2 mb-5 transition-colors ${
                            step.id < current ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'
                        }`} />
                    )}
                </div>
            ))}
        </div>
    );
}

function ModuleCard({ moduleKey, config, label, selected, onSelect }) {
    const Icon = config.icon;
    return (
        <button
            onClick={() => onSelect(moduleKey)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                selected
                    ? 'border-[#7e22ce] bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
            }`}
        >
            <span className={`p-2 rounded-lg ${config.bg}`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
            </span>
            <span className={`text-sm font-semibold ${selected ? 'text-[#7e22ce]' : 'text-gray-700 dark:text-gray-300'}`}>
                {label}
            </span>
        </button>
    );
}

function ProgressBar({ value, color = 'bg-[#7e22ce]' }) {
    return (
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
                className={`h-full ${color} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    );
}

// ─── Étape 1 : Upload ─────────────────────────────────────────────────────────

function StepUpload({ modules, onNext }) {
    const [selectedModule, setSelectedModule] = useState('');
    const [file, setFile]                     = useState(null);
    const [dragging, setDragging]             = useState(false);
    const [uploading, setUploading]           = useState(false);
    const [error, setError]                   = useState('');
    const inputRef                            = useRef(null);

    const handleFile = useCallback((f) => {
        if (! f) return;
        const ext = f.name.split('.').pop().toLowerCase();
        if (! ['csv', 'xlsx'].includes(ext)) {
            setError('Format non supporté. Acceptés : CSV, XLSX.');
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setError('Fichier trop volumineux (max 10 MB).');
            return;
        }
        setError('');
        setFile(f);
    }, []);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const handleUpload = async () => {
        if (! selectedModule) { setError('Sélectionnez un module.'); return; }
        if (! file)           { setError('Choisissez un fichier.'); return; }

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('module', selectedModule);

        try {
            const { data } = await axios.post('/api/v1/import/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onNext(data);
        } catch (e) {
            setError(e.response?.data?.message || 'Erreur lors de l\'upload.');
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = (format = 'xlsx') => {
        if (! selectedModule) { setError('Sélectionnez d\'abord un module.'); return; }
        window.open(`/api/v1/import/template/${selectedModule}?format=${format}`, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Module */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">1. Sélectionnez le module de destination</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(modules).map(([key, mod]) => (
                        <ModuleCard
                            key={key}
                            moduleKey={key}
                            config={MODULE_ICONS[key] || MODULE_ICONS.contacts}
                            label={mod.label}
                            selected={selectedModule === key}
                            onSelect={setSelectedModule}
                        />
                    ))}
                </div>
            </div>

            {/* Télécharger le template */}
            {selectedModule && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-100 dark:border-purple-800">
                    <ArrowDownTrayIcon className="w-4 h-4 text-[#7e22ce] flex-shrink-0" />
                    <span>Téléchargez le fichier modèle pour éviter les erreurs de format.</span>
                    <button onClick={() => downloadTemplate('xlsx')} className="ml-auto text-[#7e22ce] font-semibold hover:underline whitespace-nowrap">
                        Modèle Excel
                    </button>
                    <button onClick={() => downloadTemplate('csv')} className="text-[#7e22ce] font-semibold hover:underline whitespace-nowrap">
                        Modèle CSV
                    </button>
                </div>
            )}

            {/* Zone de dépôt */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">2. Chargez votre fichier CSV ou XLSX</h3>
                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                        dragging
                            ? 'border-[#7e22ce] bg-purple-50 dark:bg-purple-900/20'
                            : file
                            ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                            : 'border-gray-200 dark:border-gray-600 hover:border-[#7e22ce] bg-white dark:bg-gray-800 hover:bg-purple-50/30'
                    }`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv,.xlsx"
                        className="hidden"
                        onChange={e => handleFile(e.target.files[0])}
                    />
                    {file ? (
                        <div className="text-center">
                            <DocumentArrowDownIcon className="w-10 h-10 text-green-500 mx-auto mb-2" />
                            <p className="font-semibold text-green-700 dark:text-green-400">{file.name}</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                                onClick={e => { e.stopPropagation(); setFile(null); }}
                                className="mt-2 text-xs text-red-500 hover:underline"
                            >
                                Choisir un autre fichier
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <CloudArrowUpIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-600 dark:text-gray-400 font-medium">
                                Glissez un fichier ici ou <span className="text-[#7e22ce] font-semibold">parcourir</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">CSV, XLSX — max 10 MB — max 10 000 lignes</p>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <ExclamationCircleIcon className="w-4 h-4" /> {error}
                </p>
            )}

            <button
                onClick={handleUpload}
                disabled={! file || ! selectedModule || uploading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#7e22ce] hover:bg-[#2574a9] text-white font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
                {uploading ? <><ArrowPathIcon className="w-5 h-5 animate-spin" /> Analyse en cours...</> : <><ArrowRightIcon className="w-5 h-5" /> Analyser le fichier</>}
            </button>
        </div>
    );
}

// ─── Étape 2 : Mappage ────────────────────────────────────────────────────────

function StepMapping({ uploadData, onNext, onBack }) {
    const [mapping, setMapping]             = useState(uploadData.auto_mapping || {});
    const [skipHeader, setSkipHeader]       = useState(true);
    const [updateExisting, setUpdateExisting] = useState(false);
    const [validating, setValidating]       = useState(false);
    const [error, setError]                 = useState('');

    const { detected_columns, available_fields, preview } = uploadData;

    const updateMapping = (col, field) => {
        setMapping(prev => ({ ...prev, [col]: field || null }));
    };

    const handleValidate = async () => {
        const filledMappings = Object.values(mapping).filter(Boolean).length;
        if (filledMappings === 0) {
            setError('Mappez au moins une colonne.');
            return;
        }

        setValidating(true);
        setError('');

        try {
            const { data } = await axios.post(`/api/v1/import/${uploadData.job_id}/validate`, {
                column_mapping: mapping,
                options: { skip_header: skipHeader, update_existing: updateExisting },
            });
            onNext(data);
        } catch (e) {
            setError(e.response?.data?.message || 'Erreur lors de la validation.');
        } finally {
            setValidating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Infos fichier */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 flex items-center gap-4 text-sm">
                <DocumentArrowDownIcon className="w-8 h-8 text-[#7e22ce]" />
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{uploadData.total_rows?.toLocaleString('fr-FR')} lignes détectées</p>
                    <p className="text-gray-400">
                        {(uploadData.file_size / 1024).toFixed(1)} KB
                    </p>
                </div>
            </div>

            {/* Aperçu fichier */}
            {preview && preview.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Aperçu (3 premières lignes)</p>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-600">
                        <table className="w-full text-xs">
                            <tbody>
                                {preview.map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/30'}>
                                        {row.map((cell, j) => (
                                            <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[160px] truncate border-r border-gray-100 dark:border-gray-700 last:border-0">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Mapping */}
            <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Associez les colonnes de votre fichier aux champs SECRETIS
                </p>
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-600">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-1/3">Colonne fichier</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 w-12">→</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Champ SECRETIS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {detected_columns.map(col => {
                                const mapped  = mapping[col];
                                const isIgnored = ! mapped;
                                const fieldDef = available_fields.find(f => f.field === mapped);

                                return (
                                    <tr key={col} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                                            <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{col}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-400">→</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={mapped || ''}
                                                    onChange={e => updateMapping(col, e.target.value)}
                                                    className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7e22ce]"
                                                >
                                                    <option value="">— Ignorer —</option>
                                                    {available_fields.map(f => (
                                                        <option key={f.field} value={f.field}>
                                                            {f.label}{f.required ? ' *' : ''}
                                                        </option>
                                                    ))}
                                                </select>

                                                {fieldDef?.required && (
                                                    <span className="px-1.5 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                                                        Requis
                                                    </span>
                                                )}
                                                {isIgnored && (
                                                    <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-400 font-medium whitespace-nowrap">
                                                        Ignoré
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Options */}
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                    <input
                        type="checkbox"
                        checked={skipHeader}
                        onChange={e => setSkipHeader(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-[#7e22ce]"
                    />
                    Ignorer la première ligne (en-tête)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                    <input
                        type="checkbox"
                        checked={updateExisting}
                        onChange={e => setUpdateExisting(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-[#7e22ce]"
                    />
                    Mettre à jour les enregistrements existants
                </label>
            </div>

            {error && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <ExclamationCircleIcon className="w-4 h-4" /> {error}
                </p>
            )}

            <div className="flex gap-3">
                <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" /> Retour
                </button>
                <button
                    onClick={handleValidate}
                    disabled={validating}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#7e22ce] hover:bg-[#2574a9] text-white font-semibold text-sm transition-colors disabled:opacity-60"
                >
                    {validating ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Validation...</> : <><ArrowRightIcon className="w-4 h-4" /> Valider le mapping</>}
                </button>
            </div>
        </div>
    );
}

// ─── Étape 3 : Validation ─────────────────────────────────────────────────────

function StepValidation({ validationData, uploadData, onNext, onBack }) {
    const { valid_rows, error_rows, total_rows, errors, can_import } = validationData;

    const downloadErrors = () => {
        window.open(`/api/v1/import/${uploadData.job_id}/error-report`, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Résumé */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{valid_rows?.toLocaleString('fr-FR')}</p>
                    <p className="text-sm text-green-600 dark:text-green-500 mt-1">Lignes valides</p>
                </div>
                <div className={`border rounded-xl p-4 text-center ${
                    error_rows > 0
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}>
                    <p className={`text-2xl font-bold ${error_rows > 0 ? 'text-red-700 dark:text-red-400' : 'text-gray-400'}`}>
                        {error_rows?.toLocaleString('fr-FR')}
                    </p>
                    <p className={`text-sm mt-1 ${error_rows > 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-400'}`}>
                        Lignes avec erreurs
                    </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{total_rows?.toLocaleString('fr-FR')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total</p>
                </div>
            </div>

            {/* Erreurs */}
            {errors && errors.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Erreurs détectées ({errors.length} affichées)
                        </p>
                        <button onClick={downloadErrors} className="flex items-center gap-1.5 text-xs text-[#7e22ce] hover:underline">
                            <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Exporter les erreurs
                        </button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-red-200 dark:border-red-800 max-h-60">
                        <table className="w-full text-xs">
                            <thead className="bg-red-50 dark:bg-red-900/20 sticky top-0">
                                <tr>
                                    {['Ligne', 'Champ', 'Valeur', 'Erreur'].map(h => (
                                        <th key={h} className="px-3 py-2 text-left font-semibold text-red-700 dark:text-red-400 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-red-100 dark:divide-red-900/30">
                                {errors.map((err, i) => (
                                    <tr key={i} className="bg-white dark:bg-gray-800">
                                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300 font-mono">{err.row}</td>
                                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{err.field}</td>
                                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{err.value ?? '—'}</td>
                                        <td className="px-3 py-2 text-red-600 dark:text-red-400">{err.message}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="flex gap-3">
                <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" /> Corriger le mapping
                </button>
                {can_import && (
                    <button
                        onClick={onNext}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#7e22ce] hover:bg-[#2574a9] text-white font-semibold text-sm transition-colors"
                    >
                        <ArrowRightIcon className="w-4 h-4" />
                        Importer {valid_rows?.toLocaleString('fr-FR')} lignes valides
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Étape 4 : Import ─────────────────────────────────────────────────────────

function StepImport({ uploadData }) {
    const [status, setStatus]   = useState('idle'); // idle | running | completed | failed
    const [progress, setProgress] = useState(0);
    const [result, setResult]   = useState(null);
    const [error, setError]     = useState('');

    const startImport = async () => {
        setStatus('running');
        setError('');

        try {
            await axios.post(`/api/v1/import/${uploadData.job_id}/start`);

            // Polling
            const poll = setInterval(async () => {
                const { data } = await axios.get(`/api/v1/import/${uploadData.job_id}/status`);
                setProgress(data.progress || 0);

                if (data.status === 'completed') {
                    clearInterval(poll);
                    setStatus('completed');
                    setResult(data.summary);
                } else if (data.status === 'failed') {
                    clearInterval(poll);
                    setStatus('failed');
                    setError(data.summary?.error || 'Erreur lors de l\'import.');
                }
            }, 1500);

        } catch (e) {
            setStatus('failed');
            setError(e.response?.data?.message || 'Erreur lors du démarrage.');
        }
    };

    if (status === 'idle') {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ArrowRightIcon className="w-8 h-8 text-[#7e22ce]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Prêt à importer</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Cliquez sur le bouton pour démarrer l'importation.</p>
                <button
                    onClick={startImport}
                    className="px-8 py-3 rounded-xl bg-[#7e22ce] hover:bg-[#2574a9] text-white font-semibold transition-colors shadow-sm"
                >
                    Démarrer l'import
                </button>
            </div>
        );
    }

    if (status === 'running') {
        return (
            <div className="text-center py-8 space-y-4">
                <ArrowPathIcon className="w-12 h-12 text-[#7e22ce] mx-auto animate-spin" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Importation en cours...</h3>
                <div className="max-w-xs mx-auto">
                    <ProgressBar value={progress} />
                    <p className="text-sm text-gray-400 mt-2">{progress}%</p>
                </div>
            </div>
        );
    }

    if (status === 'failed') {
        return (
            <div className="text-center py-8 space-y-4">
                <XCircleIcon className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">Import échoué</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
                <button onClick={startImport} className="px-6 py-2.5 rounded-xl bg-[#7e22ce] text-white font-semibold">
                    Réessayer
                </button>
            </div>
        );
    }

    // Completed
    return (
        <div className="space-y-6">
            <div className="text-center">
                <CheckCircleIcon className="w-14 h-14 text-green-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Import terminé !</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                    <CheckCircleSolid className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">
                        {(result?.imported || 0).toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500">Importées</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                        {(result?.skipped || 0).toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500">Ignorées (doublons)</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                    <XCircleIcon className="w-5 h-5 text-red-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-red-700 dark:text-red-400">
                        {(result?.errors || 0).toLocaleString('fr-FR')}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-500">Échouées</p>
                </div>
            </div>

            <div className="flex gap-3">
                <Link
                    href="/import/history"
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    Voir l'historique
                </Link>
                {result?.errors > 0 && (
                    <button
                        onClick={() => window.open(`/api/v1/import/${uploadData.job_id}/error-report`, '_blank')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700 text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" /> Rapport d'erreurs
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ImportWizard({ modules = {} }) {
    const [step, setStep]               = useState(1);
    const [uploadData, setUploadData]   = useState(null);
    const [validationData, setValidationData] = useState(null);

    const handleUploadDone = (data) => {
        setUploadData(data);
        setStep(2);
    };

    const handleMappingDone = (data) => {
        setValidationData(data);
        setStep(3);
    };

    const handleValidationDone = () => {
        setStep(4);
    };

    return (
        <AppLayout>
            <Head title="Import universel" />

            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import de données</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Importez vos données CSV ou Excel en quelques étapes guidées.
                    </p>
                </div>

                <StepIndicator current={step} />

                {/* Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                    {step === 1 && (
                        <StepUpload modules={modules} onNext={handleUploadDone} />
                    )}
                    {step === 2 && uploadData && (
                        <StepMapping
                            uploadData={uploadData}
                            onNext={handleMappingDone}
                            onBack={() => setStep(1)}
                        />
                    )}
                    {step === 3 && validationData && (
                        <StepValidation
                            validationData={validationData}
                            uploadData={uploadData}
                            onNext={handleValidationDone}
                            onBack={() => setStep(2)}
                        />
                    )}
                    {step === 4 && uploadData && (
                        <StepImport uploadData={uploadData} />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
export { ImportWizard };
