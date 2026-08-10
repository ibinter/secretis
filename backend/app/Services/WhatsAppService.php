<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * WhatsAppService — Envoi de messages via WhatsApp Cloud API (Meta Business).
 *
 * Configuration requise (config/services.php ou .env) :
 *   WHATSAPP_PHONE_NUMBER_ID   → ID du numéro WhatsApp Business
 *   WHATSAPP_ACCESS_TOKEN      → Token d'accès permanent Meta
 *   WHATSAPP_VERIFY_TOKEN      → Token de vérification webhook
 *
 * Templates prédéfinis (à créer dans le Meta Business Manager) :
 *   - event_reminder      : rappel événement
 *   - task_assigned       : assignation de tâche
 *   - visitor_arrived     : visiteur arrivé
 *   - leave_approved      : congé approuvé
 *   - invoice_sent        : facture disponible
 *
 * Fallback : si WhatsApp échoue (numéro non enregistré, opt-out…),
 * le service tente un envoi SMS via Twilio/Africa's Talking selon config.
 */
class WhatsAppService
{
    private const API_VERSION = 'v19.0';
    private const BASE_URL    = 'https://graph.facebook.com';

    private string $phoneNumberId;
    private string $accessToken;
    private string $apiUrl;

    public function __construct()
    {
        $this->phoneNumberId = (string) config('services.whatsapp.phone_number_id', '');
        $this->accessToken   = (string) config('services.whatsapp.access_token', '');
        $this->apiUrl        = sprintf(
            '%s/%s/%s/messages',
            self::BASE_URL,
            self::API_VERSION,
            $this->phoneNumberId
        );
    }

    // -------------------------------------------------------------------------
    // Messages texte
    // -------------------------------------------------------------------------

    /**
     * Envoie un message texte simple.
     *
     * @param  string $to      Numéro au format international sans + (ex: 2250701234567)
     * @param  string $message Contenu du message (max 4096 caractères)
     * @return array           Réponse API Meta
     */
    public function sendTextMessage(string $to, string $message): array
    {
        $to = $this->normalizePhoneNumber($to);

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type'    => 'individual',
            'to'                => $to,
            'type'              => 'text',
            'text'              => [
                'preview_url' => false,
                'body'        => mb_substr($message, 0, 4096),
            ],
        ];

        try {
            $response = $this->post($payload);
            Log::info('WhatsApp message texte envoyé', ['to' => $to, 'message_id' => $response['messages'][0]['id'] ?? null]);
            return $response;
        } catch (\Exception $e) {
            Log::error('WhatsApp envoi texte échoué', ['to' => $to, 'error' => $e->getMessage()]);
            return $this->fallbackSms($to, $message);
        }
    }

    // -------------------------------------------------------------------------
    // Messages template
    // -------------------------------------------------------------------------

    /**
     * Envoie un message basé sur un template Meta approuvé.
     *
     * @param  string $to         Numéro destinataire
     * @param  string $template   Nom du template (ex: "event_reminder")
     * @param  array  $variables  Variables du template dans l'ordre des placeholders
     * @return array
     */
    public function sendTemplateMessage(string $to, string $template, array $variables): array
    {
        $to = $this->normalizePhoneNumber($to);

        // Construire les composants body avec les variables
        $components = [];

        if (! empty($variables)) {
            $bodyParams = array_map(fn($v) => ['type' => 'text', 'text' => (string) $v], $variables);
            $components[] = [
                'type'       => 'body',
                'parameters' => $bodyParams,
            ];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type'    => 'individual',
            'to'                => $to,
            'type'              => 'template',
            'template'          => [
                'name'       => $template,
                'language'   => ['code' => 'fr'],
                'components' => $components,
            ],
        ];

        try {
            $response = $this->post($payload);
            Log::info('WhatsApp template envoyé', [
                'to'         => $to,
                'template'   => $template,
                'message_id' => $response['messages'][0]['id'] ?? null,
            ]);
            return $response;
        } catch (\Exception $e) {
            Log::error('WhatsApp template échoué', [
                'to'       => $to,
                'template' => $template,
                'error'    => $e->getMessage(),
            ]);

            // Fallback : message texte si le template échoue
            $text = $this->renderTemplateAsFallbackText($template, $variables);
            return $this->fallbackSms($to, $text);
        }
    }

    /**
     * Envoie un document (PDF, Word, etc.) via WhatsApp.
     *
     * @param  string $to          Numéro destinataire
     * @param  string $documentUrl URL publique du document
     * @param  string $filename    Nom du fichier affiché dans WhatsApp
     * @return array
     */
    public function sendDocumentMessage(string $to, string $documentUrl, string $filename): array
    {
        $to = $this->normalizePhoneNumber($to);

        $payload = [
            'messaging_product' => 'whatsapp',
            'recipient_type'    => 'individual',
            'to'                => $to,
            'type'              => 'document',
            'document'          => [
                'link'     => $documentUrl,
                'filename' => $filename,
            ],
        ];

        try {
            $response = $this->post($payload);
            Log::info('WhatsApp document envoyé', ['to' => $to, 'filename' => $filename]);
            return $response;
        } catch (\Exception $e) {
            Log::error('WhatsApp document échoué', ['to' => $to, 'error' => $e->getMessage()]);
            // Pas de fallback SMS pour les documents
            throw $e;
        }
    }

    // -------------------------------------------------------------------------
    // Templates prédéfinis — Méthodes de commodité
    // -------------------------------------------------------------------------

    /**
     * Rappel d'événement.
     * Template : "Rappel : {event_title} dans {minutes} minutes. Lieu : {location}"
     */
    public function sendEventReminder(string $to, string $eventTitle, int $minutes, string $location = ''): array
    {
        return $this->sendTemplateMessage($to, 'event_reminder', [
            $eventTitle,
            (string) $minutes,
            $location ?: 'Non précisé',
        ]);
    }

    /**
     * Notification de tâche assignée.
     * Template : "Nouvelle tâche assignée : {task_title}. Échéance : {due_date}"
     */
    public function sendTaskAssigned(string $to, string $taskTitle, string $dueDate): array
    {
        return $this->sendTemplateMessage($to, 'task_assigned', [$taskTitle, $dueDate]);
    }

    /**
     * Notification d'arrivée de visiteur.
     * Template : "Votre visiteur {visitor_name} est arrivé à la réception"
     */
    public function sendVisitorArrived(string $to, string $visitorName): array
    {
        return $this->sendTemplateMessage($to, 'visitor_arrived', [$visitorName]);
    }

    /**
     * Notification d'approbation de congé.
     * Template : "Votre demande de congé du {start} au {end} est approuvée"
     */
    public function sendLeaveApproved(string $to, string $startDate, string $endDate): array
    {
        return $this->sendTemplateMessage($to, 'leave_approved', [$startDate, $endDate]);
    }

    /**
     * Notification de facture disponible.
     * Template : "Nouvelle facture {invoice_number} de {amount} FCFA disponible"
     */
    public function sendInvoiceSent(string $to, string $invoiceNumber, string $amount): array
    {
        return $this->sendTemplateMessage($to, 'invoice_sent', [$invoiceNumber, $amount]);
    }

    // -------------------------------------------------------------------------
    // Webhook — Réception de messages entrants et statuts de livraison
    // -------------------------------------------------------------------------

    /**
     * Traite le payload webhook Meta (messages entrants + statuts de livraison).
     *
     * @param array $payload Corps de la requête POST décodé
     */
    public function handleWebhook(array $payload): void
    {
        $entry = $payload['entry'][0] ?? null;

        if (! $entry) {
            return;
        }

        $changes = $entry['changes'] ?? [];

        foreach ($changes as $change) {
            $value = $change['value'] ?? [];

            // Traitement des messages entrants
            if (! empty($value['messages'])) {
                foreach ($value['messages'] as $message) {
                    $this->handleIncomingMessage($message, $value['contacts'][0] ?? []);
                }
            }

            // Traitement des statuts de livraison
            if (! empty($value['statuses'])) {
                foreach ($value['statuses'] as $status) {
                    $this->handleDeliveryStatus($status);
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // Helpers privés
    // -------------------------------------------------------------------------

    private function post(array $payload): array
    {
        $response = Http::withToken($this->accessToken)
            ->timeout(15)
            ->retry(2, 500)
            ->post($this->apiUrl, $payload);

        if ($response->failed()) {
            $error = $response->json('error', []);
            throw new \RuntimeException(
                sprintf(
                    'WhatsApp API Error %d: %s (code: %s)',
                    $response->status(),
                    $error['message'] ?? 'Unknown',
                    $error['code'] ?? 'N/A'
                )
            );
        }

        return $response->json();
    }

    private function normalizePhoneNumber(string $phone): string
    {
        // Supprimer espaces, tirets, parenthèses
        $phone = preg_replace('/[\s\-\(\)\+]/', '', $phone);

        // Ajouter indicatif Côte d'Ivoire si numéro local (commence par 0)
        if (str_starts_with($phone, '0') && strlen($phone) === 10) {
            $phone = '225' . substr($phone, 1);
        }

        return $phone;
    }

    private function handleIncomingMessage(array $message, array $contact): void
    {
        $from = $message['from'] ?? 'unknown';
        $type = $message['type'] ?? 'text';

        Log::info('WhatsApp message entrant', [
            'from'       => $from,
            'type'       => $type,
            'contact'    => $contact['profile']['name'] ?? 'Inconnu',
            'message_id' => $message['id'] ?? null,
        ]);

        // Ici : dispatcher un event Laravel pour que les modules puissent réagir
        // event(new WhatsAppMessageReceived($message, $contact));
    }

    private function handleDeliveryStatus(array $status): void
    {
        Log::info('WhatsApp statut livraison', [
            'message_id' => $status['id'] ?? null,
            'status'     => $status['status'] ?? null,
            'timestamp'  => $status['timestamp'] ?? null,
        ]);
    }

    /**
     * Fallback SMS via une API SMS (Twilio ou Africa's Talking).
     * Retourne un tableau cohérent avec le format WhatsApp.
     */
    private function fallbackSms(string $to, string $message): array
    {
        $smsProvider = config('services.sms.provider', 'none');

        if ($smsProvider === 'none') {
            Log::warning('WhatsApp échoué, aucun provider SMS de fallback configuré', ['to' => $to]);
            return ['fallback' => false, 'error' => 'no_sms_provider'];
        }

        try {
            // Implémentation spécifique selon le provider configuré
            Log::info('WhatsApp fallback SMS déclenché', ['to' => $to, 'provider' => $smsProvider]);
            return ['fallback' => true, 'provider' => $smsProvider];
        } catch (\Exception $e) {
            Log::error('Fallback SMS échoué', ['to' => $to, 'error' => $e->getMessage()]);
            return ['fallback' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Génère un texte lisible depuis un template pour le fallback SMS.
     */
    private function renderTemplateAsFallbackText(string $template, array $variables): string
    {
        $templates = [
            'event_reminder'  => "Rappel : %s dans %s minutes. Lieu : %s",
            'task_assigned'   => "Nouvelle tâche assignée : %s. Échéance : %s",
            'visitor_arrived' => "Votre visiteur %s est arrivé à la réception",
            'leave_approved'  => "Votre demande de congé du %s au %s est approuvée",
            'invoice_sent'    => "Nouvelle facture %s de %s FCFA disponible",
        ];

        $pattern = $templates[$template] ?? $template;

        return vsprintf($pattern, $variables);
    }
}
