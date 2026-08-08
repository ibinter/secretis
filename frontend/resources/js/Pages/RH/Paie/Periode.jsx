/**
 * RH/Paie/Periode.jsx — bulletins d'un mois.
 *
 * Deux choses doivent sauter aux yeux : ce qui a été calculé, et QUI MANQUE.
 * Une paie incomplète est un incident social ; la liste des salariés sans
 * bulletin est donc affichée aussi visiblement que les totaux, avec le motif.
 *
 * La clôture est irréversible et le dit avant d'être déclenchée.
 */

import { Head, router, Link } from '@inertiajs/react';
import {
  Wallet, Calculator, Lock, Download, ArrowLeft, AlertTriangle,
  FileText, CheckCircle2, UserX,
} from 'lucide-react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState,
  cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

const fmt = (n, d = '') =>
  `${Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}${d ? ' ' + d : ''}`;

export default function PaiePeriode({ periode, bulletins = [], manquants = [] }) {
  if (!periode) return null;

  const ouverte  = periode.status === 'draft';
  const devise   = periode.currency ?? '';
  const aRisque  = bulletins.some((b) => !b.rules_verified);

  const calculer = () => router.post(`/rh/paie/periodes/${periode.id}/calculer`, {}, { preserveScroll: true });

  const cloturer = () => {
    if (!confirm(
      `Clôturer « ${periode.label} » ?\n\n`
      + `Les bulletins deviennent définitifs : ils ne pourront plus être recalculés, `
      + `même si un salaire ou un taux change ensuite. Cette action est irréversible.`
    )) return;
    router.post(`/rh/paie/periodes/${periode.id}/cloturer`, {}, { preserveScroll: true });
  };

  return (
    <AuthLayout>
      <Head title={`Paie — ${periode.label}`} />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={Wallet}
          title={periode.label}
          breadcrumbs={[{ label: 'Paie', href: '/rh/paie' }, { label: periode.label }]}
          subtitle={
            ouverte
              ? 'Période en cours — les bulletins peuvent être recalculés.'
              : `Période clôturée${periode.closed_at ? ` le ${new Date(periode.closed_at).toLocaleDateString('fr-FR')}` : ''} — bulletins définitifs.`
          }
          actions={
            ouverte ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={calculer}>
                  <Calculator className="h-4 w-4" /> Calculer
                </Button>
                <Button onClick={cloturer} disabled={bulletins.length === 0}>
                  <Lock className="h-4 w-4" /> Clôturer
                </Button>
              </div>
            ) : (
              <Badge variant="success">Clôturée</Badge>
            )
          }
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={FileText} label="Bulletins"          value={bulletins.length} />
          <StatCard icon={Wallet}   label="Brut total"         value={fmt(periode.total_gross)} />
          <StatCard icon={Wallet}   label="Net à payer"        value={fmt(periode.total_net, devise)} />
          <StatCard icon={Wallet}   label="Coût employeur"
                    value={fmt(Number(periode.total_gross) + Number(periode.total_employer_contributions))} />
        </div>

        {aRisque && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Certains bulletins s'appuient sur des taux non confirmés sur texte officiel.
              La réserve figure sur les documents imprimés.
            </span>
          </div>
        )}

        {/* ── Qui manque : aussi important que ce qui a été calculé ── */}
        {manquants.length > 0 && (
          <Card title={`${manquants.length} salarié(s) sans bulletin`}>
            <p className={cx('mb-3 text-sm', TEXT_MUTED)}>
              Ces salariés actifs n'ont pas de bulletin sur cette période. Corrigez leur fiche
              puis relancez le calcul.
            </p>
            <div className="space-y-2">
              {manquants.map((m) => (
                <div key={m.id} className={cx('flex items-center justify-between rounded-lg border px-3 py-2', BORDER)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <UserX className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className={cx('text-sm font-medium', TEXT_TITLE)}>{m.nom}</span>
                    {m.poste && <span className={cx('text-xs', TEXT_FAINT)}>· {m.poste}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {m.motif && <span className="text-xs text-amber-700">{m.motif}</span>}
                    <Link
                      href={`/rh/personnel/${m.id}`}
                      className="text-xs font-medium text-purple-600 hover:underline"
                    >
                      Ouvrir la fiche
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Bulletins ── */}
        <Card title="Bulletins">
          {bulletins.length === 0 ? (
            <EmptyState
              icon={Calculator}
              title="Aucun bulletin calculé"
              description="Lancez le calcul pour produire les bulletins de tous les salariés actifs."
              action={ouverte ? <Button onClick={calculer}><Calculator className="h-4 w-4" /> Calculer</Button> : null}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-2 py-2">Salarié</th>
                    <th className="px-2 py-2 text-right">Brut</th>
                    <th className="px-2 py-2 text-right">Retenues</th>
                    <th className="px-2 py-2 text-right">Net à payer</th>
                    <th className="px-2 py-2 text-right">Charges patronales</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {bulletins.map((b) => {
                    const retenues = Number(b.employee_contributions) + Number(b.income_tax) + Number(b.other_deductions);
                    return (
                      <tr key={b.id} className={cx('border-b', BORDER)}>
                        <td className="px-2 py-2.5">
                          <Link href={`/rh/paie/bulletins/${b.id}`} className={cx('font-medium hover:underline', TEXT_TITLE)}>
                            {b.employee_name}
                          </Link>
                          {b.employee_position && (
                            <span className={cx('block text-xs', TEXT_FAINT)}>{b.employee_position}</span>
                          )}
                        </td>
                        <td className={cx('px-2 py-2.5 text-right', NUM)}>{fmt(b.gross_salary)}</td>
                        <td className={cx('px-2 py-2.5 text-right', NUM, TEXT_MUTED)}>− {fmt(retenues)}</td>
                        <td className={cx('px-2 py-2.5 text-right font-semibold', NUM)}>{fmt(b.net_salary, devise)}</td>
                        <td className={cx('px-2 py-2.5 text-right', NUM, TEXT_FAINT)}>{fmt(b.employer_contributions)}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            {b.rules_verified
                              ? <CheckCircle2 className="h-4 w-4 text-green-600" title="Taux confirmés" />
                              : <AlertTriangle className="h-4 w-4 text-amber-500" title="Taux non confirmés" />}
                            <a
                              href={`/rh/paie/bulletins/${b.id}/pdf`}
                              className="rounded p-1.5 text-purple-600 hover:bg-purple-50"
                              title="Télécharger le bulletin"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Link href="/rh/paie" className={cx('inline-flex items-center gap-1.5 text-sm', TEXT_MUTED)}>
          <ArrowLeft className="h-4 w-4" /> Toutes les périodes
        </Link>
      </div>
    </AuthLayout>
  );
}
