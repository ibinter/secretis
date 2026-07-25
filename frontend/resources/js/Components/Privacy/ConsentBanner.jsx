import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

const CONSENT_KEY  = 'secretis_consent_v1';
const VISITOR_KEY  = 'secretis_visitor_id';

function getOrCreateVisitorId() {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
        id = 'v_' + Math.random().toString(36).slice(2) + Date.now();
        localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
}

export default function ConsentBanner({ orgId }) {
    const [visible,    setVisible]    = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [saving,     setSaving]     = useState(false);
    const [choices,    setChoices]    = useState({
        essential: true,   // toujours activé
        analytics: false,
        marketing: false,
    });

    useEffect(() => {
        const stored = localStorage.getItem(CONSENT_KEY);
        if (!stored) setVisible(true);
    }, []);

    const persist = async (consents) => {
        setSaving(true);
        const visitorId = getOrCreateVisitorId();
        try {
            await fetch('/gdpr/consent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content ?? '',
                },
                body: JSON.stringify({
                    consents:      consents,
                    visitor_id:    visitorId,
                    organization_id: orgId,
                    version:       '1.0',
                }),
            });
            localStorage.setItem(CONSENT_KEY, JSON.stringify({ consents, date: new Date().toISOString() }));
        } catch (_) {
            // Fallback : sauvegarder localement si l'API échoue
            localStorage.setItem(CONSENT_KEY, JSON.stringify({ consents, date: new Date().toISOString() }));
        } finally {
            setSaving(false);
            setVisible(false);
        }
    };

    const acceptAll  = () => persist(['essential', 'analytics', 'marketing']);
    const rejectAll  = () => persist(['essential']);
    const saveCustom = () => {
        const selected = Object.entries(choices)
            .filter(([, v]) => v)
            .map(([k]) => k);
        persist(selected);
    };

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Paramètres de confidentialité et cookies"
            className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
        >
            {/* Fond semi-transparent */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

            <div className="relative mx-auto max-w-2xl rounded-xl bg-white shadow-2xl ring-1 ring-black/10 dark:bg-gray-900 dark:ring-white/10">
                {/* En-tête */}
                <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">🔒</span>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                Vos préférences de confidentialité
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                IBIG SECRETIS respecte votre vie privée — RGPD Art. 7
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4">
                    {!showDetail ? (
                        /* Vue résumé */
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Nous utilisons des cookies pour faire fonctionner cette plateforme
                            (essentiels), mesurer les performances (analytiques) et personnaliser
                            certaines fonctionnalités (marketing). Vous pouvez personnaliser vos choix.{' '}
                            <a
                                href="/privacy"
                                className="underline text-purple-600 hover:text-purple-800 dark:text-purple-400"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                En savoir plus
                            </a>
                        </p>
                    ) : (
                        /* Vue détail */
                        <div className="space-y-3" role="group" aria-label="Catégories de cookies">
                            <ConsentToggle
                                id="essential"
                                label="Cookies essentiels"
                                description="Nécessaires au fonctionnement de la plateforme (authentification, sécurité). Toujours actifs."
                                checked={true}
                                disabled={true}
                            />
                            <ConsentToggle
                                id="analytics"
                                label="Cookies analytiques"
                                description="Nous aident à comprendre comment vous utilisez SECRETIS pour améliorer nos services (données anonymisées)."
                                checked={choices.analytics}
                                onChange={(v) => setChoices(p => ({ ...p, analytics: v }))}
                            />
                            <ConsentToggle
                                id="marketing"
                                label="Cookies marketing"
                                description="Permettent de vous proposer des contenus et offres personnalisés en lien avec votre usage."
                                checked={choices.marketing}
                                onChange={(v) => setChoices(p => ({ ...p, marketing: v }))}
                            />
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                    <button
                        onClick={acceptAll}
                        disabled={saving}
                        className="flex-1 min-w-[140px] rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        {saving ? 'Enregistrement…' : 'Tout accepter'}
                    </button>

                    {showDetail ? (
                        <button
                            onClick={saveCustom}
                            disabled={saving}
                            className="flex-1 min-w-[140px] rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                        >
                            Enregistrer mes choix
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowDetail(true)}
                            className="flex-1 min-w-[140px] rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                            Personnaliser
                        </button>
                    )}

                    <button
                        onClick={rejectAll}
                        disabled={saving}
                        className="text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                    >
                        Tout refuser
                    </button>
                </div>
            </div>
        </div>
    );
}

function ConsentToggle({ id, label, description, checked, onChange, disabled = false }) {
    return (
        <label
            htmlFor={`consent-${id}`}
            className={`flex items-start gap-4 rounded-lg border p-4 transition-colors
                ${disabled ? 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 cursor-not-allowed' :
                  'border-gray-200 hover:border-purple-300 dark:border-gray-700 dark:hover:border-purple-500 cursor-pointer'}
            `}
        >
            <input
                id={`consent-${id}`}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange?.(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                aria-describedby={`desc-${id}`}
            />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                    {disabled && (
                        <span className="text-xs bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                            Toujours actif
                        </span>
                    )}
                </div>
                <p id={`desc-${id}`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {description}
                </p>
            </div>
        </label>
    );
}
export { ConsentBanner };
