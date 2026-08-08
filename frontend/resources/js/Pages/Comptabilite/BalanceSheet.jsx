/**
 * Comptabilite/BalanceSheet.jsx — Bilan SYSCOHADA
 *
 * Props Inertia :
 *   data        : résultat SyscohadaService::generateBalanceSheet()
 *   fiscalYears : liste exercices
 *   selectedFY  : exercice sélectionné
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Aucun agrégat n'est recalculé côté client : tous les montants viennent
 * de `data`, ils sont uniquement formatés.
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  ArrowDownTrayIcon, CheckCircleIcon, ExclamationTriangleIcon, ScaleIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, EmptyState,
  cx, CONTROL, SURFACE_SUNK, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';
import {
  amount, money, TABLE_CARD, TABLE_HEAD, TH_CELL, TFOOT,
} from '@/Components/Comptabilite/accounting';

/** Montant de poste de bilan : « — » quand le poste est nul. */
const cell = (v) =>
  v == null || Number(v) === 0 ? null : amount(Math.abs(Number(v)));

const NumCell = ({ value, className = '' }) => {
  const text = cell(value);
  return (
    <span className={cx(NUM, 'whitespace-nowrap tabular-nums', text === null && TEXT_FAINT, className)}>
      {text ?? '—'}
    </span>
  );
};

// Ligne bilan : 3 colonnes (Brut / Amort / Net) ou 1 colonne
function BilanRow({ label, brut, amort, net, value, isTotal, indent = 0, bold }) {
  const showTriple = brut !== undefined;
  const displayVal = showTriple ? net : value;
  const isEmpty    = displayVal == null || displayVal === 0;

  return (
    <tr className={cx(
      isTotal && cx(SURFACE_SUNK, 'border-t', 'border-gray-200 dark:border-[#1E3048]'),
      isEmpty && !isTotal && 'opacity-60',
    )}>
      <td
        className={cx('py-2 pr-3 text-sm', (bold || isTotal) ? cx('font-semibold', TEXT_TITLE) : TEXT_MUTED)}
        style={{ paddingLeft: `${16 + indent * 16}px` }}
      >
        {label}
      </td>
      {showTriple ? (
        <>
          <td className="px-3 py-2 text-right text-xs">
            <NumCell value={brut} className={TEXT_MUTED} />
          </td>
          <td className="px-3 py-2 text-right text-xs">
            <NumCell value={amort} className={TEXT_FAINT} />
          </td>
          <td className={cx('px-3 py-2 text-right text-sm font-semibold', TEXT_TITLE)}>
            <NumCell value={net} />
          </td>
        </>
      ) : (
        <td
          colSpan={3}
          className={cx('px-3 py-2 text-right text-sm', (bold || isTotal) ? cx('font-semibold', TEXT_TITLE) : TEXT_MUTED)}
        >
          <NumCell value={value} />
        </td>
      )}
    </tr>
  );
}

function BilanHeader({ cols }) {
  return (
    <thead className={TABLE_HEAD}>
      <tr>
        {cols.map((c, i) => (
          <th key={i} scope="col" className={cx(TH_CELL, i === 0 ? 'text-left' : 'text-right')}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function BilanSection({ title }) {
  return (
    <tr className={SURFACE_SUNK}>
      <td colSpan={4} className={cx('px-4 py-2 text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>
        {title}
      </td>
    </tr>
  );
}

function GrandTotal({ label, value }) {
  return (
    <tr className={TFOOT}>
      <td className={cx('px-4 py-3 text-sm font-semibold uppercase tracking-wide', TEXT_TITLE)}>
        {label}
      </td>
      <td colSpan={3} className={cx('px-4 py-3 text-right text-base font-semibold whitespace-nowrap', NUM, TEXT_TITLE)}>
        {amount(Math.abs(Number(value ?? 0)))}
      </td>
    </tr>
  );
}

export default function BalanceSheet({ data, fiscalYears, selectedFY }) {
  const [selectedId, setSelectedId] = useState(selectedFY?.id || '');

  const handleFYChange = (id) => {
    setSelectedId(id);
    router.get('/comptabilite/bilan', { fiscal_year_id: id });
  };

  const exportPdf = () => {
    window.open(`/comptabilite/bilan/pdf?fiscal_year_id=${selectedId}`, '_blank');
  };

  const actif  = data?.actif;
  const passif = data?.passif;

  return (
    <AuthLayout>
      <Head title="Bilan SYSCOHADA" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={ScaleIcon}
          title="Bilan"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Bilan' }]}
          subtitle="SYSCOHADA Révisé 2017 — présentation OHADA, montants en FCFA (XOF)"
          actions={
            <>
              <select
                className={cx(CONTROL, 'h-10 w-auto min-w-[200px]')}
                value={selectedId}
                onChange={e => handleFYChange(e.target.value)}
                aria-label="Exercice fiscal"
              >
                <option value="">Sélectionner un exercice</option>
                {fiscalYears.map(fy => (
                  <option key={fy.id} value={fy.id}>{fy.name}</option>
                ))}
              </select>
              {data && (
                <Button variant="secondary" icon={ArrowDownTrayIcon} onClick={exportPdf}>
                  PDF
                </Button>
              )}
            </>
          }
        />

        {!data ? (
          <EmptyState
            bordered
            icon={ScaleIcon}
            title="Aucun exercice sélectionné"
            description="Choisissez un exercice fiscal pour afficher le bilan actif / passif."
          />
        ) : (
          <>
            {/* Indicateur équilibre */}
            <div className={cx(
              'mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm',
              data.is_balanced
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
            )}>
              {data.is_balanced
                ? <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                : <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />}
              <span className="font-medium">
                {data.is_balanced
                  ? `Bilan équilibré — total actif = total passif = ${money(data.total_actif)}`
                  : `Bilan déséquilibré — écart de ${money(data.ecart)}`}
              </span>
            </div>

            {/* Bilan côte à côte */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

              {/* === ACTIF === */}
              <div className={TABLE_CARD}>
                <div className={cx('border-b px-4 py-3', 'border-gray-200 dark:border-[#1E3048]', SURFACE_SUNK)}>
                  <h2 className={cx('text-sm font-semibold uppercase tracking-wide', TEXT_TITLE)}>Actif</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <BilanHeader cols={['Désignation', 'Brut', 'Amort./Prov.', 'Net']} />
                    <tbody className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                      <BilanSection title="Actif immobilisé" />
                      <BilanRow label="Immob. incorporelles" indent={1}
                        brut={actif.immobilisations.incorporelles.brut}
                        amort={actif.immobilisations.incorporelles.amort}
                        net={actif.immobilisations.incorporelles.net} />
                      <BilanRow label="Terrains" indent={1}
                        brut={actif.immobilisations.terrains.brut}
                        amort={actif.immobilisations.terrains.amort}
                        net={actif.immobilisations.terrains.net} />
                      <BilanRow label="Bâtiments" indent={1}
                        brut={actif.immobilisations.batiments.brut}
                        amort={actif.immobilisations.batiments.amort}
                        net={actif.immobilisations.batiments.net} />
                      <BilanRow label="Autres immob. corporelles" indent={1}
                        brut={actif.immobilisations.autres_corporelles.brut}
                        amort={actif.immobilisations.autres_corporelles.amort}
                        net={actif.immobilisations.autres_corporelles.net} />
                      <BilanRow label="Immob. financières" indent={1}
                        brut={actif.immobilisations.financieres.brut}
                        amort={actif.immobilisations.financieres.amort}
                        net={actif.immobilisations.financieres.net} />
                      <BilanRow label="Total actif immobilisé" isTotal bold
                        brut={actif.immobilisations.total_brut}
                        amort={actif.immobilisations.total_amort}
                        net={actif.immobilisations.total_net} />

                      <BilanSection title="Actif circulant" />
                      <BilanRow label="Stocks (30-38)" indent={1} value={actif.circulant.stocks} />
                      <BilanRow label="Créances clients (411-416)" indent={1} value={actif.circulant.creances_clients} />
                      <BilanRow label="Autres créances" indent={1} value={actif.circulant.autres_creances} />
                      <BilanRow label="Total actif circulant" isTotal bold value={actif.circulant.total} />

                      <BilanSection title="Trésorerie-actif" />
                      <BilanRow label="Banques et caisses (51-57)" indent={1} value={actif.tresorerie} />
                    </tbody>

                    <tfoot>
                      <GrandTotal label="Total actif" value={actif.total} />
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* === PASSIF === */}
              <div className={TABLE_CARD}>
                <div className={cx('border-b px-4 py-3', 'border-gray-200 dark:border-[#1E3048]', SURFACE_SUNK)}>
                  <h2 className={cx('text-sm font-semibold uppercase tracking-wide', TEXT_TITLE)}>Passif</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <BilanHeader cols={['Désignation', '', '', 'Exercice N']} />
                    <tbody className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                      <BilanSection title="Capitaux propres et ressources assimilées" />
                      <BilanRow label="Capital social (101)" indent={1} value={passif.capitaux_propres.capital} />
                      <BilanRow label="Réserves (104-107)" indent={1} value={passif.capitaux_propres.reserves} />
                      <BilanRow label="Report à nouveau (110-119)" indent={1} value={passif.capitaux_propres.report_nouveau} />
                      <BilanRow label="Résultat net (120-129)" indent={1} value={passif.capitaux_propres.resultat} />
                      <BilanRow label="Subventions (130-131)" indent={1} value={passif.capitaux_propres.subventions} />
                      <BilanRow label="Total capitaux propres" isTotal bold value={passif.capitaux_propres.total} />

                      <BilanRow label="Dettes financières (16-17)" indent={1} value={passif.dettes_financieres} />
                      <BilanRow label="Provisions pour risques (15)" indent={1} value={passif.provisions} />
                      <BilanRow label="Total ressources durables" isTotal bold value={passif.ressources_durables} />

                      <BilanSection title="Passif circulant" />
                      <BilanRow label="Fournisseurs (401-408)" indent={1} value={passif.passif_circulant.fournisseurs} />
                      <BilanRow label="Dettes fiscales et sociales" indent={1} value={passif.passif_circulant.dettes_fiscales} />
                      <BilanRow label="Autres dettes" indent={1} value={passif.passif_circulant.autres_dettes} />
                      <BilanRow label="Total passif circulant" isTotal bold value={passif.passif_circulant.total} />

                      <BilanSection title="Trésorerie-passif" />
                      <BilanRow label="Crédits de trésorerie (521-522)" indent={1} value={passif.tresorerie} />
                    </tbody>

                    <tfoot>
                      <GrandTotal label="Total passif" value={passif.total} />
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <p className={cx('mt-4 text-center text-xs', TEXT_MUTED)}>
              Bilan établi selon les normes SYSCOHADA Révisé 2017 — montants en FCFA.
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
export { BalanceSheet };
