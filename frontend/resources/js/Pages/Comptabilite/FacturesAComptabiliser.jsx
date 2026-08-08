/**
 * Comptabilite/FacturesAComptabiliser.jsx — le trou entre les deux silos.
 *
 * Facturation et comptabilité vivaient séparées : les factures s'empilaient
 * d'un côté, le journal restait vide de l'autre, et la déclaration de TVA
 * sortait donc à zéro. Cet écran rend l'écart visible et permet de le combler.
 *
 * Le montant de TVA en attente est mis en avant : c'est lui qui manque à la
 * déclaration tant que les écritures ne sont pas passées.
 */

import { Head, router, Link } from '@inertiajs/react';
import {
  BookOpen, ArrowRightLeft, AlertTriangle, CheckCircle2, Settings2,
} from 'lucide-react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState,
  cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const LIBELLES = {
  clients:          'Créances clients',
  sales_services:   'Ventes de services',
  sales_goods:      'Ventes de marchandises',
  vat_collected:    'TVA collectée',
  vat_deductible:   'TVA déductible',
  bank:             'Banque',
  cash:             'Caisse',
  suppliers:        'Fournisseurs',
  discount_granted: 'Remises accordées',
};

export default function FacturesAComptabiliser({ factures = [], totaux = {}, comptes = [] }) {
  const rien = factures.length === 0;

  return (
    <AuthLayout>
      <Head title="Factures à comptabiliser" />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={ArrowRightLeft}
          title="Factures à comptabiliser"
          subtitle="Une facture émise sans écriture n'existe pas pour l'administration fiscale."
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'À comptabiliser' }]}
          actions={
            !rien && (
              <Button onClick={() => router.post('/comptabilite/factures-non-comptabilisees/tout', {}, { preserveScroll: true })}>
                <BookOpen className="h-4 w-4" /> Tout comptabiliser
              </Button>
            )
          }
        />

        {rien ? (
          <Card>
            <EmptyState
              icon={CheckCircle2}
              title="Tout est comptabilisé"
              description="Chaque facture émise a son écriture au journal des ventes. La TVA collectée remonte donc correctement dans la déclaration."
            />
          </Card>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <strong>{fmt(totaux.tva)} de TVA collectée</strong> ne figurent pas encore au journal.
                Tant que ces écritures ne sont pas passées, votre déclaration les ignore.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={ArrowRightLeft} label="Factures en attente" value={totaux.nombre} />
              <StatCard icon={BookOpen}       label="Montant HT"          value={fmt(totaux.ht)} />
              <StatCard icon={AlertTriangle}  label="TVA non déclarée"    value={fmt(totaux.tva)} />
              <StatCard icon={BookOpen}       label="Total TTC"           value={fmt(totaux.ttc)} />
            </div>

            <Card title="Détail">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                      <th className="px-2 py-2">Facture</th>
                      <th className="px-2 py-2">Client</th>
                      <th className="px-2 py-2">Émise le</th>
                      <th className="px-2 py-2 text-right">HT</th>
                      <th className="px-2 py-2 text-right">TVA</th>
                      <th className="px-2 py-2 text-right">TTC</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {factures.map((f) => (
                      <tr key={f.id} className={cx('border-b', BORDER)}>
                        <td className={cx('px-2 py-2.5 font-medium', TEXT_TITLE, NUM)}>{f.invoice_number}</td>
                        <td className="px-2 py-2.5">{f.client ?? '—'}</td>
                        <td className={cx('px-2 py-2.5 text-xs', TEXT_FAINT)}>{f.issue_date}</td>
                        <td className={cx('px-2 py-2.5 text-right', NUM)}>{fmt(f.subtotal)}</td>
                        <td className={cx('px-2 py-2.5 text-right', NUM)}>{fmt(f.tax_amount)}</td>
                        <td className={cx('px-2 py-2.5 text-right font-medium', NUM)}>{fmt(f.total)}</td>
                        <td className="px-2 py-2.5 text-right">
                          <Button
                            variant="subtle" size="sm"
                            onClick={() => router.post(`/comptabilite/factures/${f.id}/comptabiliser`, {}, { preserveScroll: true })}
                          >
                            <BookOpen className="h-4 w-4" /> Comptabiliser
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ── Paramétrage : vérifiable sans ouvrir la base ── */}
        <Card title="Comptes utilisés">
          <p className={cx('mb-3 text-sm', TEXT_MUTED)}>
            Les écritures s'appuient sur ce paramétrage. Il suit le plan SYSCOHADA révisé,
            mais un négociant qui vend des marchandises utilisera 701 là où un cabinet de
            services utilise 706.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {comptes.map((c) => (
              <div key={c.purpose} className={cx('flex items-center justify-between rounded-lg border px-3 py-2', BORDER)}>
                <span className={cx('text-sm', TEXT_MUTED)}>{LIBELLES[c.purpose] ?? c.purpose}</span>
                <Badge variant="neutral">{c.account_number}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Link href="/comptabilite" className={cx('inline-flex items-center gap-1.5 text-sm', TEXT_MUTED)}>
          <Settings2 className="h-4 w-4" /> Retour à la comptabilité
        </Link>
      </div>
    </AuthLayout>
  );
}
