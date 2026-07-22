import { useState, useRef } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import {
    AcademicCapIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    EyeIcon,
    EyeSlashIcon,
    ChartBarIcon,
    UsersIcon,
    TrophyIcon,
    BookOpenIcon,
    XMarkIcon,
    CheckIcon,
    Bars3Icon,
    GripVerticalIcon,
} from '@heroicons/react/24/outline';

// ─── Constantes ───────────────────────────────────────────────────────────────

const LEVELS = [
    { value: 'beginner',     label: 'Débutant' },
    { value: 'intermediate', label: 'Intermédiaire' },
    { value: 'advanced',     label: 'Avancé' },
];

const CONTENT_TYPES = [
    { value: 'text',  label: 'Texte riche (TipTap)' },
    { value: 'video', label: 'Vidéo (URL)' },
    { value: 'quiz',  label: 'Quiz' },
    { value: 'file',  label: 'Fichier' },
];

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color = 'indigo' }) {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600',
        green:  'bg-green-50 text-green-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        blue:   'bg-blue-50 text-blue-600',
    };
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${colors[color]}`}>
                <Icon className="w-6 h-6"/>
            </div>
            <div>
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-sm text-gray-500">{label}</div>
            </div>
        </div>
    );
}

// ─── Modal Cours ──────────────────────────────────────────────────────────────

function CourseModal({ course, onClose, categories }) {
    const isEdit = !!course?.id;
    const { data, setData, post, put, processing, errors } = useForm({
        title:            course?.title ?? '',
        description:      course?.description ?? '',
        category:         course?.category ?? '',
        level:            course?.level ?? 'beginner',
        duration_minutes: course?.duration_minutes ?? 0,
        is_published:     course?.is_published ?? false,
    });

    function handleSubmit(e) {
        e.preventDefault();
        if (isEdit) {
            put(`/training/courses/${course.id}`, {
                onSuccess: () => { onClose(); router.reload(); },
            });
        } else {
            post('/training/courses', {
                onSuccess: () => { onClose(); router.reload(); },
            });
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">
                        {isEdit ? 'Modifier le cours' : 'Nouveau cours'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                        <input type="text" value={data.title} onChange={e => setData('title', e.target.value)}
                               className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                               placeholder="Titre du cours"/>
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea value={data.description} onChange={e => setData('description', e.target.value)}
                                  rows={3}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Description du cours..."/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
                            <input type="text" value={data.category} onChange={e => setData('category', e.target.value)}
                                   list="categories-list"
                                   className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                   placeholder="ex. Sécurité, RH, Gestion"/>
                            <datalist id="categories-list">
                                {(categories ?? []).map(c => <option key={c} value={c}/>)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                            <select value={data.level} onChange={e => setData('level', e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Durée (minutes)</label>
                        <input type="number" min="0" value={data.duration_minutes}
                               onChange={e => setData('duration_minutes', parseInt(e.target.value) || 0)}
                               className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <div className={`relative w-11 h-6 rounded-full transition-colors ${data.is_published ? 'bg-indigo-600' : 'bg-gray-200'}`}
                             onClick={() => setData('is_published', !data.is_published)}>
                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${data.is_published ? 'translate-x-5' : ''}`}/>
                        </div>
                        <span className="text-sm font-medium text-gray-700">Publier le cours</span>
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                            Annuler
                        </button>
                        <button type="submit" disabled={processing}
                                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                            {processing ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Ligne de cours ───────────────────────────────────────────────────────────

function CourseRow({ course, onEdit, onDelete }) {
    const levelColors = {
        beginner:     'bg-green-100 text-green-700',
        intermediate: 'bg-yellow-100 text-yellow-700',
        advanced:     'bg-red-100 text-red-700',
    };

    return (
        <tr className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3">
                <div className="font-medium text-gray-900 text-sm">{course.title}</div>
                <div className="text-xs text-gray-500">{course.category}</div>
            </td>
            <td className="px-4 py-3">
                <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${levelColors[course.level] ?? 'bg-gray-100 text-gray-600'}`}>
                    {LEVELS.find(l => l.value === course.level)?.label ?? course.level}
                </span>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{course.duration_minutes} min</td>
            <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    course.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                    {course.is_published
                        ? <><EyeIcon className="w-3 h-3"/>Publié</>
                        : <><EyeSlashIcon className="w-3 h-3"/>Brouillon</>
                    }
                </span>
            </td>
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => router.visit(`/training/courses/${course.id}`)}
                            className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-600" title="Voir">
                        <EyeIcon className="w-4 h-4"/>
                    </button>
                    <button onClick={() => onEdit(course)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Modifier">
                        <PencilIcon className="w-4 h-4"/>
                    </button>
                    <button onClick={() => onDelete(course)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Supprimer">
                        <TrashIcon className="w-4 h-4"/>
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminCourses({ courses, stats }) {
    const [modalCourse, setModalCourse] = useState(null);  // null = fermé, {} = nouveau, {id,...} = edit
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [tab, setTab] = useState('courses'); // 'courses' | 'analytics'
    const [analytics, setAnalytics] = useState(null);

    const categories = [...new Set((courses ?? []).map(c => c.category).filter(Boolean))];

    function handleDelete(course) {
        setConfirmDelete(course);
    }

    function confirmDeleteAction() {
        router.delete(`/training/courses/${confirmDelete.id}`, {
            onSuccess: () => { setConfirmDelete(null); router.reload(); },
        });
    }

    async function loadAnalytics() {
        const res = await fetch('/api/training/analytics');
        const data = await res.json();
        setAnalytics(data);
        setTab('analytics');
    }

    return (
        <AppLayout>
            <Head title="Gestion des formations"/>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* En-tête */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <AcademicCapIcon className="w-8 h-8 text-indigo-600"/>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gestion des formations</h1>
                            <p className="text-sm text-gray-500">Créez et gérez les cours de votre organisation</p>
                        </div>
                    </div>
                    <button onClick={() => setModalCourse({})}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">
                        <PlusIcon className="w-5 h-5"/>
                        Nouveau cours
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <KpiCard icon={BookOpenIcon}   label="Total cours"       value={stats?.total_courses ?? 0}      color="indigo"/>
                    <KpiCard icon={EyeIcon}         label="Publiés"           value={stats?.published_courses ?? 0}  color="green"/>
                    <KpiCard icon={UsersIcon}        label="Inscriptions"      value={stats?.total_enrollments ?? 0}  color="blue"/>
                    <KpiCard icon={TrophyIcon}       label="Certificats émis"  value={stats?.total_certificates ?? 0} color="yellow"/>
                </div>

                {/* Onglets */}
                <div className="flex gap-1 mb-6 border-b border-gray-200">
                    <button onClick={() => setTab('courses')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                tab === 'courses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}>
                        Cours
                    </button>
                    <button onClick={loadAnalytics}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                tab === 'analytics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}>
                        <ChartBarIcon className="w-4 h-4 inline mr-1"/>
                        Statistiques
                    </button>
                </div>

                {/* Tableau des cours */}
                {tab === 'courses' && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {courses?.length === 0 ? (
                            <div className="text-center py-16">
                                <AcademicCapIcon className="w-14 h-14 text-gray-200 mx-auto mb-4"/>
                                <p className="text-gray-500">Aucun cours. Créez-en un !</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Cours</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Niveau</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Durée</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Statut</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {courses.map(course => (
                                        <CourseRow key={course.id} course={course}
                                                   onEdit={setModalCourse}
                                                   onDelete={handleDelete}/>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Statistiques */}
                {tab === 'analytics' && analytics && (
                    <div className="space-y-6">
                        {/* Taux de réussite global quiz */}
                        {analytics.global_pass_rate !== null && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <h3 className="font-semibold text-gray-800 mb-3">Quiz — Taux de réussite global</h3>
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl font-bold text-indigo-600">{analytics.global_pass_rate}%</div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                                        <div className="bg-indigo-600 h-3 rounded-full" style={{ width: `${analytics.global_pass_rate}%` }}/>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Question la plus ratée */}
                        {analytics.hardest_question && (
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                                <h3 className="font-semibold text-orange-800 mb-2">Question la plus ratée</h3>
                                <p className="text-orange-700 text-sm">{analytics.hardest_question.question_text}</p>
                                <div className="mt-2 text-xs text-orange-600">
                                    Taux d'erreur : {analytics.hardest_question.error_rate}% ({analytics.hardest_question.total_attempts} tentatives)
                                </div>
                            </div>
                        )}

                        {/* Taux de complétion par cours */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="font-semibold text-gray-800 mb-4">Complétion par cours</h3>
                            <div className="space-y-3">
                                {(analytics.courses ?? []).map(c => (
                                    <div key={c.course_id}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="text-gray-700 font-medium truncate">{c.course_title}</span>
                                            <span className="text-gray-500 text-xs ml-2 flex-shrink-0">
                                                {c.completed}/{c.total_enrolled} ({c.completion_rate}%)
                                            </span>
                                        </div>
                                        <div className="bg-gray-100 rounded-full h-2">
                                            <div className="bg-indigo-500 h-2 rounded-full transition-all"
                                                 style={{ width: `${c.completion_rate}%` }}/>
                                        </div>
                                        {c.avg_completion_minutes && (
                                            <div className="text-xs text-gray-400 mt-0.5">
                                                Temps moyen : {Math.round(c.avg_completion_minutes / 60)}h{c.avg_completion_minutes % 60}min
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Cours */}
            {modalCourse !== null && (
                <CourseModal
                    course={Object.keys(modalCourse).length > 0 ? modalCourse : null}
                    onClose={() => setModalCourse(null)}
                    categories={categories}
                />
            )}

            {/* Confirm Delete */}
            {confirmDelete && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="font-bold text-gray-900 mb-2">Supprimer le cours ?</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            "<strong>{confirmDelete.title}</strong>" sera supprimé définitivement avec tous ses modules.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">
                                Annuler
                            </button>
                            <button onClick={confirmDeleteAction}
                                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
