import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/UI/card';
import { Button } from '@/Components/UI/button';
import { Label } from '@/Components/UI/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/UI/select';
import { Switch } from '@/Components/UI/switch';
import { Separator } from '@/Components/UI/separator';
import { Badge } from '@/Components/UI/badge';
import CurrencySelector from '@/Components/UI/CurrencySelector';
import { Globe, Clock, Calendar, DollarSign, FileText, Check, AlertCircle } from 'lucide-react';

/**
 * Paramètres de localisation par organisation — SECRETIS
 *
 * Configure :
 *  - Pays (parmi les 17 OHADA + autres)
 *  - Devise principale & de rapport
 *  - Format de date
 *  - Premier jour de la semaine
 *  - Langue par défaut
 *  - Fuseau horaire
 *  - TVA par défaut
 */

const OHADA_COUNTRIES = [
  { code: 'BJ', name: 'Bénin',                      flag: '🇧🇯', currency: 'XOF', tz: 'Africa/Porto-Novo',  vat: 18.0  },
  { code: 'BF', name: 'Burkina Faso',                flag: '🇧🇫', currency: 'XOF', tz: 'Africa/Ouagadougou', vat: 18.0  },
  { code: 'CM', name: 'Cameroun',                    flag: '🇨🇲', currency: 'XAF', tz: 'Africa/Douala',      vat: 19.25 },
  { code: 'CF', name: 'Rép. Centrafricaine',         flag: '🇨🇫', currency: 'XAF', tz: 'Africa/Bangui',      vat: 19.0  },
  { code: 'KM', name: 'Comores',                     flag: '🇰🇲', currency: 'KMF', tz: 'Indian/Comoro',      vat: 10.0  },
  { code: 'CG', name: 'Congo',                       flag: '🇨🇬', currency: 'XAF', tz: 'Africa/Brazzaville', vat: 18.0  },
  { code: 'CI', name: "Côte d'Ivoire",               flag: '🇨🇮', currency: 'XOF', tz: 'Africa/Abidjan',     vat: 18.0  },
  { code: 'GA', name: 'Gabon',                       flag: '🇬🇦', currency: 'XAF', tz: 'Africa/Libreville',  vat: 18.0  },
  { code: 'GN', name: 'Guinée',                      flag: '🇬🇳', currency: 'GNF', tz: 'Africa/Conakry',     vat: 18.0  },
  { code: 'GW', name: 'Guinée-Bissau',               flag: '🇬🇼', currency: 'XOF', tz: 'Africa/Bissau',      vat: 15.0  },
  { code: 'GQ', name: 'Guinée Équatoriale',          flag: '🇬🇶', currency: 'XAF', tz: 'Africa/Malabo',      vat: 15.0  },
  { code: 'ML', name: 'Mali',                        flag: '🇲🇱', currency: 'XOF', tz: 'Africa/Bamako',      vat: 18.0  },
  { code: 'NE', name: 'Niger',                       flag: '🇳🇪', currency: 'XOF', tz: 'Africa/Niamey',      vat: 19.0  },
  { code: 'CD', name: 'Rép. Dém. du Congo',          flag: '🇨🇩', currency: 'CDF', tz: 'Africa/Kinshasa',    vat: 16.0  },
  { code: 'SN', name: 'Sénégal',                     flag: '🇸🇳', currency: 'XOF', tz: 'Africa/Dakar',       vat: 18.0  },
  { code: 'TD', name: 'Tchad',                       flag: '🇹🇩', currency: 'XAF', tz: 'Africa/Ndjamena',    vat: 18.0  },
  { code: 'TG', name: 'Togo',                        flag: '🇹🇬', currency: 'XOF', tz: 'Africa/Lome',        vat: 18.0  },
  // Autres pays fréquents
  { code: 'GH', name: 'Ghana',                       flag: '🇬🇭', currency: 'GHS', tz: 'Africa/Accra',       vat: 15.0  },
  { code: 'NG', name: 'Nigeria',                     flag: '🇳🇬', currency: 'NGN', tz: 'Africa/Lagos',       vat: 7.5   },
  { code: 'MA', name: 'Maroc',                       flag: '🇲🇦', currency: 'MAD', tz: 'Africa/Casablanca',  vat: 20.0  },
  { code: 'FR', name: 'France',                      flag: '🇫🇷', currency: 'EUR', tz: 'Europe/Paris',       vat: 20.0  },
];

const DATE_FORMATS = [
  { value: 'd/m/Y',   label: 'JJ/MM/AAAA  (ex : 21/07/2026)',  region: 'OHADA, Europe' },
  { value: 'Y-m-d',   label: 'AAAA-MM-JJ  (ex : 2026-07-21)',  region: 'ISO 8601' },
  { value: 'm/d/Y',   label: 'MM/JJ/AAAA  (ex : 07/21/2026)',  region: 'États-Unis' },
  { value: 'd.m.Y',   label: 'JJ.MM.AAAA  (ex : 21.07.2026)',  region: 'Allemagne, Suisse' },
];

const LANGUAGES = [
  { value: 'fr',    label: '🇫🇷 Français' },
  { value: 'fr-CI', label: '🇨🇮 Français (Côte d\'Ivoire)' },
  { value: 'fr-SN', label: '🇸🇳 Français (Sénégal)' },
  { value: 'fr-CM', label: '🇨🇲 Français (Cameroun)' },
  { value: 'en',    label: '🇬🇧 English' },
  { value: 'pt',    label: '🇵🇹 Português' },
  { value: 'ar',    label: '🇲🇦 العربية' },
];

const Localisation = ({ organization }) => {
  const [saved, setSaved] = useState(false);

  const { data, setData, post, processing, errors } = useForm({
    country:            organization?.country         ?? 'CI',
    primary_currency:   organization?.primary_currency   ?? 'XOF',
    reporting_currency: organization?.reporting_currency ?? 'XOF',
    date_format:        organization?.date_format     ?? 'd/m/Y',
    first_day_of_week:  organization?.first_day_of_week ?? 1,
    language:           organization?.language        ?? 'fr',
    timezone:           organization?.timezone        ?? 'Africa/Abidjan',
    default_vat_rate:   organization?.default_vat_rate ?? 18.0,
    plan_comptable:     organization?.plan_comptable  ?? 'SYSCOHADA',
    use_ohada_invoice:  organization?.use_ohada_invoice ?? true,
  });

  const selectedCountry = OHADA_COUNTRIES.find(c => c.code === data.country);
  const isOhada = OHADA_COUNTRIES.slice(0, 17).some(c => c.code === data.country);

  const handleCountryChange = (countryCode) => {
    const country = OHADA_COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setData(prev => ({
        ...prev,
        country:           countryCode,
        primary_currency:  country.currency,
        reporting_currency:country.currency,
        timezone:          country.tz,
        default_vat_rate:  country.vat,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    post(route('parametres.localisation.update'), {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Localisation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configuration régionale de votre organisation — Pays, devise, langue, TVA
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Pays & Région ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Pays et région
            </CardTitle>
            <CardDescription>
              Détermine automatiquement la devise, le fuseau horaire et la TVA par défaut
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pays</Label>
              <Select value={data.country} onValueChange={handleCountryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="" disabled className="text-muted-foreground text-xs font-semibold">
                    — États membres OHADA (17) —
                  </SelectItem>
                  {OHADA_COUNTRIES.slice(0, 17).map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          OHADA
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value="" disabled className="text-muted-foreground text-xs font-semibold mt-2">
                    — Autres pays —
                  </SelectItem>
                  {OHADA_COUNTRIES.slice(17).map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedCountry && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">{selectedCountry.flag} {selectedCountry.name}</Badge>
                  <Badge variant="outline">Devise : {selectedCountry.currency}</Badge>
                  <Badge variant="outline">TVA : {selectedCountry.vat}%</Badge>
                  <Badge variant="outline">{selectedCountry.tz}</Badge>
                  {isOhada && <Badge className="bg-green-600">✓ Membre OHADA</Badge>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Devises ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Devises
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Devise principale</Label>
                <CurrencySelector
                  value={data.primary_currency}
                  onChange={(v) => setData('primary_currency', v)}
                  baseCurrency="XOF"
                  showRates={false}
                />
                <p className="text-xs text-muted-foreground">
                  Utilisée pour saisir les montants des factures
                </p>
              </div>
              <div className="space-y-2">
                <Label>Devise de rapport</Label>
                <CurrencySelector
                  value={data.reporting_currency}
                  onChange={(v) => setData('reporting_currency', v)}
                  baseCurrency={data.primary_currency}
                  showRates={true}
                />
                <p className="text-xs text-muted-foreground">
                  Utilisée pour les rapports financiers et la BI
                </p>
              </div>
            </div>

            {data.primary_currency !== data.reporting_currency && (
              <div className="flex items-start gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Les montants seront convertis automatiquement de{' '}
                  <strong>{data.primary_currency}</strong> vers{' '}
                  <strong>{data.reporting_currency}</strong> dans les rapports,
                  en utilisant le taux de change au moment de chaque transaction.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Format et langue ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Format de date et langue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format de date</Label>
                <Select value={data.date_format} onValueChange={(v) => setData('date_format', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((fmt) => (
                      <SelectItem key={fmt.value} value={fmt.value}>
                        <div>
                          <div className="font-mono text-sm">{fmt.label}</div>
                          <div className="text-xs text-muted-foreground">{fmt.region}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Langue de l'interface</Label>
                <Select value={data.language} onValueChange={(v) => setData('language', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Premier jour de la semaine</Label>
              <div className="flex gap-2">
                {[
                  { value: 1, label: 'Lundi' },
                  { value: 0, label: 'Dimanche' },
                  { value: 6, label: 'Samedi' },
                ].map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => setData('first_day_of_week', day.value)}
                    className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                      data.first_day_of_week === day.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted border-input'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Lundi recommandé pour les pays OHADA (norme ISO 8601)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Fuseau horaire ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Fuseau horaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Select value={data.timezone} onValueChange={(v) => setData('timezone', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="" disabled className="text-xs font-semibold text-muted-foreground">
                    — Afrique de l'Ouest (UTC+0) —
                  </SelectItem>
                  {['Africa/Abidjan', 'Africa/Dakar', 'Africa/Bamako', 'Africa/Ouagadougou',
                    'Africa/Lome', 'Africa/Bissau', 'Africa/Conakry', 'Africa/Accra'].map(tz => (
                    <SelectItem key={tz} value={tz}>{tz.replace('Africa/', '')} (UTC+0)</SelectItem>
                  ))}
                  <SelectItem value="" disabled className="text-xs font-semibold text-muted-foreground mt-1">
                    — Afrique Centrale (UTC+1) —
                  </SelectItem>
                  {['Africa/Douala', 'Africa/Libreville', 'Africa/Brazzaville', 'Africa/Bangui',
                    'Africa/Ndjamena', 'Africa/Malabo', 'Africa/Porto-Novo', 'Africa/Niamey'].map(tz => (
                    <SelectItem key={tz} value={tz}>{tz.replace('Africa/', '')} (UTC+1)</SelectItem>
                  ))}
                  <SelectItem value="" disabled className="text-xs font-semibold text-muted-foreground mt-1">
                    — Afrique Est (UTC+3) —
                  </SelectItem>
                  {['Africa/Nairobi', 'Indian/Comoro'].map(tz => (
                    <SelectItem key={tz} value={tz}>{tz.replace('Africa/', '')} (UTC+3)</SelectItem>
                  ))}
                  <SelectItem value="" disabled className="text-xs font-semibold text-muted-foreground mt-1">
                    — Autres —
                  </SelectItem>
                  {['Europe/Paris', 'Europe/London', 'UTC'].map(tz => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Fiscalité ── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Fiscalité et comptabilité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taux de TVA par défaut (%)</Label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.25"
                  value={data.default_vat_rate}
                  onChange={(e) => setData('default_vat_rate', parseFloat(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label>Plan comptable</Label>
                <Select value={data.plan_comptable} onValueChange={(v) => setData('plan_comptable', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SYSCOHADA">SYSCOHADA Révisé (2017)</SelectItem>
                    <SelectItem value="PCG">Plan Comptable Général (France)</SelectItem>
                    <SelectItem value="IFRS">IFRS</SelectItem>
                    <SelectItem value="US_GAAP">US GAAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Template de facture OHADA</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Utilise le modèle de facture conforme SYSCOHADA avec les mentions légales obligatoires
                </p>
              </div>
              <Switch
                checked={data.use_ohada_invoice}
                onCheckedChange={(v) => setData('use_ohada_invoice', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Bouton sauvegarde ── */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Ces paramètres s'appliquent à toute votre organisation.
          </p>
          <Button type="submit" disabled={processing} className="min-w-32">
            {processing ? (
              'Enregistrement…'
            ) : saved ? (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Enregistré !
              </span>
            ) : (
              'Enregistrer'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Localisation;
