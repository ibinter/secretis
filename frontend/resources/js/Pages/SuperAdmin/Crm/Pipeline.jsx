import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';

// ─── Icônes SVG ───────────────────────────────────────────────────────────────
const Icon = {
  Plus: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Filter: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  User: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  TrendingUp: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  GripVertical: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtXOF = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v);

const PLAN_COLORS = {
  starter: 'bg-gray-100 text-gray-700',
  pro: 'bg-indigo-100 text-indigo-700',
  enterprise: 'bg-amber-100 text-amber-800',
};

const BANT_COLOR = (score) => {
  if (score >= 75) return 'bg-green-500';
  if (score >= 50) return 'bg-amber-400';
  if (score >= 25) return 'bg-orange-400';
  return 'bg-red-400';
};

// ─── Composants ───────────────────────────────────────────────────────────────
function BantBadge({ score }) {
  if (score == null) return null;
  return (
    <div className="flex items-center gap-1.5" title={`Score BANT : ${score}/100`}>
      <div className={`w-2 h-2 rounded-full ${BANT_COLOR(score)}`} />
      <span className="text-xs font-semibold text-gray-600">{score}</span>
    </div>
  );
}

function DealCard({ deal, onDragStart, onView, onMoveStage, stages }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(deal)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{deal.contact?.company_name}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{deal.title}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onView(deal)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
            title="Voir le contact"
          >
            <Icon.Eye />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400"
              title="Déplacer"
            >
              <Icon.GripVertical />
            </button>
            {showMoveMenu && (
              <div className="absolute right-0 top-7 bg-white rounded-xl shadow-xl border border-gray-100 z-10 w-44 py-1">
                {stages.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { onMoveStage(deal.id, s.id); setShowMoveMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Valeur + probabilité */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-bold text-purple-900">{fmtXOF(deal.value)}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
          deal.probability >= 70 ? 'bg-green-100 text-green-700' :
          deal.probability >= 40 ? 'bg-amber-100 text-amber-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {deal.probability ?? 0}%
        </span>
      </div>

      {/* Plan badge */}
      {deal.plan && (
        <div className="mb-3">
          <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wide ${PLAN_COLORS[deal.plan] || 'bg-gray-100'}`}>
            {deal.plan}
          </span>
          {deal.users_count && (
            <span className="text-xs text-gray-400 ml-2">{deal.users_count} users</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50">
        <BantBadge score={deal.contact?.bant_score} />
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {deal.contact?.country && (
            <span>{deal.contact.country}</span>
          )}
          {deal.close_date_expected && (
            <span className="flex items-center gap-1">
              <Icon.Calendar />
              {new Date(deal.close_date_expected).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ stage, deals, onDrop, onDragOver, onView, onMoveStage, stages }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(stage.id);
  };

  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="flex-shrink-0 w-72">
      {/* En-tête colonne */}
      <div className="mb-3 px-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
          <h3 className="font-semibold text-gray-800 text-sm truncate">{stage.name}</h3>
          <span className="ml-auto bg-gray-100 text-gray-600 text-xs font-semibold rounded-full px-2 py-0.5">
            {deals.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 font-medium pl-5">{fmtXOF(totalValue)}</p>
      </div>

      {/* Zone de drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`min-h-40 rounded-xl p-2 space-y-2 transition-colors ${
          isDragOver ? 'bg-purple-50 ring-2 ring-purple-300 ring-dashed' : 'bg-gray-50'
        } ${stage.is_closed_won ? 'bg-green-50' : stage.is_closed_lost ? 'bg-red-50' : ''}`}
      >
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onDragStart={(d) => window.__crmDragDeal = d}
            onView={onView}
            onMoveStage={onMoveStage}
            stages={stages.filter(s => s.id !== stage.id)}
          />
        ))}
        {deals.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-gray-400">
            Glissez un deal ici
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal deal perdu ─────────────────────────────────────────────────────────
function LostReasonModal({ deal, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  if (!deal) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-4">Motif de perte — {deal.title}</h3>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Pourquoi ce deal a été perdu ? (budget, concurrent, timing...)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-900 focus:border-purple-900 resize-none"
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
          >
            Confirmer la perte
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function CrmPipeline({ initialData }) {
  const [data, setData]           = useState(initialData || null);
  const [loading, setLoading]     = useState(!initialData);
  const [filters, setFilters]     = useState({ assigned_to: '', country: '', plan: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [lostModal, setLostModal] = useState(null); // { dealId, stageId }
  const [notification, setNotification] = useState(null);
  const dragDeal = useRef(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/superadmin/crm/pipeline', { params: filters });
      setData(res.data);
    } catch (e) {
      notify('Erreur lors du chargement du pipeline.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const handleDrop = async (stageId) => {
    const deal = dragDeal.current || window.__crmDragDeal;
    if (!deal || deal.stage?.id === stageId) return;

    const stage = data?.stages?.find(s => s.id === stageId);

    // Si stage = lost → demander le motif
    if (stage?.is_closed_lost) {
      setLostModal({ dealId: deal.id, stageId });
      return;
    }

    await moveDeal(deal.id, stageId);
  };

  const moveDeal = async (dealId, stageId, lostReason = null) => {
    try {
      await axios.post(`/superadmin/crm/deals/${dealId}/stage`, {
        stage_id: stageId,
        lost_reason: lostReason,
      });
      notify('Deal déplacé avec succès.');
      fetchPipeline();
    } catch (e) {
      notify('Erreur lors du déplacement.', 'error');
    }
  };

  const stages = data?.stages || [];

  // Appliquer filtres côté client (filtre additionnel pour plan/pays)
  const filteredStages = stages.map(stage => ({
    ...stage,
    deals: stage.deals.filter(deal => {
      if (filters.plan && deal.plan !== filters.plan) return false;
      if (filters.country && deal.contact?.country !== filters.country) return false;
      return true;
    }),
  }));

  return (
    <>
      <Head title="CRM Pipeline — SuperAdmin IBIG Soft" />

      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.msg}
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-purple-900 text-white">
          <div className="max-w-full px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">Pipeline CRM — IBIG Soft</h1>
              <p className="text-purple-200 text-xs mt-0.5">
                {data?.total_deals ?? 0} deals · {data ? fmtXOF(data.total_pipeline) : '—'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                <Icon.Filter /> Filtres
              </button>
              <button
                onClick={() => router.visit('/superadmin/crm/contacts/create')}
                className="flex items-center gap-2 px-4 py-2 bg-white text-purple-900 rounded-lg text-sm font-bold hover:bg-purple-50 transition-colors"
              >
                <Icon.Plus /> Nouveau lead
              </button>
            </div>
          </div>

          {/* Filtres */}
          {showFilters && (
            <div className="px-6 pb-4 flex items-center gap-4 flex-wrap">
              <select
                value={filters.plan}
                onChange={e => setFilters(f => ({ ...f, plan: e.target.value }))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-white/30"
              >
                <option value="">Tous les plans</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                value={filters.country}
                onChange={e => setFilters(f => ({ ...f, country: e.target.value }))}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-white/30"
              >
                <option value="">Tous les pays</option>
                <option value="CI">Côte d'Ivoire</option>
                <option value="SN">Sénégal</option>
                <option value="BF">Burkina Faso</option>
                <option value="CM">Cameroun</option>
                <option value="GN">Guinée</option>
                <option value="ML">Mali</option>
                <option value="TG">Togo</option>
                <option value="BJ">Bénin</option>
              </select>
              {(filters.plan || filters.country) && (
                <button
                  onClick={() => setFilters({ assigned_to: '', country: '', plan: '' })}
                  className="flex items-center gap-1 text-sm text-white/70 hover:text-white"
                >
                  <Icon.X /> Effacer
                </button>
              )}
            </div>
          )}
        </header>

        {/* Kanban */}
        <main className="p-6 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-purple-900 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
              {filteredStages.map(stage => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  deals={stage.deals}
                  stages={filteredStages}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onView={(deal) => router.visit(`/superadmin/crm/contacts/${deal.contact?.id}`)}
                  onMoveStage={(dealId, stageId) => moveDeal(dealId, stageId)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal motif de perte */}
      {lostModal && (
        <LostReasonModal
          deal={data?.stages?.flatMap(s => s.deals).find(d => d.id === lostModal.dealId)}
          onConfirm={(reason) => {
            moveDeal(lostModal.dealId, lostModal.stageId, reason);
            setLostModal(null);
          }}
          onCancel={() => setLostModal(null)}
        />
      )}
    </>
  );
}
export { CrmPipeline };
