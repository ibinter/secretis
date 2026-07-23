import { router } from '@inertiajs/react';

/**
 * Expired — Affiché quand la licence d'une organisation est expirée.
 * Modal centrale non fermable, fond clair.
 *
 * Props Inertia :
 *   gracePeriodEndsAt {string|null}  — date de fin de période de grâce (ISO)
 *   isGracePeriod     {boolean}      — true si on est encore en période de grâce
 *   organizationName  {string}
 *   lastPlanName      {string}
 */
export default function Expired({
  gracePeriodEndsAt = null,
  isGracePeriod     = false,
  organizationName  = '',
  lastPlanName      = 'Pro',
}) {
  const graceDateStr = gracePeriodEndsAt
    ? new Date(gracePeriodEndsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">

        {/* Bande colorée en haut */}
        <div className={`h-1.5 w-full ${isGracePeriod ? 'bg-amber-400' : 'bg-red-500'}`} />

        <div className="p-8 text-center">

          {/* Icône */}
          <div className={`w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center text-3xl
            ${isGracePeriod ? 'bg-amber-100' : 'bg-red-100'}`}>
            ⏰
          </div>

          {/* Titre */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isGracePeriod ? 'Accès limité' : 'Votre accès a expiré'}
          </h1>

          {organizationName && (
            <p className="text-sm text-gray-500 mb-4">{organizationName}</p>
          )}

          {/* Message période de grâce */}
          {isGracePeriod && graceDateStr ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800 text-left">
              <p className="font-semibold mb-1">Période de grâce active</p>
              <p>
                Votre abonnement <strong>{lastPlanName}</strong> est expiré mais vous bénéficiez d'un accès limité
                jusqu'au <strong>{graceDateStr}</strong>. Renouvelez pour retrouver toutes vos fonctionnalités.
              </p>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-6 text-sm text-red-700 text-left">
              <p className="font-semibold mb-1">Abonnement expiré</p>
              <p>
                Votre abonnement <strong>{lastPlanName}</strong> n'est plus actif.
                Votre compte est actuellement en <strong>lecture seule</strong> — vous pouvez consulter vos données
                mais pas créer ni modifier de contenu.
              </p>
            </div>
          )}

          {/* Restrictions */}
          <div className="mb-6 text-left bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Accès actuellement limité à</p>
            <ul className="space-y-1.5 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Consultation de vos données existantes
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span> Export de vos données (RGPD)
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <span className="text-red-400">✗</span> Création et modification de contenu
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <span className="text-red-400">✗</span> Invitations de nouveaux utilisateurs
              </li>
              <li className="flex items-center gap-2 text-gray-400">
                <span className="text-red-400">✗</span> Intégrations et automatisations
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.visit('/subscription/plans')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              Renouveler maintenant
            </button>
            <button
              onClick={() => router.visit('/account/export')}
              className="w-full py-2.5 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-xl transition-colors"
            >
              Exporter mes données (RGPD)
            </button>
          </div>

          {/* Lien support */}
          <p className="mt-5 text-xs text-gray-400">
            Des questions ?{' '}
            <a
              href="mailto:support@secretis.ibig.africa"
              className="text-indigo-600 hover:underline font-medium"
            >
              Contacter le support
            </a>
          </p>

        </div>
      </div>
    </div>
  );
}
