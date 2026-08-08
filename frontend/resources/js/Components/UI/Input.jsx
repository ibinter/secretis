/**
 * Input — alias historique de FormInput.
 *
 * Ce fichier ne contenait qu'un stub renvoyant ses enfants : tout champ écrit
 * `<Input value=… />` était donc rendu VIDE, sans que rien ne signale l'erreur
 * (aucune exception, juste un formulaire sans champ). Le seul écran concerné
 * était Admin/LicenseInfo.
 *
 * Plutôt que de dupliquer un composant de saisie, on redirige vers FormInput,
 * qui gère déjà libellé, erreur, indication, préfixe/suffixe et textarea.
 */
export { default } from './FormInput'
