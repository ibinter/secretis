/**
 * RH/NoteFrais/Form.jsx — Formulaire de note de frais SECRETIS ERP
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * La logique métier est strictement inchangée : mêmes états, même FormData,
 * mêmes noms de routes (`rh.frais.store`, `rh.frais.submit`, `rh.frais.index`).
 *
 * Fonctionnalités :
 *   - Lignes dynamiques (ajout / suppression)
 *   - Upload justificatifs par ligne (drag & drop)
 *   - Calcul total automatique en temps réel
 *   - Catégories : Transport, Hébergement, Repas, Divers
 *   - Prévisualisation avant soumission
 */

import { useState, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  Plus, Trash2, Upload, X, FileText, Receipt, PieChart,
  ArrowLeft, Eye, Send, Save, Check,
  Car, Hotel, UtensilsCrossed, MoreHorizontal,
} from 'lucide-react';
import { formatAmount } from '@/hooks/useCurrency';
import {
  PageHeader, Button, Badge, Card,
  cx, SURFACE_SUNK, BORDER, DIVIDE, CONTROL,
  TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, TH, NUM, FOCUS_RING,
} from '@/Components/UI';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { value: 'transport',     label: 'Transport',   icon: Car },
  { value: 'accommodation', label: 'Hébergement', icon: Hotel },
  { value: 'meals',         label: 'Repas',       icon: UtensilsCrossed },
  { value: 'other',         label: 'Divers',      icon: MoreHorizontal },
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

/** Montant XOF : le helper partagé `formatAmount` reste la source unique. */
const fmtAmount = (n) => {
  if (! n && n !== 0) return '—';
  return formatAmount(Number(n), 'XOF', 'fr');
};

const categoryOf = (value) => CATEGORIES.find(c => c.value === value) ?? CATEGORIES[3];

const FIELD_LABEL = cx('mb-1.5 block text-xs font-medium');

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
      className={cx(
        'relative flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-dashed transition-colors',
        item.receipt
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
          : dragging
            ? 'border-purple-400 bg-purple-50 dark:border-purple-500/50 dark:bg-purple-500/10'
            : cx(BORDER, SURFACE_SUNK, 'hover:border-gray-400 dark:hover:border-gray-500'),
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />

      {item.receipt ? (
        <div className="flex w-full items-center gap-1.5 px-2 py-1.5">
          <Receipt className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span className="flex-1 truncate text-[11px] text-emerald-700 dark:text-emerald-300">
            {item.receipt.name}
          </span>
          {item.receiptUrl && item.receipt.type?.startsWith('image/') && (
            <a
              href={item.receiptUrl} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              title="Aperçu du justificatif"
              className={cx('shrink-0 rounded text-emerald-600 hover:text-emerald-700 dark:text-emerald-400', FOCUS_RING)}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
          <button
            type="button" onClick={removeReceipt} title="Retirer le justificatif"
            className={cx('shrink-0 rounded', TEXT_FAINT, 'hover:text-red-600 dark:hover:text-red-400', FOCUS_RING)}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 px-2 py-2 text-center">
          <Upload className={cx('h-3.5 w-3.5', TEXT_FAINT)} aria-hidden="true" />
          <span className={cx('text-[11px]', TEXT_FAINT)}>Justificatif</span>
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
  const update = (field, value) => onUpdate(index, { [field]: value });

  return (
    <div className={cx('group grid grid-cols-1 gap-3 border-b py-4 last:border-0 sm:grid-cols-12', BORDER)}>

      {/* Numéro */}
      <div className="hidden items-start pt-7 sm:col-span-1 sm:flex sm:justify-center">
        <span className={cx(
          'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium',
          SURFACE_SUNK, TEXT_MUTED, NUM,
        )}>
          {index + 1}
        </span>
      </div>

      {/* Catégorie */}
      <div className="sm:col-span-2">
        <label htmlFor={`cat-${index}`} className={cx(FIELD_LABEL, TEXT_MUTED)}>Catégorie</label>
        <select
          id={`cat-${index}`}
          value={item.category}
          onChange={e => update('category', e.target.value)}
          className={cx(CONTROL, 'h-10')}
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Description */}
      <div className="sm:col-span-3">
        <label htmlFor={`desc-${index}`} className={cx(FIELD_LABEL, TEXT_MUTED)}>Description</label>
        <input
          id={`desc-${index}`}
          type="text"
          value={item.description}
          onChange={e => update('description', e.target.value)}
          placeholder="Taxi aéroport, Hôtel Ibis…"
          required
          className={cx(CONTROL, 'h-10')}
        />
      </div>

      {/* Date */}
      <div className="sm:col-span-2">
        <label htmlFor={`date-${index}`} className={cx(FIELD_LABEL, TEXT_MUTED)}>Date</label>
        <input
          id={`date-${index}`}
          type="date"
          value={item.expense_date}
          onChange={e => update('expense_date', e.target.value)}
          required
          className={cx(CONTROL, 'h-10', NUM)}
        />
      </div>

      {/* Montant */}
      <div className="sm:col-span-2">
        <label htmlFor={`amount-${index}`} className={cx(FIELD_LABEL, TEXT_MUTED)}>Montant (FCFA)</label>
        <input
          id={`amount-${index}`}
          type="number"
          value={item.amount}
          onChange={e => update('amount', e.target.value)}
          placeholder="0"
          min="0"
          step="1"
          required
          className={cx(CONTROL, 'h-10 text-right', NUM)}
        />
      </div>

      {/* Justificatif */}
      <div className="sm:col-span-1">
        <span className={cx(FIELD_LABEL, TEXT_MUTED)}>Justif.</span>
        <ReceiptUpload item={item} index={index} onChange={(i, patch) => onUpdate(i, patch)} />
      </div>

      {/* Supprimer */}
      <div className="flex items-start sm:col-span-1 sm:justify-center sm:pt-6">
        {! isOnly && (
          <Button
            variant="ghost" size="sm" iconOnly icon={Trash2}
            title={`Supprimer la ligne ${index + 1}`}
            onClick={() => onRemove(index)}
            className="hover:text-red-600 dark:hover:text-red-400"
          />
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
// Panneau de prévisualisation
// ---------------------------------------------------------------------------

function PreviewPanel({ title, period, items, onClose, onSubmit, submitting }) {
  const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col">
        <Card
          padded={false}
          className="flex max-h-[90vh] flex-col shadow-xl"
          title="Prévisualisation"
          subtitle={[title, period].filter(Boolean).join(' — ')}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={cx('text-xs', TEXT_MUTED, NUM)}>
                  {items.length} ligne{items.length > 1 ? 's' : ''}
                </p>
                <p className={cx('text-base font-semibold', TEXT_TITLE, NUM)}>{fmtAmount(total)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={onClose}>Modifier</Button>
                <Button variant="primary" icon={Send} loading={submitting} onClick={onSubmit}>
                  Soumettre
                </Button>
              </div>
            </div>
          }
        >
          <div className="overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className={cx(SURFACE_SUNK, 'border-b', BORDER)}>
                <tr>
                  <th scope="col" className={cx('px-4 py-3 text-left', TH)}>#</th>
                  <th scope="col" className={cx('px-4 py-3 text-left', TH)}>Catégorie</th>
                  <th scope="col" className={cx('px-4 py-3 text-left', TH)}>Description</th>
                  <th scope="col" className={cx('px-4 py-3 text-left whitespace-nowrap', TH)}>Date</th>
                  <th scope="col" className={cx('px-4 py-3 text-right whitespace-nowrap', TH)}>Montant</th>
                  <th scope="col" className={cx('px-4 py-3 text-center', TH)}>Just.</th>
                </tr>
              </thead>
              <tbody className={cx('divide-y', DIVIDE)}>
                {items.map((item, i) => {
                  const cat = categoryOf(item.category);
                  const CatIcon = cat.icon;
                  return (
                    <tr key={i}>
                      <td className={cx('px-4 py-3', TEXT_FAINT, NUM)}>{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className={cx('inline-flex items-center gap-1.5 text-xs', TEXT_MUTED)}>
                          <CatIcon className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                          {cat.label}
                        </span>
                      </td>
                      <td className={cx('px-4 py-3', TEXT_BODY)}>{item.description}</td>
                      <td className={cx('px-4 py-3 whitespace-nowrap', TEXT_MUTED, NUM)}>{item.expense_date}</td>
                      <td className={cx('px-4 py-3 text-right whitespace-nowrap font-medium', TEXT_TITLE, NUM)}>
                        {fmtAmount(item.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.receipt
                          ? <Check className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label={item.receipt.name} />
                          : <span className={TEXT_FAINT}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className={cx(SURFACE_SUNK, 'border-t', BORDER)}>
                <tr>
                  <td colSpan={4} className={cx('px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider', TEXT_MUTED)}>
                    Total
                  </td>
                  <td className={cx('px-4 py-3 text-right font-semibold whitespace-nowrap', TEXT_TITLE, NUM)}>
                    {fmtAmount(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
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

  const lineErrors = Object.entries(errors).filter(([k]) => k.startsWith('items.'));
  const receiptsProvided = items.filter(i => i.receipt).length;

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------

  return (
    <AuthLayout>
      <Head title="Nouvelle note de frais — RH" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={Receipt}
          title="Nouvelle note de frais"
          breadcrumbs={[
            { label: 'Ressources Humaines', href: route('rh.index') },
            { label: 'Notes de frais', href: route('rh.frais.index') },
            { label: 'Nouvelle note' },
          ]}
          subtitle={
            employee
              ? `${employee.first_name} ${employee.last_name}`
              : 'Remplissez le formulaire et soumettez pour validation.'
          }
          actions={
            <Button variant="ghost" icon={ArrowLeft} onClick={() => router.visit(route('rh.frais.index'))}>
              Retour
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Formulaire principal */}
          <div className="space-y-6 lg:col-span-2">

            {/* Informations générales */}
            <Card icon={FileText} title="Informations générales">
              <div className="space-y-4">
                <div>
                  <label htmlFor="note-title" className={cx(FIELD_LABEL, TEXT_MUTED)}>
                    Titre de la note <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="note-title"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex : Déplacement client Abidjan — Juin 2025"
                    className={cx(CONTROL, 'h-10', errors.title && 'border-red-400 dark:border-red-500/60')}
                  />
                  {errors.title && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title}</p>}
                </div>

                <div>
                  <label htmlFor="note-period" className={cx(FIELD_LABEL, TEXT_MUTED)}>
                    Période <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="note-period"
                    type="month"
                    value={period}
                    onChange={e => setPeriod(e.target.value)}
                    className={cx(CONTROL, 'h-10', NUM, errors.period && 'border-red-400 dark:border-red-500/60')}
                  />
                  {errors.period && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.period}</p>}
                </div>

                <div>
                  <label htmlFor="note-notes" className={cx(FIELD_LABEL, TEXT_MUTED)}>
                    Notes (optionnel)
                  </label>
                  <textarea
                    id="note-notes"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Contexte du déplacement, informations complémentaires…"
                    className={cx(CONTROL, 'resize-none')}
                  />
                </div>
              </div>
            </Card>

            {/* Lignes de dépenses */}
            <Card
              icon={Receipt}
              title="Dépenses"
              subtitle={`${items.length} ligne${items.length > 1 ? 's' : ''} · ${receiptsProvided}/${items.length} justificatif${items.length > 1 ? 's' : ''}`}
            >
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

              {/* Erreurs de lignes */}
              {lineErrors.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {lineErrors.map(([k, v]) => (
                    <li key={k} className="text-xs text-red-600 dark:text-red-400">
                      Ligne {parseInt(k.split('.')[1], 10) + 1} : {v}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4">
                <Button variant="subtle" size="sm" icon={Plus} onClick={addItem}>
                  Ajouter une dépense
                </Button>
              </div>
            </Card>
          </div>

          {/* Panneau latéral — Récapitulatif & Actions */}
          <div className="space-y-4">

            <Card icon={PieChart} title="Récapitulatif">
              <ul className={cx('mb-4 divide-y', DIVIDE)}>
                {CATEGORIES.map(({ value, label, icon: Icon }) => {
                  const catTotal = items
                    .filter(i => i.category === value)
                    .reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                  if (catTotal === 0) return null;
                  return (
                    <li key={value} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className={cx('inline-flex items-center gap-1.5', TEXT_BODY)}>
                        <Icon className={cx('h-3.5 w-3.5 shrink-0', TEXT_FAINT)} aria-hidden="true" />
                        {label}
                      </span>
                      <span className={cx('font-medium whitespace-nowrap', TEXT_TITLE, NUM)}>
                        {fmtAmount(catTotal)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className={cx('border-t pt-3', BORDER)}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={cx('text-sm font-semibold', TEXT_TITLE)}>Total</span>
                  <span className={cx('text-xl font-semibold tracking-tight whitespace-nowrap', TEXT_TITLE, NUM)}>
                    {fmtAmount(total)}
                  </span>
                </div>
                <p className={cx('mt-1 text-xs', TEXT_FAINT, NUM)}>
                  {receiptsProvided}/{items.length} justificatifs fournis
                </p>
              </div>
            </Card>

            {/* Actions */}
            <Card>
              <div className="space-y-3">
                <Button variant="primary" block icon={Eye} onClick={handlePreviewOpen}>
                  Prévisualiser & soumettre
                </Button>

                <Button variant="secondary" block icon={Save} loading={saving} onClick={saveDraft}>
                  Sauvegarder le brouillon
                </Button>

                <p className={cx('text-center text-xs leading-relaxed', TEXT_FAINT)}>
                  Le brouillon reste modifiable à tout moment.<br />
                  La soumission déclenche la validation manager.
                </p>
              </div>
            </Card>

            {/* Aide */}
            <Card>
              <p className={cx('mb-1.5 text-xs font-semibold', TEXT_TITLE)}>Formats acceptés</p>
              <p className={cx('text-xs leading-relaxed', TEXT_MUTED)}>
                Justificatifs : PDF, JPG, PNG (5 Mo maximum par fichier).
                Conservez les originaux pour contrôle comptable.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {CATEGORIES.map(({ value, label, icon: Icon }) => (
                  <Badge key={value} variant="neutral" icon={Icon}>{label}</Badge>
                ))}
              </div>
            </Card>
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

NoteFraisForm.propTypes = {
  employee: PropTypes.shape({
    id:         PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    first_name: PropTypes.string,
    last_name:  PropTypes.string,
  }),
};
export { NoteFraisForm };
