<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use IntlDateFormatter;
use NumberFormatter;

/**
 * SECRETIS ERP — LocalizationService
 *
 * Service centralisé pour :
 *   - Détecter la locale d'un utilisateur
 *   - Formater les dates selon la locale (Grégorien / Hijri)
 *   - Formater les montants et devises
 *   - Retourner la direction textuelle (RTL / LTR)
 *   - Conversion calendrier Grégorien → Hijri
 */
class LocalizationService
{
    // ─── Constantes ──────────────────────────────────────────────────────────────

    /** Locales avec direction RTL */
    protected const RTL_LOCALES = ['ar', 'ar-MA', 'ar-TN', 'fa', 'he', 'ur'];

    /** Locales utilisant le calendrier Hijri par défaut */
    protected const HIJRI_PREFERRED_LOCALES = ['ar-SA'];

    /** Devises par défaut par locale */
    protected const DEFAULT_CURRENCIES = [
        'fr'    => 'XOF',   // FCFA — UEMOA
        'fr-CI' => 'XOF',   // Côte d'Ivoire
        'fr-SN' => 'XOF',   // Sénégal
        'fr-CM' => 'XAF',   // FCFA — CEMAC
        'en'    => 'USD',
        'ar'    => 'USD',
        'ar-MA' => 'MAD',   // Dirham marocain
        'ar-TN' => 'TND',   // Dinar tunisien
        'pt-BR' => 'BRL',   // Real brésilien
        'pt-ST' => 'STN',   // Dobra São-tomense
        'pt-MZ' => 'MZN',   // Metical mozambicain
        'sw'    => 'TZS',   // Shilling tanzanien
        'ha'    => 'NGN',   // Naira nigérian
    ];

    /** Formats de date par locale */
    protected const DATE_FORMATS = [
        'fr'    => 'd/m/Y',
        'fr-CI' => 'd/m/Y',
        'fr-SN' => 'd/m/Y',
        'fr-CM' => 'd/m/Y',
        'en'    => 'm/d/Y',
        'ar'    => 'd/m/Y',
        'ar-MA' => 'd/m/Y',
        'ar-TN' => 'd/m/Y',
        'pt-BR' => 'd/m/Y',
        'pt-ST' => 'd/m/Y',
        'pt-MZ' => 'd/m/Y',
        'sw'    => 'd/m/Y',
        'ha'    => 'd/m/Y',
    ];

    // ─── Méthodes publiques ───────────────────────────────────────────────────────

    /**
     * Retourne la locale préférée d'un utilisateur.
     *
     * Cherche dans l'ordre :
     *   1. $user->locale (colonne directe)
     *   2. $user->preferences['locale']
     *   3. null (le middleware fera un fallback)
     *
     * @param  User   $user
     * @return string|null  Code ISO locale (ex: 'ar-MA', 'fr', 'pt-BR')
     */
    public function getUserLocale(User $user): ?string
    {
        // Colonne directe
        if (!empty($user->locale)) {
            return $user->locale;
        }

        // Dans preferences JSON
        if (!empty($user->preferences) && is_array($user->preferences)) {
            return $user->preferences['locale'] ?? null;
        }

        return null;
    }

    /**
     * Retourne la direction textuelle pour une locale.
     *
     * @param  string $locale
     * @return 'rtl'|'ltr'
     */
    public function getTextDirection(string $locale): string
    {
        $prefix = explode('-', $locale)[0];

        if (in_array($locale, self::RTL_LOCALES, true) || in_array($prefix, ['ar', 'fa', 'he', 'ur'], true)) {
            return 'rtl';
        }

        return 'ltr';
    }

    /**
     * Formate une date selon la locale.
     *
     * Pour les locales arabes : option de format Hijri disponible.
     * Pour les autres : format Grégorien standard.
     *
     * @param  Carbon $date
     * @param  string $locale          Code ISO locale
     * @param  bool   $includeTime     Inclure l'heure
     * @param  bool   $forceHijri      Forcer le calendrier Hijri
     * @return string                  Date formatée
     */
    public function formatDateForLocale(
        Carbon $date,
        string $locale,
        bool   $includeTime  = false,
        bool   $forceHijri   = false
    ): string {
        // Calendrier Hijri
        if ($forceHijri || in_array($locale, self::HIJRI_PREFERRED_LOCALES, true)) {
            $hijri = $this->getHijriDate($date);
            if ($includeTime) {
                $hijri .= ' ' . $date->format('H:i');
            }
            return $hijri;
        }

        // Format selon locale
        $format = self::DATE_FORMATS[$locale] ?? 'd/m/Y';

        if ($includeTime) {
            $format .= ' H:i';
        }

        // Utiliser IntlDateFormatter si disponible pour les noms localisés
        if (class_exists(IntlDateFormatter::class)) {
            try {
                $intlLocale = str_replace('-', '_', $locale);
                $dateType   = IntlDateFormatter::MEDIUM;
                $timeType   = $includeTime ? IntlDateFormatter::SHORT : IntlDateFormatter::NONE;

                $formatter = new IntlDateFormatter(
                    $intlLocale,
                    $dateType,
                    $timeType,
                    $date->getTimezone()
                );

                $result = $formatter->format($date->toDateTime());
                if ($result !== false) {
                    return $result;
                }
            } catch (\Throwable $e) {
                // Fallback sur format simple
            }
        }

        return $date->format($format);
    }

    /**
     * Formate un montant selon la locale et la devise.
     *
     * Exemples :
     *   ar-MA  → "١٥٠٠٫٠٠ درهم" (chiffres arabes) ou "1 500,00 MAD"
     *   fr     → "1 500,00 FCFA"
     *   en     → "$1,500.00"
     *   pt-BR  → "R$ 1.500,00"
     *
     * @param  float  $amount
     * @param  string $currency  Code ISO devise (MAD, EUR, USD…)
     * @param  string $locale
     * @param  bool   $arabicNumerals  Utiliser les chiffres arabes (١٢٣)
     * @return string
     */
    public function formatCurrencyForLocale(
        float  $amount,
        string $currency = '',
        string $locale   = 'fr',
        bool   $arabicNumerals = false
    ): string {
        // Devise par défaut selon la locale
        if (empty($currency)) {
            $currency = self::DEFAULT_CURRENCIES[$locale] ?? 'XOF';
        }

        // Utiliser NumberFormatter si l'extension intl est disponible
        if (class_exists(NumberFormatter::class)) {
            try {
                $intlLocale = str_replace('-', '_', $locale);
                $formatter  = new NumberFormatter($intlLocale, NumberFormatter::CURRENCY);

                $result = $formatter->formatCurrency($amount, $currency);
                if ($result !== false) {
                    // Pour les locales arabes avec chiffres arabes
                    if ($arabicNumerals && $this->getTextDirection($locale) === 'rtl') {
                        $result = $this->toArabicNumerals($result);
                    }
                    return $result;
                }
            } catch (\Throwable $e) {
                // Fallback
            }
        }

        // Fallback manuel
        return $this->formatCurrencyFallback($amount, $currency, $locale);
    }

    /**
     * Convertit une date Carbon en date Hijri (calendrier islamique).
     *
     * Algorithme de conversion Grégorien → Hijri basé sur la méthode
     * de Khalid Shaukat (précision ±1 jour).
     *
     * @param  Carbon $date
     * @param  string $format  Format de sortie : 'long' | 'short' | 'numeric'
     * @return string          Ex: "١٥ رمضان ١٤٤٥" ou "15/09/1445"
     */
    public function getHijriDate(Carbon $date, string $format = 'numeric'): string
    {
        // Utiliser IntlCalendar si disponible (extension intl)
        if (class_exists('\IntlCalendar')) {
            try {
                $intlDate = \IntlCalendar::fromDateTime($date->toDateTime());
                $intlDate->setTimeZone(\IntlTimeZone::createDefault());

                // Basculer vers le calendrier islamique
                $islamicCal = \IntlCalendar::createInstance(null, 'ar@calendar=islamic-civil');
                $islamicCal->setTime($intlDate->getTime());

                $hYear  = $islamicCal->get(\IntlCalendar::FIELD_YEAR);
                $hMonth = $islamicCal->get(\IntlCalendar::FIELD_MONTH) + 1; // 0-indexed
                $hDay   = $islamicCal->get(\IntlCalendar::FIELD_DAY_OF_MONTH);

                return $this->formatHijriDate($hDay, $hMonth, $hYear, $format);
            } catch (\Throwable $e) {
                // Fallback sur algorithme manuel
            }
        }

        return $this->gregorianToHijriManual($date, $format);
    }

    // ─── Méthodes privées ─────────────────────────────────────────────────────────

    /**
     * Algorithme manuel de conversion Grégorien → Hijri.
     * Méthode de Fliegel & Van Flandern (1968), adaptée.
     */
    protected function gregorianToHijriManual(Carbon $date, string $format = 'numeric'): string
    {
        $year  = (int) $date->year;
        $month = (int) $date->month;
        $day   = (int) $date->day;

        // Numéro Julian Day
        $jd = (int) ((1461 * ($year + 4800 + (int)(($month - 14) / 12))) / 4)
            + (int)((367 * ($month - 2 - 12 * ((int)(($month - 14) / 12)))) / 12)
            - (int)((3 * ((int)(($year + 4900 + (int)(($month - 14) / 12)) / 100))) / 4)
            + $day - 32075;

        // Conversion JD → Hijri
        $l  = $jd - 1948440 + 10632;
        $n  = (int)(($l - 1) / 10631);
        $l  = $l - 10631 * $n + 354;
        $j  = (int)((10985 - $l) / 5316) * (int)((50 * $l) / 17719)
            + (int)($l / 5670) * (int)((43 * $l) / 15238);
        $l  = $l - (int)((30 - $j) / 15) * (int)((17719 * $j) / 50)
            - (int)($j / 16) * (int)((15238 * $j) / 43) + 29;
        $hMonth = (int)((24 * $l) / 709);
        $hDay   = $l - (int)((709 * $hMonth) / 24);
        $hYear  = 30 * $n + $j - 30;

        return $this->formatHijriDate($hDay, $hMonth, $hYear, $format);
    }

    /**
     * Formate une date Hijri selon le format demandé.
     */
    protected function formatHijriDate(int $day, int $month, int $year, string $format): string
    {
        $monthNames = [
            1 => 'محرم',     2 => 'صفر',       3 => 'ربيع الأول',
            4 => 'ربيع الثاني', 5 => 'جمادى الأولى', 6 => 'جمادى الآخرة',
            7 => 'رجب',      8 => 'شعبان',     9 => 'رمضان',
            10 => 'شوال',   11 => 'ذو القعدة', 12 => 'ذو الحجة',
        ];

        return match ($format) {
            'long'    => "{$day} {$monthNames[$month]} {$year} هـ",
            'short'   => "{$monthNames[$month]} {$year} هـ",
            default   => sprintf('%02d/%02d/%04d', $day, $month, $year),
        };
    }

    /**
     * Convertit les chiffres ASCII en chiffres arabes-indiens.
     * 0123456789 → ٠١٢٣٤٥٦٧٨٩
     */
    protected function toArabicNumerals(string $str): string
    {
        $western = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        $arabic  = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return str_replace($western, $arabic, $str);
    }

    /**
     * Formatage de devise en fallback (sans extension intl).
     */
    protected function formatCurrencyFallback(float $amount, string $currency, string $locale): string
    {
        // Séparateurs selon la locale
        $useCommaDecimal = in_array(explode('-', $locale)[0], ['fr', 'ar', 'pt'], true);

        if ($useCommaDecimal) {
            $formatted = number_format($amount, 2, ',', ' ');
        } else {
            $formatted = number_format($amount, 2, '.', ',');
        }

        // Position du symbole
        if ($this->getTextDirection($locale) === 'rtl') {
            return "{$formatted} {$currency}";
        }

        return "{$currency} {$formatted}";
    }
}
