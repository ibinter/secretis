/**
 * SuperAdmin/Licences/Index.jsx — console des licences (section 12.6).
 *
 * Aucun nombre n'est écrit ici. Ni la durée d'essai, ni le plafond, ni le seuil
 * de l'alerte commerciale, ni les libellés d'état : tout descend du serveur
 * dans `reglages`, qui les lit dans `licence.config.json`. Un chiffre écrit
 * dans ce fichier serait juste aujourd'hui et faux le jour où la configuration
 * change — sans que personne ne pense à venir le corriger ici.
 *
 * L'ordre de la page n'est pas décoratif. L'alerte commerciale vient AVANT la
 * liste des espaces : la section 12.6 en fait « les prospects les plus chauds
 * du portefeuille », et une liste chaude placée en bas de page est une liste
 * qu'on ne lit pas.
 */

import { useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
  KeyRound, Flame, CalendarClock, TrendingUp, Building2, AlertTriangle,
  Search, ArrowRight, ShieldAlert,
} from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState, Select,
  cx, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

/* ─── Présentation des six états officiels ──────────────────────────────────
 * Les six valeurs viennent du serveur (`etats`), jamais d'une liste écrite
 * ici : c'est ce qui garantit qu'aucun « état maison » ne peut apparaître.
 * Seuls le ton visuel et la clé de glossaire sont décidés côté écran.
 */
const TON_ETAT = {
  DEMO:    'neutral',
  FREE:    'info',
  TRIAL:   'accent',
  ACTIVE:  'success',
  GRACE:   'warning',
  EXPIRED: 'danger',
};

const CLE_GLOSSAIRE = {
  DEMO:    'demo_publique',
  FREE:    'gratuit',
  TRIAL:   'essai',
  ACTIVE:  'formule',
  GRACE:   'grace',
  EXPIRED: 'lecture_seule',
};

const fmt  = (n) => Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
const jour = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
const dateHeure = (d) =>
  (d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export default function LicencesIndex({
  reglages, etats = [], repartition = {}, conversion = {}, echeances = [],
  prospects = [], espaces = [], total = 0, incoherences = [], filtres = {},
}) {
  const glossaire = reglages?.glossaire ?? {};

  const libelle = (etat) => glossaire[CLE_GLOSSAIRE[etat]] ?? etat;

  const naviguer = (patch) => {
    const params = { ...filtres, ...patch };
    router.get('/superadmin/licences', params, {
      preserveState: true, preserveScroll: true, replace: true,
    });
  };

  const optionsEtat = useMemo(
    () => [{ value: '', label: 'Tous les états' }]
      .concat(etats.map((e) => ({ value: e, label: `${libelle(e)} · ${e}` }))),
    [etats, glossaire],
  );

  const anomalies = incoherences.reduce((t, a) => t + Math.max(a.lignes.length, 1), 0);

  return (
    <SuperAdminLayout title="Licences">
      <Head title="Licences" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={KeyRound}
          title="Licences"
          subtitle={
            `${reglages.nom_solution} — essai de ${reglages.essai_jours} jour(s), `
            + `période de grâce de ${reglages.grace_jours} jour(s), `
            + `conservation ${reglages.retention_jours} jour(s) après échéance. `
            + `Palier ${reglages.palier_gratuit} : ${reglages.plafond_resume}.`
          }
          breadcrumbs={[{ label: 'Administration', href: '/superadmin' }, { label: 'Licences' }]}
        />

        {/* ─── Répartition des six états ───────────────────────────────────── */}

        <section aria-label="Répartition des états">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {etats.map((etat) => (
              <StatCard
                key={etat}
                label={libelle(etat)}
                value={fmt(repartition[etat])}
                hint={etat}
                tone={TON_ETAT[etat] ?? 'neutral'}
                active={filtres.etat === etat}
                onClick={() => naviguer({ etat: filtres.etat === etat ? '' : etat })}
              />
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={TrendingUp}
            label="Conversion essai → payant"
            value={conversion.taux === null || conversion.taux === undefined
              ? '—'
              : `${fmt(conversion.taux)} %`}
            hint={conversion.essais > 0
              ? `${fmt(conversion.convertis)} sur ${fmt(conversion.essais)} espace(s) passés par un essai`
              : 'Aucun essai enregistré : pas de taux à calculer.'}
            tone="accent"
          />
          <StatCard
            icon={CalendarClock}
            label={`Échéance sous ${reglages.preavis_jours} jour(s)`}
            value={fmt(echeances.length)}
            tone={echeances.length > 0 ? 'warning' : 'neutral'}
            hint="Essais et abonnements arrivant à terme"
          />
          <StatCard
            icon={Building2}
            label="Espaces suivis"
            value={fmt(total)}
            hint={`Solution ${reglages.solution}`}
          />
        </div>

        {/* ─── Alerte commerciale — la place que le cahier lui donne ────────── */}

        <Card
          icon={Flame}
          title="Alerte commerciale"
          subtitle={
            `Espaces ayant buté au moins ${reglages.seuil_prospect} fois sur un plafond. `
            + 'Ce sont les prospects les plus chauds du portefeuille : ils ont essayé de faire '
            + 'davantage et se sont heurtés à la limite.'
          }
          flush
        >
          {prospects.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                icon={Flame}
                title="Aucun espace au contact du plafond"
                description={
                  `Aucun espace n'a atteint ${reglages.seuil_prospect} tentatives refusées. `
                  + 'Cette liste se remplit d\'elle-même à mesure que les espaces du palier '
                  + `${reglages.palier_gratuit} approchent de leur limite.`
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-4 py-2.5">Espace</th>
                    <th className="px-4 py-2.5">État</th>
                    <th className="px-4 py-2.5">Compteur métier</th>
                    <th className="px-4 py-2.5 text-right">Butées</th>
                    <th className="px-4 py-2.5 text-right">Plafond</th>
                    <th className="px-4 py-2.5">Dernière</th>
                    <th className="px-4 py-2.5 text-right">Proposition</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p) => (
                    <tr key={`${p.organization_id}-${p.compteur}`} className={cx('border-b', BORDER)}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/superadmin/licences/${p.organization_id}`}
                          className={cx('font-medium hover:underline', TEXT_TITLE)}
                        >
                          {p.nom}
                        </Link>
                        <div className={cx('text-xs', TEXT_FAINT)}>{p.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={TON_ETAT[p.etat] ?? 'neutral'}>{libelle(p.etat)}</Badge>
                      </td>
                      <td className={cx('px-4 py-3', TEXT_MUTED)}>{p.compteur}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={cx('font-semibold text-red-600 dark:text-red-400', NUM)}>
                          {fmt(p.butees)}
                        </span>
                      </td>
                      <td className={cx('px-4 py-3 text-right', NUM, TEXT_MUTED)}>{fmt(p.plafond)}</td>
                      <td className={cx('px-4 py-3 text-xs', TEXT_FAINT)}>{dateHeure(p.derniere)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/superadmin/licences/${p.organization_id}`}>
                          <Button size="sm" variant="subtle" iconRight={ArrowRight}>
                            {p.formule_suivante ?? 'Ouvrir'}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ─── Échéances proches ───────────────────────────────────────────── */}

        {echeances.length > 0 && (
          <Card
            icon={CalendarClock}
            title={`Échéances dans ${reglages.preavis_jours} jour(s) ou moins`}
            subtitle="Rien n'est coupé à l'échéance : l'accès bascule, il ne disparaît pas."
            flush
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-4 py-2.5">Espace</th>
                    <th className="px-4 py-2.5">État</th>
                    <th className="px-4 py-2.5">Formule</th>
                    <th className="px-4 py-2.5 text-right">Jours restants</th>
                    <th className="px-4 py-2.5">Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {echeances.map((e) => (
                    <tr key={e.id} className={cx('border-b', BORDER)}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/superadmin/licences/${e.id}`}
                          className={cx('font-medium hover:underline', TEXT_TITLE)}
                        >
                          {e.nom}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={TON_ETAT[e.etat] ?? 'neutral'}>{libelle(e.etat)}</Badge>
                      </td>
                      <td className={cx('px-4 py-3', TEXT_MUTED)}>{e.formule ?? '—'}</td>
                      <td className={cx('px-4 py-3 text-right font-semibold', NUM)}>
                        {e.jours_restants ?? '—'}
                      </td>
                      <td className={cx('px-4 py-3', TEXT_MUTED)}>{jour(e.date_fin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ─── Incohérences révélées ───────────────────────────────────────── */}

        {incoherences.length > 0 && (
          <Card
            icon={ShieldAlert}
            title={`Contradictions relevées (${fmt(anomalies)})`}
            subtitle={
              'La console les montre et ne les corrige pas. Une correction automatique ferait '
              + 'disparaître la trace du problème avant qu\'on ait compris comment il est arrivé.'
            }
          >
            <ul className="space-y-4">
              {incoherences.map((a) => (
                <li key={a.code} className={cx('rounded-lg border p-4', BORDER)}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className={cx('font-medium', TEXT_TITLE)}>{a.titre}</p>
                      <p className={cx('mt-1 text-sm', TEXT_MUTED)}>{a.explication}</p>

                      {a.lignes.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className={cx('border-b text-left', BORDER, TEXT_FAINT)}>
                                {Object.keys(a.lignes[0]).map((c) => (
                                  <th key={c} className="px-2 py-1.5 font-medium">{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {a.lignes.map((l, i) => (
                                <tr key={i} className={cx('border-b last:border-0', BORDER)}>
                                  {Object.keys(a.lignes[0]).map((c) => (
                                    <td key={c} className={cx('px-2 py-1.5', NUM, TEXT_MUTED)}>
                                      {l[c] === null || l[c] === undefined ? '—' : String(l[c])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <p className={cx('mt-2 text-[11px] uppercase tracking-wide', TEXT_FAINT)}>
                        code : {a.code}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* ─── Liste des espaces ───────────────────────────────────────────── */}

        <Card
          icon={Building2}
          title="Espaces"
          subtitle={`${fmt(espaces.length)} espace(s) affiché(s) sur ${fmt(total)}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)}
                  aria-hidden="true"
                />
                <input
                  type="search"
                  defaultValue={filtres.q ?? ''}
                  onKeyDown={(ev) => { if (ev.key === 'Enter') naviguer({ q: ev.currentTarget.value }); }}
                  placeholder="Nom, courriel, formule…"
                  aria-label="Rechercher un espace"
                  className={cx(
                    'w-56 rounded-lg border bg-white py-2 pl-9 pr-3 text-sm dark:bg-[#0F1923]',
                    BORDER, TEXT_TITLE,
                  )}
                />
              </div>
              <div className="w-56">
                <Select
                  options={optionsEtat}
                  value={filtres.etat ?? ''}
                  onChange={(v) => naviguer({ etat: v })}
                  placeholder="Tous les états"
                />
              </div>
            </div>
          }
          flush
        >
          {espaces.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                icon={Building2}
                title="Aucun espace ne correspond"
                description="Modifiez l'état retenu ou effacez la recherche."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                    <th className="px-4 py-2.5">Espace</th>
                    <th className="px-4 py-2.5">État</th>
                    <th className="px-4 py-2.5">Formule</th>
                    <th className="px-4 py-2.5">Usage / plafond</th>
                    <th className="px-4 py-2.5 text-right">Jours restants</th>
                    <th className="px-4 py-2.5">Fin</th>
                    <th className="px-4 py-2.5 text-right">Butées</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {espaces.map((e) => {
                    const quotas = Object.values(e.quotas ?? {});

                    return (
                      <tr key={e.id} className={cx('border-b', BORDER)}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/superadmin/licences/${e.id}`}
                            className={cx('font-medium hover:underline', TEXT_TITLE)}
                          >
                            {e.nom}
                          </Link>
                          <div className={cx('text-xs', TEXT_FAINT)}>{e.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={TON_ETAT[e.etat] ?? 'neutral'}>{libelle(e.etat)}</Badge>
                          {e.etat_stocke && e.etat_stocke !== e.etat && (
                            <div className={cx('mt-1 text-[11px]', 'text-amber-600 dark:text-amber-400')}>
                              stocké : {e.etat_stocke}
                            </div>
                          )}
                        </td>
                        <td className={cx('px-4 py-3', TEXT_MUTED)}>{e.formule ?? '—'}</td>
                        <td className="px-4 py-3">
                          {quotas.length === 0 ? (
                            <span className={TEXT_FAINT}>Sans plafond</span>
                          ) : (
                            quotas.map((q) => (
                              <div key={q.compteur} className={cx('text-xs', NUM, TEXT_MUTED)}>
                                {q.compteur} : <strong className={TEXT_TITLE}>{fmt(q.valeur)}</strong>
                                {' / '}{fmt(q.plafond)}
                              </div>
                            ))
                          )}
                        </td>
                        <td className={cx('px-4 py-3 text-right', NUM,
                          e.a_echeance ? 'font-semibold text-amber-600 dark:text-amber-400' : TEXT_MUTED)}>
                          {e.jours_restants ?? '—'}
                        </td>
                        <td className={cx('px-4 py-3', TEXT_MUTED)}>{jour(e.date_fin)}</td>
                        <td className={cx('px-4 py-3 text-right', NUM,
                          e.butees >= reglages.seuil_prospect
                            ? 'font-semibold text-red-600 dark:text-red-400'
                            : TEXT_FAINT)}>
                          {fmt(e.butees)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/superadmin/licences/${e.id}`}>
                            <Button size="sm" variant="ghost" iconRight={ArrowRight}>Ouvrir</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className={cx('text-xs', TEXT_FAINT)}>
          Durées, plafonds et prix sont lus dans la configuration de la solution. Ils ne sont
          modifiables ni ici, ni espace par espace : une exception accordée à un client devient
          la règle que le suivant réclamera.
        </p>
      </div>
    </SuperAdminLayout>
  );
}
