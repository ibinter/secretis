import { useState } from 'react';
import axios from 'axios';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

/**
 * CourseRating — Composant de notation d'un cours
 *
 * Props :
 *   courseId  : number  — ID du cours à noter
 *   initial   : { rating, comment } — valeurs initiales (si édition)
 *   onSuccess : () => void — callback après soumission réussie
 *   showDistribution : bool — afficher la distribution des notes
 *   distribution : [{ star, count, pct }] — données de distribution
 *   totalRatings : number
 *   avgRating    : number
 */
export default function CourseRating({
    courseId,
    initial = {},
    onSuccess,
    showDistribution = false,
    distribution = [],
    totalRatings = 0,
    avgRating = 0,
}) {
    const [hover, setHover]     = useState(0);
    const [rating, setRating]   = useState(initial.rating ?? 0);
    const [comment, setComment] = useState(initial.comment ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);
    const [done, setDone]       = useState(false);

    const LABELS = ['', 'Très décevant', 'Décevant', 'Passable', 'Bien', 'Excellent'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Veuillez sélectionner une note.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await axios.post(`/training/courses/${courseId}/rate`, { rating, comment });
            setDone(true);
            onSuccess?.();
        } catch (err) {
            setError(err.response?.data?.message ?? "Une erreur est survenue.");
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5 text-center">
                <div className="flex justify-center mb-2">
                    {[1,2,3,4,5].map(i => (
                        <StarSolid key={i} className={`w-6 h-6 ${i <= rating ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-600'}`} />
                    ))}
                </div>
                <p className="font-semibold text-green-800 dark:text-green-300">Merci pour votre évaluation !</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">Votre avis aide les autres apprenants.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Distribution (lecture seule) */}
            {showDistribution && totalRatings > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Note globale</h4>
                    <div className="flex items-center gap-6">
                        {/* Note moyenne */}
                        <div className="text-center flex-shrink-0">
                            <div className="text-5xl font-bold text-gray-900 dark:text-white mb-1">
                                {Number(avgRating).toFixed(1)}
                            </div>
                            <div className="flex justify-center mb-1">
                                {[1,2,3,4,5].map(i => (
                                    <StarSolid key={i}
                                               className={`w-5 h-5 ${i <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200 dark:text-gray-600'}`} />
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{totalRatings} avis</p>
                        </div>

                        {/* Barres */}
                        <div className="flex-1 space-y-1.5">
                            {[5,4,3,2,1].map(star => {
                                const d = distribution.find(x => x.star === star);
                                const pct = d?.pct ?? 0;
                                return (
                                    <div key={star} className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-3 text-right">{star}</span>
                                        <StarSolid className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                                        <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 w-7 text-right">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Formulaire de notation */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    {initial.rating ? 'Modifier votre évaluation' : 'Évaluer cette formation'}
                </h4>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Étoiles */}
                    <div>
                        <div className="flex items-center gap-1 mb-1">
                            {[1,2,3,4,5].map(i => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setRating(i)}
                                    onMouseEnter={() => setHover(i)}
                                    onMouseLeave={() => setHover(0)}
                                    className="transition-transform hover:scale-110 focus:outline-none"
                                    aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
                                >
                                    {i <= (hover || rating) ? (
                                        <StarSolid className="w-8 h-8 text-yellow-400 drop-shadow-sm" />
                                    ) : (
                                        <StarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {(hover > 0 || rating > 0) && (
                            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 h-5">
                                {LABELS[hover || rating]}
                            </p>
                        )}
                    </div>

                    {/* Commentaire */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Commentaire <span className="font-normal text-gray-400">(facultatif)</span>
                        </label>
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            placeholder="Partagez votre expérience avec cette formation…"
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                       placeholder-gray-400 dark:placeholder-gray-500
                                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                       text-sm resize-none"
                        />
                        <div className="text-right text-xs text-gray-400 mt-1">{comment.length}/1000</div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={loading || rating === 0}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                                       text-white font-semibold rounded-xl transition-colors text-sm"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
                                    </svg>
                                    Envoi…
                                </span>
                            ) : 'Soumettre mon évaluation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
export { CourseRating };
