/**
 * RH/Paie/Bulletin.jsx — détail d'un bulletin, à l'écran.
 *
 * Même lecture que le PDF remis au salarié : gains, retenues, net détaché, puis
 * charges patronales pour information. Chaque ligne porte son assiette et son
 * taux — un bulletin doit pouvoir être vérifié, pas seulement consulté.
 */

import { Head, Link } from '@inertiajs/react';
import { Wallet, Download, ArrowLeft, AlertTriangle } from 'lucide-react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card,
  cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

const fmt = (n, d = '') =>
  `${Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}${d ? ' ' + d : ''}`;

const SECTIONS = [
  { cle: 'earning',               titre: 'Rémunération',   signe: '' },
  { cle: 'contribution',          titre: 'Cotisations salariales', signe: '− ' },
  { cle: 'tax',                   titre: 'Impôt sur les salaires', signe: '− ' },
  { cle: 'deduction',             titre: 'Autres retenues', signe: '− ' },
  { cle: 'employer_contribution', titre: 'Charges patronales — non déduites du net', signe: '' },
];

function Lignes({ lignes, signe }) {
  if (!lignes.length) return null;
  return (
    <table className="w-full text-sm">
      <tbody>
        {lignes.map((l) => (
          <tr key={l.id} className={cx('border-b last:border-0', BORDER)}>
            <td className="py-2">
              <span className={TEXT_TITLE}>{l.label}</span>
              {(l.base || l.rate) && (
                <span className={cx('ml-2 text-xs', TEXT_FAINT)}>
                  {l.base ? fmt(l.base) : ''}{l.rate ? ` × ${Number(l.rate).toFixed(2)} %` : ''}
                </span>
              )}
              {l.is_verified_rule === false && (
                <AlertTriangle className="ml-1.5 inline h-3 w-3 text-amber-500" title="Taux non confirmé" />
              )}
            </td>
            <td className={cx('py-2 text-right', NUM)}>{signe}{fmt(l.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PaieBulletin({ bulletin, lignes = [], periode }) {
  if (!bulletin) return null;

  const devise = bulletin.currency ?? '';
  const parCat = (c) => lignes.filter((l) => l.category === c);
  const retenues = Number(bulletin.employee_contributions)
                 + Number(bulletin.income_tax)
                 + Number(bulletin.other_deductions);

  return (
    <AuthLayout>
      <Head title={`Bulletin — ${bulletin.employee_name}`} />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={Wallet}
          title={bulletin.employee_name}
          breadcrumbs={[
            { label: 'Paie', href: '/rh/paie' },
            { label: periode?.label ?? '', href: `/rh/paie/periodes/${bulletin.payroll_period_id}` },
            { label: bulletin.reference },
          ]}
          subtitle={[bulletin.employee_position, periode?.label].filter(Boolean).join(' — ')}
          actions={
            <a href={`/rh/paie/bulletins/${bulletin.id}/pdf`}>
              <Button><Download className="h-4 w-4" /> Télécharger</Button>
            </a>
          }
        />

        {!bulletin.rules_verified && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Taux non confirmés sur texte officiel. À vérifier avec votre comptable avant
              remise définitive au salarié ou dépôt de déclaration.
            </span>
          </div>
        )}

        {SECTIONS.map(({ cle, titre, signe }) => {
          const l = parCat(cle);
          if (!l.length) return null;
          return (
            <Card key={cle} title={titre}>
              <Lignes lignes={l} signe={signe} />
              {cle === 'earning' && (
                <div className={cx('mt-2 flex justify-between border-t pt-2 text-sm font-semibold', BORDER, TEXT_TITLE)}>
                  <span>Salaire brut</span>
                  <span className={NUM}>{fmt(bulletin.gross_salary, devise)}</span>
                </div>
              )}
              {cle === 'employer_contribution' && (
                <div className={cx('mt-2 flex justify-between border-t pt-2 text-sm font-semibold', BORDER, TEXT_TITLE)}>
                  <span>Coût total pour l'employeur</span>
                  <span className={NUM}>
                    {fmt(Number(bulletin.gross_salary) + Number(bulletin.employer_contributions), devise)}
                  </span>
                </div>
              )}
            </Card>
          );
        })}

        {/* ── Net à payer ── */}
        <div className="rounded-xl bg-purple-600 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-100">Net à payer</p>
              <p className="mt-0.5 text-xs text-purple-200">
                Brut {fmt(bulletin.gross_salary)} − retenues {fmt(retenues)}
              </p>
            </div>
            <p className={cx('text-2xl font-bold', NUM)}>{fmt(bulletin.net_salary, devise)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/rh/paie/periodes/${bulletin.payroll_period_id}`}
            className={cx('inline-flex items-center gap-1.5 text-sm', TEXT_MUTED)}
          >
            <ArrowLeft className="h-4 w-4" /> Retour à la période
          </Link>
          <Badge variant={bulletin.status === 'closed' ? 'success' : 'warning'}>
            {bulletin.status === 'closed' ? 'Définitif' : 'Brouillon'}
          </Badge>
        </div>
      </div>
    </AuthLayout>
  );
}
