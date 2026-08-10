/**
 * Comptabilite/InvoiceForm.jsx — Formulaire facture SECRETIS ERP
 *
 * Props Inertia :
 *   clients    : AccountingClient[]
 *   invoice    : Invoice (null si création)
 *   defaultTax : number (18 par défaut)
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Les calculs (sous-total, TVA, remise, total) et le payload envoyé à
 * `/comptabilite/factures` sont STRICTEMENT inchangés.
 */

import { Head, router } from '@inertiajs/react';
import { useState, useCallback, useMemo } from 'react';
import {
  PlusIcon, TrashIcon, CheckIcon, EyeIcon, EyeSlashIcon, DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Card,
  cx, CONTROL, BORDER, SURFACE_SUNK, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM,
} from '@/Components/UI';
import { money, amount, TABLE_HEAD, TH_CELL } from '@/Components/Comptabilite/accounting';

// Ligne vide par défaut
const emptyLine = () => ({
  id: Math.random().toString(36).slice(2),
  description: '',
  quantity: 1,
  unit_price: 0,
});

const TAX_PRESETS = [0, 10, 18];

// =============================================================================

export default function InvoiceForm({ clients, invoice, defaultTax }) {
  const isEdit = !!invoice;

  const [form, setForm] = useState({
    client_id:       invoice?.client_id ?? '',
    title:           invoice?.title ?? '',
    issue_date:      invoice?.issue_date ?? new Date().toISOString().slice(0, 10),
    due_date:        invoice?.due_date ?? '',
    tax_rate:        invoice?.tax_rate ?? defaultTax ?? 18,
    discount_amount: invoice?.discount_amount ?? 0,
    notes:           invoice?.notes ?? '',
    terms:           invoice?.terms ?? '',
  });

  const [items, setItems] = useState(
    invoice?.items?.length
      ? invoice.items.map((it) => ({ id: it.id, description: it.description, quantity: it.quantity, unit_price: it.unit_price }))
      : [emptyLine()]
  );

  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [errors, setErrors] = useState({});

  // ===== Calculs en temps réel (inchangés) =====
  const subtotal = useMemo(
    () => items.reduce((acc, it) => acc + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0),
    [items]
  );
  const taxAmount   = useMemo(() => subtotal * (parseFloat(form.tax_rate) || 0) / 100, [subtotal, form.tax_rate]);
  const discount    = parseFloat(form.discount_amount) || 0;
  const total       = useMemo(() => Math.max(0, subtotal + taxAmount - discount), [subtotal, taxAmount, discount]);

  // ===== Mutations items =====
  const updateItem = useCallback((id, field, value) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it));
  }, []);

  const addItem = useCallback(() => setItems((prev) => [...prev, emptyLine()]), []);

  const removeItem = useCallback((id) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((it) => it.id !== id);
    });
  }, []);

  // ===== Soumission =====
  const handleSubmit = async (asDraft = false) => {
    setSaving(true);
    setErrors({});

    const payload = {
      ...form,
      items: items.map((it, i) => ({
        description: it.description,
        quantity:    parseFloat(it.quantity) || 1,
        unit_price:  parseFloat(it.unit_price) || 0,
        sort_order:  i,
      })),
    };

    try {
      if (isEdit) {
        await axios.put(`/comptabilite/factures/${invoice.id}`, payload);
        toast.success('Facture mise à jour.');
        router.visit('/comptabilite/factures');
      } else {
        const { data } = await axios.post('/comptabilite/factures', payload);
        toast.success(`Facture ${data.invoice.invoice_number} créée.`);
        router.visit('/comptabilite/factures');
      }
    } catch (e) {
      if (e.response?.status === 422) {
        setErrors(e.response.data.errors ?? {});
        toast.error('Veuillez corriger les erreurs du formulaire.');
      } else {
        toast.error('Une erreur est survenue.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Trouver le client sélectionné (pour l'aperçu)
  const selectedClient = clients.find((c) => String(c.id) === String(form.client_id));

  // =============================================================================

  return (
    <AuthLayout>
      <Head title={isEdit ? `Modifier ${invoice.invoice_number}` : 'Nouvelle facture'} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={DocumentTextIcon}
          title={isEdit ? `Modifier ${invoice.invoice_number}` : 'Nouvelle facture'}
          breadcrumbs={[
            { label: 'Comptabilité', href: '/comptabilite' },
            { label: 'Factures', href: '/comptabilite/factures' },
            { label: isEdit ? invoice.invoice_number : 'Nouvelle' },
          ]}
          subtitle="Devise FCFA (XOF) — TVA par défaut 18 % (Côte d'Ivoire)"
          actions={
            <Button
              variant="secondary"
              icon={showPreview ? EyeSlashIcon : EyeIcon}
              onClick={() => setShowPreview((p) => !p)}
            >
              {showPreview ? 'Masquer l\'aperçu' : 'Afficher l\'aperçu'}
            </Button>
          }
        />

        <div className={cx('grid gap-6', showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'max-w-3xl grid-cols-1')}>

          {/* ===== Formulaire ===== */}
          <div className="space-y-6">

            <Card title="Informations générales">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Client *</span>
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
                    className={cx(CONTROL, 'h-10', errors.client_id && 'border-red-400 dark:border-red-500/60')}
                  >
                    <option value="">— Sélectionner un client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.client_id && (
                    <span className="text-xs text-red-600 dark:text-red-400">{errors.client_id[0]}</span>
                  )}
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Objet / Titre *</span>
                  <input
                    type="text"
                    placeholder="Ex : Prestation conseil — Mars 2026"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className={cx(CONTROL, 'h-10', errors.title && 'border-red-400 dark:border-red-500/60')}
                  />
                  {errors.title && (
                    <span className="text-xs text-red-600 dark:text-red-400">{errors.title[0]}</span>
                  )}
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Date d'émission *</span>
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value }))}
                    className={cx(CONTROL, 'h-10')}
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Date d'échéance</span>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                    className={cx(CONTROL, 'h-10')}
                  />
                </label>
              </div>
            </Card>

            <Card
              title="Lignes de facturation"
              flush
              actions={
                <Button variant="subtle" size="sm" icon={PlusIcon} onClick={addItem}>
                  Ajouter une ligne
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className={TABLE_HEAD}>
                    <tr>
                      <th scope="col" className={cx(TH_CELL, 'text-left')}>Description</th>
                      <th scope="col" className={cx(TH_CELL, 'text-center w-24')}>Qté</th>
                      <th scope="col" className={cx(TH_CELL, 'text-right w-36')}>Prix HT</th>
                      <th scope="col" className={cx(TH_CELL, 'text-right w-32')}>Total</th>
                      <th scope="col" className={cx(TH_CELL, 'w-12')}><span className="sr-only">Retirer</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                    {items.map((item) => {
                      const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                      return (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              placeholder="Description du service ou produit"
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              className={cx(CONTROL, 'h-9')}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="0.001" step="0.001"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                              className={cx(CONTROL, 'h-9 text-center tabular-nums')}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" min="0" step="1"
                              value={item.unit_price}
                              onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                              className={cx(CONTROL, 'h-9 text-right tabular-nums')}
                            />
                          </td>
                          <td className={cx('px-3 py-2 text-right whitespace-nowrap font-medium', NUM, TEXT_TITLE)}>
                            {amount(lineTotal)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Button
                              variant="ghost" size="sm" iconOnly icon={TrashIcon}
                              title="Retirer la ligne"
                              className="hover:text-red-600 dark:hover:text-red-400"
                              disabled={items.length <= 1}
                              onClick={() => removeItem(item.id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* TVA et remise */}
              <div className={cx('grid grid-cols-1 gap-6 border-t px-4 py-4 sm:grid-cols-2 sm:px-6', BORDER)}>
                <div className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Taux TVA (%)</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {TAX_PRESETS.map((rate) => (
                      <Button
                        key={rate}
                        size="sm"
                        variant={parseFloat(form.tax_rate) === rate ? 'primary' : 'secondary'}
                        onClick={() => setForm((p) => ({ ...p, tax_rate: rate }))}
                      >
                        {rate} %
                      </Button>
                    ))}
                    <input
                      type="number" min="0" max="100" step="0.5"
                      value={form.tax_rate}
                      onChange={(e) => setForm((p) => ({ ...p, tax_rate: e.target.value }))}
                      className={cx(CONTROL, 'h-9 w-20 text-center tabular-nums')}
                    />
                  </div>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Remise (FCFA)</span>
                  <input
                    type="number" min="0"
                    value={form.discount_amount}
                    onChange={(e) => setForm((p) => ({ ...p, discount_amount: e.target.value }))}
                    className={cx(CONTROL, 'h-10 text-right tabular-nums')}
                  />
                </label>
              </div>
            </Card>

            <Card title="Notes & conditions">
              <div className="space-y-4">
                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>Notes internes / client</span>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Informations complémentaires à afficher sur la facture…"
                    className={cx(CONTROL, 'resize-none')}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={cx('text-xs font-medium', TEXT_MUTED)}>
                    Conditions de paiement / mentions légales
                  </span>
                  <textarea
                    rows={2}
                    value={form.terms}
                    onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))}
                    placeholder="Paiement à 30 jours. Tout retard entraîne des pénalités…"
                    className={cx(CONTROL, 'resize-none')}
                  />
                </label>
              </div>
            </Card>

            {/* Boutons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => router.visit('/comptabilite/factures')}>
                Annuler
              </Button>
              <Button variant="secondary" loading={saving} onClick={() => handleSubmit(true)}>
                Enregistrer le brouillon
              </Button>
              <Button variant="primary" icon={CheckIcon} loading={saving} onClick={() => handleSubmit(false)}>
                {isEdit ? 'Mettre à jour' : 'Créer la facture'}
              </Button>
            </div>
          </div>

          {/* ===== Aperçu ===== */}
          {showPreview && (
            <div className="hidden lg:block">
              <Card className="sticky top-6">
                {/* En-tête aperçu */}
                <div className={cx('flex items-start justify-between gap-4 border-b pb-4', BORDER)}>
                  <div>
                    <p className={cx('text-[11px] uppercase tracking-wider', TEXT_FAINT)}>Votre organisation</p>
                    <div className="mt-2 h-2 w-24 rounded bg-gray-200 dark:bg-white/10" />
                  </div>
                  <div className="text-right">
                    <p className={cx('text-lg font-semibold tracking-tight', TEXT_TITLE)}>FACTURE</p>
                    <p className={cx('text-sm font-mono', TEXT_MUTED)}>
                      {isEdit ? invoice.invoice_number : 'FACT-2026-XXXXX'}
                    </p>
                    <p className={cx('mt-0.5 text-xs tabular-nums', TEXT_FAINT)}>{form.issue_date || '—'}</p>
                  </div>
                </div>

                {/* Client aperçu */}
                {selectedClient && (
                  <div className="mt-5 rounded-lg border-l-2 border-purple-600 bg-purple-50 px-3 py-2 dark:bg-purple-500/10">
                    <p className={cx('text-xs', TEXT_MUTED)}>Facturé à</p>
                    <p className={cx('text-sm font-medium', TEXT_TITLE)}>{selectedClient.name}</p>
                    {selectedClient.email && (
                      <p className={cx('text-xs', TEXT_MUTED)}>{selectedClient.email}</p>
                    )}
                  </div>
                )}

                {form.title && (
                  <p className={cx('mt-4 text-sm', TEXT_TITLE)}>
                    <span className={TEXT_MUTED}>Objet : </span>{form.title}
                  </p>
                )}

                {/* Tableau items */}
                <div className={cx('mt-4 overflow-x-auto rounded-lg border', BORDER)}>
                  <table className="w-full border-collapse text-xs">
                    <thead className={TABLE_HEAD}>
                      <tr>
                        <th scope="col" className={cx('px-2 py-2 text-left', TEXT_MUTED)}>Description</th>
                        <th scope="col" className={cx('px-2 py-2 text-center', TEXT_MUTED)}>Qté</th>
                        <th scope="col" className={cx('px-2 py-2 text-right', TEXT_MUTED)}>P.U.</th>
                        <th scope="col" className={cx('px-2 py-2 text-right', TEXT_MUTED)}>Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-[#1E3048]">
                      {items.map((it) => {
                        const lt = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
                        return (
                          <tr key={it.id}>
                            <td className={cx('px-2 py-1.5', TEXT_TITLE)}>
                              {it.description || <span className={TEXT_FAINT}>—</span>}
                            </td>
                            <td className={cx('px-2 py-1.5 text-center tabular-nums', TEXT_MUTED)}>{it.quantity}</td>
                            <td className={cx('px-2 py-1.5 text-right whitespace-nowrap', NUM, TEXT_MUTED)}>
                              {amount(it.unit_price)}
                            </td>
                            <td className={cx('px-2 py-1.5 text-right whitespace-nowrap font-medium', NUM, TEXT_TITLE)}>
                              {amount(lt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totaux */}
                <dl className={cx('mt-4 space-y-1.5 border-t pt-3 text-sm', BORDER)}>
                  <div className="flex justify-between">
                    <dt className={TEXT_MUTED}>Sous-total HT</dt>
                    <dd className={cx('whitespace-nowrap', NUM, TEXT_TITLE)}>{money(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className={TEXT_MUTED}>TVA ({form.tax_rate} %)</dt>
                    <dd className={cx('whitespace-nowrap', NUM, TEXT_TITLE)}>{money(taxAmount)}</dd>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-red-600 dark:text-red-400">Remise</dt>
                      <dd className={cx('whitespace-nowrap text-red-600 dark:text-red-400', NUM)}>
                        - {money(discount)}
                      </dd>
                    </div>
                  )}
                  <div className={cx(
                    'mt-2 flex items-center justify-between rounded-lg px-3 py-2 font-semibold',
                    SURFACE_SUNK, TEXT_TITLE,
                  )}>
                    <dt>Total TTC</dt>
                    <dd className={cx('whitespace-nowrap text-base', NUM)}>{money(total)}</dd>
                  </div>
                </dl>

                {form.notes && (
                  <p className={cx(
                    'mt-4 rounded-lg border px-3 py-2 text-xs',
                    'border-amber-200 bg-amber-50 text-amber-800',
                    'dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
                  )}>
                    <span className="font-medium">Notes : </span>{form.notes}
                  </p>
                )}
              </Card>
            </div>
          )}

        </div>
      </div>
    </AuthLayout>
  );
}
export { InvoiceForm };
