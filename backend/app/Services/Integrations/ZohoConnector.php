<?php

namespace App\Services\Integrations;

use App\Models\Contact;
use App\Models\Crm\CrmActivity;
use App\Models\Crm\CrmDeal;
use App\Models\Organization;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * ZohoConnector — Synchronisation bidirectionnelle avec Zoho CRM.
 *
 * OAuth2 Authorization Code Flow :
 *  - Access Token : 1h
 *  - Refresh Token : permanent (révocable)
 *  - Stockage chiffré dans organization_integrations.config
 *
 * Modules synchronisés :
 *  - Contacts   ↔  SECRETIS Contacts
 *  - Deals      ↔  SECRETIS CRM Opportunités
 *  - Activities ↔  SECRETIS Tâches / Rendez-vous
 */
class ZohoConnector
{
    private const BASE_URL    = 'https://www.zohoapis.com/crm/v3';
    private const AUTH_URL    = 'https://accounts.zoho.com/oauth/v2';
    private const TOKEN_CACHE = 'zoho_access_token_';

    private array $config = [];

    public function withConfig(array $config): static
    {
        $this->config = $config;
        return $this;
    }

    // ─── OAuth2 ───────────────────────────────────────────────────────────────

    /**
     * Génère l'URL d'autorisation Zoho OAuth2.
     */
    public function getAuthorizationUrl(string $redirectUri, string $state): string
    {
        return self::AUTH_URL . '/auth?' . http_build_query([
            'scope'         => 'ZohoCRM.modules.contacts.ALL,ZohoCRM.modules.deals.ALL,ZohoCRM.modules.activities.ALL',
            'client_id'     => $this->config['client_id'],
            'response_type' => 'code',
            'redirect_uri'  => $redirectUri,
            'access_type'   => 'offline',
            'state'         => $state,
            'prompt'        => 'consent',
        ]);
    }

    /**
     * Échange le code d'autorisation contre les tokens.
     *
     * @return array{access_token: string, refresh_token: string, expires_in: int}
     */
    public function exchangeCode(string $code, string $redirectUri): array
    {
        $response = Http::asForm()->post(self::AUTH_URL . '/token', [
            'code'          => $code,
            'client_id'     => $this->config['client_id'],
            'client_secret' => $this->config['client_secret'],
            'redirect_uri'  => $redirectUri,
            'grant_type'    => 'authorization_code',
        ]);

        $response->throw();
        return $response->json();
    }

    // ─── Helpers d'accès API ─────────────────────────────────────────────────

    private function getAccessToken(): string
    {
        $cacheKey = self::TOKEN_CACHE . md5($this->config['refresh_token'] ?? '');

        return Cache::remember($cacheKey, 3400, function () {
            $response = Http::asForm()->post(self::AUTH_URL . '/token', [
                'refresh_token' => $this->config['refresh_token'],
                'client_id'     => $this->config['client_id'],
                'client_secret' => $this->config['client_secret'],
                'grant_type'    => 'refresh_token',
            ]);

            if (!$response->successful()) {
                throw new \RuntimeException('Zoho token refresh échoué : ' . $response->body());
            }

            return $response->json('access_token');
        });
    }

    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withToken($this->getAccessToken())
                   ->baseUrl(self::BASE_URL)
                   ->timeout(30);
    }

    // ─── 1. Contacts ─────────────────────────────────────────────────────────

    /**
     * Synchronisation bidirectionnelle des contacts Zoho ↔ SECRETIS.
     * Règle de conflit : modified_time Zoho vs updated_at SECRETIS.
     */
    public function syncContacts(): void
    {
        $orgId = $this->config['organization_id'] ?? null;
        if (!$orgId) {
            throw new \RuntimeException('organization_id manquant dans la configuration Zoho.');
        }

        // ── Pull depuis Zoho ──
        $page = 1;
        do {
            $response = $this->http()->get('/Contacts', [
                'page'     => $page,
                'per_page' => 200,
                'fields'   => 'id,First_Name,Last_Name,Email,Phone,Account_Name,Mailing_City,Mailing_Country,Modified_Time',
            ]);

            if (!$response->successful()) {
                Log::error('Zoho Contacts pull échoué', ['status' => $response->status()]);
                break;
            }

            $records = $response->json('data') ?? [];
            foreach ($records as $record) {
                $this->upsertContactFromZoho($orgId, $record);
            }

            $more = $response->json('info.more_records') ?? false;
            $page++;
        } while ($more);

        // ── Push vers Zoho ──
        $localContacts = Contact::where('organization_id', $orgId)
            ->where(function ($q) {
                $q->whereNull('zoho_id')
                  ->orWhere('updated_at', '>', now()->subHours(24));
            })
            ->get();

        foreach ($localContacts->chunk(100) as $chunk) {
            $records = $chunk->map(fn ($c) => [
                'id'          => $c->zoho_id ?? null,
                'First_Name'  => $c->first_name ?? explode(' ', $c->name)[0] ?? '',
                'Last_Name'   => $c->last_name  ?? (explode(' ', $c->name)[1] ?? $c->name),
                'Email'       => $c->email,
                'Phone'       => $c->phone,
                'Mailing_City'    => $c->city,
                'Mailing_Country' => $c->country,
            ])->filter(fn ($r) => !empty($r['Last_Name']))->values()->toArray();

            if (empty($records)) {
                continue;
            }

            $response = $this->http()->post('/Contacts/upsert', ['data' => $records]);

            if ($response->successful()) {
                foreach ($response->json('data') ?? [] as $idx => $result) {
                    $zohoId = $result['details']['id'] ?? null;
                    if ($zohoId && isset($localContacts[$idx])) {
                        $localContacts[$idx]->update(['zoho_id' => $zohoId]);
                    }
                }
            }
        }

        Log::info('Zoho Contacts sync terminée', ['org' => $orgId]);
    }

    // ─── 2. Deals / Opportunités ─────────────────────────────────────────────

    public function syncDeals(): void
    {
        $orgId = $this->config['organization_id'] ?? null;

        $response = $this->http()->get('/Deals', [
            'per_page' => 200,
            'fields'   => 'id,Deal_Name,Stage,Amount,Closing_Date,Probability,Contact_Name,Modified_Time',
        ]);

        if (!$response->successful()) {
            Log::error('Zoho Deals pull échoué');
            return;
        }

        foreach ($response->json('data') ?? [] as $deal) {
            CrmDeal::updateOrCreate(
                ['zoho_id' => $deal['id'], 'organization_id' => $orgId],
                [
                    'name'         => $deal['Deal_Name'],
                    'stage'        => $this->mapDealStage($deal['Stage'] ?? ''),
                    'amount'       => (float) ($deal['Amount'] ?? 0),
                    'closing_date' => $deal['Closing_Date'] ? Carbon::parse($deal['Closing_Date'])->toDateString() : null,
                    'probability'  => (float) ($deal['Probability'] ?? 0),
                    'source'       => 'zoho',
                ]
            );
        }
    }

    // ─── 3. Activités ────────────────────────────────────────────────────────

    public function syncActivities(): void
    {
        $orgId = $this->config['organization_id'] ?? null;

        foreach (['Tasks', 'Events', 'Calls'] as $module) {
            $response = $this->http()->get("/{$module}", [
                'per_page' => 200,
                'fields'   => 'id,Subject,Status,Due_Date,Description,Who_Id,Modified_Time',
            ]);

            if (!$response->successful()) {
                continue;
            }

            foreach ($response->json('data') ?? [] as $item) {
                CrmActivity::updateOrCreate(
                    ['zoho_id' => $item['id'], 'organization_id' => $orgId],
                    [
                        'type'        => strtolower(rtrim($module, 's')),
                        'subject'     => $item['Subject'] ?? '',
                        'status'      => strtolower($item['Status'] ?? 'open'),
                        'due_date'    => $item['Due_Date'] ? Carbon::parse($item['Due_Date'])->toDateString() : null,
                        'description' => $item['Description'] ?? null,
                        'source'      => 'zoho',
                    ]
                );
            }
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function upsertContactFromZoho(int $orgId, array $record): void
    {
        Contact::updateOrCreate(
            ['zoho_id' => $record['id'], 'organization_id' => $orgId],
            [
                'name'    => trim(($record['First_Name'] ?? '') . ' ' . ($record['Last_Name'] ?? '')),
                'email'   => $record['Email'] ?? null,
                'phone'   => $record['Phone'] ?? null,
                'company' => $record['Account_Name']['name'] ?? null,
                'city'    => $record['Mailing_City'] ?? null,
                'country' => $record['Mailing_Country'] ?? null,
                'source'  => 'zoho',
                'type'    => 'prospect',
            ]
        );
    }

    private function mapDealStage(string $zohoStage): string
    {
        return match (strtolower($zohoStage)) {
            'qualification'              => 'qualification',
            'needs analysis'             => 'analyse',
            'value proposition'          => 'proposition',
            'id. decision makers'        => 'decision',
            'perception analysis'        => 'analyse',
            'proposal/price quote'       => 'devis',
            'negotiation/review'         => 'negociation',
            'closed won'                 => 'gagne',
            'closed lost'                => 'perdu',
            default                      => 'prospection',
        };
    }
}
