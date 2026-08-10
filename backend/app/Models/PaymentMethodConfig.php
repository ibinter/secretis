<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * PaymentMethodConfig — Configuration des 11 familles de moyens de paiement
 *
 * SÉCURITÉ :
 * - Le champ config est stocké chiffré (encrypt/decrypt)
 * - Les clés secrètes ne sont JAMAIS exposées au frontend
 * - getPublicConfig() retourne uniquement les données publiques (instructions, numéros)
 *
 * Familles supportées :
 *   mobile_money, electronic, bank_transfer, international_transfer,
 *   money_transfer, cash_agency, check, crypto, voucher, delivery, additional
 */
class PaymentMethodConfig extends Model
{
    use HasFactory;

    protected $table = 'payment_methods_config';

    protected $fillable = [
        'type',
        'provider',
        'display_name',
        'display_name_en',
        'description',
        'is_active',
        'is_test_mode',
        'config',
        'countries',
        'plans',
        'currencies',
        'order',
        'icon',
    ];

    protected $casts = [
        'is_active'      => 'boolean',
        'is_test_mode'   => 'boolean',
        'display_name_en' => 'array',
        'countries'      => 'array',
        'plans'          => 'array',
        'currencies'     => 'array',
    ];

    /**
     * SÉCURITÉ : Le champ config contient les clés API chiffrées.
     * Déchiffrement automatique à la lecture.
     */
    public function getConfigAttribute(?string $value): ?array
    {
        if ($value === null) {
            return null;
        }
        try {
            return json_decode(Crypt::decryptString($value), true);
        } catch (\Exception) {
            // Fallback : données non chiffrées (ex. lors de la migration initiale)
            return json_decode($value, true);
        }
    }

    public function setConfigAttribute(?array $value): void
    {
        if ($value === null) {
            $this->attributes['config'] = null;
            return;
        }
        $this->attributes['config'] = Crypt::encryptString(json_encode($value));
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeForCountry(Builder $query, string $countryCode): Builder
    {
        return $query->where(function (Builder $q) use ($countryCode) {
            $q->whereNull('countries')
              ->orWhereJsonContains('countries', $countryCode);
        });
    }

    public function scopeForPlan(Builder $query, string $planCode): Builder
    {
        return $query->where(function (Builder $q) use ($planCode) {
            $q->whereNull('plans')
              ->orWhereJsonContains('plans', $planCode);
        });
    }

    // -------------------------------------------------------------------------
    // Méthodes publiques
    // -------------------------------------------------------------------------

    /**
     * Retourne la configuration publique (sans clés secrètes).
     * JAMAIS de secret_key, api_key, webhook_secret dans ce retour.
     */
    public function getPublicConfig(): array
    {
        $config = $this->config ?? [];

        // Champs autorisés dans la config publique
        $publicFields = [
            'instructions',
            'merchant_number',
            'ussd_code',
            'bank_name',
            'account_number',
            'iban',
            'swift',
            'wallet_address',
            'network',
            'agency_name',
            'agency_address',
            'check_payable_to',
            'redirect_url',
            'public_key',  // clé publique uniquement (pas secret)
        ];

        return array_intersect_key($config, array_flip($publicFields));
    }

    /**
     * Vérifie si ce provider est disponible pour un pays donné.
     */
    public function isAvailableForCountry(string $countryCode): bool
    {
        if (empty($this->countries)) {
            return true; // disponible partout
        }
        return in_array(strtoupper($countryCode), $this->countries, true);
    }
}
