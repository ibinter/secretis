<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Réglages TECHNIQUES de l'API de licence
|--------------------------------------------------------------------------
|
| ATTENTION : ce fichier ne porte AUCUNE règle de licence. Les durées, les
| plafonds, les droits par état et le nom du palier gratuit vivent dans
| config/licence.config.json — la source unique de vérité — et nulle part
| ailleurs. On ne trouve ici que des paramètres de transport : secret de
| webhook, en-tête de signature.
|
| Y ajouter un jour « essai_jours » ou « plafond » créerait la seconde vérité
| que la section 12 du cahier interdit.
*/

return [

    /*
     * Secret partagé avec la passerelle de paiement, pour POST /api/paiement/callback.
     *
     * Sans valeur par défaut, et c'est voulu : un secret vide accepté par
     * défaut ferait d'un oubli de configuration une porte ouverte sur
     * l'activation des licences. Le contrôleur refuse tout callback tant que
     * LICENCE_WEBHOOK_SECRET n'est pas défini, et le journalise en erreur.
     */
    'webhook_secret' => env('LICENCE_WEBHOOK_SECRET'),

    /*
     * En-tête portant la signature HMAC-SHA256 du corps brut de la requête.
     * Documenté dans docs/API-LICENCE.md.
     */
    'webhook_header' => env('LICENCE_WEBHOOK_HEADER', 'X-Licence-Signature'),

];
