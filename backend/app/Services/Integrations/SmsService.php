<?php

namespace App\Services\Integrations;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * SmsService — Envoi de SMS multi-provider avec routage automatique par pays.
 *
 * Providers supportés :
 *  - Africa's Talking  → Kenya, Uganda, Tanzania, Nigeria, Ghana
 *  - Orange SMS        → Côte d'Ivoire (+225), Cameroun (+237), Sénégal (+221)
 *  - MTN SMS           → Cameroun (+237), Côte d'Ivoire (+225), Ghana (+233)
 *  - Vonage / Nexmo    → Europe + international fallback
 *  - Twilio            → International (fallback final)
 *
 * OTP Redis :
 *  - Stocké 5 minutes avec limite de 3 tentatives
 *  - Code 6 chiffres cryptographiquement aléatoire
 */
class SmsService
{
    // ─── Mapping indicatif → provider préféré ─────────────────────────────────

    private const COUNTRY_PROVIDER = [
        '+225' => 'orange',          // Côte d'Ivoire
        '+237' => 'orange',          // Cameroun
        '+221' => 'orange',          // Sénégal
        '+242' => 'orange',          // Congo-Brazzaville
        '+241' => 'orange',          // Gabon
        '+212' => 'orange',          // Maroc
        '+254' => 'africas_talking', // Kenya
        '+256' => 'africas_talking', // Uganda
        '+255' => 'africas_talking', // Tanzania
        '+234' => 'africas_talking', // Nigeria
        '+233' => 'africas_talking', // Ghana
        '+260' => 'africas_talking', // Zambie
        '+263' => 'africas_talking', // Zimbabwe
        '+27'  => 'africas_talking', // Afrique du Sud
    ];

    // ─── Templates ────────────────────────────────────────────────────────────

    private const TEMPLATES = [
        'rdv_reminder'     => "Rappel : Votre rendez-vous est prévu le {date} à {heure}. SECRETIS ERP.",
        'delivery_alert'   => "Alerte livraison : Votre commande #{numero} a été expédiée. Suivi : {lien}",
        'password_reset'   => "SECRETIS : Code de réinitialisation : {otp}. Valide 5 minutes.",
        'otp'              => "SECRETIS : Votre code de vérification est {otp}. Ne le partagez jamais.",
        'task_assigned'    => "Nouvelle tâche assignée : \"{tache}\" — Échéance : {date}.",
        'invoice_due'      => "Rappel paiement : Facture #{numero} de {montant} FCFA échue le {date}.",
    ];

    public function __construct(private readonly array $config = []) {}

    // ─── 1. Envoi SMS ─────────────────────────────────────────────────────────

    /**
     * Envoie un SMS avec sélection automatique du provider.
     *
     * @param  string $to       Numéro au format international (+225XXXXXXXX)
     * @param  string $message  Contenu du message (max 160 chars pour 1 crédit)
     * @param  string $provider auto | africas_talking | orange | twilio | vonage | mtn
     * @return bool             true si envoyé avec succès
     */
    public function sendSms(string $to, string $message, string $provider = 'auto'): bool
    {
        $to = $this->normalizePhone($to);

        if ($provider === 'auto') {
            $provider = $this->detectProvider($to);
        }

        Log::info("SMS [{$provider}] → {$to}", ['length' => strlen($message)]);

        return match ($provider) {
            'africas_talking' => $this->sendAfricasTalking($to, $message),
            'orange'          => $this->sendOrange($to, $message),
            'mtn'             => $this->sendMtn($to, $message),
            'vonage'          => $this->sendVonage($to, $message),
            'twilio'          => $this->sendTwilio($to, $message),
            default           => $this->sendTwilio($to, $message), // fallback
        };
    }

    /**
     * Envoie un SMS depuis un template avec variables.
     *
     * @param  string               $to        Numéro destinataire
     * @param  string               $template  Clé du template (rdv_reminder, otp, …)
     * @param  array<string,string> $vars      Variables à remplacer ({key} → value)
     */
    public function sendTemplate(string $to, string $template, array $vars = []): bool
    {
        $text = self::TEMPLATES[$template] ?? throw new \InvalidArgumentException(
            "Template SMS inconnu : {$template}"
        );

        foreach ($vars as $key => $value) {
            $text = str_replace("{{$key}}", $value, $text);
        }

        return $this->sendSms($to, $text);
    }

    // ─── 2. OTP ───────────────────────────────────────────────────────────────

    /**
     * Génère un OTP 6 chiffres, le stocke dans Redis 5 minutes et l'envoie par SMS.
     *
     * @return string Le code OTP (pour debug/test uniquement, ne pas exposer en prod)
     */
    public function sendOtp(string $phone): string
    {
        $phone = $this->normalizePhone($phone);
        $otp   = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put(
            key:    $this->otpCacheKey($phone),
            value:  ['otp' => $otp, 'attempts' => 0],
            ttl:    300 // 5 minutes
        );

        $this->sendTemplate($phone, 'otp', ['otp' => $otp]);

        return $otp;
    }

    /**
     * Vérifie un OTP. Limite à 3 tentatives puis invalide.
     */
    public function verifyOtp(string $phone, string $otp): bool
    {
        $phone = $this->normalizePhone($phone);
        $key   = $this->otpCacheKey($phone);
        $data  = Cache::get($key);

        if (!$data) {
            return false; // Expiré ou inexistant
        }

        // Incrément des tentatives
        $data['attempts']++;
        if ($data['attempts'] >= 3) {
            Cache::forget($key);
            return false; // Trop de tentatives
        }

        Cache::put($key, $data, 300);

        if (hash_equals($data['otp'], $otp)) {
            Cache::forget($key); // Invalider après succès
            return true;
        }

        return false;
    }

    // ─── 3. Providers ─────────────────────────────────────────────────────────

    private function sendAfricasTalking(string $to, string $message): bool
    {
        $apiKey   = $this->config['africas_talking_api_key'] ?? config('services.sms.africas_talking.api_key');
        $username = $this->config['africas_talking_username'] ?? config('services.sms.africas_talking.username');

        $response = Http::withHeaders([
            'apiKey' => $apiKey,
            'Accept' => 'application/json',
        ])->asForm()->post('https://api.africastalking.com/version1/messaging', [
            'username' => $username,
            'to'       => $to,
            'message'  => $message,
        ]);

        if (!$response->successful()) {
            Log::error("Africa's Talking erreur", ['body' => $response->body()]);
            return false;
        }

        $result = $response->json('SMSMessageData.Recipients.0');
        return isset($result['status']) && $result['status'] === 'Success';
    }

    private function sendOrange(string $to, string $message): bool
    {
        // Orange SMS API (OCS — Orange Contact Services)
        // Authentification OAuth2 client_credentials
        $clientId     = $this->config['orange_client_id']     ?? config('services.sms.orange.client_id');
        $clientSecret = $this->config['orange_client_secret'] ?? config('services.sms.orange.client_secret');
        $senderName   = $this->config['orange_sender_name']   ?? config('services.sms.orange.sender_name', 'SECRETIS');

        // Token (caché 50 min)
        $token = Cache::remember('orange_sms_token', 3000, function () use ($clientId, $clientSecret) {
            $resp = Http::asForm()->post('https://api.orange.com/oauth/v3/token', [
                'grant_type'    => 'client_credentials',
                'client_id'     => $clientId,
                'client_secret' => $clientSecret,
            ]);
            return $resp->json('access_token');
        });

        $senderAddress = 'tel:' . config('services.sms.orange.sender_number', '+2250000000000');
        $recipientUrl  = 'https://api.orange.com/smsmessaging/v1/outbound/' . urlencode($senderAddress) . '/requests';

        $response = Http::withToken($token)->post($recipientUrl, [
            'outboundSMSMessageRequest' => [
                'address'             => ['tel:' . $to],
                'senderAddress'       => $senderAddress,
                'senderName'          => $senderName,
                'outboundSMSTextMessage' => ['message' => $message],
            ],
        ]);

        if (!$response->successful()) {
            Log::error('Orange SMS erreur', ['body' => $response->body()]);
            // Fallback Twilio
            return $this->sendTwilio($to, $message);
        }

        return true;
    }

    private function sendMtn(string $to, string $message): bool
    {
        // MTN MoMo SMS API — nécessite subscription API MTN Developer
        $apiKey      = $this->config['mtn_api_key']      ?? config('services.sms.mtn.api_key');
        $apiUser     = $this->config['mtn_api_user']     ?? config('services.sms.mtn.api_user');
        $environment = $this->config['mtn_environment']  ?? config('services.sms.mtn.environment', 'sandbox');

        $baseUrl = $environment === 'production'
            ? 'https://proxy.momoapi.mtn.com'
            : 'https://sandbox.momodeveloper.mtn.com';

        $response = Http::withHeaders([
            'Ocp-Apim-Subscription-Key' => $apiKey,
            'X-Target-Environment'      => $environment,
        ])->post("{$baseUrl}/collection/v1_0/requesttopay", [
            // MTN SMS via notification lors du paiement — pour notifications SMS pures
            // utiliser leur SMS Gateway si disponible
            'message' => $message,
            'to'      => ltrim($to, '+'),
        ]);

        if (!$response->successful()) {
            Log::warning('MTN SMS échoué, fallback Orange', ['status' => $response->status()]);
            return $this->sendOrange($to, $message);
        }

        return true;
    }

    private function sendVonage(string $to, string $message): bool
    {
        $apiKey    = $this->config['vonage_api_key']    ?? config('services.sms.vonage.api_key');
        $apiSecret = $this->config['vonage_api_secret'] ?? config('services.sms.vonage.api_secret');
        $from      = $this->config['vonage_from']       ?? config('services.sms.vonage.from', 'SECRETIS');

        $response = Http::post('https://rest.nexmo.com/sms/json', [
            'api_key'    => $apiKey,
            'api_secret' => $apiSecret,
            'from'       => $from,
            'to'         => ltrim($to, '+'),
            'text'       => $message,
        ]);

        if (!$response->successful()) {
            Log::error('Vonage SMS erreur', ['body' => $response->body()]);
            return false;
        }

        $msgStatus = $response->json('messages.0.status');
        return $msgStatus === '0'; // 0 = succès chez Vonage
    }

    private function sendTwilio(string $to, string $message): bool
    {
        $accountSid = $this->config['twilio_account_sid'] ?? config('services.sms.twilio.account_sid');
        $authToken  = $this->config['twilio_auth_token']  ?? config('services.sms.twilio.auth_token');
        $from       = $this->config['twilio_from']        ?? config('services.sms.twilio.from');

        $response = Http::withBasicAuth($accountSid, $authToken)
            ->asForm()
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json", [
                'From' => $from,
                'To'   => $to,
                'Body' => $message,
            ]);

        if (!$response->successful()) {
            Log::error('Twilio SMS erreur', ['body' => $response->body()]);
            return false;
        }

        return in_array($response->json('status'), ['queued', 'sent', 'delivered']);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function detectProvider(string $phone): string
    {
        foreach (self::COUNTRY_PROVIDER as $prefix => $provider) {
            if (str_starts_with($phone, $prefix)) {
                return $provider;
            }
        }
        return 'twilio'; // fallback international
    }

    private function normalizePhone(string $phone): string
    {
        // Supprime espaces et tirets, assure le + en tête
        $phone = preg_replace('/[\s\-\(\)]/', '', $phone);
        if (!str_starts_with($phone, '+')) {
            $phone = '+' . $phone;
        }
        return $phone;
    }

    private function otpCacheKey(string $phone): string
    {
        return 'otp:' . hash('sha256', $phone);
    }
}
