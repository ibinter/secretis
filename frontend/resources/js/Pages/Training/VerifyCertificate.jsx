import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    CheckBadgeIcon,
    XCircleIcon,
    MagnifyingGlassIcon,
    ShieldCheckIcon,
    TrophyIcon,
    CalendarDaysIcon,
    UserCircleIcon,
    BookOpenIcon,
} from '@heroicons/react/24/outline';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day:     'numeric',
        month:   'long',
        year:    'numeric',
    });
}

// ─── Page publique de vérification ───────────────────────────────────────────

export default function VerifyCertificate({ uuid, certificate, is_valid }) {
    const [inputUuid, setInputUuid] = useState(uuid ?? '');
    const [checking, setChecking]   = useState(false);

    function handleCheck(e) {
        e.preventDefault();
        const val = inputUuid.trim();
        if (!val) return;
        setChecking(true);
        router.visit(route('training.verify', { uuid: val }), {
            onFinish: () => setChecking(false),
        });
    }

    return (
        <>
            <Head title="Vérification de certificat — IBIG SECRETIS" />

            {/* Page autonome sans AppLayout (publique) */}
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-gray-950 dark:to-purple-950 flex flex-col items-center justify-start px-4 py-16">

                {/* Logo */}
                <div className="mb-10 text-center">
                    <div className="flex items-center gap-3 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                            <ShieldCheckIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <span className="text-2xl font-extrabold text-purple-800 dark:text-white">IBIG SECRETIS</span>
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-left">Vérification de certificat</p>
                        </div>
                    </div>
                </div>

                {/* Formulaire de vérification */}
                <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 mb-8">
                    <h1 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2 text-balance">
                        Vérifier l'authenticité d'un certificat
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Entrez le numéro de certificat (visible en bas du document) pour vérifier son authenticité.
                    </p>

                    <form onSubmit={handleCheck} className="flex gap-2">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={inputUuid}
                                onChange={e => setInputUuid(e.target.value)}
                                placeholder="IBIG-XXXXXXXX ou UUID complet…"
                                className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={checking || !inputUuid.trim()}
                            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
                        >
                            {checking ? '…' : 'Vérifier'}
                        </button>
                    </form>
                </div>

                {/* Résultat */}
                {uuid && (
                    <div className="w-full max-w-lg">
                        {is_valid && certificate ? (
                            /* ── Certificat authentique ── */
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-2 border-emerald-300 dark:border-emerald-600 overflow-hidden">
                                {/* Bandeau vert */}
                                <div className="bg-emerald-500 px-6 py-4 flex items-center gap-3">
                                    <CheckBadgeIcon className="w-8 h-8 text-white flex-shrink-0" />
                                    <div>
                                        <p className="text-white font-extrabold text-base">Certificat authentique</p>
                                        <p className="text-emerald-100 text-xs">Ce certificat a été délivré par IBIG SECRETIS et est valide.</p>
                                    </div>
                                </div>

                                {/* Détails */}
                                <div className="px-6 py-6 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <UserCircleIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Décerné à</p>
                                            <p className="text-base font-bold text-gray-900 dark:text-white">{certificate.user_name}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <BookOpenIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Formation complétée</p>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{certificate.course_title}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <CalendarDaysIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Date d'obtention</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{formatDate(certificate.issued_at)}</p>
                                        </div>
                                    </div>

                                    {certificate.score != null && (
                                        <div className="flex items-start gap-3">
                                            <TrophyIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Score obtenu</p>
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                    {certificate.score}%
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="px-6 pb-6">
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-100 dark:border-emerald-800">
                                        <p className="text-xs text-emerald-700 dark:text-emerald-300 text-center">
                                            Ce certificat a été vérifié le{' '}
                                            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
                                            via le système de vérification IBIG SECRETIS.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ── Certificat introuvable ── */
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-2 border-red-200 dark:border-red-700 overflow-hidden">
                                <div className="bg-red-500 px-6 py-4 flex items-center gap-3">
                                    <XCircleIcon className="w-8 h-8 text-white flex-shrink-0" />
                                    <div>
                                        <p className="text-white font-extrabold text-base">Certificat introuvable</p>
                                        <p className="text-red-100 text-xs">Ce numéro ne correspond à aucun certificat dans notre base.</p>
                                    </div>
                                </div>

                                <div className="px-6 py-6">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                        Le numéro que vous avez saisi (<code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-mono">{uuid}</code>)
                                        n'existe pas dans notre système.
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Vérifiez le numéro figurant en bas du certificat (format : <strong>IBIG-XXXXXXXX</strong>) et recommencez.
                                        Si le problème persiste, contactez{' '}
                                        <a href="mailto:support@ibigsoft.com" className="text-purple-600 dark:text-purple-400 underline">
                                            support@ibigsoft.com
                                        </a>.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Pied de page */}
                <p className="mt-12 text-xs text-gray-400 dark:text-gray-600 text-center">
                    Système de vérification IBIG SECRETIS · © {new Date().getFullYear()} IBIG Soft · Tous droits réservés
                </p>
            </div>
        </>
    );
}
export { VerifyCertificate };
