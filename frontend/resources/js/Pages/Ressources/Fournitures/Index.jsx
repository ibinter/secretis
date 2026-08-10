/**
 * Ressources/Fournitures/Index.jsx — Gestion des fournitures et stocks
 *
 * Props Inertia :
 *   - supplies  : LengthAwarePaginator<Supply>
 *   - lowStock  : Supply[]  (fournitures sous le seuil minimum)
 *
 * Présentation migrée sur `@/Components/UI`. Logique métier inchangée :
 * mêmes routes (`resources.fournitures.*`), mêmes appels axios, mêmes états.
 */

import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import axios from 'axios';
import {
  Package, PlusCircle, ArrowUpCircle, ArrowDownCircle,
  AlertTriangle, X, Loader2, History, Download, Layers, TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  PageHeader, Button, Badge, Card, DataTable, EmptyState, StatCard,
  cx, CONTROL, BORDER, SURFACE, SURFACE_SUNK, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, NUM, FOCUS_RING,
} from '@/Components/UI';

// ---------------------------------------------------------------------------
// Barre de progression stock
// ---------------------------------------------------------------------------

function StockBar({ quantity, minQuantity }) {
  const max        = Math.max(minQuantity * 2, 1);
  const pct        = Math.min(100, (quantity / max) * 100);
  const isLow      = quantity <= minQuantity;
  const isCritical = quantity === 0;

  const barColor = isCritical
    ? 'bg-red-600'
    : isLow
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  return (
    <div className="flex min-w-[140px] items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
        <div
          className={cx('h-full rounded-full transition-all', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cx(
        'text-xs font-semibold', NUM,
        isCritical ? 'text-red-600 dark:text-red-400'
          : isLow ? 'text-amber-600 dark:text-amber-400'
          : TEXT_TITLE,
      )}>
        {quantity}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Mouvement
// ---------------------------------------------------------------------------

function MovementModal({ supply, onClose, onSuccess }) {
  const [form, setForm] = useState({ type: 'out', quantity: 1, reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const maxOut = supply.quantity;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.post(route('resources.fournitures.movement', supply.id), form);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erreur lors du mouvement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <Card
          padded={false}
          className="shadow-xl"
          title="Mouvement de stock"
          subtitle={supply.name}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
              <Button
                type="submit"
                variant={form.type === 'in' ? 'primary' : 'danger'}
                loading={saving}
                disabled={form.type === 'out' && form.quantity > maxOut}
              >
                {form.type === 'in' ? 'Enregistrer l\'entrée' : 'Enregistrer la sortie'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 px-4 py-4 sm:px-6">

            {/* Type entrée/sortie */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'in',  label: 'Entrée', icon: ArrowUpCircle,   tone: 'text-emerald-600 dark:text-emerald-400' },
                { value: 'out', label: 'Sortie', icon: ArrowDownCircle, tone: 'text-red-600 dark:text-red-400' },
              ].map(({ value, label, icon: Icon, tone }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: value }))}
                  className={cx(
                    'flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors',
                    FOCUS_RING,
                    form.type === value
                      ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-500/50 dark:bg-purple-500/10 dark:text-purple-300'
                      : cx(BORDER, SURFACE, TEXT_MUTED, 'hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                  )}
                >
                  <Icon className={cx('h-4 w-4', tone)} />
                  {label}
                </button>
              ))}
            </div>

            {/* Stock actuel */}
            <div className={cx('flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm', BORDER, SURFACE_SUNK, TEXT_MUTED)}>
              <span>
                Stock actuel : <span className={cx('font-semibold', TEXT_TITLE, NUM)}>{supply.quantity}</span> {supply.unit}(s)
              </span>
              {supply.quantity <= supply.min_quantity && (
                <Badge variant="danger" icon={AlertTriangle}>Stock bas</Badge>
              )}
            </div>

            {/* Quantité */}
            <div>
              <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>Quantité *</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                min={1}
                max={form.type === 'out' ? maxOut : undefined}
                required
                className={cx(CONTROL, 'h-10', NUM)}
              />
              {form.type === 'out' && form.quantity > maxOut && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Stock insuffisant ({maxOut} disponible{maxOut !== 1 ? 's' : ''})
                </p>
              )}
            </div>

            {/* Motif */}
            <div>
              <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>Motif *</label>
              <textarea
                rows={2}
                value={form.reason}
                onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                required
                placeholder={form.type === 'in' ? 'Réapprovisionnement commande n°…' : 'Utilisé pour le service…'}
                className={cx(CONTROL, 'resize-none')}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}
          </div>
        </Card>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Création fourniture — POST resources.fournitures.store
// ---------------------------------------------------------------------------

const UNITS = ['pièce', 'rame', 'boîte', 'carton', 'litre', 'kg', 'autre'];

function CreateSupplyModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '', unit: 'pièce', quantity: 0, min_quantity: 0,
    unit_price: '', supplier: '', reference: '', location: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.post(route('resources.fournitures.store'), {
        ...form,
        quantity:     parseInt(form.quantity, 10) || 0,
        min_quantity: parseInt(form.min_quantity, 10) || 0,
        unit_price:   form.unit_price === '' ? null : Number(form.unit_price),
      });
      onSuccess();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat()[0] : (err.response?.data?.message ?? 'Erreur lors de la création.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <Card
          padded={false}
          className="shadow-xl"
          title="Nouvelle fourniture"
          subtitle="Ajouter un consommable au stock"
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
              <Button type="submit" variant="primary" loading={saving}>Créer</Button>
            </div>
          }
        >
          <div className="space-y-4 px-4 py-4 sm:px-6">
            <div>
              <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>Désignation *</label>
              <input value={form.name} onChange={setField('name')} required maxLength={150}
                     placeholder="Ramette papier A4 80g" className={cx(CONTROL, 'h-10')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>Unité *</label>
                <select value={form.unit} onChange={setField('unit')} className={cx(CONTROL, 'h-10')}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>Référence</label>
                <input value={form.reference} onChange={setField('reference')} maxLength={100}
                       className={cx(CONTROL, 'h-10')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>Stock initial *</label>
                <input type="number" min={0} value={form.quantity} onChange={setField('quantity')} required
                       className={cx(CONTROL, 'h-10', NUM)} />
              </div>
              <div>
                <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>Seuil minimum *</label>
                <input type="number" min={0} value={form.min_quantity} onChange={setField('min_quantity')} required
                       className={cx(CONTROL, 'h-10', NUM)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>Prix unitaire</label>
                <input type="number" min={0} step="0.01" value={form.unit_price} onChange={setField('unit_price')}
                       className={cx(CONTROL, 'h-10', NUM)} />
              </div>
              <div>
                <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>Emplacement</label>
                <input value={form.location} onChange={setField('location')} maxLength={100}
                       className={cx(CONTROL, 'h-10')} />
              </div>
            </div>

            <div>
              <label className={cx('mb-1.5 block text-xs font-medium', TEXT_MUTED)}>Fournisseur</label>
              <input value={form.supplier} onChange={setField('supplier')} maxLength={150}
                     className={cx(CONTROL, 'h-10')} />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </p>
            )}
          </div>
        </Card>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal Historique mouvements
// ---------------------------------------------------------------------------

function HistoryModal({ supply, onClose }) {
  const [movements, setMovements] = useState(null);
  const [loading, setLoading]     = useState(true);

  useState(() => {
    axios.get(route('resources.fournitures.show', supply.id))
      .then(res => setMovements(res.data.movements ?? []))
      .catch(() => setMovements([]))
      .finally(() => setLoading(false));
  }, [supply.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm dark:bg-black/60">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col">
        <Card
          padded={false}
          className="flex max-h-[80vh] flex-col shadow-xl"
          bodyClassName="overflow-y-auto"
          title="Historique des mouvements"
          subtitle={supply.name}
          actions={<Button variant="ghost" size="sm" iconOnly icon={X} title="Fermer" onClick={onClose} />}
        >
          <div className="p-4">
            {loading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-400" />
              </div>
            ) : movements?.length > 0 ? (
              <ul className={cx('divide-y', 'divide-gray-100 dark:divide-[#1E3048]')}>
                {movements.map((mv) => (
                  <li key={mv.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {mv.type === 'in'
                        ? <ArrowUpCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                        : <ArrowDownCircle className="h-4 w-4 shrink-0 text-red-500" />}
                      <div className="min-w-0">
                        <p className={cx('text-sm font-medium', TEXT_TITLE)}>
                          <span className={NUM}>{mv.type === 'in' ? '+' : '−'}{mv.quantity}</span> {supply.unit}(s)
                          <span className={cx('ml-1.5 font-normal', TEXT_MUTED, NUM)}>→ {mv.stock_after}</span>
                        </p>
                        <p className={cx('truncate text-xs', TEXT_MUTED)} title={mv.reason}>{mv.reason}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cx('text-xs', TEXT_MUTED, NUM)}>
                        {format(new Date(mv.created_at), 'd MMM', { locale: fr })}
                      </p>
                      {mv.user && <p className={cx('max-w-[90px] truncate text-xs', TEXT_FAINT)}>{mv.user.name}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={History}
                title="Aucun mouvement enregistré"
                description="Les entrées et sorties de cette fourniture apparaîtront ici."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function FournituresIndex({ supplies: initialData, lowStock }) {
  const { auth }      = usePage().props;
  const [movTarget, setMovTarget]   = useState(null);
  const [histTarget, setHistTarget] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const isAdmin = auth.user?.roles?.some(r => ['admin_org', 'superadmin_ibig'].includes(r));

  const handleSuccess = () => {
    setMovTarget(null);
    setShowCreate(false);
    router.reload({ only: ['supplies', 'lowStock'] });
  };

  const exportExcel = () => {
    window.open(route('resources.fournitures.export'), '_blank');
  };

  const rows      = initialData.data ?? [];
  const outOfStock = rows.filter(s => s.quantity === 0).length;

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'name',
      label: 'Désignation',
      render: (v, s) => {
        const isLow = s.quantity <= s.min_quantity;
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <Package className={cx('h-4 w-4 shrink-0', isLow ? 'text-amber-500' : TEXT_FAINT)} />
            <span className={cx('truncate font-medium', TEXT_TITLE)}>{v}</span>
            {s.reference && (
              <span className={cx('shrink-0 font-mono text-xs', TEXT_FAINT)}>#{s.reference}</span>
            )}
          </div>
        );
      },
    },
    { key: 'unit', label: 'Unité', nowrap: true, className: 'capitalize' },
    {
      key: 'quantity',
      label: 'Stock actuel',
      width: '190px',
      render: (_v, s) => <StockBar quantity={s.quantity} minQuantity={s.min_quantity} />,
    },
    { key: 'min_quantity', label: 'Seuil min.', numeric: true, width: '110px' },
    {
      key: 'supplier',
      label: 'Fournisseur',
      render: (v) => v ?? <span className={TEXT_FAINT}>—</span>,
    },
    {
      key: 'location',
      label: 'Lieu',
      render: (v) => v ?? <span className={TEXT_FAINT}>—</span>,
    },
  ];

  /* ─── Rendu ──────────────────────────────────────────────────────────────── */

  return (
    <AuthLayout>
      <Head title="Fournitures — Ressources" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={Layers}
          title="Fournitures & Stocks"
          breadcrumbs={[{ label: 'Ressources' }, { label: 'Fournitures' }]}
          subtitle={`${initialData.total} référence${initialData.total !== 1 ? 's' : ''} suivie${initialData.total !== 1 ? 's' : ''}`}
          actions={
            <>
              <Button variant="secondary" icon={Download} onClick={exportExcel}>Exporter</Button>
              {isAdmin && (
                <Button variant="primary" icon={PlusCircle} onClick={() => setShowCreate(true)}>Nouvelle fourniture</Button>
              )}
            </>
          }
        />

        {/* Indicateurs */}
        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-3">
          <StatCard label="Références" value={initialData.total} icon={Layers} tone="accent" />
          <StatCard label="Sous le seuil" value={lowStock.length} icon={TrendingDown}
                    tone={lowStock.length > 0 ? 'warning' : 'neutral'} hint="réapprovisionnement conseillé" />
          <StatCard label="Rupture" value={outOfStock} icon={AlertTriangle}
                    tone={outOfStock > 0 ? 'danger' : 'neutral'} hint="sur cette page" />
        </div>

        {/* Bandeau alertes stock bas */}
        {lowStock.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div className="min-w-0">
                <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {lowStock.length} fourniture{lowStock.length !== 1 ? 's' : ''} en stock insuffisant
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {lowStock.map((s) => (
                    <Badge key={s.id} variant="warning" outline size="md">
                      {s.name} <span className={cx('ml-1 font-semibold', NUM)}>{s.quantity}/{s.min_quantity}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tableau */}
        <DataTable
          columns={columns}
          data={rows}
          rowKey="id"
          pageSize={initialData.per_page ?? 15}
          totalItems={initialData.total ?? rows.length}
          rowClassName={(s) => s.quantity <= s.min_quantity ? 'bg-amber-50/40 dark:bg-amber-500/[0.04]' : ''}
          actions={(supply) => (
            <>
              <Button variant="ghost" size="sm" iconOnly icon={ArrowUpCircle}
                      title="Mouvement de stock" onClick={() => setMovTarget(supply)}
                      className="text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-500/10" />
              <Button variant="ghost" size="sm" iconOnly icon={History}
                      title="Historique" onClick={() => setHistTarget(supply)} />
            </>
          )}
          empty={
            <EmptyState
              icon={Package}
              title="Aucune fourniture enregistrée"
              description="Déclarez vos consommables — papier, encre, fournitures de bureau — pour suivre les stocks et être alerté avant la rupture."
              hints={[
                'Le seuil minimum déclenche automatiquement une alerte de réapprovisionnement.',
                "Chaque entrée ou sortie est historisée avec son motif et son auteur.",
              ]}
              action={isAdmin
                ? <Button variant="primary" icon={PlusCircle} onClick={() => setShowCreate(true)}>Ajouter une fourniture</Button>
                : undefined}
            />
          }
          footer={initialData.last_page > 1 ? (
            <div className="flex flex-wrap items-center justify-center gap-1 px-4 py-3">
              {Array.from({ length: initialData.last_page }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => router.get(route('resources.fournitures.index'), { page }, { preserveState: true, replace: true })}
                  className={cx(
                    'h-8 min-w-[32px] rounded-lg border px-2 text-xs font-medium transition-colors', NUM, FOCUS_RING,
                    initialData.current_page === page
                      ? 'border-transparent bg-purple-600 text-white'
                      : cx(BORDER, SURFACE, 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
          ) : null}
        />
      </div>

      {movTarget && (
        <MovementModal
          supply={movTarget}
          onClose={() => setMovTarget(null)}
          onSuccess={handleSuccess}
        />
      )}
      {histTarget && (
        <HistoryModal
          supply={histTarget}
          onClose={() => setHistTarget(null)}
        />
      )}
      {showCreate && (
        <CreateSupplyModal
          onClose={() => setShowCreate(false)}
          onSuccess={handleSuccess}
        />
      )}
    </AuthLayout>
  );
}
export { FournituresIndex };
