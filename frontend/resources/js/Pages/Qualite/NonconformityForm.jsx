import React, { useState } from 'react';
import { Head, usePage, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { ArrowLeft, AlertTriangle, Save, Loader2 } from 'lucide-react';
import axios from 'axios';

const SOURCES = [
    { value: 'audit',              label: 'Audit' },
    { value: 'client_complaint',   label: 'Réclamation client' },
    { value: 'internal_detection', label: 'Détection interne' },
    { value: 'supplier',           label: 'Fournisseur' },
    { value: 'regulatory',         label: 'Réglementaire' },
];

const SEVERITIES = [
    { value: 'mineure',  label: 'Mineure',  classes: 'border-yellow-300 bg-yellow-50 text-yellow-800' },
    { value: 'majeure',  label: 'Majeure',  classes: 'border-orange-300 bg-orange-50 text-orange-800' },
    { value: 'critique', label: 'Critique', classes: 'border-red-300 bg-red-50 text-red-800' },
];

function FieldError({ errors, name }) {
    if (!errors[name]) return null;
    const msg = Array.isArray(errors[name]) ? errors[name][0] : errors[name];
    return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

export default function NonconformityForm() {
    const { processes = [] } = usePage().props;

    const [form, setForm] = useState({
        title:                 '',
        description:           '',
        source:                'internal_detection',
        severity:              'mineure',
        detected_at:           new Date().toISOString().slice(0, 10),
        process_id:            '',
        product_service:       '',
        immediate_action:      '',
        due_date:              '',
        cost_of_nonconformity: '',
    });
    const [errors, setErrors]         = useState({});
    const [submitting, setSubmitting] = useState(false);

    const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const inputCls = (name) =>
        `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ` +
        (errors[name] ? 'border-red-400' : 'border-gray-300');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        setErrors({});

        // Nettoyage : ne pas envoyer les champs optionnels vides.
        const payload = {};
        Object.entries(form).forEach(([k, v]) => {
            if (v !== '' && v !== null) payload[k] = v;
        });

        try {
            await axios.post('/qualite/non-conformites', payload, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            window.location.href = '/qualite/non-conformites';
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors ?? {});
            } else {
                setErrors({ _global: ["Une erreur inattendue s'est produite. Veuillez réessayer."] });
            }
            setSubmitting(false);
        }
    };

    return (
        <AppLayout>
            <Head title="Nouvelle non-conformité — Qualité ISO 9001" />

            <div className="p-6 max-w-3xl mx-auto space-y-5">
                {/* En-tête */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link
                            href="/qualite/non-conformites"
                            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-purple-600 transition"
                        >
                            <ArrowLeft className="w-4 h-4" /> Retour à la liste
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 mt-1">Nouvelle non-conformité</h1>
                        <p className="text-sm text-gray-500">Déclaration d'une non-conformité (ISO 9001)</p>
                    </div>
                </div>

                {errors._global && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {errors._global[0]}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
                    {/* Titre */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Titre <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="Résumé court de la non-conformité"
                            maxLength={255}
                            className={inputCls('title')}
                        />
                        <FieldError errors={errors} name="title" />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows={4}
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            placeholder="Description détaillée du problème constaté..."
                            className={inputCls('description')}
                        />
                        <FieldError errors={errors} name="description" />
                    </div>

                    {/* Source + Sévérité */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Source <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.source}
                                onChange={e => set('source', e.target.value)}
                                className={inputCls('source')}
                            >
                                {SOURCES.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                            <FieldError errors={errors} name="source" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sévérité <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                {SEVERITIES.map(s => (
                                    <button
                                        key={s.value}
                                        type="button"
                                        onClick={() => set('severity', s.value)}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition
                                            ${form.severity === s.value
                                                ? s.classes + ' ring-2 ring-purple-500'
                                                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}
                                        `}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                            <FieldError errors={errors} name="severity" />
                        </div>
                    </div>

                    {/* Date de détection + Processus */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Détectée le <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.detected_at}
                                onChange={e => set('detected_at', e.target.value)}
                                className={inputCls('detected_at')}
                            />
                            <FieldError errors={errors} name="detected_at" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Processus concerné</label>
                            <select
                                value={form.process_id}
                                onChange={e => set('process_id', e.target.value)}
                                className={inputCls('process_id')}
                            >
                                <option value="">— Aucun —</option>
                                {processes.map(p => (
                                    <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                                ))}
                            </select>
                            <FieldError errors={errors} name="process_id" />
                        </div>
                    </div>

                    {/* Produit/service + Échéance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Produit / service concerné</label>
                            <input
                                type="text"
                                value={form.product_service}
                                onChange={e => set('product_service', e.target.value)}
                                placeholder="Ex : Rapport mensuel, prestation X..."
                                maxLength={255}
                                className={inputCls('product_service')}
                            />
                            <FieldError errors={errors} name="product_service" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Échéance de traitement</label>
                            <input
                                type="date"
                                value={form.due_date}
                                onChange={e => set('due_date', e.target.value)}
                                className={inputCls('due_date')}
                            />
                            <FieldError errors={errors} name="due_date" />
                        </div>
                    </div>

                    {/* Action immédiate */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Action immédiate (curative)</label>
                        <textarea
                            rows={3}
                            value={form.immediate_action}
                            onChange={e => set('immediate_action', e.target.value)}
                            placeholder="Mesure prise immédiatement pour contenir le problème..."
                            className={inputCls('immediate_action')}
                        />
                        <FieldError errors={errors} name="immediate_action" />
                    </div>

                    {/* Coût */}
                    <div className="md:w-1/2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Coût estimé de la non-conformité (XOF)</label>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            value={form.cost_of_nonconformity}
                            onChange={e => set('cost_of_nonconformity', e.target.value)}
                            placeholder="0"
                            className={inputCls('cost_of_nonconformity')}
                        />
                        <FieldError errors={errors} name="cost_of_nonconformity" />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-4 border-t">
                        <Link
                            href="/qualite/non-conformites"
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
                        >
                            Annuler
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitting
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Save className="w-4 h-4" />}
                            Créer la non-conformité
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
export { NonconformityForm };
