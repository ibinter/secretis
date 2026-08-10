import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    PlusIcon,
    TrashIcon,
    PencilSquareIcon,
    Bars3Icon,
    ArrowUpIcon,
    ArrowDownIcon,
    CheckCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';

/**
 * WorkflowTemplates — Configuration des templates de workflow (Admin)
 *
 * Permet de créer, éditer et supprimer des templates de validation
 * avec un builder d'étapes drag-and-drop simplifié.
 */

const CATEGORIES = [
    { value: '', label: 'Toutes les catégories' },
    { value: 'CONTRAT',      label: 'Contrat' },
    { value: 'FACTURE',      label: 'Facture' },
    { value: 'COURRIER',     label: 'Courrier' },
    { value: 'RAPPORT',      label: 'Rapport' },
    { value: 'PV_REUNION',   label: 'PV de réunion' },
    { value: 'FICHE_RH',     label: 'Fiche RH' },
    { value: 'BON_COMMANDE', label: 'Bon de commande' },
    { value: 'DEVIS',        label: 'Devis' },
    { value: 'DECISION',     label: 'Décision' },
    { value: 'AUTRE',        label: 'Autre' },
];

const ROLES = [
    'admin', 'manager', 'directeur', 'responsable_rh', 'comptable',
    'chef_projet', 'juriste', 'daf', 'pdg',
];

const DEFAULT_STEP = {
    step_name:      '',
    approver_role:  '',
    approver_id:    null,
    is_required:    true,
    timeout_hours:  72,
};

function StepBuilder({ steps, onChange }) {
    function addStep() {
        onChange([...steps, { ...DEFAULT_STEP, step_name: `Étape ${steps.length + 1}` }]);
    }

    function removeStep(idx) {
        onChange(steps.filter((_, i) => i !== idx));
    }

    function updateStep(idx, field, value) {
        onChange(steps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
    }

    function moveStep(idx, direction) {
        const next = [...steps];
        const target = idx + direction;
        if (target < 0 || target >= next.length) return;
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange(next);
    }

    return (
        <div className="space-y-3">
            {steps.map((step, idx) => (
                <div
                    key={idx}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
                >
                    <div className="flex items-center gap-2">
                        <Bars3Icon className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="text-xs font-semibold text-gray-500">ÉTAPE {idx + 1}</span>
                        <div className="ml-auto flex items-center gap-1">
                            <button onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                                <ArrowUpIcon className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1}
                                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
                                <ArrowDownIcon className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => removeStep(idx)}
                                className="p-1 rounded hover:bg-red-100 text-red-500">
                                <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Nom de l'étape *
                            </label>
                            <input
                                value={step.step_name}
                                onChange={e => updateStep(idx, 'step_name', e.target.value)}
                                placeholder="Ex: Validation DAF"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Rôle approbateur
                            </label>
                            <select
                                value={step.approver_role}
                                onChange={e => updateStep(idx, 'approver_role', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Choisir un rôle…</option>
                                {ROLES.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                Délai (heures)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={720}
                                value={step.timeout_hours}
                                onChange={e => updateStep(idx, 'timeout_hours', parseInt(e.target.value) || 72)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div className="col-span-2 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id={`required-${idx}`}
                                checked={step.is_required}
                                onChange={e => updateStep(idx, 'is_required', e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor={`required-${idx}`} className="text-sm text-gray-700">
                                Étape obligatoire
                            </label>
                        </div>
                    </div>
                </div>
            ))}

            <button
                onClick={addStep}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 py-3 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
                <PlusIcon className="h-4 w-4" />
                Ajouter une étape
            </button>
        </div>
    );
}

function TemplateModal({ template, onClose, onSaved }) {
    const isNew = !template?.id;
    const [form, setForm] = useState({
        name:        template?.name ?? '',
        description: template?.description ?? '',
        category:    template?.category ?? '',
        is_active:   template?.is_active ?? true,
        steps:       template?.steps
            ? (typeof template.steps === 'string' ? JSON.parse(template.steps) : template.steps)
            : [{ ...DEFAULT_STEP, step_name: 'Validation initiale' }],
    });
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!form.name.trim()) { setError('Le nom est requis.'); return; }
        if (form.steps.length === 0) { setError('Au moins une étape est requise.'); return; }

        setSaving(true);
        setError(null);

        try {
            if (isNew) {
                await axios.post('/api/document-workflow-templates', form);
            } else {
                await axios.put(`/api/document-workflow-templates/${template.id}`, form);
            }
            onSaved();
            onClose();
        } catch (e) {
            setError(e.response?.data?.message ?? 'Une erreur est survenue.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-semibold text-gray-900">
                        {isNew ? 'Nouveau template de workflow' : 'Modifier le template'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nom du template *
                            </label>
                            <input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Ex: Validation contrat fournisseur"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Catégorie déclenchante
                            </label>
                            <select
                                value={form.category}
                                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">Template actif</span>
                            </label>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                rows={2}
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">Étapes du workflow</h3>
                        <StepBuilder
                            steps={form.steps}
                            onChange={steps => setForm(f => ({ ...f, steps }))}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-medium"
                        >
                            {saving ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function WorkflowTemplates({ templates: initialTemplates = [] }) {
    // La liste vient de la prop Inertia (DocumentWorkflowController@templates).
    const templates = Array.isArray(initialTemplates)
        ? initialTemplates
        : (initialTemplates?.data ?? []);
    const loading = false;
    const [modalTemplate, setModalTemplate] = useState(null); // null = fermé, {} = nouveau, {...} = édition
    const [filterCat, setFilterCat] = useState('');
    const [deleting, setDeleting]   = useState(null);

    function fetchTemplates() {
        router.reload({ only: ['templates'] });
    }

    async function deleteTemplate(id) {
        if (!window.confirm('Supprimer ce template ?')) return;
        setDeleting(id);
        try {
            await axios.delete(`/api/document-workflow-templates/${id}`);
            await fetchTemplates();
        } finally {
            setDeleting(null);
        }
    }

    const filtered = filterCat
        ? templates.filter(t => t.category === filterCat)
        : templates;

    const byCategory = CATEGORIES.slice(1).reduce((acc, cat) => {
        const items = filtered.filter(t => t.category === cat.value);
        if (items.length > 0) acc[cat.label] = items;
        return acc;
    }, {});

    const uncategorized = filtered.filter(t => !t.category);

    return (
        <AppLayout>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Templates de workflow</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configurez les circuits de validation par catégorie de document.
                    </p>
                </div>
                <button
                    onClick={() => setModalTemplate({})}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium"
                >
                    <PlusIcon className="h-4 w-4" />
                    Nouveau template
                </button>
            </div>

            {/* Filtre */}
            <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                    <button
                        key={c.value}
                        onClick={() => setFilterCat(c.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                            ${filterCat === c.value
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(byCategory).map(([catLabel, items]) => (
                        <div key={catLabel}>
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                {catLabel}
                            </h2>
                            <div className="space-y-2">
                                {items.map(template => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onEdit={() => setModalTemplate(template)}
                                        onDelete={() => deleteTemplate(template.id)}
                                        deleting={deleting === template.id}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {uncategorized.length > 0 && (
                        <div>
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Toutes catégories
                            </h2>
                            <div className="space-y-2">
                                {uncategorized.map(template => (
                                    <TemplateCard
                                        key={template.id}
                                        template={template}
                                        onEdit={() => setModalTemplate(template)}
                                        onDelete={() => deleteTemplate(template.id)}
                                        deleting={deleting === template.id}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {filtered.length === 0 && (
                        <div className="text-center py-16 text-gray-500">
                            <p>Aucun template trouvé.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {modalTemplate !== null && (
                <TemplateModal
                    template={Object.keys(modalTemplate).length === 0 ? null : modalTemplate}
                    onClose={() => setModalTemplate(null)}
                    onSaved={fetchTemplates}
                />
            )}
        </div>
        </AppLayout>
    );
}

function TemplateCard({ template, onEdit, onDelete, deleting }) {
    const steps = typeof template.steps === 'string'
        ? JSON.parse(template.steps)
        : (template.steps ?? []);

    return (
        <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm">{template.name}</h3>
                    {template.is_active ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                            <CheckCircleIcon className="h-3 w-3" /> Actif
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Inactif</span>
                    )}
                </div>
                {template.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-gray-500">{steps.length} étape(s) :</span>
                    {steps.slice(0, 5).map((s, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                            {s.step_name}
                        </span>
                    ))}
                    {steps.length > 5 && (
                        <span className="text-xs text-gray-400">+{steps.length - 5}</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={onEdit}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-indigo-600"
                >
                    <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                    onClick={onDelete}
                    disabled={deleting}
                    className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
export { WorkflowTemplates };
