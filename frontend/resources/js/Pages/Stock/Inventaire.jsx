/**
 * Stock/Inventaire.jsx — confrontation du théorique au réel.
 *
 * Le stock théorique dérive toujours : casse, perte, erreur de saisie. Sans
 * comptage, l'écart s'accumule en silence et la valeur devient une fiction.
 *
 * Deux principes portés par l'écran :
 *   — la quantité attendue est FIGÉE à l'ouverture, pour qu'un mouvement
 *     survenu pendant le comptage ne se lise pas comme une perte ;
 *   — une ligne laissée vide n'est PAS un écart nul : elle n'a pas été
 *     comptée, et la clôture le dit explicitement plutôt que de la valider.
 */

import { useMemo, useState } from 'react';
import { Head, router, useForm, Link } from '@inertiajs/react';
import {
  ClipboardList, Play, CheckCircle2, AlertTriangle, ArrowLeft, History,
} from 'lucide-react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState, FormInput, Select,
  cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

const fmt = (n) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });

export default function Inventaire({ inventaire = null, historique = [], lieux = [] }) {
  return (
    <AuthLayout>
      <Head title="Inventaire physique" />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={ClipboardList}
          title="Inventaire physique"
          subtitle="Chaque écart produit un mouvement tracé, jamais une correction silencieuse."
          breadcrumbs={[{ label: 'Stock', href: '/stock' }, { label: 'Inventaire' }]}
        />

        {inventaire ? <Comptage inventaire={inventaire} /> : <Ouverture lieux={lieux} />}

        {historique.length > 0 && (
          <Card title="Inventaires clos">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-2 py-2">Référence</th>
                    <th className="px-2 py-2">Date de comptage</th>
                    <th className="px-2 py-2">Lieu</th>
                    <th className="px-2 py-2">Clos le</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((h) => (
                    <tr key={h.reference} className={cx('border-b', BORDER)}>
                      <td className={cx('px-2 py-2.5 font-medium', TEXT_TITLE, NUM)}>{h.reference}</td>
                      <td className="px-2 py-2.5">{h.count_date}</td>
                      <td className={cx('px-2 py-2.5', TEXT_MUTED)}>{h.location ?? 'Tous lieux'}</td>
                      <td className={cx('px-2 py-2.5 text-xs', TEXT_FAINT)}>{h.closed_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Link href="/stock" className={cx('inline-flex items-center gap-1.5 text-sm', TEXT_MUTED)}>
          <ArrowLeft className="h-4 w-4" /> Retour au stock
        </Link>
      </div>
    </AuthLayout>
  );
}

function Ouverture({ lieux }) {
  const { data, setData, post, processing, errors } = useForm({ location: '', notes: '' });

  return (
    <Card title="Ouvrir un comptage">
      <form
        onSubmit={(e) => { e.preventDefault(); post('/stock/inventaire', { preserveScroll: true }); }}
        className="space-y-4"
      >
        {errors.inventaire && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{errors.inventaire}</div>
        )}

        <p className={cx('text-sm', TEXT_MUTED)}>
          À l'ouverture, la quantité théorique de chaque article est figée. Les mouvements
          qui surviennent pendant le comptage n'altèrent donc pas les écarts constatés.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Lieu de stockage"
            options={[
              { value: '', label: 'Tous les lieux' },
              ...lieux.map((l) => ({ value: l, label: l })),
            ]}
            value={data.location}
            onChange={(v) => setData('location', v)}
            hint="Restreindre le comptage à une seule réserve"
          />
          <FormInput
            id="inv-note" label="Note"
            placeholder="Inventaire annuel, contrôle ponctuel…"
            value={data.notes}
            onChange={(e) => setData('notes', e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={processing}>
            <Play className="h-4 w-4" /> Ouvrir le comptage
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Comptage({ inventaire }) {
  const [comptages, setComptages] = useState(() =>
    Object.fromEntries(inventaire.lignes.map((l) => [l.id, l.compte ?? ''])),
  );
  const [enCours, setEnCours] = useState(false);

  const bilan = useMemo(() => {
    let comptees = 0, ecarts = 0, valeur = 0;

    inventaire.lignes.forEach((l) => {
      const saisi = comptages[l.id];
      if (saisi === '' || saisi === null || saisi === undefined) return;
      comptees++;
      const e = Number(saisi) - l.attendu;
      if (e !== 0) { ecarts++; valeur += e * Number(l.cout ?? 0); }
    });

    return { comptees, ecarts, valeur, restantes: inventaire.lignes.length - comptees };
  }, [comptages, inventaire.lignes]);

  const enregistrer = () => {
    setEnCours(true);
    router.post(`/stock/inventaire/${inventaire.id}/comptage`, { comptages }, {
      preserveScroll: true,
      onFinish: () => setEnCours(false),
    });
  };

  const cloturer = () => {
    // Le comptage est enregistré d'abord : clôturer sur des valeurs restées
    // dans le navigateur régulariserait sur des chiffres que le serveur
    // n'a jamais reçus.
    setEnCours(true);
    router.post(`/stock/inventaire/${inventaire.id}/comptage`, { comptages }, {
      preserveScroll: true,
      onSuccess: () => router.post(`/stock/inventaire/${inventaire.id}/cloturer`, {}, {
        onFinish: () => setEnCours(false),
      }),
      onError: () => setEnCours(false),
    });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Articles"       value={inventaire.lignes.length} />
        <StatCard icon={CheckCircle2}  label="Comptés"        value={bilan.comptees} />
        <StatCard icon={AlertTriangle} label="Écarts"         value={bilan.ecarts}
                  tone={bilan.ecarts > 0 ? 'warning' : undefined} />
        <StatCard icon={History}       label="Valeur d'écart" value={fmt(bilan.valeur)} />
      </div>

      {bilan.restantes > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>{bilan.restantes} article(s)</strong> ne sont pas encore comptés. À la clôture
            ils resteront inchangés — une case vide n'est pas un comptage à zéro.
          </span>
        </div>
      )}

      <Card
        title={`Comptage ${inventaire.reference}`}
        subtitle={[inventaire.location ?? 'Tous lieux', inventaire.count_date].filter(Boolean).join(' · ')}
        actions={
          <div className="flex gap-2">
            <Button variant="subtle" size="sm" onClick={enregistrer} disabled={enCours}>
              Enregistrer
            </Button>
            <Button size="sm" onClick={cloturer} disabled={enCours}>
              <CheckCircle2 className="h-4 w-4" /> Clôturer et régulariser
            </Button>
          </div>
        }
      >
        {inventaire.lignes.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucun article à compter"
            description="Ce lieu de stockage ne contient aucune fourniture suivie."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                  <th className="px-2 py-2">Article</th>
                  <th className="px-2 py-2 text-right">Théorique</th>
                  <th className="px-2 py-2 text-right">Compté</th>
                  <th className="px-2 py-2 text-right">Écart</th>
                  <th className="px-2 py-2 text-right">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {inventaire.lignes.map((l) => {
                  const saisi = comptages[l.id];
                  const vide = saisi === '' || saisi === null || saisi === undefined;
                  const ecart = vide ? null : Number(saisi) - l.attendu;

                  return (
                    <tr key={l.id} className={cx('border-b', BORDER)}>
                      <td className={cx('px-2 py-2.5 font-medium', TEXT_TITLE)}>
                        {l.supply} <span className={TEXT_FAINT}>({l.unit})</span>
                      </td>
                      <td className={cx('px-2 py-2.5 text-right', NUM, TEXT_MUTED)}>{fmt(l.attendu)}</td>
                      <td className="px-2 py-2.5">
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          aria-label={`Quantité comptée pour ${l.supply}`}
                          className={cx(
                            'h-9 w-24 rounded-lg border px-2 text-right text-sm tabular-nums',
                            'bg-white dark:bg-[#0F1923] text-gray-900 dark:text-white',
                            'border-gray-300 dark:border-gray-600',
                            'focus:outline-none focus:ring-2 focus:ring-[#7e22ce]/30 focus:border-[#7e22ce]',
                          )}
                          value={saisi ?? ''}
                          onChange={(e) => setComptages((c) => ({ ...c, [l.id]: e.target.value }))}
                        />
                      </td>
                      <td className={cx('px-2 py-2.5 text-right', NUM)}>
                        {ecart === null ? (
                          <span className={TEXT_FAINT}>—</span>
                        ) : ecart === 0 ? (
                          <Badge variant="success">exact</Badge>
                        ) : (
                          <Badge variant={ecart > 0 ? 'info' : 'danger'}>
                            {ecart > 0 ? '+' : '−'}{fmt(Math.abs(ecart))}
                          </Badge>
                        )}
                      </td>
                      <td className={cx('px-2 py-2.5 text-right', NUM, TEXT_MUTED)}>
                        {ecart ? fmt(ecart * Number(l.cout ?? 0)) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
