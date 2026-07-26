/**
 * RH/NoteFrais/Form.jsx — Formulaire de note de frais SECRETIS ERP
 *
 * Fonctionnalités :
 *   - Lignes dynamiques (ajout / suppression)
 *   - Upload justificatifs par ligne (drag & drop)
 *   - Calcul total automatique en temps réel
 *   - Catégories : Transport, Hébergement, Repas, Divers
 *   - Prévisualisation avant soumission
 *
 * Ce composant est utilisé pour :
 *   - Créer une note : POST /rh/frais
 *   - Modifier une note existante (mode edit)
 */

import { useState, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  Plus, Trash2, Upload, X, FileText, Receipt,
  ArrowLeft, Eye, Send, Save, Loader2,
  Car, Hotel, UtensilsCrossed, MoreHorizontal
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: 'transport',     label: 'Transport',    icon: Car,              color: 'text-purple-500'  },
  { value: 'accommodation', label: 'Hébergement',  icon: Hotel,            color: 'text-purple-500' },
  { value: 'meals',         label: 'Repas',        icon: UtensilsCrossed,  color: 'text-orange-500' },
  { value: 'other',         label: 'Divers',       icon: MoreHorizontal,   color: 'text-gray-500'  },
];

const EMPTY_ITEM = {
  category:     'transport',
  description:  '',
  amount:       '',
  expense_date: '',
  receipt:      null,
  receiptUrl:   null,
  id:           null, // ID ligne existante (mode edit)
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

const fmtAmount = (n) => {
  if (! n && n !== 0) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(Number(n)) + ' FCFA';
};

// ---------------------------------------------------------------------------
// Zone d'upload justificatif (drag & drop)
// ---------------------------------------------------------------------------

function ReceiptUpload({ item, index, onChange }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (! file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 5 Mo).'); return; }
    const accepted = ['application/pdf', 'image/jpeg', 'image/png'];
    if (! accepted.includes(file.type)) { toast.error('Format accepté : PDF, JPG, PNG.'); return; }

    const url = URL.createObjectURL(file);
    onChange(index, { receipt: file, receiptUrl: url });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const removeReceipt = (e) => {
    e.stopPropagation();
    if (item.receiptUrl) URL.revokeObjectURL(item.receiptUrl);
    onChange(index, { receipt: null, receiptUrl: null });
  };

  return (
    <div
      onClick={() => ! item.receipt && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`relative flex items-center justify-center rounded-lg border-2 border-dashed transition-all cursor-pointer min-h-12 ${
        item.receipt
          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
          : dragging
            ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-700'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />

      {item.receipt ? (
        <div className="flex items-center gap-2 px-3 py-2 w-full">
          <Receipt className="w-4 h-4 text-green-500 flex-shrink-0" />
          <span className="text-xs text-green-700 dark:text-green-300 truncate flex-1">
            {item.receipt.name}
          </span>
          {item.receiptUrl && item.receipt.type?.startsWith('image/') && (
            <a href={item.receiptUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
              <Eye className="w-3.5 h-3.5 text-green-500 hover:text-green-700" />
            </a>
          )}
          <button onClick={removeReceipt} className="flex-shrink-0">
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 py-3 text-center px-2">
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Justificatif</span>
        </div>
      )}
    </div>
  );
}

ReceiptUpload.propTypes = {
  item:     PropTypes.object.isRequired,
  index:    PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Ligne de dépense
// ---------------------------------------------------------------------------

function ExpenseItemRow({ item, index, onUpdate, onRemove, isOnly }) {
  const CatIcon = CATEGORIES.find(c => c.value === item.category)?.icon || MoreHorizontal;

  const update = (field, value) => onUpdate(index, { [field]: value });

  return (
    <div className="grid grid-cols-12 gap-2 items-start py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0 group">
      {/* Numéro */}
      <div className="col-span-1 flex items-center justify-center pt-2.5">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          {index + 1}
        </span>
      </div>

      {/* Catégorie */}
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Catégorie</label>
        <select
          value={item.category}
          onChange={e => update('category', e.target.value)}
          className="w-full px-2 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Description */}
      <div className="col-span-3">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Description</label>
        <input
          type="text"
          value={item.description}
          onChange={e => update('description', e.target.value)}
          placeholder="Taxi aéroport, Hôtel Ibis…"
          required
          className="w-full px-2 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {/* Date */}
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date</label>
        <input
          type="date"
          value={item.expense_date}
          onChange={e => update('expense_date', e.target.value)}
          required
          className="w-full px-2 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {/* Montant */}
      <div className="col-span-2">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Montant (FCFA)</label>
        <input
          type="number"
          value={item.amount}
          onChange={e => update('amount', e.target.value)}
          placeholder="0"
          min="0"
          step="1"
          required
          className="w-full px-2 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none text-right font-mono"
        />
      </div>

      {/* Justificatif */}
      <div className="col-span-1">
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Justif.</label>
        <ReceiptUpload item={item} index={index} onChange={(i, patch) => onUpdate(i, patch)} />
      </div>

      {/* Supprimer */}
      <div className="col-span-1 flex items-center justify-center pt-6">
        {! isOnly && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

ExpenseItemRow.propTypes = {
  item:     PropTypes.object.isRequired,
  index:    PropTypes.number.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  isOnly:   PropTypes.bool,
};

// ---------------------------------------------------------------------------
// Panel de prévisualisation
// ---------------------------------------------------------------------------

function PreviewPanel({ title, period, items, onClose, onSubmit, submitting }) {
  const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Prévisualisation</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title} — {period}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                <th className="pb-2 text-left">#</th>
                <th className="pb-2 text-left">Catégorie</th>
                <th className="pb-2 text-left">Description</th>
                <th className="pb-2 text-left">Date</th>
                <th className="pb-2 text-right">Montant</th>
                <th className="pb-2 text-center">Just.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item, i) => {
                const cat = CATEGORIES.find(c => c.value === item.category);
                const CatIcon = cat?.icon || MoreHorizontal;
                return (
                  <tr key={i}>
                    <td className="py-3 text-gray-400">{i + 1}</td>
                    <td className="py-3">
                      <span className={`flex items-center gap-1.5 text-xs ${cat?.color}`}>
                        <CatIcon className="w-3.5 h-3.5" />
                        {cat?.label}
                      </span>
                    </td>
                    <td className="py-3 text-gray-900 dark:text-white">{item.description}</td>
                    <td className="py-3 text-gray-500 dark:text-gray-400 text-xs">{item.expense_date}</td>
                    <td className="py-3 text-right font-mono font-medium text-gray-900 dark:text-white">
                      {fmtAmount(item.amount)}
                    </td>
                    <td className="py-3 text-center">
                      {item.receipt
                        ? <span className="text-green-500 text-lg" title={item.receipt.name}>✓</span>
                        : <span className="text-gray-300 dark:text-gray-600 text-lg">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-gray-700 font-bold">
                <td colSpan={4} className="pt-3 text-gray-900 dark:text-white">Total</td>
                <td className="pt-3 text-right font-mono text-lg text-purple-600 dark:text-purple-400">{fmtAmount(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} ligne{items.length > 1 ? 's' : ''}</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{fmtAmount(total)}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Modifier
            </button>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Soumettre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

PreviewPanel.propTypes = {
  title:      PropTypes.string.isRequired,
  period:     PropTypes.string.isRequired,
  items:      PropTypes.array.isRequired,
  onClose:    PropTypes.func.isRequired,
  onSubmit:   PropTypes.func.isRequired,
  submitting: PropTypes.bool,
};

// ---------------------------------------------------------------------------
// Page / composant principal
// ---------------------------------------------------------------------------

export default function NoteFraisForm({ employee }) {
  const [title, setTitle]   = useState('');
  const [period, setPeriod] = useState('');
  const [notes, setNotes]   = useState('');
  const [items, setItems]   = useState([{ ...EMPTY_ITEM, _key: Date.now() }]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [errors, setErrors]           = useState({});

  // Total en temps réel
  const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  // ---------------------------------------------------------------------------
  // Gestion des lignes
  // ---------------------------------------------------------------------------

  const addItem = () => {
    setItems(prev => [...prev, { ...EMPTY_ITEM, _key: Date.now() }]);
  };

  const removeItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index, patch) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  }, []);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  const validate = () => {
    const errs = {};
    if (! title.trim())  errs.title  = 'Le titre est requis.';
    if (! period)        errs.period = 'La période est requise.';

    items.forEach((item, i) => {
      if (! item.description.trim()) errs[`items.${i}.description`] = 'Description manquante.';
      if (! item.amount || parseFloat(item.amount) <= 0) errs[`items.${i}.amount`] = 'Montant invalide.';
      if (! item.expense_date) errs[`items.${i}.expense_date`] = 'Date manquante.';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ---------------------------------------------------------------------------
  // Sauvegarder en brouillon
  // ---------------------------------------------------------------------------

  const saveDraft = async () => {
    if (! validate()) { toast.error('Veuillez corriger les erreurs avant de sauvegarder.'); return; }
    setSaving(true);

    const formData = buildFormData();
    try {
      await axios.post(route('rh.frais.store'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Note de frais sauvegardée en brouillon.');
      router.visit(route('rh.frais.index'));
    } catch (err) {
      const serverErrors = err.response?.data?.errors || {};
      setErrors(serverErrors);
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Soumettre (après prévisualisation)
  // ---------------------------------------------------------------------------

  const handlePreviewSubmit = async () => {
    setSubmitting(true);
    const formData = buildFormData();
    try {
      const { data } = await axios.post(route('rh.frais.store'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Soumettre immédiatement
      await axios.post(route('rh.frais.submit', data.id));
      toast.success('Note de frais soumise pour validation !');
      router.visit(route('rh.frais.index'));
    } catch (err) {
      const serverErrors = err.response?.data?.errors || {};
      setErrors(serverErrors);
      toast.error('Erreur lors de la soumission.');
      setShowPreview(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Construire FormData
  // ---------------------------------------------------------------------------

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('title',        title);
    fd.append('period_month', period);
    fd.append('notes',        notes);

    items.forEach((item, i) => {
      fd.append(`items[${i}][category]`,     item.category);
      fd.append(`items[${i}][description]`,  item.description);
      fd.append(`items[${i}][amount]`,       item.amount);
      fd.append(`items[${i}][expense_date]`, item.expense_date);
      if (item.receipt) {
        fd.append(`items[${i}][receipt]`, item.receipt, item.receipt.name);
      }
    });

    return fd;
  };

  const handlePreviewOpen = () => {
    if (! validate()) { toast.error('Veuillez corriger les erreurs avant de prévisualiser.'); return; }
    setShowPreview(true);
  };

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------

  return (
    <AuthLayout>
      <Head title="Nouvelle note de frais — RH" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.visit(route('rh.frais.index'))}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nouvelle note de frais</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {employee ? `${employee.first_name} ${employee.last_name}` : 'Remplissez le formulaire et soumettez pour validation'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulaire principal */}
          <div className="lg:col-span-2 space-y-6">

            {/* En-tête de la note */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-500" /> Informations générales
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Titre de la note <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex : Déplacement client Abidjan — Juin 2025"
                  className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none transition ${
                    errors.title ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'
                  }`}
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Période <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition ${
                    errors.period ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'
                  }`}
                />
                {errors.period && <p className="text-xs text-red-500 mt-1">{errors.period}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Contexte du déplacement, informations complémentaires…"
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
              </div>
            </div>

            {/* Lignes de dépenses */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-purple-500" /> Dépenses
                  <span className="text-xs font-normal text-gray-400">({items.length} ligne{items.length > 1 ? 's' : ''})</span>
                </h2>
              </div>

              {/* En-têtes colonnes */}
              <div className="grid grid-cols-12 gap-2 mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                <div className="col-span-1" />
                <div className="col-span-2">Catégorie</div>
                <div className="col-span-3">Description</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Montant</div>
                <div className="col-span-1">Just.</div>
                <div className="col-span-1" />
              </div>

              {/* Lignes */}
              <div>
                {items.map((item, i) => (
                  <ExpenseItemRow
                    key={item._key || i}
                    item={item}
                    index={i}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    isOnly={items.length === 1}
                  />
                ))}
              </div>

              {/* Erreurs lignes */}
              {Object.entries(errors).filter(([k]) => k.startsWith('items.')).map(([k, v]) => (
                <p key={k} className="text-xs text-red-500 mt-1">Ligne {parseInt(k.split('.')[1]) + 1} : {v}</p>
              ))}

              {/* Ajouter une ligne */}
              <button
                type="button"
                onClick={addItem}
                className="mt-4 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter une dépense
              </button>
            </div>

            {/* Catégories légende */}
            <div className="flex flex-wrap gap-4 px-1">
              {CATEGORIES.map(({ value, label, icon: Icon, color }) => (
                <div key={value} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Panneau latéral — Récapitulatif & Actions */}
          <div className="space-y-4">
            {/* Total */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-500" /> Récapitulatif
              </h3>

              <div className="space-y-2 mb-4">
                {CATEGORIES.map(({ value, label, icon: Icon, color }) => {
                  const catTotal = items
                    .filter(i => i.category === value)
                    .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                  if (catTotal === 0) return null;
                  return (
                    <div key={value} className="flex items-center justify-between text-sm">
                      <span className={`flex items-center gap-1.5 text-gray-600 dark:text-gray-400 ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </span>
                      <span className="font-mono text-gray-900 dark:text-white">{fmtAmount(catTotal)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                    {fmtAmount(total)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {items.filter(i => i.receipt).length}/{items.length} justificatifs fournis
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <button
                onClick={handlePreviewOpen}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" /> Prévisualiser & Soumettre
              </button>

              <button
                onClick={saveDraft}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sauvegarder brouillon
              </button>

              <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                Le brouillon est modifiable à tout moment.<br />
                La soumission déclenche la validation manager.
              </p>
            </div>

            {/* Aide */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-4">
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium mb-1">Formats acceptés</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Justificatifs : PDF, JPG, PNG (max 5 Mo par fichier).
                Conservez les originaux pour contrôle comptable.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal prévisualisation */}
      {showPreview && (
        <PreviewPanel
          title={title}
          period={period}
          items={items}
          onClose={() => setShowPreview(false)}
          onSubmit={handlePreviewSubmit}
          submitting={submitting}
        />
      )}
    </AuthLayout>
  );
}

// eslint-disable-next-line no-unused-vars
function BarChart2({ className }) { return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="18" y="3" width="4" height="18" rx="1" /><rect x="10" y="8" width="4" height="13" rx="1" /><rect x="2" y="13" width="4" height="8" rx="1" /></svg>; }

NoteFraisForm.propTypes = {
  employee: PropTypes.shape({
    id:         PropTypes.string,
    first_name: PropTypes.string,
    last_name:  PropTypes.string,
  }),
};
export { NoteFraisForm };
