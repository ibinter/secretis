/**
 * Comptabilité — socle de présentation partagé
 *
 * Source unique de vérité pour TOUT le module `Pages/Comptabilite/` :
 *   - formatage des montants (XOF / FCFA, séparateur insécable) ;
 *   - conventions Débit / Crédit (zéro affiché « — ») ;
 *   - couleur sémantique d'un solde (négatif = rouge, positif = neutre) ;
 *   - libellés + tons des statuts (facture, devis, dépense, déclaration…) ;
 *   - classes de tableau comptable (en-tête, cellules, pied de totaux).
 *
 * ⚠ Présentation uniquement : aucune règle de calcul, aucun arrondi métier.
 * Le formatage délègue à `formatAmount()` de `@/hooks/useCurrency`, helper
 * déjà utilisé ailleurs dans l'ERP — on ne réimplémente rien.
 */

import React from 'react';
import { formatAmount, getSymbol } from '@/hooks/useCurrency';
import {
  Badge, cx, NUM, TH, BORDER, SURFACE, SURFACE_SUNK,
  TEXT_TITLE, TEXT_FAINT,
} from '@/Components/UI';

/* ─── Devise ───────────────────────────────────────────────────────────────── */

export const CURRENCY = 'XOF';
const SYMBOL = getSymbol(CURRENCY);          // « FCFA »
const NBSP   = ' ';                      // espace fine insécable

const isBlank = (v) =>
  v === null || v === undefined || v === '' || Number.isNaN(Number(v));

/**
 * Montant complet avec devise : « 1 250 000 FCFA ».
 * Les espaces de groupement sont rendus insécables pour qu'un montant ne se
 * coupe jamais en fin de ligne.
 */
export function money(value) {
  if (isBlank(value)) return '—';
  return formatAmount(Number(value), CURRENCY, 'fr').replace(/ /g, NBSP);
}

/** Montant nu, sans devise : « 1 250 000 » — pour les colonnes denses. */
export function amount(value) {
  if (isBlank(value)) return '—';
  return money(value).replace(`${NBSP}${SYMBOL}`, '');
}

/**
 * Cellule Débit / Crédit : un zéro alourdit la lecture d'une balance,
 * on affiche « — » à la place.
 */
export function dc(value) {
  if (isBlank(value) || Number(value) === 0) return null;
  return amount(value);
}

/** Classe de couleur d'un solde : négatif = rouge sémantique, sinon neutre. */
export const balanceTone = (value) =>
  Number(value) < 0 ? 'text-red-600 dark:text-red-400' : TEXT_TITLE;

/* ─── Composants d'affichage de montant ────────────────────────────────────── */

/** Montant aligné à droite, chasse tabulaire, insécable. */
export function Money({ value, withCurrency = true, tone = false, className = '' }) {
  const blank = isBlank(value);
  return (
    <span
      className={cx(
        NUM, 'whitespace-nowrap tabular-nums',
        blank ? TEXT_FAINT : tone ? balanceTone(value) : undefined,
        className,
      )}
    >
      {withCurrency ? money(value) : amount(value)}
    </span>
  );
}

/** Cellule Débit/Crédit — rend « — » discret quand le montant est nul. */
export function DebitCredit({ value, className = '' }) {
  const text = dc(value);
  if (text === null) return <span className={cx(TEXT_FAINT, className)}>—</span>;
  return <span className={cx(NUM, 'whitespace-nowrap tabular-nums', className)}>{text}</span>;
}

/* ─── Statuts métier — mapping unique pour tout le module ──────────────────── */
/**
 * `[libellé, ton sémantique]`. Le violet (`accent`) est réservé aux actions :
 * aucun statut ne l'utilise.
 */
const STATUS = {
  invoice: {
    draft:     ['Brouillon', 'neutral'],
    sent:      ['Envoyée',   'info'],
    paid:      ['Payée',     'success'],
    overdue:   ['En retard', 'danger'],
    cancelled: ['Annulée',   'warning'],
  },
  quote: {
    draft:    ['Brouillon', 'neutral'],
    sent:     ['Envoyé',    'info'],
    accepted: ['Accepté',   'success'],
    rejected: ['Refusé',    'danger'],
    expired:  ['Expiré',    'warning'],
  },
  expense: {
    pending:  ['En attente', 'warning'],
    approved: ['Approuvée',  'success'],
    rejected: ['Refusée',    'danger'],
  },
  declaration: {
    draft:     ['Brouillon', 'neutral'],
    submitted: ['Soumis',    'info'],
    paid:      ['Payé',      'success'],
  },
  entry: {
    locked: ['Validée',   'success'],
    draft:  ['Brouillon', 'warning'],
  },
};

/** Retourne `{ label, tone }` pour un couple (famille, statut). */
export function statusMeta(kind, status) {
  const [label, tone] = STATUS[kind]?.[status] ?? [status ?? '—', 'neutral'];
  return { label, tone };
}

/** Options `<select>` d'un filtre de statut — évite de dupliquer les libellés. */
export const statusOptions = (kind) =>
  Object.entries(STATUS[kind] ?? {}).map(([value, [label]]) => ({ value, label }));

/** Pastille de statut cohérente d'un écran à l'autre. */
export function StatusBadge({ kind, status, icon, size = 'sm', className = '' }) {
  const { label, tone } = statusMeta(kind, status);
  return (
    <Badge variant={tone} size={size} icon={icon} dot={!icon} className={className}>
      {label}
    </Badge>
  );
}

/* ─── Journaux SYSCOHADA (VE, AC, BQ…) ─────────────────────────────────────── */

export const JOURNAL_TYPES = [
  { value: 'OD', label: 'Opérations diverses' },
  { value: 'VE', label: 'Ventes' },
  { value: 'AC', label: 'Achats' },
  { value: 'BQ', label: 'Banque' },
  { value: 'SA', label: 'Salaires' },
  { value: 'CA', label: 'Caisse' },
  { value: 'AN', label: 'À-nouveaux' },
];

const JOURNAL_TONE = {
  VE: 'success', AC: 'warning', BQ: 'info',
  SA: 'info',    CA: 'warning', OD: 'neutral', AN: 'neutral',
};

export function JournalBadge({ type }) {
  return (
    <Badge variant={JOURNAL_TONE[type] ?? 'neutral'} className="font-mono">
      {type}
    </Badge>
  );
}

/* ─── Types de compte SYSCOHADA ────────────────────────────────────────────── */

export const ACCOUNT_TYPES = [
  { value: 'actif',    label: 'Actif' },
  { value: 'passif',   label: 'Passif' },
  { value: 'capitaux', label: 'Capitaux' },
  { value: 'charge',   label: 'Charges' },
  { value: 'produit',  label: 'Produits' },
];

const ACCOUNT_TONE = {
  actif: 'info', passif: 'warning', capitaux: 'neutral',
  charge: 'danger', produit: 'success',
};

export const accountTone = (type) => ACCOUNT_TONE[type] ?? 'neutral';

export function AccountTypeBadge({ type }) {
  const label = ACCOUNT_TYPES.find(t => t.value === type)?.label ?? type ?? '—';
  return <Badge variant={accountTone(type)}>{label}</Badge>;
}

export const OHADA_CLASSES = [
  { value: '1', label: 'Classe 1 — Ressources durables' },
  { value: '2', label: 'Classe 2 — Actif immobilisé' },
  { value: '3', label: 'Classe 3 — Stocks' },
  { value: '4', label: 'Classe 4 — Tiers' },
  { value: '5', label: 'Classe 5 — Trésorerie' },
  { value: '6', label: 'Classe 6 — Charges' },
  { value: '7', label: 'Classe 7 — Produits' },
  { value: '8', label: 'Classe 8 — Spéciaux' },
];

/* ─── Classes de tableau comptable ─────────────────────────────────────────── */
/**
 * Les états comptables (balance, grand livre, bilan) ont besoin d'un vrai
 * `<tfoot>` aligné sur les colonnes Débit/Crédit : `DataTable` ne peut pas les
 * rendre (son `footer` vit hors du tableau). Ces classes garantissent malgré
 * tout la même identité visuelle que `DataTable`.
 */
export const TABLE_CARD  = cx(SURFACE, 'border', BORDER, 'rounded-xl shadow-sm overflow-hidden');
export const TABLE_HEAD  = cx(SURFACE_SUNK, 'border-b', BORDER);
export const TH_CELL     = cx('px-4 py-3 whitespace-nowrap', TH);
export const TD_CELL     = 'px-4 py-2.5';
export const ROW_HOVER   = 'transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]';
export const NUM_CELL    = cx(TD_CELL, NUM, 'text-right whitespace-nowrap tabular-nums');

/** Pied de tableau : fond teinté + semi-gras, jamais un simple <b>. */
export const TFOOT = cx(
  SURFACE_SUNK, 'font-semibold', TEXT_TITLE,
  'border-t-2 border-gray-300 dark:border-[#2A3F5F]',
);

export default {
  CURRENCY, money, amount, dc, balanceTone,
  Money, DebitCredit, StatusBadge, statusMeta, statusOptions,
  JournalBadge, JOURNAL_TYPES, AccountTypeBadge, ACCOUNT_TYPES, accountTone,
  OHADA_CLASSES, TABLE_CARD, TABLE_HEAD, TH_CELL, TD_CELL, NUM_CELL, ROW_HOVER, TFOOT,
};
