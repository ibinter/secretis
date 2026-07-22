<?php

/**
 * Variante franco-camerounaise — Termes locaux Cameroun
 * Langue : Français du Cameroun (pays bilingue FR/EN)
 */

return [

    // Interface générale
    'welcome'          => 'Bienvenue / Welcome',
    'dashboard'        => 'Tableau de bord',
    'settings'         => 'Paramètres',
    'logout'           => 'Déconnexion',

    // Termes commerciaux camerounais
    'invoice'          => 'Facture',
    'quote'            => 'Devis / Proforma',
    'receipt'          => 'Reçu / Note de caisse',
    'payment'          => 'Paiement',
    'deposit'          => 'Avance sur commande',
    'balance'          => 'Solde dû',
    'tax'              => 'TVA',
    'tax_rate'         => 'Taux de TVA (19,25%)',
    'subtotal'         => 'Montant HT',
    'total_ht'         => 'Total Hors Taxes',
    'total_ttc'        => 'Total TTC',
    'currency'         => 'FCFA',
    'currency_long'    => 'Franc CFA Afrique Centrale',

    // Identifiants légaux CM
    'tax_id'           => 'NIU (Numéro d\'Identifiant Unique)',
    'company_reg'      => 'RCCM (Registre du Commerce et du Crédit Mobilier)',
    'vat_number'       => 'Numéro de TVA',
    'cnps_number'      => 'Numéro CNPS (Caisse Nationale de Prévoyance Sociale)',

    // Termes locaux spécifiques camerounais
    'cabaret'          => 'Cabaret (bar-restaurant populaire)',
    'chop_house'       => 'Chop House (restaurant populaire, terme anglophone)',
    'call_box'         => 'Cabine téléphonique / Call Box',
    'njanga'           => 'Tontine / Njangi (épargne communautaire)',
    'buyam_sellam'     => 'Commerce informel / Revendeur (Buyam-Sellam)',
    'feymania'         => 'Arnaque (terme local — à éviter)',

    // Administrations camerounaises
    'dgi'              => 'Direction Générale des Impôts (DGI)',
    'dgd'              => 'Direction Générale des Douanes',
    'minfi'            => 'Ministère des Finances (MINFI)',
    'cnps'             => 'Caisse Nationale de Prévoyance Sociale (CNPS)',
    'gicam'            => 'Groupement Inter-Patronal du Cameroun (GICAM)',
    'ccima'            => 'Chambre de Commerce, d\'Industrie, des Mines et de l\'Artisanat (CCIMA)',

    // Régions du Cameroun
    'capital'          => 'Yaoundé',
    'economic_capital' => 'Douala',
    'regions'          => [
        'Adamaoua', 'Centre', 'Est', 'Extrême-Nord', 'Littoral',
        'Nord', 'Nord-Ouest', 'Ouest', 'Sud', 'Sud-Ouest',
    ],

    // Particularité bilingue
    'bilingual_note'   => 'Le Cameroun est un pays bilingue (Français / English). ' .
                          'Les documents officiels peuvent être rédigés dans l\'une ou l\'autre langue.',

    // Messages système
    'invoice_due'      => 'Facture à régler avant le :date',
    'payment_received' => 'Paiement reçu. Merci / Thank you!',
    'overdue'          => 'En retard de :days jours',
    'draft'            => 'Brouillon',
    'sent'             => 'Envoyée',
    'paid'             => 'Payée',
    'partial'          => 'Partiellement réglée',
    'cancelled'        => 'Annulée',

    // Mentions légales Cameroun
    'legal_footer'     => 'Conformément aux dispositions fiscales camerounaises (Loi de Finances) et OHADA. ' .
                          'TVA 19,25%. NIU obligatoire sur toute facture.',
    'late_penalty'     => 'Tout retard de paiement entraîne des pénalités conformément aux dispositions légales.',

    // Jours fériés Cameroun
    'holidays'         => [
        '01-01' => 'Jour de l\'An / New Year\'s Day',
        '02-11' => 'Fête de la Jeunesse',
        '05-01' => 'Fête du Travail / Labour Day',
        '05-20' => 'Fête Nationale (Unité Nationale)',
        '08-15' => 'Assomption',
        '12-25' => 'Noël / Christmas',
    ],

    // Mobile Money Cameroun
    'mobile_money'     => 'Mobile Money',
    'orange_money'     => 'Orange Money Cameroun',
    'mtn_mobile_money' => 'MTN Mobile Money',
    'express_union'    => 'Express Union Mobile',
];
