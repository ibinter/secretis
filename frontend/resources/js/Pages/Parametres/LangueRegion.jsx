/**
 * SECRETIS ERP — Page Paramètres : Langue & Région
 * Sélecteurs de langue, format de date/heure, calendrier, devise, fuseau horaire
 *
 * Features :
 *  - Aperçu en temps réel dans la langue sélectionnée
 *  - Support RTL (arabe)
 *  - Drapeaux et noms natifs des langues
 *  - Sélecteur de calendrier (Grégorien / Hijri)
 */

import { useState, useEffect, useMemo }  from 'react';
import { router, usePage }               from '@inertiajs/react';
import { useTranslation }                from '../../hooks/useTranslation';
import { useDirection }                  from '../../hooks/useDirection';

// ─── Données statiques ────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = [
  { code: 'fr',    flag: '🇫🇷', nativeName: 'Français',         englishName: 'French',     dir: 'ltr' },
  { code: 'en',    flag: '🇬🇧', nativeName: 'English',          englishName: 'English',    dir: 'ltr' },
  { code: 'ar',    flag: '🇸🇦', nativeName: 'العربية',           englishName: 'Arabic',     dir: 'rtl' },
  { code: 'ar-MA', flag: '🇲🇦', nativeName: 'العربية (المغرب)',   englishName: 'Arabic (Morocco)', dir: 'rtl' },
  { code: 'ar-TN', flag: '🇹🇳', nativeName: 'العربية (تونس)',    englishName: 'Arabic (Tunisia)', dir: 'rtl' },
  { code: 'pt-BR', flag: '🇧🇷', nativeName: 'Português (Brasil)', englishName: 'Portuguese (Brazil)', dir: 'ltr' },
  { code: 'pt-ST', flag: '🇸🇹', nativeName: 'Português (São Tomé)', englishName: 'Portuguese (São Tomé)', dir: 'ltr' },
  { code: 'sw',    flag: '🇹🇿', nativeName: 'Kiswahili',         englishName: 'Swahili',    dir: 'ltr' },
  { code: 'ha',    flag: '🇳🇪', nativeName: 'Hausa',             englishName: 'Hausa',      dir: 'ltr' },
  { code: 'fr-CI', flag: '🇨🇮', nativeName: 'Français (Côte d\'Ivoire)', englishName: 'French (Ivory Coast)', dir: 'ltr' },
  { code: 'fr-SN', flag: '🇸🇳', nativeName: 'Français (Sénégal)', englishName: 'French (Senegal)', dir: 'ltr' },
  { code: 'fr-CM', flag: '🇨🇲', nativeName: 'Français (Cameroun)', englishName: 'French (Cameroon)', dir: 'ltr' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY',   label: 'DD/MM/YYYY',   example: '22/07/2026' },
  { value: 'MM/DD/YYYY',   label: 'MM/DD/YYYY',   example: '07/22/2026' },
  { value: 'YYYY-MM-DD',   label: 'YYYY-MM-DD',   example: '2026-07-22' },
  { value: 'D MMMM YYYY',  label: 'D MMMM YYYY',  example: '22 juillet 2026' },
  { value: 'MMMM D, YYYY', label: 'MMMM D, YYYY', example: 'July 22, 2026' },
];

const TIME_FORMATS = [
  { value: '24h', label: '24h (14:30)',   example: '14:30' },
  { value: '12h', label: '12h (2:30 PM)', example: '2:30 PM' },
];

const CALENDARS = [
  { value: 'gregorian', label: 'Grégorien / Gregorian / ميلادي',  icon: '📅' },
  { value: 'hijri',     label: 'Hijri / Hégire / هجري',           icon: '🌙' },
];

const CURRENCIES = [
  { code: 'XOF', symbol: 'FCFA',  name: 'Franc CFA UEMOA',      flag: '🌍' },
  { code: 'XAF', symbol: 'FCFA',  name: 'Franc CFA CEMAC',      flag: '🌍' },
  { code: 'MAD', symbol: 'MAD',   name: 'Dirham marocain',       flag: '🇲🇦' },
  { code: 'TND', symbol: 'TND',   name: 'Dinar tunisien',        flag: '🇹🇳' },
  { code: 'EUR', symbol: '€',     name: 'Euro',                  flag: '🇪🇺' },
  { code: 'USD', symbol: '$',     name: 'Dollar américain',      flag: '🇺🇸' },
  { code: 'BRL', symbol: 'R$',    name: 'Real brésilien',        flag: '🇧🇷' },
  { code: 'STN', symbol: 'Db',    name: 'Dobra (São Tomé)',      flag: '🇸🇹' },
  { code: 'MZN', symbol: 'MT',    name: 'Metical mozambicain',   flag: '🇲🇿' },
  { code: 'NGN', symbol: '₦',     name: 'Naira nigérian',        flag: '🇳🇬' },
  { code: 'GHS', symbol: 'GH₵',  name: 'Cedi ghanéen',          flag: '🇬🇭' },
  { code: 'KES', symbol: 'Ksh',   name: 'Shilling kenyan',       flag: '🇰🇪' },
  { code: 'TZS', symbol: 'TSh',   name: 'Shilling tanzanien',    flag: '🇹🇿' },
];

const NUMBER_FORMATS = [
  { value: 'fr',   label: '1 000 000,00 (espace + virgule)',  example: '1 234 567,89' },
  { value: 'en',   label: '1,000,000.00 (comma + dot)',       example: '1,234,567.89' },
  { value: 'ar',   label: '١٬٢٣٤٬٥٦٧٫٨٩ (chiffres arabes)',  example: '١٬٢٣٤٬٥٦٧٫٨٩' },
];

// Fuseaux horaires africains et principaux
const TIMEZONES_AFRICA = [
  { value: 'Africa/Abidjan',        label: 'Abidjan (GMT+0)',               country: '🇨🇮' },
  { value: 'Africa/Accra',          label: 'Accra (GMT+0)',                 country: '🇬🇭' },
  { value: 'Africa/Dakar',          label: 'Dakar (GMT+0)',                 country: '🇸🇳' },
  { value: 'Africa/Bamako',         label: 'Bamako (GMT+0)',                country: '🇲🇱' },
  { value: 'Africa/Conakry',        label: 'Conakry (GMT+0)',               country: '🇬🇳' },
  { value: 'Africa/Lagos',          label: 'Lagos (GMT+1)',                 country: '🇳🇬' },
  { value: 'Africa/Niamey',         label: 'Niamey (GMT+1)',                country: '🇳🇪' },
  { value: 'Africa/Douala',         label: 'Douala (GMT+1)',                country: '🇨🇲' },
  { value: 'Africa/Brazzaville',    label: 'Brazzaville (GMT+1)',           country: '🇨🇬' },
  { value: 'Africa/Kinshasa',       label: 'Kinshasa (GMT+1)',              country: '🇨🇩' },
  { value: 'Africa/Tunis',          label: 'Tunis (GMT+1)',                 country: '🇹🇳' },
  { value: 'Africa/Algiers',        label: 'Alger (GMT+1)',                 country: '🇩🇿' },
  { value: 'Africa/Casablanca',     label: 'Casablanca (GMT+0/+1)',         country: '🇲🇦' },
  { value: 'Africa/Cairo',          label: 'Le Caire (GMT+2)',              country: '🇪🇬' },
  { value: 'Africa/Johannesburg',   label: 'Johannesburg (GMT+2)',          country: '🇿🇦' },
  { value: 'Africa/Nairobi',        label: 'Nairobi (GMT+3)',               country: '🇰🇪' },
  { value: 'Africa/Dar_es_Salaam',  label: 'Dar es Salaam (GMT+3)',         country: '🇹🇿' },
  { value: 'Africa/Maputo',         label: 'Maputo (GMT+2)',                country: '🇲🇿' },
  { value: 'Africa/Sao_Tome',       label: 'São Tomé (GMT+1)',              country: '🇸🇹' },
  { value: 'Atlantic/Cape_Verde',   label: 'Praia (GMT-1)',                 country: '🇨🇻' },
  // Fuseaux hors Afrique pour les multinationales
  { value: 'Europe/Paris',          label: 'Paris (GMT+1/+2)',              country: '🇫🇷' },
  { value: 'Europe/London',         label: 'Londres (GMT+0/+1)',            country: '🇬🇧' },
  { value: 'America/Sao_Paulo',     label: 'São Paulo (GMT-3)',             country: '🇧🇷' },
  { value: 'Asia/Riyadh',           label: 'Riyad (GMT+3)',                 country: '🇸🇦' },
  { value: 'UTC',                   label: 'UTC (GMT+0)',                   country: '🌍' },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export default function LangueRegion() {
  const { t, locale: currentLocale, setLocale } = useTranslation();
  const { isRTL } = useDirection(currentLocale);
  const { auth }  = usePage().props;

  // État du formulaire
  const [form, setForm] = useState({
    language:      currentLocale || 'fr',
    date_format:   'DD/MM/YYYY',
    time_format:   '24h',
    calendar:      'gregorian',
    currency:      'XOF',
    timezone:      'Africa/Abidjan',
    number_format: 'fr',
  });

  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [preview,  setPreview]  = useState({});

  // Mettre à jour l'aperçu en temps réel
  useEffect(() => {
    const now     = new Date();
    const lang    = SUPPORTED_LANGUAGES.find(l => l.code === form.language);
    const tz      = form.timezone;
    const options = { timeZone: tz };

    try {
      setPreview({
        date: now.toLocaleDateString(
          form.language.replace('-', '_'),
          { ...options, day: '2-digit', month: '2-digit', year: 'numeric' }
        ),
        time: now.toLocaleTimeString(
          form.language.replace('-', '_'),
          { ...options, hour: '2-digit', minute: '2-digit', hour12: form.time_format === '12h' }
        ),
        datetime: now.toLocaleString(
          form.language.replace('-', '_'),
          { ...options, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
        ),
        currency_example: new Intl.NumberFormat(
          form.language.replace('-', '_'),
          { style: 'currency', currency: form.currency, minimumFractionDigits: 2 }
        ).format(1500.00),
        language_name: lang?.nativeName || form.language,
        direction:     lang?.dir || 'ltr',
      });
    } catch (e) {
      setPreview({ date: '22/07/2026', time: '14:30', datetime: '22/07/2026 14:30' });
    }
  }, [form]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaved(false);

    // Changer immédiatement la langue de l'interface
    if (field === 'language') {
      setLocale(value);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    router.put('/parametres/langue-region', form, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
      onFinish: () => setSaving(false),
    });
  };

  // Langue actuellement sélectionnée
  const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === form.language);
  const formDir      = selectedLang?.dir || 'ltr';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* En-tête */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary mb-1">
          {t('parametres.langue_region') || 'Langue & Région'}
        </h1>
        <p className="text-text-secondary">
          Configurez la langue, les formats et le fuseau horaire de votre interface.
        </p>
      </div>

      <div className="space-y-6">

        {/* ── SECTION : Langue ── */}
        <section className="card">
          <h2 className="text-lg font-semibold text-primary mb-4">
            🌐 {t('langue_region.language') || 'Langue de l\'interface'}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {SUPPORTED_LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleChange('language', lang.code)}
                className={[
                  'flex items-center gap-2 p-3 rounded-md border-2 text-left transition-all',
                  form.language === lang.code
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-border hover:border-primary-300 hover:bg-gray-50',
                ].join(' ')}
                dir={lang.dir}
              >
                <span className="text-xl" role="img" aria-label={lang.englishName}>
                  {lang.flag}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{lang.nativeName}</div>
                  <div className="text-xs text-text-secondary truncate">{lang.code}</div>
                </div>
                {lang.dir === 'rtl' && (
                  <span className="ms-auto text-xs bg-accent-100 text-accent-700 px-1.5 rounded font-mono">
                    RTL
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── SECTION : Formats ── */}
        <section className="card">
          <h2 className="text-lg font-semibold text-primary mb-4">
            📅 Formats d'affichage
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Format de date */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t('langue_region.date_format') || 'Format de date'}
              </label>
              <select
                value={form.date_format}
                onChange={e => handleChange('date_format', e.target.value)}
                className="form-select w-full"
              >
                {DATE_FORMATS.map(f => (
                  <option key={f.value} value={f.value}>
                    {f.label} — ex. {f.example}
                  </option>
                ))}
              </select>
            </div>

            {/* Format d'heure */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t('langue_region.time_format') || 'Format d\'heure'}
              </label>
              <div className="flex gap-3">
                {TIME_FORMATS.map(tf => (
                  <button
                    key={tf.value}
                    onClick={() => handleChange('time_format', tf.value)}
                    className={[
                      'flex-1 py-2 px-4 rounded-md border-2 text-sm font-medium transition-all',
                      form.time_format === tf.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-border hover:border-primary-300',
                    ].join(' ')}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendrier */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t('langue_region.calendar') || 'Type de calendrier'}
              </label>
              <div className="flex gap-3">
                {CALENDARS.map(cal => (
                  <button
                    key={cal.value}
                    onClick={() => handleChange('calendar', cal.value)}
                    className={[
                      'flex-1 py-2 px-4 rounded-md border-2 text-sm font-medium transition-all',
                      form.calendar === cal.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-border hover:border-primary-300',
                    ].join(' ')}
                  >
                    {cal.icon} {cal.value === 'gregorian' ? 'Grégorien' : 'Hijri هجري'}
                  </button>
                ))}
              </div>
              {form.calendar === 'hijri' && (
                <p className="mt-2 text-xs text-accent-700 bg-accent-50 p-2 rounded">
                  🌙 Le calendrier Hijri est utilisé pour l'affichage des dates. Certains modules peuvent afficher les deux formats.
                </p>
              )}
            </div>

            {/* Format des nombres */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t('langue_region.number_format') || 'Format des nombres'}
              </label>
              <select
                value={form.number_format}
                onChange={e => handleChange('number_format', e.target.value)}
                className="form-select w-full"
              >
                {NUMBER_FORMATS.map(nf => (
                  <option key={nf.value} value={nf.value}>
                    {nf.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── SECTION : Devise ── */}
        <section className="card">
          <h2 className="text-lg font-semibold text-primary mb-4">
            💰 {t('langue_region.currency') || 'Devise principale'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {CURRENCIES.map(cur => (
              <button
                key={cur.code}
                onClick={() => handleChange('currency', cur.code)}
                className={[
                  'flex items-center gap-2 p-3 rounded-md border-2 text-left transition-all text-sm',
                  form.currency === cur.code
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-border hover:border-primary-300 hover:bg-gray-50',
                ].join(' ')}
              >
                <span>{cur.flag}</span>
                <div>
                  <div className="font-semibold">{cur.code}</div>
                  <div className="text-xs text-text-secondary">{cur.symbol}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── SECTION : Fuseau horaire ── */}
        <section className="card">
          <h2 className="text-lg font-semibold text-primary mb-4">
            🕐 {t('langue_region.timezone') || 'Fuseau horaire'}
          </h2>
          <select
            value={form.timezone}
            onChange={e => handleChange('timezone', e.target.value)}
            className="form-select w-full"
          >
            <optgroup label="🌍 Afrique">
              {TIMEZONES_AFRICA.filter(tz => tz.value.startsWith('Africa') || tz.value.startsWith('Atlantic')).map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.country} {tz.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="🌐 Autres">
              {TIMEZONES_AFRICA.filter(tz => !tz.value.startsWith('Africa') && !tz.value.startsWith('Atlantic')).map(tz => (
                <option key={tz.value} value={tz.value}>
                  {tz.country} {tz.label}
                </option>
              ))}
            </optgroup>
          </select>
        </section>

        {/* ── SECTION : Aperçu en temps réel ── */}
        <section className="card bg-gray-50 border-2 border-dashed border-border">
          <h2 className="text-lg font-semibold text-primary mb-4">
            👁️ {t('langue_region.preview') || 'Aperçu en temps réel'}
          </h2>

          <div
            className={['p-4 bg-white rounded-md border space-y-3', formDir === 'rtl' ? 'font-arabic text-right' : ''].join(' ')}
            dir={formDir}
          >
            {/* Ligne langue */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-text-secondary text-sm">
                {formDir === 'rtl' ? 'اللغة المحددة' : 'Langue sélectionnée'}
              </span>
              <span className="font-semibold">
                {selectedLang?.flag} {preview.language_name}
                {formDir === 'rtl' && <span className="ms-2 text-xs bg-accent-100 text-accent-700 px-2 py-0.5 rounded">RTL</span>}
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-text-secondary text-sm">
                {formDir === 'rtl' ? t('langue_region.date_preview') || 'مثال التاريخ' : 'Exemple date'}
              </span>
              <span className="font-mono font-semibold text-primary">
                {preview.date || '22/07/2026'}
              </span>
            </div>

            {/* Heure */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-text-secondary text-sm">
                {formDir === 'rtl' ? 'مثال الوقت' : 'Exemple heure'}
              </span>
              <span className="font-mono font-semibold text-primary">
                {preview.time || '14:30'}
              </span>
            </div>

            {/* Date + heure */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-text-secondary text-sm">
                {formDir === 'rtl' ? 'التاريخ والوقت' : 'Date + heure'}
              </span>
              <span className="font-mono font-semibold text-primary">
                {preview.datetime || '22/07/2026 14:30'}
              </span>
            </div>

            {/* Devise */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-text-secondary text-sm">
                {formDir === 'rtl' ? 'مثال العملة' : 'Exemple devise'}
              </span>
              <span className="font-semibold text-success-700">
                {preview.currency_example || '1 500,00 FCFA'}
              </span>
            </div>

            {/* Calendrier */}
            {form.calendar === 'hijri' && (
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t">
                <span className="text-text-secondary text-sm">
                  {formDir === 'rtl' ? 'التاريخ الهجري' : 'Date hijri (estimée)'}
                </span>
                <span className="font-semibold text-accent-700 font-arabic" dir="rtl">
                  🌙 ٢٢ محرم ١٤٤٨ هـ
                </span>
              </div>
            )}

            {/* Phrase exemple */}
            <div className="pt-2 border-t text-sm text-text-secondary">
              <span className="font-medium">Voici comment apparaîtra votre date : </span>
              <span className="font-semibold text-primary">{preview.date}</span>
              {' '}
              <span className="text-xs">({form.timezone})</span>
            </div>
          </div>
        </section>

        {/* ── Bouton de sauvegarde ── */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            * Les modifications de langue sont appliquées immédiatement.
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-md"
          >
            {saving ? (
              <><span className="animate-spin mr-2">⟳</span> {t('buttons.saving')}</>
            ) : saved ? (
              <><span className="mr-2">✓</span> {t('feedback.saved')}</>
            ) : (
              t('langue_region.save_preferences') || t('buttons.save')
            )}
          </button>
        </div>

        {saved && (
          <div className="p-3 bg-success-50 border border-success-200 rounded-md text-success-700 text-sm">
            ✓ {t('langue_region.language_changed') || 'Préférences de langue et région enregistrées.'}
          </div>
        )}
      </div>
    </div>
  );
}
export { LangueRegion };
