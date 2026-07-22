import React, { useState, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/Components/UI/popover';
import { Button } from '@/Components/UI/button';
import { Input } from '@/Components/UI/input';
import { Badge } from '@/Components/UI/badge';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExchangeRates, formatAmount } from '@/hooks/useCurrency';

/**
 * Drapeaux emoji par code de devise / pays
 */
const CURRENCY_FLAGS = {
  XOF: '🌍', // Multi-pays UEMOA
  XAF: '🌍', // Multi-pays CEMAC
  EUR: '🇪🇺',
  USD: '🇺🇸',
  GBP: '🇬🇧',
  GHS: '🇬🇭',
  NGN: '🇳🇬',
  KES: '🇰🇪',
  MAD: '🇲🇦',
  ZAR: '🇿🇦',
  GNF: '🇬🇳',
  CDF: '🇨🇩',
  KMF: '🇰🇲',
};

// Drapeaux spécifiques par pays UEMOA pour le sélecteur
const OHADA_COUNTRY_FLAGS = {
  CI: '🇨🇮',
  SN: '🇸🇳',
  CM: '🇨🇲',
  BJ: '🇧🇯',
  BF: '🇧🇫',
  ML: '🇲🇱',
  NE: '🇳🇪',
  TG: '🇹🇬',
  GA: '🇬🇦',
  CG: '🇨🇬',
  GN: '🇬🇳',
  GW: '🇬🇼',
  TD: '🇹🇩',
  CD: '🇨🇩',
  CF: '🇨🇫',
  GQ: '🇬🇶',
  KM: '🇰🇲',
};

const REGION_LABELS = {
  OHADA:          '🌍 Afrique OHADA',
  Afrique:        '🌎 Afrique (autres)',
  Europe:         '🇪🇺 Europe',
  International:  '🌐 International',
};

/**
 * CurrencySelector — Select de devise avec drapeaux, recherche et taux
 *
 * @param {string}   value         Code devise sélectionné
 * @param {function} onChange      Callback (currencyCode) => void
 * @param {string}   baseCurrency  Devise de référence pour afficher les taux
 * @param {boolean}  showRates     Affiche les taux vs base
 * @param {boolean}  disabled
 * @param {string}   placeholder
 */
const CurrencySelector = ({
  value,
  onChange,
  baseCurrency = 'XOF',
  showRates = true,
  disabled = false,
  placeholder = 'Sélectionner une devise',
  className = '',
}) => {
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');

  const { data: ratesData, isLoading } = useExchangeRates(baseCurrency);

  // Flatten toutes les devises depuis l'API
  const allCurrencies = useMemo(() => {
    if (!ratesData?.data) return [];
    const result = [];
    for (const [region, currencies] of Object.entries(ratesData.data)) {
      for (const currency of currencies) {
        result.push({ ...currency, region });
      }
    }
    return result;
  }, [ratesData]);

  // Filtre selon la recherche
  const filtered = useMemo(() => {
    if (!search) return allCurrencies;
    const q = search.toLowerCase();
    return allCurrencies.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.name_en && c.name_en.toLowerCase().includes(q)) ||
        (c.symbol && c.symbol.toLowerCase().includes(q))
    );
  }, [allCurrencies, search]);

  // Groupement par région
  const grouped = useMemo(() => {
    const groups = {};
    for (const currency of filtered) {
      if (!groups[currency.region]) groups[currency.region] = [];
      groups[currency.region].push(currency);
    }
    return groups;
  }, [filtered]);

  const selected = allCurrencies.find(c => c.code === value);

  const handleSelect = (code) => {
    onChange(code);
    setOpen(false);
    setSearch('');
  };

  const getFlag = (code) => CURRENCY_FLAGS[code] ?? '💱';

  const formatRate = (currency) => {
    if (!showRates || currency.code === baseCurrency) return null;
    if (currency.rate_from_base === null || currency.rate_from_base === undefined) return null;
    return formatAmount(currency.rate_from_base, currency.code);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="flex items-center gap-2">
            {selected ? (
              <>
                <span className="text-lg">{getFlag(selected.code)}</span>
                <span className="font-medium">{selected.code}</span>
                <span className="text-muted-foreground text-sm hidden sm:inline">
                  — {selected.name}
                </span>
              </>
            ) : (
              <span>{placeholder}</span>
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0" align="start">
        {/* Barre de recherche */}
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Rechercher (XOF, Euro, Dollar…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 shadow-none focus-visible:ring-0 p-0 h-8"
          />
        </div>

        {/* Liste groupée */}
        <div className="max-h-[360px] overflow-y-auto py-1">
          {isLoading && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Chargement des devises…
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Aucune devise trouvée
            </div>
          )}

          {Object.entries(grouped).map(([region, currencies]) => (
            <div key={region}>
              {/* En-tête de groupe */}
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                {REGION_LABELS[region] ?? region}
              </div>

              {currencies.map((currency) => {
                const isSelected = value === currency.code;
                const rateStr   = formatRate(currency);

                return (
                  <button
                    key={currency.code}
                    onClick={() => handleSelect(currency.code)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm',
                      'hover:bg-accent hover:text-accent-foreground',
                      'cursor-pointer transition-colors',
                      isSelected && 'bg-primary/5'
                    )}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base flex-shrink-0">{getFlag(currency.code)}</span>
                      <span className="flex flex-col items-start min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="font-medium">{currency.code}</span>
                          <span className="text-muted-foreground text-xs">{currency.symbol}</span>
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {currency.name}
                        </span>
                      </span>
                    </span>

                    <span className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {rateStr && showRates && (
                        <span className="text-xs text-muted-foreground">
                          = {rateStr}
                        </span>
                      )}
                      {currency.is_default_for_region && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Défaut
                        </Badge>
                      )}
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer : date de mise à jour */}
        {ratesData?.meta?.updated_at && (
          <div className="border-t px-3 py-2 text-[10px] text-muted-foreground">
            Taux mis à jour : {new Date(ratesData.meta.updated_at).toLocaleDateString('fr-FR', {
              day: '2-digit', month: 'short', year: 'numeric'
            })}
            {baseCurrency && ` — Base : ${baseCurrency}`}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CurrencySelector;
