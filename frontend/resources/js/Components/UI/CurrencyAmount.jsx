import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/UI/tooltip';
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
  const [showTooltip, setShowTooltip] = useState(false);

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
    <TooltipProvider>
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1.5 tabular-nums cursor-help ${sizeClasses[size] ?? ''} ${className}`}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
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
        </TooltipTrigger>

        {/* Tooltip : taux utilisé et date */}
        {rateLabel && (
          <TooltipContent side="top" className="text-xs max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{rateLabel}</p>
              {fetchedAt && (
                <p className="text-muted-foreground">
                  Taux mis à jour le {new Date(fetchedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
              )}
              <p className="text-muted-foreground text-[10px]">
                Taux indicatif — peut varier selon votre banque
              </p>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
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
