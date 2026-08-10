/**
 * Rapports/Index.jsx — Centre des rapports SECRETIS ERP
 *
 * Grille de 9 rapports disponibles, modal de configuration, export, historique.
 */

import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '@/Layouts/AppLayout';
import {
    EnvelopeIcon,
    UserGroupIcon,
    ClipboardDocumentListIcon,
    CalendarDaysIcon,
    BuildingOfficeIcon,
    DocumentChartBarIcon,
    CubeIcon,
    GlobeAltIcon,
    ShieldCheckIcon,
    ArrowDownTrayIcon,
    XMarkIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================================================
// CONFIG DES RAPPORTS
// ============================================================================

const REPORTS = [
    {
        id: 'mail',
        title: 'Registre Courrier',
        description: 'Courriers entrants et sortants, statuts, délais de traitement et statistiques de suivi.',
        icon: EnvelopeIcon,
        color: 'bg-purple-50 text-[#7e22ce]',
        border: 'border-purple-100 hover:border-[#7e22ce]',
    },
    {
        id: 'meetings',
        title: 'Réunions',
        description: 'Synthèse des réunions, participants, décisions prises et taux d\'assiduité.',
        icon: UserGroupIcon,
        color: 'bg-indigo-50 text-indigo-600',
        border: 'border-indigo-100 hover:border-indigo-400',
    },
    {
        id: 'tasks',
        title: 'Avancement des Tâches',
        description: 'Tâches par service, responsable et statut. Taux de complétion et retards.',
        icon: ClipboardDocumentListIcon,
        color: 'bg-emerald-50 text-emerald-600',
        border: 'border-emerald-100 hover:border-emerald-400',
    },
    {
        id: 'visitors',
        title: 'Flux Visiteurs',
        description: 'Flux quotidien des visiteurs par service, heure d\'affluence et durée moyenne.',
        icon: BuildingOfficeIcon,
        color: 'bg-amber-50 text-[#F39C12]',
        border: 'border-amber-100 hover:border-[#F39C12]',
    },
    {
        id: 'leaves',
        title: 'Absences & Congés',
        description: 'Congés approuvés, refusés et en attente par agent et par type.',
        icon: CalendarDaysIcon,
        color: 'bg-purple-50 text-purple-600',
        border: 'border-purple-100 hover:border-purple-400',
    },
    {
        id: 'rooms',
        title: 'Occupation Salles',
        description: 'Taux d\'occupation, heures utilisées et réservations par salle de réunion.',
        icon: DocumentChartBarIcon,
        color: 'bg-teal-50 text-teal-600',
        border: 'border-teal-100 hover:border-teal-400',
    },
    {
        id: 'supplies',
        title: 'Fournitures',
        description: 'Niveaux de stock, alertes de rupture et mouvements de fournitures de bureau.',
        icon: CubeIcon,
        color: 'bg-orange-50 text-orange-600',
        border: 'border-orange-100 hover:border-orange-400',
    },
    {
        id: 'global',
        title: 'Rapport Global',
        description: 'Synthèse complète de toute l\'activité de l\'organisation sur la période.',
        icon: GlobeAltIcon,
        color: 'bg-[#9333EA]/5 text-[#9333EA]',
        border: 'border-[#9333EA]/20 hover:border-[#9333EA]',
        featured: true,
    },
    {
        id: 'audit',
        title: 'Journal d\'Audit',
        description: 'Historique complet des actions utilisateurs — accès, modifications, suppressions.',
        icon: ShieldCheckIcon,
        color: 'bg-red-50 text-red-600',
        border: 'border-red-100 hover:border-red-400',
    },
];

const QUICK_PERIODS = [
    { label: 'Aujourd\'hui',    start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
    { label: '7 derniers j.',  start: format(subDays(new Date(), 6), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Ce mois',        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
    { label: 'Mois précédent', start: format(startOfMonth(subDays(new Date(), 32)), 'yyyy-MM-dd'), end: format(endOfMonth(subDays(new Date(), 32)), 'yyyy-MM-dd') },
];

// ============================================================================
// MODAL CONFIGURATION
// ============================================================================

function ReportModal({ report, onClose }) {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
    const [format_, setFormat]      = useState('json');
    const [loading, setLoading]     = useState(false);

    const applyQuickPeriod = (p) => {
        setStartDate(p.start);
        setEndDate(p.end);
    };

    const handleGenerate = async () => {
        if (format_ === 'json') {
            onClose();
            window.location.href = `/rapports/viewer?type=${report.id}&start_date=${startDate}&end_date=${endDate}`;
            return;
        }

        setLoading(true);
        try {
            const response = await axios.get(`/api/v1/reports/${report.id}`, {
                params: { start_date: startDate, end_date: endDate, format: format_ },
                responseType: 'blob',
            });

            const ext   = format_ === 'pdf' ? 'pdf' : 'csv';
            const url   = window.URL.createObjectURL(new Blob([response.data]));
            const link  = document.createElement('a');
            link.href   = url;
            link.download = `rapport-${report.id}-${startDate}.${ext}`;
            link.click();
            window.URL.revokeObjectURL(url);
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${report.color}`}>
                            <report.icon className="h-5 w-5" />
                        </div>
                        <h2 className="text-base font-semibold text-[#9333EA]">{report.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Périodes rapides */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                            Période prédéfinie
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_PERIODS.map((p) => (
                                <button
                                    key={p.label}
                                    onClick={() => applyQuickPeriod(p)}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-[#7e22ce] hover:text-[#7e22ce] transition-colors"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dates personnalisées */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                Date début
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                max={endDate}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7e22ce] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                                Date fin
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7e22ce] focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Format */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                            Format de sortie
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'json',  label: 'Visualiser' },
                                { value: 'pdf',   label: 'PDF' },
                                { value: 'excel', label: 'Excel/CSV' },
                            ].map((f) => (
                                <button
                                    key={f.value}
                                    onClick={() => setFormat(f.value)}
                                    className={`py-2 text-sm font-medium rounded-lg border transition-all ${
                                        format_ === f.value
                                            ? 'bg-[#9333EA] text-white border-[#9333EA]'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 px-6 pb-5">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-[#9333EA] text-white text-sm font-semibold hover:bg-[#7e22ce] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        {loading ? (
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : (
                            <ArrowDownTrayIcon className="h-4 w-4" />
                        )}
                        {format_ === 'json' ? 'Visualiser' : 'Télécharger'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function RapportsIndex() {
    const [selectedReport, setSelectedReport] = useState(null);

    return (
        <AppLayout>
            <Head title="Centre des rapports" />

            <div className="min-h-screen bg-gray-50">
                {/* En-tête */}
                <div className="bg-white border-b border-gray-100 px-6 py-5">
                    <div className="max-w-screen-xl mx-auto flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-[#9333EA]">Centre des rapports</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Générez et exportez vos rapports d'activité
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedReport(REPORTS.find(r => r.id === 'global'))}
                            className="flex items-center gap-2 px-4 py-2.5 bg-[#9333EA] text-white rounded-xl text-sm font-semibold hover:bg-[#7e22ce] transition-colors"
                        >
                            <GlobeAltIcon className="h-4 w-4" />
                            Rapport global
                        </button>
                    </div>
                </div>

                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
                    {/* Grille de rapports */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {REPORTS.map((report) => (
                            <button
                                key={report.id}
                                onClick={() => setSelectedReport(report)}
                                className={`text-left bg-white rounded-xl border p-5 transition-all hover:shadow-md active:scale-[0.98] ${report.border} ${
                                    report.featured ? 'ring-2 ring-[#9333EA]/10' : ''
                                }`}
                            >
                                <div className={`inline-flex p-2.5 rounded-xl mb-4 ${report.color}`}>
                                    <report.icon className="h-6 w-6" />
                                </div>
                                <h3 className="text-sm font-semibold text-[#9333EA] mb-1">
                                    {report.title}
                                    {report.featured && (
                                        <span className="ml-2 text-[10px] font-bold bg-[#9333EA] text-white px-1.5 py-0.5 rounded-full">
                                            COMPLET
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-gray-500 leading-relaxed">{report.description}</p>
                                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#7e22ce]">
                                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                                    Configurer et générer
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Note bas de page */}
                    <p className="text-center text-xs text-gray-400 mt-8">
                        Tous les rapports sont générés à la demande. Les données exportées respectent les droits d'accès de votre compte.
                    </p>
                </div>
            </div>

            {/* Modal configuration */}
            {selectedReport && (
                <ReportModal
                    report={selectedReport}
                    onClose={() => setSelectedReport(null)}
                />
            )}
        </AppLayout>
    );
}
export { RapportsIndex };
