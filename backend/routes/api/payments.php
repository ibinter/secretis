<?php

use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API — Module Paiements & Abonnements
|--------------------------------------------------------------------------
|
| ARCHITECTURE DE SÉCURITÉ :
|
| 1. Routes paiements (auth + tenant + license) :
|    Nécessitent une session authentifiée ET un tenant résolu.
|    Rate limiting standard via throttle:api.
|
| 2. Routes webhooks (SANS auth, AVEC vérification signature) :
|    Ces routes doivent être accessibles sans token JWT car les prestataires
|    externes ne peuvent pas s'authentifier.
|    La sécurité repose sur la vérification HMAC de la signature.
|    Rate limiting strict pour prévenir les attaques DDoS/flood.
|
| 3. Routes admin (auth + ibig_admin) :
|    Validation manuelle réservée aux super-admins IBIG Soft.
|
*/

// =============================================================================
// Routes Paiements — Authentifiées
// =============================================================================

Route::middleware(['auth:sanctum', 'tenant', 'license'])->prefix('payments')->group(function () {

    // Initier un paiement
    Route::post('/initiate', [PaymentController::class, 'initiatePayment'])
         ->middleware('throttle:10,1'); // Max 10 initiations par minute

    // Uploader une preuve de paiement
    Route::post('/{id}/proof', [PaymentController::class, 'uploadProof'])
         ->where('id', '[0-9]+');

    // Statut d'un paiement (polling)
    Route::get('/{id}/status', [PaymentController::class, 'getStatus'])
         ->where('id', '[0-9]+')
         ->middleware('throttle:60,1'); // Polling : 60 req/min max

    // Télécharger une facture
    Route::get('/{id}/invoice', [PaymentController::class, 'generateInvoice'])
         ->where('id', '[0-9]+');

    // Historique des paiements
    Route::get('/history', [PaymentController::class, 'history']);
});

// =============================================================================
// Routes Abonnement — Authentifiées
// =============================================================================

Route::middleware(['auth:sanctum', 'tenant'])->prefix('subscription')->group(function () {

    // Plan courant
    Route::get('/current', [SubscriptionController::class, 'currentPlan']);

    // Méthodes de paiement disponibles
    Route::get('/payment-methods', [SubscriptionController::class, 'getPaymentMethods']);

    // Changement de plan (crée une intention de paiement)
    Route::post('/change-plan', [SubscriptionController::class, 'changePlan'])
         ->middleware('throttle:5,1');

    // Annulation
    Route::post('/cancel', [SubscriptionController::class, 'cancelSubscription'])
         ->middleware('throttle:3,1');

    // Réactivation
    Route::post('/reactivate', [SubscriptionController::class, 'reactivate'])
         ->middleware('throttle:5,1');
});

// =============================================================================
// Routes Admin — Validation manuelle (IBIG Soft uniquement)
// =============================================================================

Route::middleware(['auth:sanctum', 'ibig.admin'])->prefix('admin/payments')->group(function () {

    // Valider manuellement un paiement
    Route::post('/{id}/validate', [PaymentController::class, 'adminValidate'])
         ->where('id', '[0-9]+');

    // Rejeter un paiement avec motif
    Route::post('/{id}/reject', [PaymentController::class, 'adminReject'])
         ->where('id', '[0-9]+');

    // Liste de tous les paiements en attente de validation manuelle (pour le back-office)
    Route::get('/pending-manual', function () {
        return response()->json([
            'data' => \App\Models\Payment::manualValidation()
                ->with(['organization:id,name,email', 'validatedBy:id,name'])
                ->orderBy('created_at')
                ->paginate(25),
        ]);
    });
});

// =============================================================================
// Routes Webhooks — SANS authentification, AVEC rate limiting strict
// =============================================================================

/*
 * SÉCURITÉ WEBHOOK :
 *
 * Ces routes sont exposées publiquement mais protégées par :
 *   1. Vérification HMAC de la signature (dans le contrôleur)
 *   2. Rate limiting strict (30 requêtes par minute par IP)
 *   3. Exclusion du middleware CSRF (voir VerifyCsrfToken)
 *
 * CONFIGURATION CSRF : Ajouter dans App\Http\Middleware\VerifyCsrfToken::$except :
 *   'api/webhooks/*'
 *
 * FIREWALL RECOMMANDÉ : Whitelister les IPs des prestataires au niveau nginx/serveur.
 *   CinetPay    : voir leur doc (IPs variables)
 *   Paystack    : 52.31.139.75, 52.49.173.169, 52.214.14.220
 *   Flutterwave : 52.24.126.164, 52.26.197.188
 */
Route::middleware(['throttle:30,1'])->prefix('webhooks')->group(function () {

    // CinetPay — Paiements carte et mobile
    Route::post('/cinetpay', [WebhookController::class, 'cinetpay'])
         ->name('webhook.cinetpay');

    // Paystack — Paiements carte
    Route::post('/paystack', [WebhookController::class, 'paystack'])
         ->name('webhook.paystack');

    // Flutterwave — Paiements multicanal
    Route::post('/flutterwave', [WebhookController::class, 'flutterwave'])
         ->name('webhook.flutterwave');

    // Orange Money — Callback USSD
    Route::post('/orange-money', [WebhookController::class, 'orangeMoney'])
         ->name('webhook.orange_money');

    // MTN Mobile Money — Callback de collection
    Route::post('/mtn-momo', [WebhookController::class, 'mtnMomo'])
         ->name('webhook.mtn_momo');
});
