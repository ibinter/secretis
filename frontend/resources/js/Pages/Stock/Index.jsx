/**
 * Stock/Index.jsx — valorisation et journal des mouvements.
 *
 * L'écran Fournitures montrait des quantités. Un stock n'est pas un décompte :
 * c'est une valeur immobilisée. `unit_price` était saisi une fois et ne bougeait
 * plus, si bien que deux réapprovisionnements à des prix différents laissaient
 * l'ensemble valorisé au premier. La colonne « coût moyen » est désormais
 * recalculée à chaque entrée.
 */

import { useEffect, useMemo, useState } from 'react';
import { Head, router, useForm, Link } from '@inertiajs/react';
import {
  Boxes, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, ClipboardList, Wallet,
} from 'lucide-react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState, Modal, FormInput, Select,
  cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const SOURCES = {
  manual:           'Saisie',
  goods_receipt:    'Réception',
  supplier_invoice: 'Facture',
  stock_count:      'Inventaire',
};

export default function StockIndex({
  valeurTotale = 0, lignes = [], mouvements = [], sousSeuil = 0, inventaireOuvert = null,
}) {
  const [saisie, setSaisie] = useState(null); // 'in' | 'out' | null

  const articles = lignes.length;
  const unites = useMemo(() => lignes.reduce((t, l) => t + l.quantity, 0), [lignes]);

  return (
    <AuthLayout>
      <Head title="Stock" />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={Boxes}
          title="Stock"
          subtitle="Valorisé au coût moyen unitaire pondéré, recalculé à chaque entrée."
          breadcrumbs={[{ label: 'Ressources', href: '/ressources' }, { label: 'Stock' }]}
          actions={
            <div className="flex gap-2">
              <Button variant="subtle" onClick={() => setSaisie('out')}>
                <ArrowUpFromLine className="h-4 w-4" /> Sortie
              </Button>
              <Button onClick={() => setSaisie('in')}>
                <ArrowDownToLine className="h-4 w-4" /> Entrée
              </Button>
            </div>
          }
        />

        {inventaireOuvert && (
          <div className="flex items-start gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              L'inventaire <strong>{inventaireOuvert}</strong> est en cours de comptage.{' '}
              <Link href="/stock/inventaire" className="underline underline-offset-2">Le reprendre</Link>
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Wallet}        label="Valeur du stock" value={fmt(valeurTotale)} />
          <StatCard icon={Boxes}         label="Références"      value={articles} />
          <StatCard icon={ArrowDownToLine} label="Unités"         value={fmt(unites)} />
          <StatCard icon={AlertTriangle} label="Sous le seuil"   value={sousSeuil}
                    tone={sousSeuil > 0 ? 'warning' : undefined} />
        </div>

        <Card
          title="Valorisation"
          actions={
            <Link href="/stock/inventaire">
              <Button variant="subtle" size="sm">
                <ClipboardList className="h-4 w-4" /> Inventaire physique
              </Button>
            </Link>
          }
        >
          {articles === 0 ? (
            <EmptyState
              icon={Boxes}
              title="Aucune fourniture suivie"
              description="Créez des fournitures depuis l'écran Ressources pour qu'elles apparaissent ici."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-2 py-2">Article</th>
                    <th className="px-2 py-2 text-right">Quantité</th>
                    <th className="px-2 py-2 text-right">Seuil</th>
                    <th className="px-2 py-2 text-right">Coût moyen</th>
                    <th className="px-2 py-2 text-right">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l) => (
                    <tr key={l.id} className={cx('border-b', BORDER)}>
                      <td className={cx('px-2 py-2.5 font-medium', TEXT_TITLE)}>
                        {l.name}
                        {l.sous_seuil && (
                          <Badge variant="warning" className="ml-2">à réapprovisionner</Badge>
                        )}
                      </td>
                      <td className={cx('px-2 py-2.5 text-right', NUM)}>
                        {fmt(l.quantity)} <span className={TEXT_FAINT}>{l.unit}</span>
                      </td>
                      <td className={cx('px-2 py-2.5 text-right', NUM, TEXT_FAINT)}>{fmt(l.min_quantity)}</td>
                      <td className={cx('px-2 py-2.5 text-right', NUM)}>{fmt(l.average_cost)}</td>
                      <td className={cx('px-2 py-2.5 text-right font-medium', NUM)}>{fmt(l.valeur)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className={cx('px-2 py-2.5 font-medium', TEXT_TITLE)} colSpan={4}>Total</td>
                    <td className={cx('px-2 py-2.5 text-right font-semibold', NUM, TEXT_TITLE)}>{fmt(valeurTotale)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Derniers mouvements">
          {mouvements.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Aucun mouvement" description="Les entrées et sorties apparaîtront ici." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Article</th>
                    <th className="px-2 py-2">Sens</th>
                    <th className="px-2 py-2 text-right">Qté</th>
                    <th className="px-2 py-2 text-right">Stock après</th>
                    <th className="px-2 py-2 text-right">Valeur</th>
                    <th className="px-2 py-2">Motif</th>
                    <th className="px-2 py-2">Par</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map((m) => (
                    <tr key={m.id} className={cx('border-b', BORDER)}>
                      <td className={cx('px-2 py-2.5 text-xs whitespace-nowrap', TEXT_FAINT)}>{m.date}</td>
                      <td className="px-2 py-2.5">{m.supply}</td>
                      <td className="px-2 py-2.5">
                        <Badge variant={m.type === 'in' ? 'success' : 'neutral'}>
                          {m.type === 'in' ? 'Entrée' : 'Sortie'}
                        </Badge>
                      </td>
                      <td className={cx('px-2 py-2.5 text-right', NUM)}>
                        {m.type === 'in' ? '+' : '−'}{fmt(m.quantity)}
                      </td>
                      <td className={cx('px-2 py-2.5 text-right', NUM, TEXT_FAINT)}>{fmt(m.stock_after)}</td>
                      <td className={cx('px-2 py-2.5 text-right', NUM)}>{fmt(m.total_cost)}</td>
                      <td className={cx('px-2 py-2.5 text-xs', TEXT_MUTED)}>
                        {m.reason}
                        {m.source && m.source !== 'manual' && (
                          <Badge variant="neutral" className="ml-2">{SOURCES[m.source] ?? m.source}</Badge>
                        )}
                      </td>
                      <td className={cx('px-2 py-2.5 text-xs', TEXT_FAINT)}>{m.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ModalMouvement
        sens={saisie}
        onClose={() => setSaisie(null)}
        lignes={lignes}
      />
    </AuthLayout>
  );
}

/**
 * Le coût unitaire n'est demandé qu'à l'entrée : une sortie est valorisée au
 * coût moyen du moment, et laisser l'utilisateur le fixer fausserait la valeur
 * du stock restant.
 */
function ModalMouvement({ sens, onClose, lignes }) {
  const { data, setData, post, processing, errors, reset } = useForm({
    supply_id: '', type: 'in', quantity: '', reason: '', unit_cost: '',
  });

  const entree = sens === 'in';
  const article = lignes.find((l) => String(l.id) === String(data.supply_id));

  // Le sens vient du bouton cliqué, pas d'un champ : la modale sert aux deux,
  // et poster un `type` resté sur la valeur précédente inverserait le
  // mouvement — une sortie enregistrée comme entrée.
  useEffect(() => {
    if (sens) setData('type', sens);
  }, [sens]);

  const soumettre = (e) => {
    e.preventDefault();
    post('/stock/mouvement', {
      preserveScroll: true,
      onSuccess: () => { reset(); onClose(); },
    });
  };

  return (
    <Modal
      open={sens !== null}
      onClose={onClose}
      title={entree ? 'Entrée en stock' : 'Sortie de stock'}
    >
      <form onSubmit={soumettre} className="space-y-4">
        {errors.mouvement && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{errors.mouvement}</div>
        )}

        <Select
          label="Article"
          options={lignes.map((l) => ({
            value: String(l.id),
            label: `${l.name} — ${l.quantity} ${l.unit} en stock`,
          }))}
          value={data.supply_id}
          onChange={(v) => setData('supply_id', v)}
          error={errors.supply_id}
          placeholder="Choisir un article…"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            id="mvt-qte" label="Quantité" type="number" min="1" required
            suffix={article?.unit}
            value={data.quantity}
            onChange={(e) => setData('quantity', e.target.value)}
            error={errors.quantity}
          />

          {entree && (
            <FormInput
              id="mvt-cout" label="Coût unitaire" type="number" step="0.01"
              hint="À défaut, le coût moyen actuel est reconduit."
              value={data.unit_cost}
              onChange={(e) => setData('unit_cost', e.target.value)}
              error={errors.unit_cost}
            />
          )}
        </div>

        {!entree && article && Number(data.quantity) > article.quantity && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Il n'y a que {fmt(article.quantity)} {article.unit} en stock.
          </div>
        )}

        <FormInput
          id="mvt-motif" label="Motif" required
          placeholder={entree ? 'Réapprovisionnement, retour…' : 'Sortie pour le service comptabilité…'}
          value={data.reason}
          onChange={(e) => setData('reason', e.target.value)}
          error={errors.reason}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="subtle" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={processing}>Enregistrer</Button>
        </div>
      </form>
    </Modal>
  );
}
