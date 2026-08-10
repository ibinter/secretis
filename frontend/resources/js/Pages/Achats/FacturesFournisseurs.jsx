/**
 * Achats/FacturesFournisseurs.jsx — la dernière étape du cycle achat.
 *
 * Le cycle s'arrêtait à la réception : aucune table ne portait la facture du
 * fournisseur, donc aucune TVA déductible. L'entreprise déclarait la TVA
 * qu'elle collecte sans déduire celle qu'elle avait déjà supportée.
 *
 * La ventilation HT / TVA / TTC est saisie telle qu'elle figure sur le document
 * du fournisseur : reconstituer une TVA à partir d'un TTC produit des écarts au
 * centime que le contrôle fiscal relève.
 */

import { useMemo, useState } from 'react';
import { Head, router, useForm, Link } from '@inertiajs/react';
import {
  Receipt, BookOpen, Plus, AlertTriangle, CheckCircle2, ArrowLeft,
} from 'lucide-react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState, Modal,
  FormInput, Select,
  cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const STATUTS = {
  draft:     { label: 'Brouillon', variant: 'neutral' },
  received:  { label: 'Reçue',     variant: 'info' },
  paid:      { label: 'Réglée',    variant: 'success' },
  disputed:  { label: 'Contestée', variant: 'warning' },
  cancelled: { label: 'Annulée',   variant: 'danger' },
};

export default function FacturesFournisseurs({
  factures = [], fournisseurs = [], comptesCharge = [], aComptabiliser = 0,
}) {
  const [saisie, setSaisie] = useState(false);

  const enAttente = useMemo(
    () => factures.filter((f) => !f.comptabilisee && f.status !== 'draft' && f.status !== 'cancelled'),
    [factures],
  );

  const tvaEnAttente = useMemo(
    () => enAttente.reduce((t, f) => t + Number(f.tax_amount ?? 0), 0),
    [enAttente],
  );

  return (
    <AuthLayout>
      <Head title="Factures fournisseurs" />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={Receipt}
          title="Factures fournisseurs"
          subtitle="Le seul document qui porte la TVA déductible."
          breadcrumbs={[{ label: 'Achats', href: '/achats' }, { label: 'Factures' }]}
          actions={
            <div className="flex gap-2">
              {aComptabiliser > 0 && (
                <Button
                  variant="subtle"
                  onClick={() => router.post('/achats/factures/comptabiliser-tout', {}, { preserveScroll: true })}
                >
                  <BookOpen className="h-4 w-4" /> Tout comptabiliser
                </Button>
              )}
              <Button onClick={() => setSaisie(true)}>
                <Plus className="h-4 w-4" /> Saisir une facture
              </Button>
            </div>
          }
        />

        {tvaEnAttente > 0 && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <strong>{fmt(tvaEnAttente)} de TVA déductible</strong> ne figurent pas encore au journal.
              Tant que ces écritures ne sont pas passées, vous payez une taxe que vous avez déjà supportée.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Receipt}       label="Factures"           value={factures.length} />
          <StatCard icon={BookOpen}      label="À comptabiliser"    value={enAttente.length} />
          <StatCard icon={AlertTriangle} label="TVA récupérable"    value={fmt(tvaEnAttente)} />
          <StatCard icon={CheckCircle2}  label="Total TTC reçu"
                    value={fmt(factures.reduce((t, f) => t + Number(f.total ?? 0), 0))} />
        </div>

        <Card title="Factures reçues">
          {factures.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Aucune facture fournisseur"
              description="Saisissez les factures reçues de vos fournisseurs pour récupérer la TVA qu'elles portent."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-2 py-2">N° facture</th>
                    <th className="px-2 py-2">Fournisseur</th>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2 text-right">HT</th>
                    <th className="px-2 py-2 text-right">TVA</th>
                    <th className="px-2 py-2 text-right">TTC</th>
                    <th className="px-2 py-2">Statut</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {factures.map((f) => (
                    <tr key={f.id} className={cx('border-b', BORDER)}>
                      <td className={cx('px-2 py-2.5 font-medium', TEXT_TITLE, NUM)}>{f.invoice_number}</td>
                      <td className="px-2 py-2.5">{f.supplier}</td>
                      <td className={cx('px-2 py-2.5 text-xs', TEXT_FAINT)}>{f.invoice_date}</td>
                      <td className={cx('px-2 py-2.5 text-right', NUM)}>{fmt(f.subtotal)}</td>
                      <td className={cx('px-2 py-2.5 text-right', NUM)}>{fmt(f.tax_amount)}</td>
                      <td className={cx('px-2 py-2.5 text-right font-medium', NUM)}>{fmt(f.total)}</td>
                      <td className="px-2 py-2.5">
                        <Badge variant={STATUTS[f.status]?.variant ?? 'neutral'}>
                          {STATUTS[f.status]?.label ?? f.status}
                        </Badge>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        {f.comptabilisee ? (
                          <span className={cx('inline-flex items-center gap-1 text-xs', TEXT_FAINT)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Comptabilisée
                          </span>
                        ) : f.status === 'draft' || f.status === 'cancelled' ? (
                          <span className={cx('text-xs', TEXT_FAINT)}>—</span>
                        ) : (
                          <Button
                            variant="subtle" size="sm"
                            onClick={() => router.post(`/achats/factures/${f.id}/comptabiliser`, {}, { preserveScroll: true })}
                          >
                            <BookOpen className="h-4 w-4" /> Comptabiliser
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Link href="/achats" className={cx('inline-flex items-center gap-1.5 text-sm', TEXT_MUTED)}>
          <ArrowLeft className="h-4 w-4" /> Retour aux achats
        </Link>
      </div>

      <ModalSaisie
        open={saisie}
        onClose={() => setSaisie(false)}
        fournisseurs={fournisseurs}
        comptesCharge={comptesCharge}
      />
    </AuthLayout>
  );
}

/**
 * Le taux et le HT calculent la TVA et le TTC, mais les trois restent
 * modifiables : une facture réelle comporte parfois un arrondi ou une ligne
 * exonérée que le calcul théorique ne reproduit pas. Le serveur revérifie la
 * cohérence avant d'écrire.
 */
function ModalSaisie({ open, onClose, fournisseurs, comptesCharge }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    supplier_id: '', invoice_number: '', invoice_date: '', due_date: '',
    subtotal: '', tax_rate: '18', tax_amount: '', total: '',
    expense_account: '', notes: '',
  });

  const recalculer = (ht, taux) => {
    const h = parseFloat(ht) || 0;
    const t = parseFloat(taux) || 0;
    const tva = Math.round(h * t) / 100;
    setData((d) => ({ ...d, subtotal: ht, tax_rate: taux, tax_amount: String(tva), total: String(h + tva) }));
  };

  const ecart = Math.abs(
    (parseFloat(data.subtotal) || 0) + (parseFloat(data.tax_amount) || 0) - (parseFloat(data.total) || 0),
  ) > 0.01;

  const optionsFournisseurs = fournisseurs.map((f) => ({ value: String(f.id), label: f.company_name }));

  const optionsComptes = [
    { value: '', label: 'Compte par défaut du paramétrage' },
    ...comptesCharge.map((c) => ({ value: c.account_number, label: `${c.account_number} — ${c.account_name}` })),
  ];

  const soumettre = (e) => {
    e.preventDefault();
    post('/achats/factures', { preserveScroll: true, onSuccess: () => { reset(); onClose(); } });
  };

  return (
    <Modal open={open} onClose={onClose} title="Saisir une facture fournisseur">
      <form onSubmit={soumettre} className="space-y-4">
        {errors.facture && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{errors.facture}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Fournisseur"
            options={optionsFournisseurs}
            value={data.supplier_id}
            onChange={(v) => setData('supplier_id', v)}
            error={errors.supplier_id}
            placeholder="Choisir un fournisseur…"
          />

          <FormInput
            id="fact-num" label="N° de la facture" required
            hint="Celui qui figure sur le document du fournisseur"
            value={data.invoice_number}
            onChange={(e) => setData('invoice_number', e.target.value)}
            error={errors.invoice_number}
          />

          <FormInput
            id="fact-date" label="Date de facture" type="date" required
            value={data.invoice_date}
            onChange={(e) => setData('invoice_date', e.target.value)}
            error={errors.invoice_date}
          />

          <FormInput
            id="fact-ech" label="Échéance" type="date"
            value={data.due_date}
            onChange={(e) => setData('due_date', e.target.value)}
            error={errors.due_date}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <FormInput
            id="fact-ht" label="Montant HT" type="number" step="0.01" required
            value={data.subtotal}
            onChange={(e) => recalculer(e.target.value, data.tax_rate)}
            error={errors.subtotal}
          />
          <FormInput
            id="fact-taux" label="Taux TVA" type="number" step="0.01" suffix="%"
            value={data.tax_rate}
            onChange={(e) => recalculer(data.subtotal, e.target.value)}
          />
          <FormInput
            id="fact-tva" label="TVA" type="number" step="0.01" required
            value={data.tax_amount}
            onChange={(e) => setData('tax_amount', e.target.value)}
            error={errors.tax_amount}
          />
          <FormInput
            id="fact-ttc" label="Total TTC" type="number" step="0.01" required
            value={data.total}
            onChange={(e) => setData('total', e.target.value)}
            error={errors.total}
          />
        </div>

        {ecart && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Le TTC ne correspond pas au HT plus la TVA. Une facture incohérente produirait une
            écriture équilibrée mais fausse — vérifiez la saisie.
          </div>
        )}

        <Select
          label="Compte de charge"
          options={optionsComptes}
          value={data.expense_account}
          onChange={(v) => setData('expense_account', v)}
          error={errors.expense_account}
          hint="Selon la nature de l'achat : fournitures, loyer, maintenance…"
        />

        <FormInput
          id="fact-objet" label="Objet" as="textarea" rows={2}
          placeholder="Nature de la prestation ou de la fourniture"
          value={data.notes}
          onChange={(e) => setData('notes', e.target.value)}
          error={errors.notes}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="subtle" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={processing || ecart}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}
