/**
 * SmartScheduler.jsx — Planificateur intelligent de réunions SECRETIS
 *
 * Fonctionnalités :
 *  - Saisie en langage naturel : "Réunion avec Marie jeudi prochain 1h"
 *  - Parse la date, durée et participants → pré-remplit le formulaire
 *  - Affiche les 3 meilleurs créneaux suggérés par l'IA
 *  - One-click pour créer avec le créneau suggéré
 *
 * Usage :
 *   import SmartScheduler from '@/Components/Agenda/SmartScheduler';
 *   <SmartScheduler onEventCreated={(event) => ...} participants={[...]} />
 */

import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    BoltIcon,
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    SparklesIcon,
    UserGroupIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Helpers de parsing du langage naturel (côté client, simplifié)
// =============================================================================

const DURATION_PATTERNS = [
    { regex: /(\d+)\s*h(?:eure(?:s)?)?/i,    factor: 60 },
    { regex: /(\d+)\s*min(?:ute(?:s)?)?/i,   factor: 1 },
    { regex: /(\d+)h(\d+)/i,                 custom: (m) => parseInt(m[1]) * 60 + parseInt(m[2]) },
];

const DAY_PATTERNS = {
    'aujourd\'hui': 0, 'today': 0,
    'demain':       1, 'tomorrow': 1,
    'lundi':        1, 'monday':  1,
    'mardi':        2, 'tuesday': 2,
    'mercredi':     3, 'wednesday': 3,
    'jeudi':        4, 'thursday': 4,
    'vendredi':     5, 'friday':  5,
};

function parseNaturalLanguage(text) {
    const result = { title: text, duration: 60, keywords: [] };

    // Durée
    for (const pattern of DURATION_PATTERNS) {
        const match = text.match(pattern.regex);
        if (match) {
            result.duration = pattern.custom ? pattern.custom(match) : parseInt(match[1]) * pattern.factor;
            break;
        }
    }

    // Participants (après "avec")
    const withMatch = text.match(/avec\s+([A-Za-zÀ-ÿ\s,]+?)(?:\s+(?:le|lundi|mardi|mercredi|jeudi|vendredi|demain|aujourd)|\s*$)/i);
    if (withMatch) {
        result.participants = withMatch[1].split(/,\s*|\s+et\s+/).map((p) => p.trim()).filter(Boolean);
    }

    // Nettoyage du titre
    result.title = text
        .replace(/\d+\s*h(?:eure(?:s)?)?/gi, '')
        .replace(/\d+\s*min(?:ute(?:s)?)?/gi, '')
        .replace(/avec\s+[A-Za-zÀ-ÿ\s,]+?(?=\s+(?:le|lundi|mardi|mercredi|jeudi|vendredi|demain|aujourd)|$)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    return result;
}

// =============================================================================
// Composant principal SmartScheduler
// =============================================================================

export default function SmartScheduler({
    onEventCreated,
    initialParticipants = [],
    className = '',
}) {
    const [nlInput, setNlInput]         = useState('');
    const [parsed, setParsed]           = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [step, setStep]               = useState('input'); // input | slots | confirm

    // ── Suggestions de créneaux (API) ─────────────────────────────────────────
    const slotsMutation = useMutation({
        mutationFn: (data) => axios.post('/api/agenda/smart/suggest-slots', data),
    });

    // ── Création de l'événement ────────────────────────────────────────────────
    const createMutation = useMutation({
        mutationFn: (data) => axios.post('/api/agenda/events', data),
        onSuccess: (res) => {
            if (onEventCreated) onEventCreated(res.data);
            reset();
        },
    });

    const reset = useCallback(() => {
        setNlInput('');
        setParsed(null);
        setSelectedSlot(null);
        setStep('input');
    }, []);

    // ── Soumission du formulaire NL ────────────────────────────────────────────
    const handleNlSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!nlInput.trim()) return;

        const parsedResult = parseNaturalLanguage(nlInput);
        setParsed(parsedResult);

        // Demander les créneaux suggérés à l'API
        const preferredDate = new Date();
        preferredDate.setDate(preferredDate.getDate() + 1); // Demain par défaut

        slotsMutation.mutate({
            participant_ids:  initialParticipants.map((p) => p.id),
            duration_minutes: parsedResult.duration,
            preferred_date:   preferredDate.toISOString().split('T')[0],
        }, {
            onSuccess: () => setStep('slots'),
        });
    }, [nlInput, initialParticipants, slotsMutation]);

    // ── Créer avec le créneau sélectionné ─────────────────────────────────────
    const handleCreate = useCallback(() => {
        if (!selectedSlot || !parsed) return;

        createMutation.mutate({
            title:        parsed.title || nlInput,
            start_at:     selectedSlot.start,
            end_at:       selectedSlot.end,
            participants: initialParticipants.map((p) => p.id),
            type:         'event',
        });
    }, [selectedSlot, parsed, nlInput, initialParticipants, createMutation]);

    // ── Rendu ──────────────────────────────────────────────────────────────────
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}>
            {/* ── En-tête ────────────────────────────────────────────────────── */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Planification intelligente</h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                    Décrivez votre réunion en langage naturel, SARA suggère les meilleurs créneaux.
                </p>
            </div>

            <div className="p-5">

                {/* ── Étape 1 : Saisie NL ──────────────────────────────────── */}
                {step === 'input' && (
                    <form onSubmit={handleNlSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Décrivez votre réunion
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={nlInput}
                                    onChange={(e) => setNlInput(e.target.value)}
                                    placeholder="Ex: Réunion CODIR jeudi prochain 2h"
                                    className="w-full pl-4 pr-12 py-3 text-sm border border-gray-200 dark:border-gray-600 rounded-xl
                                        bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    autoFocus
                                />
                                {nlInput && (
                                    <button type="button" onClick={() => setNlInput('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                                        <XMarkIcon className="h-4 w-4 text-gray-400" />
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5">
                                Incluez le titre, la durée (ex: 1h30) et les participants (ex: avec Marie, Jean)
                            </p>
                        </div>

                        {/* Exemples */}
                        <div className="flex flex-wrap gap-2">
                            {[
                                'Point équipe vendredi 30min',
                                'Réunion avec client lundi 1h',
                                'CODIR jeudi prochain 2h',
                            ].map((example) => (
                                <button
                                    key={example}
                                    type="button"
                                    onClick={() => setNlInput(example)}
                                    className="text-xs px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                                >
                                    {example}
                                </button>
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={!nlInput.trim() || slotsMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            {slotsMutation.isPending ? (
                                <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Analyse en cours…</>
                            ) : (
                                <><BoltIcon className="h-4 w-4" /> Trouver les meilleurs créneaux</>
                            )}
                        </button>
                    </form>
                )}

                {/* ── Étape 2 : Créneaux suggérés ─────────────────────────── */}
                {step === 'slots' && (
                    <div className="space-y-4">
                        {/* Récapitulatif du parsing */}
                        {parsed && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-sm">
                                <p className="font-medium text-purple-700 dark:text-purple-300">{parsed.title || nlInput}</p>
                                <p className="text-purple-600 dark:text-purple-400 text-xs mt-0.5">
                                    Durée : {parsed.duration} min
                                    {parsed.participants?.length > 0 && ` · Avec : ${parsed.participants.join(', ')}`}
                                </p>
                            </div>
                        )}

                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                3 meilleurs créneaux disponibles :
                            </p>

                            {slotsMutation.isPending ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : slotsMutation.data?.data?.suggestions?.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    Aucun créneau disponible sur cette période. Essayez une autre date.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {(slotsMutation.data?.data?.suggestions ?? []).map((slot, i) => (
                                        <SlotCard
                                            key={i}
                                            slot={slot}
                                            rank={i + 1}
                                            selected={selectedSlot === slot}
                                            onSelect={() => {
                                                setSelectedSlot(slot);
                                                setStep('confirm');
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={reset} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            ← Modifier la recherche
                        </button>
                    </div>
                )}

                {/* ── Étape 3 : Confirmation ───────────────────────────────── */}
                {step === 'confirm' && selectedSlot && (
                    <div className="space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                <p className="font-semibold text-green-700 dark:text-green-300">Créneau sélectionné</p>
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{parsed?.title || nlInput}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {selectedSlot.day_label} · {selectedSlot.label}
                            </p>
                            {initialParticipants.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                    <UserGroupIcon className="h-4 w-4 text-gray-400" />
                                    <p className="text-xs text-gray-500">
                                        {initialParticipants.map((p) => p.name).join(', ')}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('slots')}
                                className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Choisir un autre créneau
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={createMutation.isPending}
                                className="flex-1 py-2.5 text-sm bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors"
                            >
                                {createMutation.isPending ? 'Création…' : 'Confirmer et créer'}
                            </button>
                        </div>

                        {createMutation.isError && (
                            <p className="text-sm text-red-500 text-center">
                                Erreur lors de la création. Veuillez réessayer.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// SlotCard — Carte d'un créneau suggéré
// =============================================================================

function SlotCard({ slot, rank, selected, onSelect }) {
    const rankColors = ['bg-gold-50 border-yellow-200', 'bg-gray-50 border-gray-200', 'bg-orange-50 border-orange-200'];
    const rankLabels = ['Meilleur', 'Recommandé', 'Alternatif'];

    return (
        <button
            onClick={onSelect}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                ${selected
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 bg-white dark:bg-gray-700/30'
                }`}
        >
            {/* Rang */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                rank === 1 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                           : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
            }`}>
                {rank}
            </div>

            {/* Infos créneau */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{slot.day_label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <ClockIcon className="inline h-3 w-3 mr-1" />
                    {slot.label}
                </p>
            </div>

            {/* Score */}
            <div className="text-right">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                    {rankLabels[rank - 1] ?? ''}
                </span>
                <div className="mt-1 w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${slot.score ?? 70}%` }} />
                </div>
            </div>
        </button>
    );
}
export { SmartScheduler };
