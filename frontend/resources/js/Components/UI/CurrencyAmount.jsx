import React, { useState } from 'react';
import Tooltip from '@/Components/UI/Tooltip';
import { formatAmount, useCurrency, useConvertedAmount } from '@/hooks/useCurrency';
import { RefreshCw } from 'lucide-react';

/**
 * CurrencyAmount — Composant d'affichage de montant avec conversion optionnelle
 *
 * Exemples de rendu :
 *   <CurrencyAmount amount={15000} currency="XOF" />
 *   → "15 000 FCFA"
 *
 *   <CurrencyAmount amount={15000} currency="XOF" convertTo="EUR" showOriginal />
 *   → "15 000 FCFA (≈ 22,87 €)"
 */
const CurrencyAmount = ({
  amount,
  currency = 'XOF',
  convertTo = null,
  showOriginal = true,
  locale = 'fr',
  className = '',
  size = 'md',
  muted = false,
}) => {

  const { data: conversionData, isLoading } = useConvertedAmount(
    convertTo ? amount : null,
    currency,
    convertTo
  );

  const formattedOriginal = formatAmount(amount, currency, locale);

  const sizeClasses = {
    xs:  'text-xs',
    sm:  'text-sm',
    md:  'text-base',
    lg:  'text-lg font-semibold',
    xl:  'text-xl font-bold',
    '2xl': 'text-2xl font-bold',
  };

  if (!convertTo) {
    return (
      <span className={`tabular-nums ${sizeClasses[size] ?? ''} ${muted ? 'text-muted-foreground' : ''} ${className}`}>
        {formattedOriginal}
      </span>
    );
  }

  const convertedFormatted = conversionData?.converted
    ? formatAmount(conversionData.converted.amount, convertTo, locale)
    : null;

  const rate       = conversionData?.rate;
  const rateLabel  = rate ? `1 ${currency} = ${rate} ${convertTo}` : null;
  const fetchedAt  = conversionData?.updated_at;

  return (
    <Tooltip
      disabled={!rateLabel}
      content={
        rateLabel ? (
          <div className="space-y-1 text-xs max-w-xs">
            <p className="font-medium">{rateLabel}</p>
            {fetchedAt && (
              <p className="opacity-80">
                Taux mis à jour le {new Date(fetchedAt).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            )}
            <p className="opacity-70 text-[10px]">
              Taux indicatif — peut varier selon votre banque
            </p>
          </div>
        ) : null
      }
    >
          <span
            className={`inline-flex items-center gap-1.5 tabular-nums cursor-help ${sizeClasses[size] ?? ''} ${className}`}
          >
            {/* Montant original */}
            {showOriginal && (
              <span className={muted ? 'text-muted-foreground' : ''}>
                {formattedOriginal}
              </span>
            )}

            {/* Montant converti */}
            {isLoading ? (
              <span className="text-muted-foreground text-xs animate-pulse">
                <RefreshCw className="w-3 h-3 inline animate-spin" />
              </span>
            ) : convertedFormatted ? (
              <span className="text-muted-foreground text-sm">
                {showOriginal ? `(≈ ${convertedFormatted})` : convertedFormatted}
              </span>
            ) : null}
          </span>
    </Tooltip>
  );
};

/**
 * Variante compacte pour les tableaux
 */
export const CurrencyAmountCompact = ({ amount, currency, convertTo, ...props }) => (
  <CurrencyAmount
    amount={amount}
    currency={currency}
    convertTo={convertTo}
    size="sm"
    muted
    {...props}
  />
);

/**
 * Variante titre pour les totaux de facture
 */
export const CurrencyAmountLarge = ({ amount, currency, convertTo, ...props }) => (
  <CurrencyAmount
    amount={amount}
    currency={currency}
    convertTo={convertTo}
    size="2xl"
    {...props}
  />
);

export default CurrencyAmount;
