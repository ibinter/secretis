/**
 * RH/NoteFrais/Show.jsx — Détail d'une note de frais
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Les appels réseau et les noms de routes sont conservés à l'identique :
 *   - POST /rh/notes-de-frais/{id}/submit  (route à exposer côté backend)
 *   - route('rh.notes-de-frais.approve', id)
 *   - route('rh.notes-de-frais.reject',  id)
 */

import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  Receipt, CheckCircle2, XCircle, Send, Clock, Banknote,
  Car, Utensils, Bed, Package, AlertTriangle,
} from 'lucide-react';
import { formatAmount } from '@/hooks/useCurrency';
import {
  PageHeader, Button, Badge, Card, EmptyState,
  cx, SURFACE_SUNK, BORDER, DIVIDE,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, TH, NUM,
} from '@/Components/UI';

/** Statuts métier — tons sémantiques (l'accent violet reste aux actions). */
const STATUSES = {
  draft:     { label: 'Brouillon', tone: 'neutral', icon: Clock },
  submitted: { label: 'Soumise',   tone: 'warning', icon: Send },
  approved:  { label: 'Approuvée', tone: 'info',    icon: CheckCircle2 },
  rejected:  { label: 'Refusée',   tone: 'danger',  icon: XCircle },
  paid:      { label: 'Payée',     tone: 'success', icon: Banknote },
};

const CATEGORIES = {
  transport:     { icon: Car,      label: 'Transport' },
  accommodation: { icon: Bed,      label: 'Hébergement' },
  meals:         { icon: Utensils, label: 'Repas' },
  other:         { icon: Package,  label: 'Autre' },
};

function StatusBadge({ status }) {
  const cfg = STATUSES[status] ?? STATUSES.draft;
  return <Badge variant={cfg.tone} icon={cfg.icon} size="md">{cfg.label}</Badge>;
}

function empName(emp) {
  if (!emp) return '—';
  return emp.name ?? (`${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || '—');
}

/** Bloc « libellé / valeur » du récapitulatif. */
function Field({ label, children, hint }) {
  return (
    <div className="min-w-0">
      <p className={cx('text-[11px] font-semibold uppercase tracking-wider', TEXT_MUTED)}>{label}</p>
      <div className={cx('mt-1 text-sm font-medium', TEXT_TITLE)}>{children}</div>
      {hint && <p className={cx('mt-0.5 text-xs', TEXT_FAINT)}>{hint}</p>}
    </div>
  );
}

export default function NoteFraisShow({ report = {}, totalAmount = 0 }) {
  const [loading, setLoading] = useState(false);

  const items    = report.items ?? (Array.isArray(report.expenses) ? report.expenses : []);
  const total    = totalAmount || report.total_amount || items.reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const currency = report.currency ?? 'XOF';

  const fmt = (v) => formatAmount(Number(v ?? 0), currency, 'fr');

  function submit() {
    if (!window.confirm('Soumettre cette note de frais pour approbation ?')) return;
    setLoading(true);
    // Route à exposer côté backend : POST /rh/notes-de-frais/{id}/submit → ExpenseController@submit
    router.post(`/rh/notes-de-frais/${report.id}/submit`, {}, { preserveScroll: true, onFinish: () => setLoading(false) });
  }

  function approve() {
    if (!window.confirm('Approuver cette note de frais ?')) return;
    setLoading(true);
    router.post(route('rh.notes-de-frais.approve', report.id), {}, { preserveScroll: true, onFinish: () => setLoading(false) });
  }

  function reject() {
    const reason = window.prompt('Motif du refus (optionnel) :') ?? '';
    setLoading(true);
    router.post(route('rh.notes-de-frais.reject', report.id), { reason }, { preserveScroll: true, onFinish: () => setLoading(false) });
  }

  return (
    <AuthLayout>
      <Head title={`Note de frais — ${report.title ?? ''}`} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={Receipt}
          title={report.title || 'Note de frais'}
          breadcrumbs={[
            { label: 'Ressources Humaines', href: route('rh.index') },
            { label: 'Notes de frais', href: route('rh.notes-de-frais.index') },
            { label: report.title || 'Détail' },
          ]}
          meta={<StatusBadge status={report.status} />}
          actions={
            <>
              {report.status === 'draft' && (
                <Button variant="primary" icon={Send} loading={loading} onClick={submit}>
                  Soumettre
                </Button>
              )}
              {report.status === 'submitted' && (
                <>
                  <Button variant="primary" icon={CheckCircle2} loading={loading} onClick={approve}>
                    Approuver
                  </Button>
                  <Button variant="secondary" icon={XCircle} disabled={loading} onClick={reject}
                          className="hover:text-red-600 dark:hover:text-red-400">
                    Refuser
                  </Button>
                </>
              )}
              <Button as={Link} href={route('rh.notes-de-frais.index')} variant="ghost">
                Retour
              </Button>
            </>
          }
        />

        <div className="space-y-6">

          {/* Récapitulatif */}
          <Card title="Récapitulatif">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Field label="Employé" hint={report.employee?.position}>
                {empName(report.employee)}
              </Field>

              <Field label="Total">
                <span className={cx('text-lg font-semibold', NUM)}>{fmt(total)}</span>
              </Field>

              {report.period_month && (
                <Field label="Période">
                  <span className={NUM}>{report.period_month}</span>
                </Field>
              )}

              {report.approver && (
                <Field label="Approbateur">{report.approver.name}</Field>
              )}
            </div>

            {report.rejection_reason && (
              <div className="mt-6 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-500/30 dark:bg-red-500/10">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                <p className="text-sm text-red-700 dark:text-red-300">{report.rejection_reason}</p>
              </div>
            )}

            {report.notes && (
              <p className={cx('mt-6 border-t pt-4 text-sm', BORDER, TEXT_BODY)}>{report.notes}</p>
            )}
          </Card>

          {/* Lignes de dépense */}
          <Card
            padded={false}
            title="Lignes de dépense"
            subtitle={`${items.length} ligne${items.length > 1 ? 's' : ''}`}
            actions={<span className={cx('text-sm font-semibold', TEXT_TITLE, NUM)}>{fmt(total)}</span>}
          >
            {items.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Aucune ligne de dépense"
                description="Cette note ne contient encore aucune dépense. Ajoutez des lignes avant de la soumettre."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className={cx(SURFACE_SUNK, 'border-b', BORDER)}>
                    <tr>
                      <th scope="col" className={cx('px-4 py-3 text-left', TH)}>Dépense</th>
                      <th scope="col" className={cx('px-4 py-3 text-left', TH)}>Catégorie</th>
                      <th scope="col" className={cx('px-4 py-3 text-left whitespace-nowrap', TH)}>Date</th>
                      <th scope="col" className={cx('px-4 py-3 text-right whitespace-nowrap', TH)}>Montant</th>
                    </tr>
                  </thead>
                  <tbody className={cx('divide-y', DIVIDE)}>
                    {items.map((item, i) => {
                      const cat  = CATEGORIES[item.category] ?? CATEGORIES.other;
                      const Icon = cat.icon;
                      return (
                        <tr key={item.id ?? i} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04]">
                          <td className={cx('px-4 py-3', TEXT_BODY)}>
                            {item.description || <span className={TEXT_FAINT}>—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
                              <Icon className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                              {cat.label}
                            </span>
                          </td>
                          <td className={cx('px-4 py-3 whitespace-nowrap', TEXT_MUTED, NUM)}>
                            {item.expense_date
                              ? new Date(item.expense_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                              : <span className={TEXT_FAINT}>—</span>}
                          </td>
                          <td className={cx('px-4 py-3 text-right whitespace-nowrap font-medium', TEXT_TITLE, NUM)}>
                            {fmt(item.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className={cx(SURFACE_SUNK, 'border-t', BORDER)}>
                    <tr>
                      <td colSpan={3} className={cx('px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider', TEXT_MUTED)}>
                        Total
                      </td>
                      <td className={cx('px-4 py-3 text-right font-semibold whitespace-nowrap', TEXT_TITLE, NUM)}>
                        {fmt(total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AuthLayout>
  );
}
