/**
 * SuperAdmin/Crm/Pipeline.jsx — Pipeline commercial (kanban)
 *
 * Présentation migrée sur le système de composants `@/Components/UI`.
 * Logique métier inchangée : mêmes appels réseau
 * (`GET /superadmin/crm/pipeline`, `POST /superadmin/crm/deals/{id}/stage`),
 * mêmes états locaux, même glisser-déposer, mêmes destinations `router.visit`.
 *
 * Nettoyage sans effet fonctionnel : icônes inline inutilisées supprimées.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  KanbanSquare, Plus, Filter, X, Eye, GripVertical, Calendar, Loader2,
} from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card,
  cx, SURFACE, SURFACE_SUNK, BORDER, CONTROL, TEXT_TITLE, TEXT_BODY, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const fmtXOF = (v) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(v ?? 0);

const PLAN_TONE = { starter: 'neutral', pro: 'info', enterprise: 'accent' };

const bantDot = (score) =>
  score >= 75 ? 'bg-emerald-500'
    : score >= 50 ? 'bg-amber-500'
    : score >= 25 ? 'bg-orange-500'
    : 'bg-red-500';

const probaTone = (p) => (p >= 70 ? 'success' : p >= 40 ? 'warning' : 'neutral');

const COUNTRIES = [
  ['CI', "Côte d'Ivoire"], ['SN', 'Sénégal'], ['BF', 'Burkina Faso'], ['CM', 'Cameroun'],
  ['GN', 'Guinée'], ['ML', 'Mali'], ['TG', 'Togo'], ['BJ', 'Bénin'],
];

/* ─── Carte d'opportunité ──────────────────────────────────────────────────── */

function DealCard({ deal, onDragStart, onView, onMoveStage, stages }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => onDragStart(deal)}
      className={cx(
        SURFACE, 'group border', BORDER,
        'cursor-grab rounded-xl p-4 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing',
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cx('truncate text-sm font-semibold', TEXT_TITLE)}>{deal.contact?.company_name}</p>
          <p className={cx('mt-0.5 truncate text-xs', TEXT_MUTED)}>{deal.title}</p>
        </div>

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost" size="xs" iconOnly icon={Eye}
            title="Voir le contact"
            onClick={() => onView(deal)}
          />
          <div className="relative">
            <Button
              variant="ghost" size="xs" iconOnly icon={GripVertical}
              title="Déplacer vers une autre étape"
              aria-expanded={showMoveMenu}
              onClick={() => setShowMoveMenu(v => !v)}
            />
            {showMoveMenu && (
              <div className={cx(
                SURFACE, 'absolute right-0 top-8 z-10 w-48 rounded-lg border py-1 shadow-lg',
                BORDER,
              )}>
                {stages.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { onMoveStage(deal.id, s.id); setShowMoveMenu(false); }}
                    className={cx(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      TEXT_BODY, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]', FOCUS_RING,
                    )}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={cx('text-base font-semibold', TEXT_TITLE, NUM)}>{fmtXOF(deal.value)}</span>
        <Badge variant={probaTone(deal.probability ?? 0)}>{deal.probability ?? 0} %</Badge>
      </div>

      {deal.plan && (
        <div className="mb-3 flex items-center gap-2">
          <Badge variant={PLAN_TONE[deal.plan] ?? 'neutral'}>
            {deal.plan.charAt(0).toUpperCase() + deal.plan.slice(1)}
          </Badge>
          {deal.users_count && (
            <span className={cx('text-xs', TEXT_FAINT, NUM)}>{deal.users_count} utilisateurs</span>
          )}
        </div>
      )}

      <div className={cx('flex items-center justify-between border-t pt-2', BORDER)}>
        {deal.contact?.bant_score != null ? (
          <span
            className="flex items-center gap-1.5"
            title={`Score BANT : ${deal.contact.bant_score}/100`}
          >
            <span className={cx('h-2 w-2 rounded-full', bantDot(deal.contact.bant_score))} />
            <span className={cx('text-xs font-semibold', TEXT_BODY, NUM)}>{deal.contact.bant_score}</span>
          </span>
        ) : <span />}

        <div className={cx('flex items-center gap-3 text-xs', TEXT_FAINT)}>
          {deal.contact?.country && <span>{deal.contact.country}</span>}
          {deal.close_date_expected && (
            <span className={cx('flex items-center gap-1', NUM)}>
              <Calendar className="h-3 w-3" />
              {new Date(deal.close_date_expected).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Colonne kanban ───────────────────────────────────────────────────────── */

function KanbanColumn({ stage, deals, onDrop, onDragOver, onView, onMoveStage, stages }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  };

  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="w-72 shrink-0">
      <div className="mb-3 px-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className={cx('truncate text-sm font-semibold', TEXT_TITLE)}>{stage.name}</h3>
          <Badge variant="neutral" className="ml-auto">{deals.length}</Badge>
        </div>
        <p className={cx('pl-[18px] text-xs font-medium', TEXT_MUTED, NUM)}>{fmtXOF(totalValue)}</p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(stage.id); }}
        className={cx(
          'min-h-40 space-y-2 rounded-xl p-2 transition-colors',
          isDragOver
            ? 'bg-purple-50 ring-2 ring-dashed ring-purple-300 dark:bg-purple-500/10 dark:ring-purple-500/40'
            : stage.is_closed_won
              ? 'bg-emerald-50 dark:bg-emerald-500/[0.07]'
              : stage.is_closed_lost
                ? 'bg-red-50 dark:bg-red-500/[0.07]'
                : SURFACE_SUNK,
        )}
      >
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onDragStart={(d) => { window.__crmDragDeal = d; }}
            onView={onView}
            onMoveStage={onMoveStage}
            stages={stages.filter(s => s.id !== stage.id)}
          />
        ))}

        {deals.length === 0 && (
          <div className={cx('flex h-24 items-center justify-center text-xs', TEXT_FAINT)}>
            Déposez une opportunité ici
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Motif de perte ───────────────────────────────────────────────────────── */

function LostReasonModal({ deal, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  if (!deal) return null;

  return (
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 grid place-items-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md">
        <Card
          padded={false}
          className="shadow-xl"
          title="Motif de perte"
          subtitle={deal.title}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onCancel} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onCancel}>Annuler</Button>
              <Button variant="danger" onClick={() => onConfirm(reason)}>Confirmer la perte</Button>
            </div>
          }
        >
          <div className="px-4 py-5 sm:px-6">
            <label className="flex flex-col gap-1.5">
              <span className={cx('text-xs font-medium', TEXT_MUTED)}>
                Pourquoi cette opportunité est-elle perdue ?
              </span>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Budget insuffisant, concurrent retenu, calendrier reporté…"
                className={cx(CONTROL, 'resize-none')}
              />
            </label>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Composant principal ──────────────────────────────────────────────────── */

export default function CrmPipeline({ initialData }) {
  const [data, setData]                 = useState(initialData ?? null);
  const [loading, setLoading]           = useState(!initialData);
  const [filters, setFilters]           = useState({ assigned_to: '', country: '', plan: '' });
  const [showFilters, setShowFilters]   = useState(false);
  const [lostModal, setLostModal]       = useState(null); // { dealId, stageId }
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
    } catch {
      notify('Erreur lors du chargement du pipeline.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const moveDeal = async (dealId, stageId, lostReason = null) => {
    try {
      await axios.post(`/superadmin/crm/deals/${dealId}/stage`, {
        stage_id: stageId,
        lost_reason: lostReason,
      });
      notify('Opportunité déplacée.');
      fetchPipeline();
    } catch {
      notify('Erreur lors du déplacement.', 'error');
    }
  };

  const handleDrop = async (stageId) => {
    const deal = dragDeal.current || window.__crmDragDeal;
    if (!deal || deal.stage?.id === stageId) return;

    const stage = data?.stages?.find(s => s.id === stageId);

    if (stage?.is_closed_lost) {
      setLostModal({ dealId: deal.id, stageId });
      return;
    }

    await moveDeal(deal.id, stageId);
  };

  const stages = data?.stages ?? [];

  const filteredStages = stages.map(stage => ({
    ...stage,
    deals: (stage.deals ?? []).filter(deal => {
      if (filters.plan && deal.plan !== filters.plan) return false;
      if (filters.country && deal.contact?.country !== filters.country) return false;
      return true;
    }),
  }));

  const isFiltered = Boolean(filters.plan || filters.country);

  return (
    <SuperAdminLayout title="Pipeline commercial">
      <Head title="CRM Pipeline — SuperAdmin IBIG Soft" />

      {notification && (
        <div
          role="status"
          className={cx(
            'fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg',
            notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600',
          )}
        >
          {notification.msg}
        </div>
      )}

      <PageHeader
        icon={KanbanSquare}
        title="Pipeline commercial"
        subtitle={`${data?.total_deals ?? 0} opportunité${(data?.total_deals ?? 0) > 1 ? 's' : ''} · ${data ? fmtXOF(data.total_pipeline) : '—'} de valeur cumulée`}
        breadcrumbs={[{ label: 'Console', href: '/superadmin' }, { label: 'CRM' }, { label: 'Pipeline' }]}
        actions={
          <>
            <Button variant="secondary" icon={Filter} onClick={() => setShowFilters(v => !v)}>
              Filtres
            </Button>
            <Button
              variant="primary" icon={Plus}
              onClick={() => router.visit('/superadmin/crm/contacts/create')}
            >
              Nouveau lead
            </Button>
          </>
        }
      />

      {showFilters && (
        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.plan}
              onChange={e => setFilters(f => ({ ...f, plan: e.target.value }))}
              aria-label="Filtrer par plan"
              className={cx(CONTROL, 'h-10 w-auto min-w-[160px]')}
            >
              <option value="">Tous les plans</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>

            <select
              value={filters.country}
              onChange={e => setFilters(f => ({ ...f, country: e.target.value }))}
              aria-label="Filtrer par pays"
              className={cx(CONTROL, 'h-10 w-auto min-w-[180px]')}
            >
              <option value="">Tous les pays</option>
              {COUNTRIES.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>

            {isFiltered && (
              <Button
                variant="ghost" icon={X}
                onClick={() => setFilters({ assigned_to: '', country: '', plan: '' })}
              >
                Effacer
              </Button>
            )}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-purple-600 dark:text-purple-400" />
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
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
        </div>
      )}

      {lostModal && (
        <LostReasonModal
          deal={data?.stages?.flatMap(s => s.deals ?? []).find(d => d.id === lostModal.dealId)}
          onConfirm={(reason) => {
            moveDeal(lostModal.dealId, lostModal.stageId, reason);
            setLostModal(null);
          }}
          onCancel={() => setLostModal(null)}
        />
      )}
    </SuperAdminLayout>
  );
}

export { CrmPipeline };
