/**
 * Budget/BudgetRevision.jsx — Révision budgétaire
 *
 * Props Inertia :
 *   budget : Budget avec lignes, révisions et réviseurs
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import AuthLayout from '@/Layouts/AuthLayout';

const fcfa = (v) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.abs(v));
const num  = (v) => parseFloat(v) || 0;

export default function BudgetRevision({ budget }) {
  const originalLines = budget.lines ?? [];

  // État des changements : lineId → { q1_amount, q2_amount, q3_amount, q4_amount }
  const [changes, setChanges] = useState(
    Object.fromEntries(originalLines.map((l) => [l.id, {
      q1_amount: l.q1_amount,
      q2_amount: l.q2_amount,
      q3_amount: l.q3_amount,
      q4_amount: l.q4_amount,
    }]))
  );

  const [reason, setReason]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setQ = (lineId, q, val) => {
    setChanges((prev) => ({ ...prev, [lineId]: { ...prev[lineId], [q]: val } }));
  };

  // Calculer les totaux originaux et révisés
  const originalTotal = originalLines.reduce((s, l) => s + num(l.annual_amount), 0);
  const revisedTotal  = originalLines.reduce((s, l) => {
    const c = changes[l.id];
    return s + num(c.q1_amount) + num(c.q2_amount) + num(c.q3_amount) + num(c.q4_amount);
  }, 0);

  const deltaTotal = revisedTotal - originalTotal;
  const deltaPct   = originalTotal ? ((Math.abs(deltaTotal) / originalTotal) * 100).toFixed(1) : 0;
  const needsApproval = parseFloat(deltaPct) > 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Le motif de révision est obligatoire.');
      return;
    }
    if (reason.trim().length < 10) {
      toast.error('Le motif doit comporter au moins 10 caractères.');
      return;
    }

    setSubmitting(true);
    try {
      const lineChanges = originalLines.map((l) => {
        const c = changes[l.id];
        return { line_id: l.id, ...c };
      });

      await axios.post(`/budget/${budget.id}/revise`, {
        reason,
        changes: lineChanges,
      });

      toast.success('Révision budgétaire enregistrée.');
      router.visit(`/budget/${budget.id}/variance`);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Erreur lors de la révision.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Head title={`Révision — ${budget.name}`} />

      <form onSubmit={handleSubmit} className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* En-tête */}
        <div className="flex items-start justify-between">
          <div>
            <a href="/budget" className="text-xs text-gray-400 hover:text-gray-600">← Budgets</a>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Révision budgétaire</h1>
            <p className="text-sm text-gray-500">{budget.name}</p>
          </div>
        </div>

        {/* Alerte approbation requise */}
        {needsApproval && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-orange-800 text-sm">Approbation requise</div>
              <div className="text-orange-700 text-xs mt-0.5">
                Cette révision représente {deltaPct}% du budget total (seuil : 10%).
                Elle devra être approuvée par le Directeur Administratif et Financier avant activation.
              </div>
            </div>
          </div>
        )}

        {/* Motif */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="text-sm font-semibold text-gray-800 mb-2 block">
            Motif de la révision <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            required
            minLength={10}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Décrivez les raisons de cette révision budgétaire (ex : hausse imprévue des coûts de matières premières, nouvel appel d'offres...)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA] resize-none"
          />
        </div>

        {/* Tableau comparatif */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">Modification des montants par ligne</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Colonne gauche = budget actuel · Colonne droite = budget révisé
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left border-b border-gray-100">
                  <th className="px-4 py-2.5 font-medium">Compte</th>
                  <th className="px-4 py-2.5 font-medium">Libellé</th>
                  {/* Actuel */}
                  <th className="px-3 py-2.5 font-medium text-right bg-purple-50">Q1 Act.</th>
                  <th className="px-3 py-2.5 font-medium text-right bg-purple-50">Q2 Act.</th>
                  <th className="px-3 py-2.5 font-medium text-right bg-purple-50">Q3 Act.</th>
                  <th className="px-3 py-2.5 font-medium text-right bg-purple-50">Q4 Act.</th>
                  <th className="px-3 py-2.5 font-medium text-right bg-purple-50 border-r border-gray-200">Total Act.</th>
                  {/* Révisé */}
                  <th className="px-3 py-2.5 font-medium text-right bg-amber-50">Q1 Rév.</th>
                  <th className="px-3 py-2.5 font-medium text-right bg-amber-50">Q2 Rév.</th>
                  <th className="px-3 py-2.5 font-medium text-right bg-amber-50">Q3 Rév.</th>
                  <th className="px-3 py-2.5 font-medium text-right bg-amber-50">Q4 Rév.</th>
                  <th className="px-3 py-2.5 font-medium text-right bg-amber-50">Total Rév.</th>
                  {/* Écart */}
                  <th className="px-3 py-2.5 font-medium text-right">Écart</th>
                </tr>
              </thead>
              <tbody>
                {originalLines.map((line) => {
                  const c = changes[line.id] ?? {};
                  const origAnnual = num(line.annual_amount);
                  const revAnnual  = num(c.q1_amount) + num(c.q2_amount) + num(c.q3_amount) + num(c.q4_amount);
                  const delta      = revAnnual - origAnnual;
                  const hasChange  = Math.abs(delta) > 0;

                  return (
                    <tr key={line.id} className={`border-t border-gray-50 ${hasChange ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-2 font-mono text-gray-500">{line.account_number}</td>
                      <td className="px-4 py-2 text-gray-800 max-w-xs truncate">{line.account_name}</td>

                      {/* Actuel (lecture seule) */}
                      {['q1_amount', 'q2_amount', 'q3_amount', 'q4_amount'].map((q) => (
                        <td key={q} className="px-3 py-2 text-right text-gray-500 bg-purple-50/40">
                          {fcfa(line[q])}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold text-gray-700 bg-purple-50/40 border-r border-gray-200">
                        {fcfa(origAnnual)}
                      </td>

                      {/* Révisé (éditable) */}
                      {['q1_amount', 'q2_amount', 'q3_amount', 'q4_amount'].map((q) => (
                        <td key={q + '_rev'} className="px-1.5 py-1 bg-amber-50/30">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            value={c[q] ?? ''}
                            onChange={(e) => setQ(line.id, q, e.target.value)}
                            className="w-20 rounded border border-gray-200 px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-bold bg-amber-50/30">
                        {fcfa(revAnnual)}
                      </td>

                      {/* Écart */}
                      <td className={`px-3 py-2 text-right font-semibold ${delta > 0 ? 'text-red-500' : delta < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {delta !== 0 ? (delta > 0 ? '+' : '−') + fcfa(delta) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totaux */}
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={6} className="px-4 py-3 font-semibold text-gray-700">TOTAL</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-800">{fcfa(originalTotal)}</td>
                  <td colSpan={4} />
                  <td className="px-3 py-3 text-right font-bold text-amber-700">{fcfa(revisedTotal)}</td>
                  <td className={`px-3 py-3 text-right font-bold ${deltaTotal > 0 ? 'text-red-500' : deltaTotal < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {deltaTotal !== 0 ? (deltaTotal > 0 ? '+' : '−') + fcfa(deltaTotal) : '—'}
                    {deltaTotal !== 0 && <span className="ml-1 text-xs font-normal">({deltaPct}%)</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Historique des révisions */}
        {budget.revisions?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">
              <ClockIcon className="h-4 w-4 inline mr-1" />
              Historique des révisions
            </h2>
            <div className="space-y-2">
              {budget.revisions.map((rev) => (
                <div key={rev.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#9333EA] text-white text-xs flex items-center justify-center font-bold">
                    {rev.revision_number}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-800">{rev.reason}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Par {rev.revisor?.name ?? '—'} le {new Date(rev.revised_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <a href="/budget" className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Annuler
          </a>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-[#9333EA] text-white text-sm rounded-lg hover:bg-[#16324e] disabled:opacity-50 transition font-medium"
          >
            {submitting ? 'Enregistrement...' : needsApproval ? 'Soumettre pour approbation' : 'Enregistrer la révision'}
          </button>
        </div>

      </form>
    </AuthLayout>
  );
}
export { BudgetRevision };
