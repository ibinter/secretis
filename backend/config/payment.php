<?php

/*
|--------------------------------------------------------------------------
| Configuration du module paiement IBIG SECRETIS
|--------------------------------------------------------------------------
|
| SÉCURITÉ :
| - Les clés secrètes (webhook_secret, api_key) sont stockées en base chiffrées
|   via encrypt(). Les variables d'environnement ci-dessous ne servent qu'à
|   l'initialisation (seeder de config).
| - Ne jamais exposer ces valeurs au frontend.
| - Mode test/production distincts par provider.
|
*/

return [

    // =========================================================================
    // Paramètres globaux
    // =========================================================================

    /** Nombre d'heures avant expiration d'une commande non payée */
    'order_expiry_hours' => env('PAYMENT_ORDER_EXPIRY_HOURS', 48),

    /** Jours de grâce après expiration de la licence */
    'grace_period_days'  => env('PAYMENT_GRACE_PERIOD_DAYS', 7),

    /** Tolérance de montant (unités) pour les vérifications webhook */
    'amount_tolerance'   => env('PAYMENT_AMOUNT_TOLERANCE', 1),

    /** Disk de stockage des preuves (toujours 'private', jamais 'public') */
    'proof_storage'      => 'private',

    /** Email de notification pour les nouvelles preuves soumises */
    'admin_notification_email' => env('IBIG_ADMIN_EMAIL', 'admin@ibigsoft.com'),

    // =========================================================================
    // Providers de paiement
    // =========================================================================

    'providers' => [

        // -----------------------------------------------------------------
        // CinetPay — Paiements carte/mobile Afrique de l'Ouest
        // -----------------------------------------------------------------
        'cinetpay' => [
            'webhook_secret' => env('CINETPAY_WEBHOOK_SECRET'),
            'api_key'        => env('CINETPAY_API_KEY'),
            'site_id'        => env('CINETPAY_SITE_ID'),
            'sandbox_url'    => 'https://api-checkout.cinetpay.com/v2/payment',
            'prod_url'       => 'https://api-checkout.cinetpay.com/v2/payment',
            'notify_url'     => env('APP_URL') . '/webhooks/cinetpay',
            'return_url'     => env('APP_URL') . '/abonnement/commandes', // NE DÉCLENCHE RIEN
            'cancel_url'     => env('APP_URL') . '/abonnement',
        ],

        // -----------------------------------------------------------------
        // Paystack — Paiements carte (Nigeria, Ghana, Afrique du Sud, Kenya)
        // -----------------------------------------------------------------
        'paystack' => [
            'webhook_secret' => env('PAYSTACK_SECRET_KEY'),
            'public_key'     => env('PAYSTACK_PUBLIC_KEY'),
            'base_url'       => 'https://api.paystack.co',
        ],

        // -----------------------------------------------------------------
        // Flutterwave — Paiements multicanal Afrique
        // -----------------------------------------------------------------
        'flutterwave' => [
            'secret_hash' => env('FLW_SECRET_HASH'),
            'secret_key'  => env('FLW_SECRET_KEY'),
            'public_key'  => env('FLW_PUBLIC_KEY'),
            'base_url'    => 'https://api.flutterwave.com/v3',
        ],

        // -----------------------------------------------------------------
        // Stripe — Paiements carte internationaux
        // -----------------------------------------------------------------
        'stripe' => [
            'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'), // whsec_...
            'secret_key'     => env('STRIPE_SECRET_KEY'),     // sk_...
            'public_key'     => env('STRIPE_PUBLIC_KEY'),     // pk_... (peut être exposé)
        ],

        // -----------------------------------------------------------------
        // Orange Money — Mobile Money Afrique de l'Ouest
        // -----------------------------------------------------------------
        'orange_money' => [
            'webhook_secret' => env('ORANGE_MONEY_WEBHOOK_SECRET'),
            'merchant_key'   => env('ORANGE_MONEY_MERCHANT_KEY'),
            'merchant_number' => env('ORANGE_MONEY_MERCHANT_NUMBER', ''),
            'ussd_code'      => env('ORANGE_MONEY_USSD_CODE', '*144#'),
            'auto_validate'  => env('ORANGE_MONEY_AUTO_VALIDATE', false),
            'test_mode'      => env('ORANGE_MONEY_TEST_MODE', true),
        ],

        // -----------------------------------------------------------------
        // MTN Mobile Money
        // -----------------------------------------------------------------
        'mtn_momo' => [
            'api_key'        => env('MTN_MOMO_API_KEY'),
            'api_user'       => env('MTN_MOMO_API_USER'),
            'base_url'       => env('MTN_MOMO_BASE_URL', 'https://sandbox.momodeveloper.mtn.com'),
            'merchant_number' => env('MTN_MOMO_MERCHANT_NUMBER', ''),
            'auto_validate'  => env('MTN_MOMO_AUTO_VALIDATE', false),
            'test_mode'      => env('MTN_MOMO_TEST_MODE', true),
        ],

        // -----------------------------------------------------------------
        // Wave — Mobile Money Sénégal / Côte d'Ivoire
        // -----------------------------------------------------------------
        'wave' => [
            'webhook_secret' => env('WAVE_WEBHOOK_SECRET'),
            'api_key'        => env('WAVE_API_KEY'),
            'merchant_number' => env('WAVE_MERCHANT_NUMBER', ''),
            'base_url'       => 'https://api.wave.com/v1',
        ],

        // -----------------------------------------------------------------
        // Moov Money
        // -----------------------------------------------------------------
        'moov_money' => [
            'webhook_secret' => env('MOOV_WEBHOOK_SECRET'),
            'merchant_key'   => env('MOOV_MERCHANT_KEY'),
            'merchant_number' => env('MOOV_MERCHANT_NUMBER', ''),
        ],

        // -----------------------------------------------------------------
        // Airtel Money
        // -----------------------------------------------------------------
        'airtel_money' => [
            'webhook_secret' => env('AIRTEL_WEBHOOK_SECRET'),
            'client_id'      => env('AIRTEL_CLIENT_ID'),
            'client_secret'  => env('AIRTEL_CLIENT_SECRET'),
        ],

        // -----------------------------------------------------------------
        // Western Union / MoneyGram (transfert international)
        // -----------------------------------------------------------------
        'western_union' => [
            'instructions'   => env('WESTERN_UNION_INSTRUCTIONS', ''),
            'receiver_name'  => env('WESTERN_UNION_RECEIVER_NAME', 'IBIG Soft SARL'),
            'receiver_country' => 'CI',
        ],

        // -----------------------------------------------------------------
        // Virement bancaire national
        // -----------------------------------------------------------------
        'bank_transfer_national' => [
            'bank_name'      => env('BANK_NAME', 'Ecobank Côte d\'Ivoire'),
            'account_number' => env('BANK_ACCOUNT_NUMBER', ''),
            'iban'           => env('BANK_IBAN', ''),
            'swift'          => env('BANK_SWIFT', ''),
            'account_holder' => env('BANK_ACCOUNT_HOLDER', 'IBIG Soft SARL'),
        ],

        // -----------------------------------------------------------------
        // Cryptomonnaie
        // -----------------------------------------------------------------
        'crypto' => [
            'usdt_trc20_address' => env('CRYPTO_USDT_TRC20', ''),
            'usdt_erc20_address' => env('CRYPTO_USDT_ERC20', ''),
            'btc_address'        => env('CRYPTO_BTC', ''),
        ],
    ],

    // =========================================================================
    // Familles de paiement (11 familles IBIG Soft)
    // =========================================================================

    'method_types' => [
        'mobile_money'           => 'Mobile Money',
        'electronic'             => 'Paiement électronique',
        'bank_transfer'          => 'Virement bancaire national',
        'international_transfer' => 'Virement international',
        'money_transfer'         => 'Transfert d\'argent',
        'cash_agency'            => 'Espèces en agence',
        'check'                  => 'Chèque',
        'crypto'                 => 'Cryptomonnaie',
        'voucher'                => 'Voucher / Code prépayé',
        'delivery'               => 'Paiement à la livraison',
        'additional'             => 'Autre moyen de paiement',
    ],

];
