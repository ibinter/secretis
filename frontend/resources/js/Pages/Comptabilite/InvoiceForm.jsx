/**
 * Comptabilite/InvoiceForm.jsx — Formulaire facture SECRETIS ERP
 *
 * Props Inertia :
 *   clients    : AccountingClient[]
 *   invoice    : Invoice (null si création)
 *   defaultTax : number (18 par défaut)
 *
 * Fonctionnalités :
 *   - Lignes dynamiques (ajouter / supprimer)
 *   - Calcul automatique sous-total, TVA, total
 *   - Aperçu en temps réel (panneau droit)
 *   - TVA configurable
 *   - Sauvegarde brouillon
 */

import { Head, router } from '@inertiajs/react';
import { useState, useCallback, useMemo } from 'react';
import { PlusIcon, TrashIcon, CheckIcon, EyeIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';

// Formateur FCFA
const fcfa = (v) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v ?? 0) + ' FCFA';

// Ligne vide par défaut
const emptyLine = () => ({
  id: Math.random().toString(36).slice(2),
  description: '',
  quantity: 1,
  unit_price: 0,
});

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

  // ===== Calculs en temps réel =====
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
        await axios.put(`/comptabilite/invoices/${invoice.id}`, payload);
        toast.success('Facture mise à jour.');
        router.visit('/comptabilite/invoices');
      } else {
        const { data } = await axios.post('/comptabilite/invoices', payload);
        toast.success(`Facture ${data.invoice.invoice_number} créée.`);
        router.visit('/comptabilite/invoices');
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

      <div className="p-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? `Modifier ${invoice.invoice_number}` : 'Nouvelle facture'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Devise : FCFA (XOF) — TVA par défaut : 18% (Côte d'Ivoire)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview((p) => !p)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <EyeIcon className="h-4 w-4" />
              {showPreview ? 'Masquer' : 'Aperçu'}
            </button>
          </div>
        </div>

        <div className={`grid gap-6 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-3xl'}`}>

          {/* ===== Formulaire ===== */}
          <div className="space-y-5">

            {/* Client */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Informations générales</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.client_id}
                    onChange={(e) => setForm((p) => ({ ...p, client_id: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30 ${errors.client_id ? 'border-red-400' : 'border-gray-200'}`}
                  >
                    <option value="">— Sélectionner un client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {errors.client_id && <p className="text-xs text-red-500 mt-1">{errors.client_id[0]}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Objet / Titre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Prestation conseil — Mars 2026"
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30 ${errors.title ? 'border-red-400' : 'border-gray-200'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date d'émission *</label>
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date d'échéance</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30"
                  />
                </div>
              </div>
            </div>

            {/* Lignes */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">Lignes de facturation</h2>
                <button
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 text-xs text-[#1A3A5C] font-medium hover:underline"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Ajouter une ligne
                </button>
              </div>

              {/* En-têtes */}
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Qté</div>
                <div className="col-span-3 text-right">Prix HT</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1" />
              </div>

              <div className="space-y-2">
                {items.map((item) => {
                  const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Description du service ou produit"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, 'unit_price', e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30"
                        />
                      </div>
                      <div className="col-span-1 text-right text-sm font-medium text-gray-700 tabular-nums">
                        {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(lineTotal)}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={items.length <= 1}
                          className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-20 transition"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TVA et remise */}
              <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Taux TVA (%)
                  </label>
                  <div className="flex items-center gap-2">
                    {[0, 10, 18].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setForm((p) => ({ ...p, tax_rate: rate }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          parseFloat(form.tax_rate) === rate
                            ? 'bg-[#1A3A5C] text-white border-[#1A3A5C]'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                    <input
                      type="number"
                      min="0" max="100" step="0.5"
                      value={form.tax_rate}
                      onChange={(e) => setForm((p) => ({ ...p, tax_rate: e.target.value }))}
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remise (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.discount_amount}
                    onChange={(e) => setForm((p) => ({ ...p, discount_amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30"
                  />
                </div>
              </div>
            </div>

            {/* Notes et conditions */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Notes &amp; Conditions</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes internes / client</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="Informations complémentaires à afficher sur la facture..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Conditions de paiement / mentions légales</label>
                  <textarea
                    rows={2}
                    value={form.terms}
                    onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))}
                    placeholder="Paiement à 30 jours. Tout retard entraîne des pénalités..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A5C]/30 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={() => router.visit('/comptabilite/invoices')}
                className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="flex-1 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer brouillon'}
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1A3A5C] text-white rounded-xl text-sm font-medium hover:bg-[#16324e] disabled:opacity-50 transition"
              >
                <CheckIcon className="h-4 w-4" />
                {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer la facture'}
              </button>
            </div>
          </div>

          {/* ===== Aperçu ===== */}
          {showPreview && (
            <div className="hidden lg:block">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sticky top-6">
                {/* En-tête aperçu */}
                <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-[#1A3A5C]">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Votre organisation</div>
                    <div className="w-24 h-2 bg-gray-200 rounded mb-2" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#1A3A5C]">FACTURE</div>
                    <div className="text-sm text-gray-500">{isEdit ? invoice.invoice_number : 'FACT-2026-XXXXX'}</div>
                    <div className="text-xs text-gray-400 mt-1">{form.issue_date || '—'}</div>
                  </div>
                </div>

                {/* Client aperçu */}
                {selectedClient && (
                  <div className="mb-5 p-3 bg-blue-50 rounded-lg border-l-4 border-[#1A3A5C]">
                    <div className="text-xs text-gray-500 mb-1">Facturé à</div>
                    <div className="font-semibold text-gray-800">{selectedClient.name}</div>
                    {selectedClient.email && (
                      <div className="text-xs text-gray-500 mt-0.5">{selectedClient.email}</div>
                    )}
                  </div>
                )}

                {/* Objet */}
                {form.title && (
                  <div className="mb-4 text-sm text-gray-700">
                    <span className="font-medium">Objet :</span> {form.title}
                  </div>
                )}

                {/* Tableau items */}
                <table className="w-full text-xs mb-4">
                  <thead>
                    <tr className="bg-[#1A3A5C] text-white">
                      <th className="px-2 py-1.5 text-left">Description</th>
                      <th className="px-2 py-1.5 text-center">Qté</th>
                      <th className="px-2 py-1.5 text-right">P.U.</th>
                      <th className="px-2 py-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const lt = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
                      return (
                        <tr key={it.id} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="px-2 py-1.5 text-gray-700">{it.description || <span className="text-gray-300">—</span>}</td>
                          <td className="px-2 py-1.5 text-center">{it.quantity}</td>
                          <td className="px-2 py-1.5 text-right">{new Intl.NumberFormat('fr-FR').format(it.unit_price)}</td>
                          <td className="px-2 py-1.5 text-right font-medium">{new Intl.NumberFormat('fr-FR').format(lt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totaux */}
                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Sous-total HT</span>
                    <span>{fcfa(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>TVA ({form.tax_rate}%)</span>
                    <span>{fcfa(taxAmount)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-xs text-red-500">
                      <span>Remise</span>
                      <span>- {fcfa(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center bg-[#1A3A5C] text-white rounded-lg px-3 py-2 mt-2">
                    <span className="font-bold text-sm">TOTAL TTC</span>
                    <span className="font-bold text-base">{fcfa(total)}</span>
                  </div>
                </div>

                {form.notes && (
                  <div className="mt-4 p-2 bg-yellow-50 rounded text-xs text-yellow-800 border border-yellow-200">
                    <strong>Notes :</strong> {form.notes}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </AuthLayout>
  );
}
