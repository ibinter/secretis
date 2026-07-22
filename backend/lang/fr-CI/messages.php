<?php

/**
 * Variante franco-ivoirienne — Termes locaux Côte d'Ivoire
 * Langue : Français de Côte d'Ivoire
 */

return [

    // Interface générale
    'welcome'          => 'Bienvenue',
    'dashboard'        => 'Tableau de bord',
    'settings'         => 'Paramètres',
    'logout'           => 'Déconnexion',

    // Termes commerciaux ivoiriens
    'invoice'          => 'Facture',
    'quote'            => 'Devis',
    'receipt'          => 'Reçu',
    'payment'          => 'Paiement',
    'deposit'          => 'Versement',
    'balance'          => 'Solde',
    'tax'              => 'TVA',
    'tax_rate'         => 'Taux de TVA (18%)',
    'subtotal'         => 'Sous-total HT',
    'total_ht'         => 'Total Hors Taxes',
    'total_ttc'        => 'Total TTC',
    'currency'         => 'FCFA',
    'currency_long'    => 'Franc CFA Afrique de l\'Ouest',

    // Identifiants légaux CI
    'tax_id'           => 'NCC (Numéro de Compte Contribuable)',
    'company_reg'      => 'RCCM (Registre du Commerce et du Crédit Mobilier)',
    'vat_number'       => 'Numéro de TVA',

    // Termes locaux spécifiques
    'maquis'           => 'Maquis', // terme ivoirien pour restaurant informel
    'restaurant_label' => 'Restaurant / Maquis',
    'boutique'         => 'Boutique',
    'commerce'         => 'Commerce',
    'prestataire'      => 'Prestataire de services',

    // Administrations
    'dgi'              => 'Direction Générale des Impôts (DGI)',
    'dgid'             => 'Direction Générale des Douanes (DGD)',
    'mef'              => 'Ministère de l\'Économie et des Finances',
    'tribunal_commerce'=> 'Tribunal de Commerce d\'Abidjan',
    'cnps'             => 'Caisse Nationale de Prévoyance Sociale (CNPS)',

    // Villes
    'capital_economic' => 'Abidjan',
    'capital_admin'    => 'Yamoussoukro',
    'regions'          => [
        'Lagunes', 'Haut-Sassandra', 'Savanes', 'Vallée du Bandama',
        'Moyen-Comoé', 'Dix-Huit Montagnes', 'Agnéby', 'Bafing',
        'Fromager', 'Lacs', 'Marahoué', 'Moyen-Cavally', 'N\'Zi-Comoé',
        'Sud-Bandama', 'Sud-Comoé', 'Worodougou', 'Zanzan',
    ],

    // Messages système
    'invoice_due'      => 'Facture à régler avant le :date',
    'payment_received' => 'Paiement reçu. Merci !',
    'overdue'          => 'En retard de :days jours',
    'draft'            => 'Brouillon',
    'sent'             => 'Envoyée',
    'paid'             => 'Payée',
    'partial'          => 'Partiellement payée',
    'cancelled'        => 'Annulée',

    // Mentions légales obligatoires CI
    'legal_footer'     => 'Conformément à la loi fiscale ivoirienne et aux dispositions OHADA. ' .
                          'En cas de litige, compétence exclusive du Tribunal de Commerce d\'Abidjan.',
    'late_penalty'     => 'Tout retard de paiement entraîne des pénalités de 1,5% par mois.',

    // Jours fériés clés
    'holidays'         => [
        '08-07' => 'Fête Nationale — Indépendance de la Côte d\'Ivoire',
        '11-15' => 'Journée Nationale de la Paix',
        '01-01' => 'Jour de l\'An',
        '05-01' => 'Fête du Travail',
    ],

    // Monnaie mobile ivoirienne
    'mobile_money'     => 'Mobile Money',
    'orange_money'     => 'Orange Money',
    'mtn_money'        => 'MTN Mobile Money',
    'moov_money'       => 'Moov Money (Flooz)',
    'wave'             => 'Wave',
];
