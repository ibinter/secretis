import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

/**
 * Hook React pour la gestion multi-devise SECRETIS
 * Utilise TanStack Query avec cache 1h
 */

// ─── Symboles de devises ───────────────────────────────────────────────────

const CURRENCY_SYMBOLS = {
  XOF: 'FCFA',
  XAF: 'FCFA',
  EUR: '€',
  USD: '$',
  GBP: '£',
  GHS: '₵',
  NGN: '₦',
  KES: 'KSh',
  MAD: 'DH',
  ZAR: 'R',
  GNF: 'FG',
  CDF: 'FC',
  KMF: 'KMF',
};

// ─── Configuration de formatage par devise ─────────────────────────────────

const CURRENCY_FORMAT = {
  XOF: { decimals: 0, decSep: ',', thousSep: ' ', pos: 'after' },
  XAF: { decimals: 0, decSep: ',', thousSep: ' ', pos: 'after' },
  EUR: { decimals: 2, decSep: ',', thousSep: ' ', pos: 'after' },
  USD: { decimals: 2, decSep: '.', thousSep: ',', pos: 'before' },
  GBP: { decimals: 2, decSep: '.', thousSep: ',', pos: 'before' },
  GHS: { decimals: 2, decSep: '.', thousSep: ',', pos: 'before' },
  NGN: { decimals: 2, decSep: '.', thousSep: ',', pos: 'before' },
  KES: { decimals: 2, decSep: '.', thousSep: ',', pos: 'before' },
  MAD: { decimals: 2, decSep: ',', thousSep: ' ', pos: 'after' },
  ZAR: { decimals: 2, decSep: ',', thousSep: ' ', pos: 'before' },
};

// ─── Fonctions utilitaires ─────────────────────────────────────────────────

/**
 * Formate un montant selon la devise et la locale.
 * @param {number} amount
 * @param {string} currency  Code ISO 4217
 * @param {string} locale    'fr' | 'en'
 * @returns {string}  ex: "15 000 FCFA", "$1,234.56", "€1.234,56"
 */
export function formatAmount(amount, currency = 'XOF', locale = 'fr') {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';

  const fmt = CURRENCY_FORMAT[currency] ?? { decimals: 2, decSep: '.', thousSep: ',', pos: 'before' };
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  // Arrondi
  const num = parseFloat(amount);
  const fixed = num.toFixed(fmt.decimals);

  // Séparation des milliers
  const [intPart, decPart] = fixed.split('.');
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, fmt.thousSep);

  let formatted;
  if (fmt.decimals === 0 || !decPart) {
    formatted = intFormatted;
  } else {
    formatted = `${intFormatted}${fmt.decSep}${decPart}`;
  }

  return fmt.pos === 'before' ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
}

/**
 * Retourne le symbole d'une devise.
 * @param {string} currencyCode
 * @returns {string}
 */
export function getSymbol(currencyCode) {
  return CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
}

/**
 * Hook pour récupérer les taux de change depuis l'API (cache 1h).
 * @param {string} baseCurrency
 */
export function useExchangeRates(baseCurrency = 'XOF') {
  return useQuery({
    queryKey: ['exchange-rates', baseCurrency],
    queryFn: async () => {
      const response = await axios.get('/api/currencies', {
        params: { base: baseCurrency, include_rates: true },
      });
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 heure
    cacheTime: 2 * 60 * 60 * 1000, // 2 heures
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Hook pour convertir un montant avec les taux en cache.
 * @param {number} amount
 * @param {string} from
 * @param {string} to
 */
export function useConvertedAmount(amount, from, to) {
  return useQuery({
    queryKey: ['currency-convert', amount, from, to],
    queryFn: async () => {
      if (from === to) return { converted: amount, rate: 1 };
      const response = await axios.get('/api/currencies/convert', {
        params: { amount, from, to },
      });
      return response.data;
    },
    enabled: !!amount && !!from && !!to && from !== to,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook principal useCurrency — accès à toutes les fonctionnalités devise.
 * @param {string} defaultCurrency
 */
export function useCurrency(defaultCurrency = 'XOF') {
  const { data: ratesData, isLoading: ratesLoading } = useExchangeRates(defaultCurrency);

  /**
   * Convertit un montant avec les taux en cache local.
   * @param {number} amount
   * @param {string} from
   * @param {string} to
   * @returns {number}
   */
  const convertAmount = (amount, from, to) => {
    if (from === to || !amount) return amount;

    // Cherche dans les données en cache
    const allCurrencies = ratesData?.data;
    if (!allCurrencies) return amount;

    let rate = null;
    for (const region of Object.values(allCurrencies)) {
      for (const currency of region) {
        if (currency.code === to && currency.rate_from_base !== null) {
          rate = currency.rate_from_base;
          break;
        }
      }
      if (rate !== null) break;
    }

    if (!rate) return null; // Taux indisponible
    return Math.round(amount * rate * 100) / 100;
  };

  /**
   * Retourne les taux disponibles par devise.
   */
  const getExchangeRates = () => {
    if (!ratesData?.data) return {};

    const rates = {};
    for (const region of Object.values(ratesData.data)) {
      for (const currency of region) {
        if (currency.rate_from_base !== null) {
          rates[currency.code] = {
            rate: currency.rate_from_base,
            symbol: currency.symbol,
            name: currency.name,
          };
        }
      }
    }
    return rates;
  };

  /**
   * Retourne la liste des devises groupées par région.
   */
  const getCurrenciesByRegion = () => ratesData?.data ?? {};

  return {
    formatAmount,
    getSymbol,
    convertAmount,
    getExchangeRates,
    getCurrenciesByRegion,
    isLoading: ratesLoading,
    updatedAt: ratesData?.meta?.updated_at,
    defaultCurrency,
  };
}

export default useCurrency;
