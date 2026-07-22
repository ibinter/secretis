<?php

namespace App\Services;

use App\Models\Organization;
use Carbon\Carbon;

class OhadaService
{
    /**
     * Retourne les 17 pays membres OHADA avec leurs métadonnées.
     */
    public function getCountries(): array
    {
        return config('ohada.countries', []);
    }

    /**
     * Retourne les infos d'un pays OHADA.
     */
    public function getCountry(string $code): ?array
    {
        return config("ohada.countries.{$code}");
    }

    /**
     * Vérifie si un pays est membre OHADA.
     */
    public function isOhadaMember(string $countryCode): bool
    {
        return array_key_exists($countryCode, config('ohada.countries', []));
    }

    /**
     * Valide le numéro fiscal / RCCM selon le format du pays.
     */
    public function validateTaxNumber(string $taxNumber, string $country): bool
    {
        $country = strtoupper($country);
        $cleaned = trim($taxNumber);

        return match ($country) {
            // Côte d'Ivoire — NCC : 7 chiffres ou format DGI CI
            'CI'  => (bool) preg_match('/^\d{7}$|^CI\d{10}$/', $cleaned),
            // Sénégal — NINEA : 7 chiffres + 2 lettres ou code numérique
            'SN'  => (bool) preg_match('/^\d{7}[A-Z]{2}\d$|^\d{9}$/', $cleaned),
            // Cameroun — NIU : format 14 caractères
            'CM'  => (bool) preg_match('/^[A-Z]{1}\d{3}[A-Z]{1}\d{3}[A-Z]{1}\d{3}[A-Z]{1}\d{1}$|^\d{12,14}$/', $cleaned),
            // Bénin — IFU : format 13 chiffres
            'BJ'  => (bool) preg_match('/^\d{13}$/', $cleaned),
            // Burkina Faso — IFU : 11 chiffres
            'BF'  => (bool) preg_match('/^\d{11}$/', $cleaned),
            // Mali — NIF : 8 chiffres
            'ML'  => (bool) preg_match('/^\d{8}$/', $cleaned),
            // Niger
            'NE'  => (bool) preg_match('/^\d{8,11}$/', $cleaned),
            // Togo
            'TG'  => (bool) preg_match('/^\d{9,11}$/', $cleaned),
            // Gabon
            'GA'  => (bool) preg_match('/^\d{7,10}$/', $cleaned),
            // Congo
            'CG'  => (bool) preg_match('/^\d{9,12}$/', $cleaned),
            // Guinée
            'GN'  => (bool) preg_match('/^\d{9,11}$/', $cleaned),
            // Tchad
            'TD'  => (bool) preg_match('/^\d{8,10}$/', $cleaned),
            // RDC
            'CD'  => (bool) preg_match('/^\d{9,11}$/', $cleaned),
            // Autres — validation générique
            default => strlen($cleaned) >= 5 && strlen($cleaned) <= 20,
        };
    }

    /**
     * Valide le numéro RCCM selon le format du pays.
     */
    public function validateRCCM(string $rccm, string $country): bool
    {
        $country = strtoupper($country);
        $countryConfig = $this->getCountry($country);

        if (! $countryConfig || ! isset($countryConfig['rccm_format'])) {
            return strlen(trim($rccm)) >= 5;
        }

        return (bool) preg_match('/' . $countryConfig['rccm_format'] . '/', trim($rccm));
    }

    /**
     * Génère la mention légale OHADA complète pour une facture.
     */
    public function formatLegalMention(Organization $org): string
    {
        $country  = $org->country ?? 'CI';
        $config   = $this->getCountry($country);
        $nifLabel = $config['nif_name'] ?? 'NIF';
        $lines    = [];

        // Dénomination sociale et forme juridique
        if ($org->legal_form) {
            $lines[] = strtoupper($org->name) . ' - ' . $org->legal_form;
        } else {
            $lines[] = strtoupper($org->name);
        }

        // Capital social
        if ($org->share_capital) {
            $currency   = $config['currency'] ?? 'XOF';
            $capitalStr = app(CurrencyService::class)->format($org->share_capital, $currency, 'fr');
            $lines[]    = 'Capital social : ' . $capitalStr;
        }

        // Siège social
        if ($org->address) {
            $lines[] = 'Siège social : ' . $this->formatAddress((array) $org->address, $country);
        }

        // RCCM
        if ($org->rccm_number) {
            $lines[] = 'RCCM : ' . $org->rccm_number;
        }

        // Numéro fiscal
        if ($org->tax_number) {
            $lines[] = $nifLabel . ' : ' . $org->tax_number;
        }

        // Numéro de TVA intracommunautaire si applicable
        if ($org->vat_number) {
            $lines[] = 'N° TVA : ' . $org->vat_number;
        }

        // Boîte Postale
        if ($org->po_box) {
            $lines[] = 'BP : ' . $org->po_box;
        }

        // Téléphone / Email
        if ($org->phone) {
            $lines[] = 'Tél. : ' . $org->phone;
        }

        if ($org->email) {
            $lines[] = 'Email : ' . $org->email;
        }

        return implode(' | ', $lines);
    }

    /**
     * Retourne le taux de TVA selon le pays OHADA.
     */
    public function getVatRate(string $country): float
    {
        return (float) (config("ohada.countries.{$country}.vat_rate") ?? 18.0);
    }

    /**
     * Retourne le nom de la TVA selon le pays (TVA, IVA, ISAVE...).
     */
    public function getVatName(string $country): string
    {
        return config("ohada.countries.{$country}.vat_name") ?? 'TVA';
    }

    /**
     * Retourne les jours fériés d'un pays OHADA pour une année donnée.
     */
    public function getPublicHolidays(string $country, int $year): array
    {
        return match (strtoupper($country)) {
            'CI' => $this->getHolidaysCI($year),
            'SN' => $this->getHolidaysSN($year),
            'CM' => $this->getHolidaysCM($year),
            'BJ' => $this->getHolidaysBJ($year),
            'BF' => $this->getHolidaysBF($year),
            'ML' => $this->getHolidaysML($year),
            'TG' => $this->getHolidaysTG($year),
            'GA' => $this->getHolidaysGA($year),
            'CG' => $this->getHolidaysCG($year),
            'NE' => $this->getHolidaysNE($year),
            'TD' => $this->getHolidaysTD($year),
            'CD' => $this->getHolidaysCD($year),
            'GN' => $this->getHolidaysGN($year),
            default => $this->getCommonHolidays($year),
        };
    }

    /**
     * Formate une adresse selon les conventions postales du pays.
     */
    public function formatAddress(array $address, string $country): string
    {
        $country = strtoupper($country);
        $config  = $this->getCountry($country);
        $name    = config("ohada.countries.{$country}.name_fr", $country);

        $street   = $address['street']   ?? $address['rue']    ?? '';
        $city     = $address['city']     ?? $address['ville']  ?? '';
        $region   = $address['region']   ?? $address['quartier'] ?? '';
        $poBox    = $address['po_box']   ?? $address['bp']     ?? '';
        $zip      = $address['zip']      ?? $address['code_postal'] ?? '';

        // Format OHADA : Rue, Quartier, BP XXXXX, Ville, PAYS
        $parts = array_filter([
            $street,
            $region,
            $poBox ? "BP {$poBox}" : ($zip ? $zip : ''),
            $city,
            strtoupper($name),
        ]);

        return implode(', ', $parts);
    }

    // =========================================================================
    // Jours fériés par pays
    // =========================================================================

    private function getHolidaysCI(int $year): array
    {
        $easter  = $this->computeEaster($year);
        $islamic = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            Carbon::create($year, 1,  15) ->format('Y-m-d') => 'Fête du Travail (reportée)',
            Carbon::create($year, 4,  13) ->format('Y-m-d') => 'Lundi de Pâques',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            $easter->copy()->addDays(39)  ->format('Y-m-d') => 'Ascension',
            $easter->copy()->addDays(49)  ->format('Y-m-d') => 'Lundi de Pentecôte',
            Carbon::create($year, 8,  7)  ->format('Y-m-d') => 'Fête Nationale (Indépendance)',
            Carbon::create($year, 8,  15) ->format('Y-m-d') => 'Assomption',
            Carbon::create($year, 11, 1)  ->format('Y-m-d') => 'Toussaint',
            Carbon::create($year, 11, 15) ->format('Y-m-d') => 'Journée Nationale de la Paix',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        // Fêtes islamiques (variables)
        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Korité (Aïd el-Fitr)';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Tabaski (Aïd el-Adha)';
        }
        if (isset($islamic['mawlid'])) {
            $holidays[$islamic['mawlid']] = 'Maouloud (Naissance du Prophète)';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysSN(int $year): array
    {
        $easter  = $this->computeEaster($year);
        $islamic = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            Carbon::create($year, 4,  4)  ->format('Y-m-d') => 'Fête de l\'Indépendance',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            $easter->copy()->addDays(39)  ->format('Y-m-d') => 'Ascension',
            $easter->copy()->addDays(49)  ->format('Y-m-d') => 'Lundi de Pentecôte',
            Carbon::create($year, 8,  15) ->format('Y-m-d') => 'Assomption',
            Carbon::create($year, 11, 1)  ->format('Y-m-d') => 'Toussaint',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        // Fêtes islamiques (très importantes au Sénégal)
        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Korité (Aïd el-Fitr)';
            $holidays[Carbon::parse($islamic['eid_al_fitr'])->addDay()->format('Y-m-d')] = 'Lendemain de Korité';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Tabaski (Aïd el-Adha)';
            $holidays[Carbon::parse($islamic['eid_al_adha'])->addDay()->format('Y-m-d')] = 'Lendemain de Tabaski';
        }
        if (isset($islamic['mawlid'])) {
            $holidays[$islamic['mawlid']] = 'Gamou (Maouloud)';
        }
        if (isset($islamic['tamkharit'])) {
            $holidays[$islamic['tamkharit']] = 'Tamkharit (Achoura)';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysCM(int $year): array
    {
        $easter  = $this->computeEaster($year);
        $islamic = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            Carbon::create($year, 2,  11) ->format('Y-m-d') => 'Fête de la Jeunesse',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            Carbon::create($year, 5,  20) ->format('Y-m-d') => 'Fête Nationale (Indépendance)',
            $easter->copy()->addDays(39)  ->format('Y-m-d') => 'Ascension',
            $easter->copy()->addDays(49)  ->format('Y-m-d') => 'Lundi de Pentecôte',
            Carbon::create($year, 8,  15) ->format('Y-m-d') => 'Assomption',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Aïd el-Fitr';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Aïd el-Adha';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysBJ(int $year): array
    {
        $easter   = $this->computeEaster($year);
        $islamic  = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            Carbon::create($year, 1,  10) ->format('Y-m-d') => 'Fête Vodoun (Fête Nationale des Religions Endogènes)',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            $easter->copy()->addDays(39)  ->format('Y-m-d') => 'Ascension',
            $easter->copy()->addDays(49)  ->format('Y-m-d') => 'Lundi de Pentecôte',
            Carbon::create($year, 8,  1)  ->format('Y-m-d') => 'Fête Nationale (Indépendance)',
            Carbon::create($year, 8,  15) ->format('Y-m-d') => 'Assomption',
            Carbon::create($year, 11, 1)  ->format('Y-m-d') => 'Toussaint',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Aïd el-Fitr';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Aïd el-Adha';
        }
        if (isset($islamic['mawlid'])) {
            $holidays[$islamic['mawlid']] = 'Maouloud';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysBF(int $year): array
    {
        $easter  = $this->computeEaster($year);
        $islamic = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            Carbon::create($year, 1,  3)  ->format('Y-m-d') => 'Soulèvement du 3 janvier',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            $easter->copy()->addDays(39)  ->format('Y-m-d') => 'Ascension',
            $easter->copy()->addDays(49)  ->format('Y-m-d') => 'Lundi de Pentecôte',
            Carbon::create($year, 8,  5)  ->format('Y-m-d') => 'Fête Nationale',
            Carbon::create($year, 8,  15) ->format('Y-m-d') => 'Assomption',
            Carbon::create($year, 11, 1)  ->format('Y-m-d') => 'Toussaint',
            Carbon::create($year, 12, 11) ->format('Y-m-d') => 'Proclamation de la République',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Aïd el-Fitr';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Aïd el-Adha';
        }
        if (isset($islamic['mawlid'])) {
            $holidays[$islamic['mawlid']] = 'Maouloud';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysML(int $year): array
    {
        $easter  = $this->computeEaster($year);
        $islamic = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            Carbon::create($year, 1,  20) ->format('Y-m-d') => 'Martyr',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            Carbon::create($year, 5,  25) ->format('Y-m-d') => 'Journée de l\'Afrique',
            Carbon::create($year, 9,  22) ->format('Y-m-d') => 'Fête Nationale (Indépendance)',
            Carbon::create($year, 11, 19) ->format('Y-m-d') => 'Journée Nationale de la Libération',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Aïd el-Fitr';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Aïd el-Adha';
        }
        if (isset($islamic['mawlid'])) {
            $holidays[$islamic['mawlid']] = 'Maouloud';
        }
        if (isset($islamic['tamkharit'])) {
            $holidays[$islamic['tamkharit']] = 'Tamkharit';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysTG(int $year): array
    {
        $easter  = $this->computeEaster($year);
        $islamic = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            Carbon::create($year, 1,  13) ->format('Y-m-d') => 'Fête Nationale de la Libération',
            Carbon::create($year, 4,  27) ->format('Y-m-d') => 'Fête Nationale (Indépendance)',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            $easter->copy()->addDays(39)  ->format('Y-m-d') => 'Ascension',
            $easter->copy()->addDays(49)  ->format('Y-m-d') => 'Lundi de Pentecôte',
            Carbon::create($year, 6,  21) ->format('Y-m-d') => 'Fête des Martyrs',
            Carbon::create($year, 8,  15) ->format('Y-m-d') => 'Assomption',
            Carbon::create($year, 11, 1)  ->format('Y-m-d') => 'Toussaint',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Aïd el-Fitr';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Aïd el-Adha';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysGA(int $year): array
    {
        $easter  = $this->computeEaster($year);
        $islamic = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            Carbon::create($year, 8,  15) ->format('Y-m-d') => 'Assomption / Fête Nationale',
            Carbon::create($year, 11, 1)  ->format('Y-m-d') => 'Toussaint',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Aïd el-Fitr';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Aïd el-Adha';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysCG(int $year): array
    {
        $easter  = $this->computeEaster($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            $easter->copy()->addDays(39)  ->format('Y-m-d') => 'Ascension',
            $easter->copy()->addDays(49)  ->format('Y-m-d') => 'Lundi de Pentecôte',
            Carbon::create($year, 6,  10) ->format('Y-m-d') => 'Journée de la Réconciliation',
            Carbon::create($year, 8,  15) ->format('Y-m-d') => 'Fête Nationale (Indépendance)',
            Carbon::create($year, 11, 1)  ->format('Y-m-d') => 'Toussaint',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysNE(int $year): array
    {
        $easter  = $this->computeEaster($year);
        $islamic = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            Carbon::create($year, 4,  24) ->format('Y-m-d') => 'Concorde Nationale',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            Carbon::create($year, 8,  3)  ->format('Y-m-d') => 'Fête Nationale (Indépendance)',
            Carbon::create($year, 12, 18) ->format('Y-m-d') => 'Proclamation de la République',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Aïd el-Fitr';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Aïd el-Adha';
        }
        if (isset($islamic['mawlid'])) {
            $holidays[$islamic['mawlid']] = 'Maouloud';
        }
        if (isset($islamic['tamkharit'])) {
            $holidays[$islamic['tamkharit']] = 'Tamkharit';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysTD(int $year): array
    {
        $easter  = $this->computeEaster($year);
        $islamic = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            Carbon::create($year, 4,  13) ->format('Y-m-d') => 'Liberté et Démocratie',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            Carbon::create($year, 5,  25) ->format('Y-m-d') => 'Journée de l\'Afrique',
            Carbon::create($year, 8,  11) ->format('Y-m-d') => 'Fête Nationale (Indépendance)',
            Carbon::create($year, 11, 1)  ->format('Y-m-d') => 'Toussaint',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Aïd el-Fitr';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Aïd el-Adha';
        }
        if (isset($islamic['mawlid'])) {
            $holidays[$islamic['mawlid']] = 'Maouloud';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysCD(int $year): array
    {
        $easter  = $this->computeEaster($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            Carbon::create($year, 1,  4)  ->format('Y-m-d') => 'Journée des Martyrs',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            Carbon::create($year, 5,  17) ->format('Y-m-d') => 'Fête Nationale (Libération)',
            $easter->copy()->addDays(39)  ->format('Y-m-d') => 'Ascension',
            Carbon::create($year, 6,  24) ->format('Y-m-d') => 'Journée des Pères',
            Carbon::create($year, 6,  30) ->format('Y-m-d') => 'Fête de l\'Indépendance',
            Carbon::create($year, 8,  1)  ->format('Y-m-d') => 'Journée des Parents',
            Carbon::create($year, 8,  15) ->format('Y-m-d') => 'Assomption',
            Carbon::create($year, 11, 17) ->format('Y-m-d') => 'Journée Nationale des Forces Armées',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        ksort($holidays);
        return $holidays;
    }

    private function getHolidaysGN(int $year): array
    {
        $easter  = $this->computeEaster($year);
        $islamic = $this->computeIslamicHolidays($year);

        $holidays = [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            Carbon::create($year, 10, 2)  ->format('Y-m-d') => 'Fête Nationale (Indépendance)',
            Carbon::create($year, 11, 1)  ->format('Y-m-d') => 'Toussaint',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];

        if (isset($islamic['eid_al_fitr'])) {
            $holidays[$islamic['eid_al_fitr']] = 'Aïd el-Fitr';
        }
        if (isset($islamic['eid_al_adha'])) {
            $holidays[$islamic['eid_al_adha']] = 'Aïd el-Adha';
        }
        if (isset($islamic['mawlid'])) {
            $holidays[$islamic['mawlid']] = 'Maouloud';
        }

        ksort($holidays);
        return $holidays;
    }

    private function getCommonHolidays(int $year): array
    {
        $easter = $this->computeEaster($year);

        return [
            Carbon::create($year, 1,  1)  ->format('Y-m-d') => 'Jour de l\'An',
            $easter->copy()->addDays(1)   ->format('Y-m-d') => 'Lundi de Pâques',
            Carbon::create($year, 5,  1)  ->format('Y-m-d') => 'Fête du Travail',
            $easter->copy()->addDays(39)  ->format('Y-m-d') => 'Ascension',
            $easter->copy()->addDays(49)  ->format('Y-m-d') => 'Lundi de Pentecôte',
            Carbon::create($year, 8,  15) ->format('Y-m-d') => 'Assomption',
            Carbon::create($year, 11, 1)  ->format('Y-m-d') => 'Toussaint',
            Carbon::create($year, 12, 25) ->format('Y-m-d') => 'Noël',
        ];
    }

    // =========================================================================
    // Calculs calendaires
    // =========================================================================

    /**
     * Calcule la date de Pâques (algorithme de Spencer Jones).
     */
    private function computeEaster(int $year): Carbon
    {
        $a = $year % 19;
        $b = intdiv($year, 100);
        $c = $year % 100;
        $d = intdiv($b, 4);
        $e = $b % 4;
        $f = intdiv($b + 8, 25);
        $g = intdiv($b - $f + 1, 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = intdiv($c, 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = intdiv($a + 11 * $h + 22 * $l, 451);
        $month = intdiv($h + $l - 7 * $m + 114, 31);
        $day   = (($h + $l - 7 * $m + 114) % 31) + 1;

        return Carbon::create($year, $month, $day);
    }

    /**
     * Approximation des fêtes islamiques (conversion hijri → grégorien).
     * Note : les dates exactes dépendent de l'observation de la lune
     * et peuvent varier d'un jour selon les pays.
     */
    private function computeIslamicHolidays(int $year): array
    {
        // Estimation basée sur le cycle solaire (approximation de ~11 jours/an)
        // Référence : Aïd el-Fitr 2024 = 10 avril, Tabaski 2024 = 17 juin
        $fitrRef  = Carbon::create(2024, 4, 10);
        $adhaRef  = Carbon::create(2024, 6, 17);
        $mawlidRef= Carbon::create(2024, 9, 16);
        $tamkharitRef = Carbon::create(2024, 7, 16);

        $yearDiff = $year - 2024;
        $daysAdj  = (int) round($yearDiff * -10.875); // le calendrier islamique recule

        return [
            'eid_al_fitr'  => $fitrRef->copy()->addDays($daysAdj)->format('Y-m-d'),
            'eid_al_adha'  => $adhaRef->copy()->addDays($daysAdj)->format('Y-m-d'),
            'mawlid'       => $mawlidRef->copy()->addDays($daysAdj)->format('Y-m-d'),
            'tamkharit'    => $tamkharitRef->copy()->addDays($daysAdj)->format('Y-m-d'),
        ];
    }
}
