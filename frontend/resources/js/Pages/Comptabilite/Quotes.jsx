/**
 * Comptabilite/Quotes.jsx — Devis SECRETIS ERP
 *
 * Props Inertia :
 *   quotes  : Paginator<Quote with client>
 *   clients : AccountingClient[]
 *   filters : { status, client_id }
 *
 * Présentation migrée sur `@/Components/UI` + socle comptable partagé.
 * Logique métier inchangée (routes, axios, états).
 */

import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
  DocumentArrowDownIcon, EnvelopeIcon, ArrowRightCircleIcon,
  PlusIcon, PencilSquareIcon, ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, DataTable, EmptyState,
  cx, CONTROL, BORDER, SURFACE, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, FOCUS_RING,
} from '@/Components/UI';
import { Money, StatusBadge, statusOptions } from '@/Components/Comptabilite/accounting';

const STATUS_OPTIONS = statusOptions('quote');

const fmtDate = (d) => {
  if (!d) return null;
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
};

// =============================================================================

export default function Quotes({ quotes, clients, filters }) {
  const [loading, setLoading] = useState({});

  const setLoaderKey = (key, val) => setLoading((p) => ({ ...p, [key]: val }));

  const handleSend = async (id, number) => {
    setLoaderKey(`send-${id}`, true);
    try {
      await axios.post(`/comptabilite/devis/${id}/send`);
      toast.success(`Devis ${number} envoyé.`);
      router.reload({ only: ['quotes'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Erreur lors de l\'envoi.');
    } finally {
      setLoaderKey(`send-${id}`, false);
    }
  };

  const handleConvert = async (id, number) => {
    if (! confirm(`Convertir le devis ${number} en facture ?`)) return;
    setLoaderKey(`convert-${id}`, true);
    try {
      const { data } = await axios.get(`/comptabilite/devis/${id}/convert`);
      toast.success(data.message);
      router.reload({ only: ['quotes'] });
    } catch (e) {
      toast.error(e.response?.data?.message ?? 'Erreur lors de la conversion.');
    } finally {
      setLoaderKey(`convert-${id}`, false);
    }
  };

  const applyFilter = (key, value) => {
    router.get('/comptabilite/devis', { ...filters, [key]: value || undefined }, {
      preserveState: true, replace: true,
    });
  };

  const isFiltered = Boolean(filters?.status || filters?.client_id);

  const resetFilters = () => {
    router.get('/comptabilite/devis', {}, { preserveState: true, replace: true });
  };

  /* ─── Colonnes ───────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: 'quote_number',
      label: 'N° Devis',
      nowrap: true,
      width: '150px',
      render: (v) => (
        <span className="font-mono text-xs font-semibold text-purple-700 dark:text-purple-400">{v}</span>
      ),
    },
    {
      key: 'client',
      label: 'Client',
      render: (_v, q) => (
        <span className={cx('font-medium', TEXT_TITLE)}>
          {q.client?.name ?? <span className={TEXT_FAINT}>—</span>}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Objet',
      render: (v) => (
        <span className="block max-w-xs truncate">{v || <span className={TEXT_FAINT}>—</span>}</span>
      ),
    },
    {
      key: 'issue_date',
      label: 'Émis le',
      nowrap: true,
      render: (v) => (
        <span className={cx('text-xs tabular-nums', TEXT_MUTED)}>
          {fmtDate(v) ?? <span className={TEXT_FAINT}>—</span>}
        </span>
      ),
    },
    {
      key: 'valid_until',
      label: 'Valide jusqu\'au',
      nowrap: true,
      render: (v, q) => {
        const d = fmtDate(v);
        if (!d) return <span className={TEXT_FAINT}>—</span>;
        return (
          <span className={cx(
            'text-xs tabular-nums',
            q.status === 'expired'
              ? 'font-semibold text-amber-600 dark:text-amber-400'
              : TEXT_MUTED,
          )}>
            {d}
          </span>
        );
      },
    },
    {
      key: 'total',
      label: 'Total TTC',
      numeric: true,
      width: '160px',
      render: (v) => <Money value={v} />,
    },
    {
      key: 'status',
      label: 'Statut',
      nowrap: true,
      render: (v) => <StatusBadge kind="quote" status={v} />,
    },
  ];

  /* ─── Rendu ──────────────────────────────────────────────────────────────── */

  return (
    <AuthLayout>
      <Head title="Devis" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">

        <PageHeader
          icon={ClipboardDocumentListIcon}
          title="Devis"
          breadcrumbs={[{ label: 'Comptabilité', href: '/comptabilite' }, { label: 'Devis' }]}
          subtitle={`${quotes.total ?? quotes.data.length} devis — montants en FCFA (XOF)`}
          actions={
            <Button
              variant="primary" icon={PlusIcon}
              onClick={() => router.visit('/comptabilite/devis/create')}
            >
              Nouveau devis
            </Button>
          }
        />

        {/* Filtres */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            defaultValue={filters.status}
            onChange={(e) => applyFilter('status', e.target.value)}
            className={cx(CONTROL, 'h-10 w-auto min-w-[180px]')}
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            defaultValue={filters.client_id}
            onChange={(e) => applyFilter('client_id', e.target.value)}
            className={cx(CONTROL, 'h-10 w-auto min-w-[180px]')}
          >
            <option value="">Tous les clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {isFiltered && (
            <Button variant="ghost" onClick={resetFilters}>Réinitialiser</Button>
          )}
        </div>

        {/* Tableau */}
        <DataTable
          columns={columns}
          data={quotes.data}
          rowKey="id"
          pageSize={quotes.per_page ?? 15}
          totalItems={quotes.total ?? quotes.data.length}
          actions={(quote) => (
            <>
              <Button
                variant="ghost" size="sm" iconOnly icon={DocumentArrowDownIcon}
                title="Télécharger le PDF"
                onClick={() => window.open(`/comptabilite/devis/${quote.id}/pdf`, '_blank')}
              />
              {quote.status === 'draft' && (
                <Button
                  variant="ghost" size="sm" iconOnly icon={PencilSquareIcon}
                  title="Modifier le devis"
                  onClick={() => router.visit(`/comptabilite/devis/${quote.id}/edit`)}
                />
              )}
              {['draft', 'sent'].includes(quote.status) && (
                <Button
                  variant="ghost" size="sm" iconOnly icon={EnvelopeIcon}
                  title="Envoyer par email"
                  loading={loading[`send-${quote.id}`]}
                  onClick={() => handleSend(quote.id, quote.quote_number)}
                />
              )}
              {['sent', 'accepted'].includes(quote.status) && (
                <Button
                  variant="ghost" size="sm" iconOnly icon={ArrowRightCircleIcon}
                  title="Convertir en facture"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400"
                  loading={loading[`convert-${quote.id}`]}
                  onClick={() => handleConvert(quote.id, quote.quote_number)}
                />
              )}
            </>
          )}
          empty={
            isFiltered ? (
              <EmptyState
                variant="no-results"
                title="Aucun devis ne correspond"
                description="Aucun résultat pour ces critères. Changez de statut ou de client."
                action={<Button variant="secondary" onClick={resetFilters}>Réinitialiser les filtres</Button>}
              />
            ) : (
              <EmptyState
                icon={ClipboardDocumentListIcon}
                title="Aucun devis"
                description="Créez votre premier devis : une fois accepté, il se convertit en facture en un clic."
                hints={[
                  'Un devis en brouillon reste librement modifiable.',
                  'La conversion en facture reprend les lignes et la TVA.',
                ]}
                action={
                  <Button
                    variant="primary" icon={PlusIcon}
                    onClick={() => router.visit('/comptabilite/devis/create')}
                  >
                    Créer votre premier devis
                  </Button>
                }
              />
            )
          }
          footer={quotes.last_page > 1 && quotes.links ? (
            <div className="flex flex-wrap items-center justify-center gap-1 px-4 py-3">
              {quotes.links.map((link, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!link.url}
                  onClick={() => link.url && router.get(link.url)}
                  dangerouslySetInnerHTML={{ __html: link.label }}
                  className={cx(
                    'min-w-[32px] rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    link.active
                      ? 'border-transparent bg-purple-600 text-white'
                      : cx(BORDER, SURFACE, 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]'),
                    !link.url && 'pointer-events-none opacity-40',
                    FOCUS_RING,
                  )}
                />
              ))}
            </div>
          ) : null}
        />
      </div>
    </AuthLayout>
  );
}
export { Quotes };
