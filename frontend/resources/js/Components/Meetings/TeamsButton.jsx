import { Video, ExternalLink, Wifi } from 'lucide-react';

/**
 * TeamsButton — Bouton "Rejoindre sur Teams" pour les réunions SECRETIS
 *
 * Comportement :
 *  - Si joinUrl est présent : affiche le bouton de jonction Teams
 *  - Tente d'ouvrir l'application Teams desktop via le schéma msteams://
 *  - Fallback sur Teams Web si l'app n'est pas installée
 *  - Affiche un badge "En ligne" sur les réunions avec lien Teams
 *
 * Props :
 *   - joinUrl       : string | null   URL de jonction Teams (online_meeting_url)
 *   - meetingTitle  : string          Titre de la réunion (pour le lien de secours)
 *   - variant       : 'button' | 'badge' | 'full'  Mode d'affichage
 *   - size          : 'sm' | 'md' | 'lg'
 *   - className     : string          Classes CSS additionnelles
 */
export default function TeamsButton({
    joinUrl      = null,
    meetingTitle = 'Réunion',
    variant      = 'full',
    size         = 'md',
    className    = '',
}) {
    if (!joinUrl) return null;

    // -------------------------------------------------------------------------
    // Logique de jonction Teams
    // -------------------------------------------------------------------------

    const handleJoinTeams = (e) => {
        e.preventDefault();

        // Convertir l'URL web Teams en schéma deep link pour l'app desktop
        // Format Teams: https://teams.microsoft.com/l/meetup-join/...
        const teamsDeepLink = convertToDeepLink(joinUrl);

        if (teamsDeepLink) {
            // Tenter d'ouvrir l'application Teams desktop
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = teamsDeepLink;
            document.body.appendChild(iframe);

            // Après 1.5 secondes, si l'app ne s'est pas ouverte, ouvrir Teams Web
            const timeout = setTimeout(() => {
                document.body.removeChild(iframe);
                window.open(joinUrl, '_blank', 'noopener,noreferrer');
            }, 1500);

            // Si la page perd le focus (l'app Teams s'est ouverte), annuler le fallback
            window.addEventListener('blur', () => {
                clearTimeout(timeout);
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, { once: true });
        } else {
            // Pas de deep link possible → ouvrir Teams Web directement
            window.open(joinUrl, '_blank', 'noopener,noreferrer');
        }
    };

    const convertToDeepLink = (webUrl) => {
        try {
            const url = new URL(webUrl);
            // URLs Teams standard : https://teams.microsoft.com/l/meetup-join/...
            if (url.hostname.includes('teams.microsoft.com')) {
                return 'msteams:' + url.pathname + url.search;
            }
            return null;
        } catch {
            return null;
        }
    };

    // -------------------------------------------------------------------------
    // Variants d'affichage
    // -------------------------------------------------------------------------

    const sizeClasses = {
        sm: 'text-xs px-2.5 py-1.5',
        md: 'text-sm px-3.5 py-2',
        lg: 'text-base px-5 py-2.5',
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    // ---- Variant "badge" : petit indicateur "En ligne" ----
    if (variant === 'badge') {
        return (
            <span
                title={`Réunion Teams disponible — Cliquez pour rejoindre : ${meetingTitle}`}
                onClick={handleJoinTeams}
                className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    bg-purple-100 dark:bg-purple-900/40
                    text-purple-700 dark:text-purple-400
                    text-xs font-medium cursor-pointer
                    hover:bg-purple-200 dark:hover:bg-purple-900/60
                    transition-colors
                    ${className}
                `}
            >
                <Wifi className="w-2.5 h-2.5" />
                En ligne
            </span>
        );
    }

    // ---- Variant "button" : bouton icône seule ----
    if (variant === 'button') {
        return (
            <button
                onClick={handleJoinTeams}
                title={`Rejoindre "${meetingTitle}" sur Microsoft Teams`}
                className={`
                    inline-flex items-center justify-center rounded-lg
                    bg-purple-600 hover:bg-purple-700 active:bg-purple-800
                    text-white transition-colors shadow-sm
                    ${sizeClasses[size]}
                    ${className}
                `}
            >
                <Video className={iconSizes[size]} />
            </button>
        );
    }

    // ---- Variant "full" (défaut) : bouton complet avec texte ----
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <button
                onClick={handleJoinTeams}
                className={`
                    inline-flex items-center gap-2 rounded-lg font-medium
                    bg-purple-600 hover:bg-purple-700 active:bg-purple-800
                    text-white transition-colors shadow-sm
                    ${sizeClasses[size]}
                `}
            >
                <Video className={iconSizes[size]} />
                Rejoindre sur Teams
            </button>

            {/* Lien de secours Teams Web */}
            <a
                href={joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Ouvrir Teams dans le navigateur"
                className="inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                <ExternalLink className={iconSizes[size]} />
                <span className="sr-only">Ouvrir dans Teams Web</span>
            </a>
        </div>
    );
}

/**
 * TeamsBadge — Composant simplifié pour afficher juste le badge "En ligne"
 * sans logique de jonction. Utilisé dans les listes de réunions.
 */
export function TeamsBadge({ joinUrl, className = '' }) {
    if (!joinUrl) return null;

    return (
        <span className={`
            inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full
            bg-purple-100 dark:bg-purple-900/40
            text-purple-700 dark:text-purple-400
            text-xs font-medium
            ${className}
        `}>
            <Wifi className="w-2.5 h-2.5" />
            Teams
        </span>
    );
}
export { TeamsButton };
