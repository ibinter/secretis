<?php

use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\SuperAdmin\PaymentAdminController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API — Module Paiements & Abonnements IBIG SECRETIS
|--------------------------------------------------------------------------
|
| ARCHITECTURE DE SÉCURITÉ :
|
| 1. Routes commandes (auth + tenant + license) :
|    Nécessitent une session authentifiée ET un tenant résolu.
|    Rate limiting standard via throttle:api.
|
| 2. Routes webhooks (SANS auth, AVEC vérification signature HMAC) :
|    Accessibles publiquement — sécurité uniquement via HMAC timing-safe.
|    L'URL de retour passerelle (return_url) N'ACTIVE JAMAIS la licence.
|    Rate limiting strict (30 req/min) pour prévenir les attaques flood.
|
| 3. Routes admin (auth + ibig.admin) :
|    Validation manuelle réservée aux super-admins IBIG Soft.
|
| CSRF : les routes webhook sont exclues du CSRF (voir bootstrap/app.php).
|
| FIREWALL RECOMMANDÉ : Whitelister les IPs des prestataires côté nginx.
|   Paystack    : 52.31.139.75, 52.49.173.169, 52.214.14.220
|   Flutterwave : 52.24.126.164, 52.26.197.188
|
*/

// =============================================================================
// Routes Commandes — Authentifiées (client)
// =============================================================================

Route::middleware(['auth:sanctum', 'tenant'])->prefix('v1')->group(function () {

    // Moyens de paiement disponibles (config publique uniquement, sans clés secrètes)
    Route::get('/payment-methods', [OrderController::class, 'getPaymentMethods'])
         ->name('api.payment-methods');

    // Créer une commande — montant calculé CÔTÉ SERVEUR
    Route::post('/orders', [OrderController::class, 'createOrder'])
         ->middleware('throttle:10,1')   // Max 10 créations par minute
         ->name('api.orders.create');

    // Détail d'une commande
    Route::get('/orders/{reference}', [OrderController::class, 'showOrder'])
         ->name('api.orders.show');

    // Annuler une commande non payée
    Route::delete('/orders/{reference}', [OrderController::class, 'cancelOrder'])
         ->name('api.orders.cancel');

    // Soumettre une preuve de paiement
    Route::post('/orders/{reference}/proof', [OrderController::class, 'submitProof'])
         ->middleware('throttle:5,1')    // Max 5 soumissions par minute
         ->name('api.orders.proof');

    // Télécharger sa propre preuve (stream sécurisé)
    Route::get('/proofs/{id}/download', [OrderController::class, 'downloadProof'])
         ->name('api.proofs.download');

    // Utiliser un code voucher
    Route::post('/orders/{reference}/voucher', [OrderController::class, 'redeemVoucher'])
         ->middleware('throttle:5,1')
         ->name('api.orders.voucher');
});

// =============================================================================
// Routes Webhooks — SANS authentification, AVEC rate limiting strict
// =============================================================================
//
// SÉCURITÉ WEBHOOK :
//   1. Aucun middleware auth (les prestataires ne s'authentifient pas)
//   2. Vérification HMAC dans WebhookService (timing-safe hash_equals)
//   3. Idempotence : event_id unique en base (SELECT FOR UPDATE)
//   4. L'URL de retour passerelle NE FAIT RIEN — activation via webhooks uniquement
//
// CONFIGURATION CSRF : Dans bootstrap/app.php, exclure les routes webhook :
//   ->withMiddleware(function (Middleware $middleware) {
//       $middleware->validateCsrfTokens(except: ['webhooks/*']);
//   });
//
Route::middleware(['throttle:30,1'])->prefix('webhooks')->group(function () {

    // CinetPay — Paiements carte et mobile Afrique de l'Ouest
    Route::post('/cinetpay', [WebhookController::class, 'cinetpay'])
         ->name('webhook.cinetpay');

    // Paystack — Paiements carte (Nigeria, Ghana, Afrique du Sud, Kenya)
    Route::post('/paystack', [WebhookController::class, 'paystack'])
         ->name('webhook.paystack');

    // Flutterwave — Paiements multicanal Afrique
    Route::post('/flutterwave', [WebhookController::class, 'flutterwave'])
         ->name('webhook.flutterwave');

    // Stripe — Paiements carte internationaux
    Route::post('/stripe', [WebhookController::class, 'stripe'])
         ->name('webhook.stripe');

    // Orange Money — Mobile Money CI, SN, ML, GN
    Route::post('/orange-money', [WebhookController::class, 'orangeMoney'])
         ->name('webhook.orange_money');

    // MTN Mobile Money — CI, CM, GH, RW
    Route::post('/mtn-momo', [WebhookController::class, 'mtnMomo'])
         ->name('webhook.mtn_momo');

    // Wave — Mobile Money Sénégal / Côte d'Ivoire
    Route::post('/wave', [WebhookController::class, 'wave'])
         ->name('webhook.wave');
});

// =============================================================================
// Routes Admin — Validation manuelle (SuperAdmin IBIG Soft uniquement)
// =============================================================================

Route::middleware(['auth:sanctum', 'ibig.admin'])->prefix('admin/payments')->group(function () {

    // KPIs dashboard
    Route::get('/kpis', [PaymentAdminController::class, 'kpis'])
         ->name('admin.payments.kpis');

    // Liste des commandes
    Route::get('/orders', [PaymentAdminController::class, 'orders'])
         ->name('admin.payments.orders');

    // Activation forcée (journalisée)
    Route::post('/orders/{id}/force-activate', [PaymentAdminController::class, 'forceActivate'])
         ->name('admin.payments.force-activate');

    // Liste des preuves
    Route::get('/proofs', [PaymentAdminController::class, 'proofs'])
         ->name('admin.payments.proofs');

    // Télécharger une preuve (admin)
    Route::get('/proofs/{id}/download', [PaymentAdminController::class, 'downloadProof'])
         ->name('admin.proofs.download');

    // Approuver une preuve
    Route::post('/proofs/{id}/approve', [PaymentAdminController::class, 'approveProof'])
         ->middleware('throttle:20,1')
         ->name('admin.payments.proofs.approve');

    // Rejeter une preuve avec motif
    Route::post('/proofs/{id}/reject', [PaymentAdminController::class, 'rejectProof'])
         ->middleware('throttle:20,1')
         ->name('admin.payments.proofs.reject');

    // Configuration des moyens de paiement
    Route::get('/config', [PaymentAdminController::class, 'config'])
         ->name('admin.payments.config');
    Route::put('/config/{id}', [PaymentAdminController::class, 'updateConfig'])
         ->name('admin.payments.config.update');

    // Vouchers
    Route::get('/vouchers', [PaymentAdminController::class, 'vouchers'])
         ->name('admin.payments.vouchers');
    Route::post('/vouchers/generate', [PaymentAdminController::class, 'generateVouchers'])
         ->middleware('throttle:5,1')
         ->name('admin.payments.vouchers.generate');
    Route::get('/vouchers/export/{batch}', [PaymentAdminController::class, 'exportVouchers'])
         ->name('admin.payments.vouchers.export');

    // Journal des webhooks
    Route::get('/webhook-logs', [PaymentAdminController::class, 'webhookLogs'])
         ->name('admin.payments.webhook-logs');
});
