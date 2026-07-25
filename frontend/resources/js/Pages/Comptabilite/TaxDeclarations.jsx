/**
 * Comptabilite/TaxDeclarations.jsx — Déclarations fiscales OHADA
 *
 * Props Inertia :
 *   preview     : données calculées (TVA, IS, etc.)
 *   history     : déclarations passées
 *   fiscalYears : exercices
 *   filters     : filtres actifs
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DocumentTextIcon, CheckCircleIcon, ClockIcon,
  ArrowDownTrayIcon, PlusIcon,
} from '@heroicons/react/24/outline';
import AuthLayout from '@/Layouts/AuthLayout';

const TAX_TYPES = [
  { value: 'TVA',     label: 'TVA',     desc: 'Taxe sur la valeur ajoutée' },
  { value: 'IS',      label: 'IS',      desc: 'Impôt sur les sociétés' },
  { value: 'PATENTE', label: 'Patente', desc: 'Patente / Contribution forfaitaire' },
  { value: 'CNPS',    label: 'CNPS',    desc: 'Cotisations sociales' },
];

const fcfa = (v) =>
  v == null ? '—' :
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(v)) + ' FCFA';

const statusBadge = (status) => {
  const map = {
    draft:     'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    submitted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
    paid:      'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  };
  const label = { draft: 'Brouillon', submitted: 'Soumis', paid: 'Payé' };
  return { cls: map[status] || map.draft, label: label[status] || status };
};

// ============================================================
// Preview TVA
// ============================================================
function TvaPreview({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'TVA collectée',  value: data.tva_collectee,  color: 'text-orange-600' },
          { label: 'TVA déductible', value: data.tva_deductible, color: 'text-green-600' },
          { label: 'TVA nette due',  value: data.a_payer,        color: 'text-red-600' },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
            <p className={`text-lg font-bold font-mono mt-1 ${k.color}`}>{fcfa(k.value)}</p>
          </div>
        ))}
      </div>
      {data.credit_report > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-sm text-purple-700 dark:text-purple-400">
          Crédit de TVA à reporter : <strong>{fcfa(data.credit_report)}</strong>
        </div>
      )}
      <div className="text-xs text-gray-400 mt-2">
        Taux TVA : {(data.taux * 100).toFixed(0)}% • Comptes collecte : {data.breakdown?.comptes_collecte?.join(', ')}
        • Comptes déductible : {data.breakdown?.comptes_deductible?.join(', ')}
      </div>
    </div>
  );
}

// Preview IS
function IsPreview({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Chiffre d\'affaires', value: data.chiffre_affaires },
          { label: 'Charges totales',     value: data.charges_totales },
          { label: 'Bénéfice fiscal',     value: data.benefice_fiscal },
          { label: 'Taux IS',             value: (data.taux_is * 100).toFixed(0) + '%', isTxt: true },
          { label: 'IS calculé',          value: data.is_calcule, color: 'text-red-600' },
          { label: 'IMF (minimum)',        value: data.imf, color: 'text-orange-600' },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
            <p className={`text-base font-bold font-mono mt-1 ${k.color || 'text-gray-900 dark:text-gray-100'}`}>
              {k.isTxt ? k.value : fcfa(k.value)}
            </p>
          </div>
        ))}
      </div>
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
        <p className="text-sm font-bold text-red-700 dark:text-red-400">
          Montant à décaisser : {fcfa(data.montant_du)}
        </p>
        <p className="text-xs text-red-500 dark:text-red-500 mt-1">{data.note}</p>
      </div>
    </div>
  );
}

// Preview CNPS
function CnpsPreview({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Salaire brut',       value: data.salaire_brut },
          { label: 'Part patronale',     value: data.cotisation_patronale },
          { label: 'Part salariale',     value: data.cotisation_salariale },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
            <p className="text-lg font-bold font-mono mt-1">{fcfa(k.value)}</p>
          </div>
        ))}
      </div>
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
        <p className="text-sm text-purple-700 dark:text-purple-400">Total à verser à la CNPS</p>
        <p className="text-2xl font-bold font-mono text-purple-700 dark:text-purple-400 mt-1">
          {fcfa(data.total_a_verser)}
        </p>
      </div>
      <p className="text-xs text-gray-400">{data.note}</p>
    </div>
  );
}

// Preview Patente
function PatentePreview({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'CA de référence',     value: data.chiffre_affaires },
          { label: 'Droit proportionnel', value: data.droit_proportionnel },
          { label: 'Droit fixe',          value: data.droit_fixe },
        ].map(k => (
          <div key={k.label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">{k.label}</p>
            <p className="text-lg font-bold font-mono mt-1">{fcfa(k.value)}</p>
          </div>
        ))}
      </div>
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
        <p className="text-sm text-yellow-700 dark:text-yellow-400">Patente totale</p>
        <p className="text-2xl font-bold font-mono text-yellow-700 dark:text-yellow-400 mt-1">{fcfa(data.total)}</p>
      </div>
      <p className="text-xs text-gray-400">{data.note}</p>
    </div>
  );
}

// ============================================================
// Page principale
// ============================================================
export default function TaxDeclarations({ preview, history, fiscalYears, filters }) {
  const [type, setType]   = useState(filters?.type || 'TVA');
  const [start, setStart] = useState(filters?.start || new Date().toISOString().slice(0, 7) + '-01');
  const [end, setEnd]     = useState(filters?.end   || new Date().toISOString().slice(0, 7) + '-28');
  const [saving, setSaving] = useState(false);

  const refresh = () => {
    router.get('/comptabilite/generale/declarations-fiscales', { type, start, end });
  };

  const handleSave = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const payload = {
        declaration_type: type,
        period_start:     start,
        period_end:       end,
        base_amount:      preview.base_amount || preview.chiffre_affaires || preview.salaire_brut || 0,
        tax_rate:         preview.taux || preview.taux_is || 0,
        tax_amount:       preview.tva_collectee || preview.is_calcule || preview.total || preview.cotisation_patronale || 0,
        tax_credit:       preview.tva_deductible || 0,
        net_tax:          preview.a_payer || preview.montant_du || preview.total_a_verser || preview.total || 0,
      };
      await axios.post('/comptabilite/generale/declarations-fiscales', payload);
      toast.success('Déclaration enregistrée en brouillon');
      router.reload({ only: ['history'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (id) => {
    if (!confirm('Soumettre cette déclaration ?')) return;
    try {
      await axios.put(`/comptabilite/generale/declarations-fiscales/${id}/submit`);
      toast.success('Déclaration soumise');
      router.reload({ only: ['history'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur');
    }
  };

  const activeType = TAX_TYPES.find(t => t.value === type);

  return (
    <AuthLayout>
      <Head title="Déclarations fiscales OHADA" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Déclarations fiscales</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Calcul automatique depuis les journaux SYSCOHADA</p>
        </div>

        {/* Sélecteur type de déclaration */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {TAX_TYPES.map(t => (
            <button key={t.value}
              onClick={() => { setType(t.value); }}
              className={`px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                type === t.value
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-500'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300'
              }`}>
              <p className={`font-bold text-sm ${type === t.value ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {t.label}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Période + calcul */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calcul */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-purple-600" />
                Calcul {activeType?.desc}
              </h2>
              <div className="flex items-center gap-2">
                <input type="date" className="input-sm text-xs" value={start} onChange={e => setStart(e.target.value)} />
                <span className="text-gray-400 text-xs">→</span>
                <input type="date" className="input-sm text-xs" value={end}   onChange={e => setEnd(e.target.value)} />
                <button onClick={refresh} className="btn-primary text-xs px-3 py-1.5">Calculer</button>
              </div>
            </div>

            {preview ? (
              <div>
                {type === 'TVA'     && <TvaPreview data={preview} />}
                {type === 'IS'      && <IsPreview data={preview} />}
                {type === 'CNPS'    && <CnpsPreview data={preview} />}
                {type === 'PATENTE' && <PatentePreview data={preview} />}

                <div className="mt-4 flex justify-end">
                  <button onClick={handleSave} disabled={saving}
                    className="btn-primary flex items-center gap-2 text-sm">
                    <PlusIcon className="w-4 h-4" />
                    {saving ? 'Enregistrement…' : 'Sauvegarder en brouillon'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                Sélectionnez une période et cliquez sur Calculer
              </div>
            )}
          </div>

          {/* Historique */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Historique des déclarations
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                  Aucune déclaration enregistrée
                </p>
              ) : history.map(decl => {
                const { cls, label } = statusBadge(decl.status);
                return (
                  <div key={decl.id}
                    className="border border-gray-100 dark:border-gray-800 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{decl.declaration_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {decl.period_start} → {decl.period_end}
                    </p>
                    <p className="text-sm font-bold font-mono text-gray-900 dark:text-gray-100 mt-1">
                      {fcfa(decl.net_tax)}
                    </p>
                    {decl.status === 'draft' && (
                      <button onClick={() => handleSubmit(decl.id)}
                        className="mt-2 text-xs text-purple-600 dark:text-purple-400 hover:underline">
                        Soumettre →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
export { TaxDeclarations };
