/**
 * SuperAdmin/Payroll/CountryRules.jsx — Référentiel social et fiscal par pays.
 *
 * SECRETIS est déployé dans les 14 pays de la zone franc CFA (UEMOA + CEMAC).
 * Les taux de cotisation et les barèmes d'impôt sur les salaires y diffèrent, et
 * changent chaque année : ils sont donc saisis ICI, avec leur date d'effet et la
 * référence du texte officiel, jamais écrits dans le code.
 *
 * Le statut d'un pays se lit d'un coup d'œil :
 *   à paramétrer — aucun taux saisi, le calcul REFUSE de produire une déclaration ;
 *   à confirmer  — taux saisis mais non validés sur texte, le calcul avertit ;
 *   confirmé     — taux validés, le calcul est silencieux.
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  Globe2, ShieldCheck, AlertTriangle, CircleDashed, Plus, Trash2,
  Calculator, BadgeCheck, FileText, Landmark,
} from 'lucide-react';
import SuperAdminLayout from '@/Components/Layout/SuperAdminLayout';
import {
  PageHeader, Button, Badge, Card, StatCard, EmptyState, Modal,
  cx, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER, NUM,
} from '@/Components/UI';

/* ─── Statuts ──────────────────────────────────────────────────────────────── */

const STATUTS = {
  pending:  { label: 'À paramétrer', tone: 'bg-red-100 text-red-700',       icon: CircleDashed },
  draft:    { label: 'À confirmer',  tone: 'bg-amber-100 text-amber-700',   icon: AlertTriangle },
  verified: { label: 'Confirmé',     tone: 'bg-green-100 text-green-700',   icon: ShieldCheck },
};

const REGLE_VIDE = {
  scheme_code: '', scheme_name: '', branch_code: '', branch_label: '',
  employer_rate: '', employee_rate: '', basis: 'gross_salary',
  monthly_ceiling: '', effective_from: '', effective_to: '', source: '', notes: '',
};

const TRANCHE_VIDE = {
  tax_code: '', tax_name: '', lower_bound: '', upper_bound: '', rate: '',
  fixed_deduction: '', period: 'monthly', effective_from: '', source: '',
};

/* ─── Champs de formulaire ─────────────────────────────────────────────────── */

function Champ({ label, children, aide }) {
  return (
    <label className="block">
      <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>{label}</span>
      {children}
      {aide && <span className={cx('mt-1 block text-xs', TEXT_FAINT)}>{aide}</span>}
    </label>
  );
}

function Saisie({ value, onChange, ...props }) {
  return (
    <input
      {...props}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
    />
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function CountryRules({ countries = [], detail = null, resume = {} }) {
  const [modaleRegle, setModaleRegle]     = useState(null);
  const [modaleTranche, setModaleTranche] = useState(null);
  const [modaleConfirm, setModaleConfirm] = useState(null);
  const [simulation, setSimulation]       = useState(null);
  const [brutTest, setBrutTest]           = useState('1000000');
  const [enCours, setEnCours]             = useState(false);
  const [message, setMessage]             = useState(null);

  const pays = detail?.profil ?? null;

  const choisirPays = (code) => router.get('/superadmin/paie/referentiel', { pays: code }, {
    preserveState: true, preserveScroll: true,
  });

  const recharger = () => router.reload({ preserveScroll: true });

  async function envoyer(methode, url, donnees, succes) {
    setEnCours(true);
    setMessage(null);
    try {
      await axios[methode](url, donnees);
      setMessage({ type: 'ok', texte: succes });
      setModaleRegle(null); setModaleTranche(null); setModaleConfirm(null);
      recharger();
    } catch (err) {
      const e = err.response?.data;
      setMessage({
        type: 'ko',
        texte: e?.message
          || Object.values(e?.errors ?? {}).flat().join(' / ')
          || 'Enregistrement impossible.',
      });
    } finally {
      setEnCours(false);
    }
  }

  async function simuler() {
    setEnCours(true);
    setSimulation(null);
    try {
      const { data } = await axios.post('/superadmin/paie/referentiel/simuler', {
        country_code: pays.country_code,
        gross: Number(brutTest),
      });
      setSimulation(data);
    } catch (err) {
      setSimulation({ erreur: err.response?.data?.message ?? 'Simulation impossible.' });
    } finally {
      setEnCours(false);
    }
  }

  const parZone = ['UEMOA', 'CEMAC'].map((zone) => ({
    zone,
    pays: countries.filter((c) => c.zone === zone),
  }));

  return (
    <SuperAdminLayout>
      <Head title="Référentiel paie par pays" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={Globe2}
          title="Référentiel social et fiscal"
          subtitle="Cotisations et barèmes d'impôt sur les salaires, par pays et par date d'effet — zone franc CFA."
        />

        {message && (
          <div className={cx(
            'rounded-xl px-4 py-3 text-sm',
            message.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800',
          )}>
            {message.texte}
          </div>
        )}

        {/* ── Où en est le déploiement ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Globe2}      label="Pays couverts"  value={resume.total ?? 0} />
          <StatCard icon={CircleDashed} label="À paramétrer"  value={resume.pending ?? 0} />
          <StatCard icon={AlertTriangle} label="À confirmer"  value={resume.draft ?? 0} />
          <StatCard icon={ShieldCheck}  label="Confirmés"     value={resume.verified ?? 0} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">

          {/* ── Liste des pays ── */}
          <div className="space-y-5">
            {parZone.map(({ zone, pays: liste }) => (
              <Card key={zone} title={`${zone} — ${liste[0]?.currency ?? ''}`}>
                <div className="space-y-1.5">
                  {liste.map((c) => {
                    const s = STATUTS[c.status] ?? STATUTS.pending;
                    const actif = pays?.country_code === c.country_code;
                    return (
                      <button
                        key={c.country_code}
                        onClick={() => choisirPays(c.country_code)}
                        className={cx(
                          'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors',
                          actif ? 'border-purple-400 bg-purple-50' : cx(BORDER, 'hover:border-purple-300'),
                        )}
                      >
                        <span className="min-w-0">
                          <span className={cx('block truncate text-sm font-medium', TEXT_TITLE)}>
                            {c.country_name}
                          </span>
                          <span className={cx('block text-xs', TEXT_FAINT)}>
                            {c.scheme_code} · {c.branches_saisies}/{c.branches_attendues} branche(s)
                          </span>
                        </span>
                        <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', s.tone)}>
                          {s.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          {/* ── Détail du pays sélectionné ── */}
          <div className="space-y-6">
            {!pays ? (
              <Card>
                <EmptyState
                  icon={Landmark}
                  title="Choisissez un pays"
                  description="Chaque pays de la zone franc a sa propre caisse, ses propres taux et son propre barème. Sélectionnez-en un pour le renseigner."
                />
              </Card>
            ) : (
              <>
                {/* En-tête du pays */}
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className={cx('text-lg font-semibold', TEXT_TITLE)}>{pays.country_name}</h2>
                      <p className={cx('mt-1 text-sm', TEXT_MUTED)}>
                        {pays.social_scheme_name}
                        {pays.income_tax_name && <> · {pays.income_tax_name}</>}
                      </p>
                      <p className={cx('mt-1 text-xs', TEXT_FAINT)}>
                        {pays.economic_zone} · devise {pays.currency}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="subtle" onClick={() => setModaleRegle({ ...REGLE_VIDE,
                        scheme_code: pays.social_scheme_code, scheme_name: pays.social_scheme_name,
                        currency: pays.currency })}>
                        <Plus className="h-4 w-4" /> Branche de cotisation
                      </Button>
                      <Button variant="subtle" onClick={() => setModaleTranche({ ...TRANCHE_VIDE,
                        tax_code: pays.income_tax_code ?? '', tax_name: pays.income_tax_name ?? '',
                        currency: pays.currency })}>
                        <Plus className="h-4 w-4" /> Tranche d'impôt
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Branches à renseigner */}
                <Card title="Cotisations sociales">
                  {(detail.rules ?? []).length === 0 ? (
                    <div className="space-y-3">
                      <p className={cx('text-sm', TEXT_MUTED)}>
                        Aucun taux saisi. Tant que ce pays n'est pas renseigné, toute déclaration
                        sociale le concernant est refusée — plutôt que produite avec les taux
                        d'un autre pays.
                      </p>
                      <div className={cx('rounded-lg border p-3', BORDER)}>
                        <p className={cx('mb-2 text-xs font-medium', TEXT_MUTED)}>Branches attendues :</p>
                        <ul className="space-y-1">
                          {Object.entries(detail.branches ?? {}).map(([code, libelle]) => (
                            <li key={code} className={cx('text-sm', TEXT_FAINT)}>• {libelle}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                            <th className="px-2 py-2">Branche</th>
                            <th className="px-2 py-2 text-right">Patronale</th>
                            <th className="px-2 py-2 text-right">Salariale</th>
                            <th className="px-2 py-2 text-right">Plafond</th>
                            <th className="px-2 py-2">En vigueur</th>
                            <th className="px-2 py-2">État</th>
                            <th className="px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {detail.rules.map((r) => (
                            <tr key={r.id} className={cx('border-b', BORDER)}>
                              <td className="px-2 py-2">
                                <span className={cx('font-medium', TEXT_TITLE)}>{r.branch_label}</span>
                                <span className={cx('block text-xs', TEXT_FAINT)}>{r.scheme_code}</span>
                              </td>
                              <td className={cx('px-2 py-2 text-right', NUM)}>{Number(r.employer_rate).toFixed(2)} %</td>
                              <td className={cx('px-2 py-2 text-right', NUM)}>{Number(r.employee_rate).toFixed(2)} %</td>
                              <td className={cx('px-2 py-2 text-right', NUM)}>
                                {r.monthly_ceiling ? Number(r.monthly_ceiling).toLocaleString('fr-FR') : '—'}
                              </td>
                              <td className={cx('px-2 py-2 text-xs', TEXT_FAINT)}>
                                depuis le {r.effective_from}
                              </td>
                              <td className="px-2 py-2">
                                {r.is_verified
                                  ? <Badge tone="success">Confirmé</Badge>
                                  : <Badge tone="warning">À confirmer</Badge>}
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex justify-end gap-1">
                                  {!r.is_verified && (
                                    <button
                                      title="Confirmer sur texte officiel"
                                      onClick={() => setModaleConfirm({ id: r.id, label: r.branch_label, source: r.source ?? '' })}
                                      className="rounded p-1.5 text-green-600 hover:bg-green-50"
                                    >
                                      <BadgeCheck className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button
                                    title="Supprimer"
                                    onClick={() => {
                                      if (confirm(`Supprimer la branche « ${r.branch_label} » ?`)) {
                                        envoyer('delete', `/superadmin/paie/cotisations/${r.id}`, {}, 'Branche supprimée.');
                                      }
                                    }}
                                    className="rounded p-1.5 text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                {/* Barème d'impôt */}
                <Card title={`Barème — ${pays.income_tax_name ?? "Impôt sur les salaires"}`}>
                  {(detail.brackets ?? []).length === 0 ? (
                    <p className={cx('text-sm', TEXT_MUTED)}>
                      Aucune tranche saisie. Le net à payer ne peut pas être calculé tant que le
                      barème est vide.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={cx('border-b text-left text-xs', BORDER, TEXT_MUTED)}>
                            <th className="px-2 py-2">De</th>
                            <th className="px-2 py-2">À</th>
                            <th className="px-2 py-2 text-right">Taux</th>
                            <th className="px-2 py-2 text-right">Abattement</th>
                            <th className="px-2 py-2">Maille</th>
                            <th className="px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {detail.brackets.map((b) => (
                            <tr key={b.id} className={cx('border-b', BORDER)}>
                              <td className={cx('px-2 py-2', NUM)}>{Number(b.lower_bound).toLocaleString('fr-FR')}</td>
                              <td className={cx('px-2 py-2', NUM)}>
                                {b.upper_bound ? Number(b.upper_bound).toLocaleString('fr-FR') : 'et au-delà'}
                              </td>
                              <td className={cx('px-2 py-2 text-right', NUM)}>{Number(b.rate).toFixed(2)} %</td>
                              <td className={cx('px-2 py-2 text-right', NUM)}>
                                {Number(b.fixed_deduction).toLocaleString('fr-FR')}
                              </td>
                              <td className={cx('px-2 py-2 text-xs', TEXT_FAINT)}>
                                {b.period === 'yearly' ? 'annuel' : 'mensuel'}
                              </td>
                              <td className="px-2 py-2 text-right">
                                <button
                                  onClick={() => {
                                    if (confirm('Supprimer cette tranche ?')) {
                                      envoyer('delete', `/superadmin/paie/bareme/${b.id}`, {}, 'Tranche supprimée.');
                                    }
                                  }}
                                  className="rounded p-1.5 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>

                {/* Vérification par simulation */}
                <Card title="Vérifier le paramétrage">
                  <p className={cx('mb-3 text-sm', TEXT_MUTED)}>
                    Testez le paramétrage sur un salaire d'essai avant de l'utiliser :
                    c'est le seul moyen de repérer une virgule mal placée sans attendre
                    un bulletin faux.
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-56">
                      <Champ label={`Salaire brut mensuel (${pays.currency})`}>
                        <Saisie type="number" value={brutTest} onChange={setBrutTest} />
                      </Champ>
                    </div>
                    <Button onClick={simuler} disabled={enCours}>
                      <Calculator className="h-4 w-4" /> Simuler
                    </Button>
                  </div>

                  {simulation && (
                    <div className="mt-4">
                      {simulation.erreur ? (
                        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
                          {simulation.erreur}
                        </div>
                      ) : (
                        <div className={cx('rounded-lg border p-4', BORDER)}>
                          <dl className="grid gap-2 text-sm sm:grid-cols-2">
                            <div className="flex justify-between gap-4">
                              <dt className={TEXT_MUTED}>Part patronale</dt>
                              <dd className={cx('font-medium', NUM)}>
                                {simulation.contributions.employer.toLocaleString('fr-FR')} {pays.currency}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                              <dt className={TEXT_MUTED}>Part salariale</dt>
                              <dd className={cx('font-medium', NUM)}>
                                {simulation.contributions.employee.toLocaleString('fr-FR')} {pays.currency}
                              </dd>
                            </div>
                            {simulation.tax && (
                              <div className="flex justify-between gap-4">
                                <dt className={TEXT_MUTED}>{simulation.tax.code}</dt>
                                <dd className={cx('font-medium', NUM)}>
                                  {simulation.tax.tax.toLocaleString('fr-FR')} {pays.currency}
                                </dd>
                              </div>
                            )}
                            {simulation.net_estimate !== null && simulation.net_estimate !== undefined && (
                              <div className="flex justify-between gap-4">
                                <dt className={cx('font-medium', TEXT_TITLE)}>Net estimé</dt>
                                <dd className={cx('font-semibold', NUM)}>
                                  {simulation.net_estimate.toLocaleString('fr-FR')} {pays.currency}
                                </dd>
                              </div>
                            )}
                          </dl>
                          {!simulation.contributions.is_verified && (
                            <p className="mt-3 flex items-start gap-2 text-xs text-amber-700">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              Taux non confirmés sur texte officiel : à valider avant tout dépôt.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modale : branche de cotisation ── */}
      {modaleRegle && (
        <Modal open onClose={() => setModaleRegle(null)} title="Branche de cotisation" size="lg">
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label="Caisse (code)">
              <Saisie value={modaleRegle.scheme_code} onChange={(v) => setModaleRegle({ ...modaleRegle, scheme_code: v })} />
            </Champ>
            <Champ label="Caisse (nom complet)">
              <Saisie value={modaleRegle.scheme_name} onChange={(v) => setModaleRegle({ ...modaleRegle, scheme_name: v })} />
            </Champ>
            <Champ label="Branche (code)" aide="ex. retraite, prestations_familiales">
              <Saisie value={modaleRegle.branch_code} onChange={(v) => setModaleRegle({ ...modaleRegle, branch_code: v })} />
            </Champ>
            <Champ label="Branche (libellé)">
              <Saisie value={modaleRegle.branch_label} onChange={(v) => setModaleRegle({ ...modaleRegle, branch_label: v })} />
            </Champ>
            <Champ label="Taux patronal (%)">
              <Saisie type="number" step="0.0001" value={modaleRegle.employer_rate} onChange={(v) => setModaleRegle({ ...modaleRegle, employer_rate: v })} />
            </Champ>
            <Champ label="Taux salarial (%)">
              <Saisie type="number" step="0.0001" value={modaleRegle.employee_rate} onChange={(v) => setModaleRegle({ ...modaleRegle, employee_rate: v })} />
            </Champ>
            <Champ label="Plafond mensuel" aide="Laisser vide s'il n'y a pas de plafond.">
              <Saisie type="number" value={modaleRegle.monthly_ceiling} onChange={(v) => setModaleRegle({ ...modaleRegle, monthly_ceiling: v })} />
            </Champ>
            <Champ label="En vigueur depuis le">
              <Saisie type="date" value={modaleRegle.effective_from} onChange={(v) => setModaleRegle({ ...modaleRegle, effective_from: v })} />
            </Champ>
            <div className="sm:col-span-2">
              <Champ label="Référence du texte officiel" aide="Décret, arrêté, note de la caisse — indispensable pour confirmer ce taux ensuite.">
                <Saisie value={modaleRegle.source} onChange={(v) => setModaleRegle({ ...modaleRegle, source: v })} />
              </Champ>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModaleRegle(null)}>Annuler</Button>
            <Button
              disabled={enCours}
              onClick={() => envoyer('post', '/superadmin/paie/cotisations', {
                ...modaleRegle,
                country_code: pays.country_code,
                currency: pays.currency,
                basis: modaleRegle.monthly_ceiling ? 'capped_salary' : 'gross_salary',
                monthly_ceiling: modaleRegle.monthly_ceiling || null,
                effective_to: modaleRegle.effective_to || null,
              }, 'Branche enregistrée.')}
            >
              Enregistrer
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Modale : tranche d'impôt ── */}
      {modaleTranche && (
        <Modal open onClose={() => setModaleTranche(null)} title="Tranche d'impôt sur les salaires" size="lg">
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ label="Impôt (code)">
              <Saisie value={modaleTranche.tax_code} onChange={(v) => setModaleTranche({ ...modaleTranche, tax_code: v })} />
            </Champ>
            <Champ label="Impôt (nom)">
              <Saisie value={modaleTranche.tax_name} onChange={(v) => setModaleTranche({ ...modaleTranche, tax_name: v })} />
            </Champ>
            <Champ label="Borne basse">
              <Saisie type="number" value={modaleTranche.lower_bound} onChange={(v) => setModaleTranche({ ...modaleTranche, lower_bound: v })} />
            </Champ>
            <Champ label="Borne haute" aide="Vide pour la tranche supérieure.">
              <Saisie type="number" value={modaleTranche.upper_bound} onChange={(v) => setModaleTranche({ ...modaleTranche, upper_bound: v })} />
            </Champ>
            <Champ label="Taux (%)">
              <Saisie type="number" step="0.0001" value={modaleTranche.rate} onChange={(v) => setModaleTranche({ ...modaleTranche, rate: v })} />
            </Champ>
            <Champ label="Abattement forfaitaire">
              <Saisie type="number" value={modaleTranche.fixed_deduction} onChange={(v) => setModaleTranche({ ...modaleTranche, fixed_deduction: v })} />
            </Champ>
            <Champ label="Maille du barème">
              <select
                value={modaleTranche.period}
                onChange={(e) => setModaleTranche({ ...modaleTranche, period: e.target.value })}
                className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
              >
                <option value="monthly">Mensuel</option>
                <option value="yearly">Annuel</option>
              </select>
            </Champ>
            <Champ label="En vigueur depuis le">
              <Saisie type="date" value={modaleTranche.effective_from} onChange={(v) => setModaleTranche({ ...modaleTranche, effective_from: v })} />
            </Champ>
            <div className="sm:col-span-2">
              <Champ label="Référence du texte officiel">
                <Saisie value={modaleTranche.source} onChange={(v) => setModaleTranche({ ...modaleTranche, source: v })} />
              </Champ>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModaleTranche(null)}>Annuler</Button>
            <Button
              disabled={enCours}
              onClick={() => envoyer('post', '/superadmin/paie/bareme', {
                ...modaleTranche,
                country_code: pays.country_code,
                currency: pays.currency,
                upper_bound: modaleTranche.upper_bound || null,
                fixed_deduction: modaleTranche.fixed_deduction || 0,
              }, 'Tranche enregistrée.')}
            >
              Enregistrer
            </Button>
          </div>
        </Modal>
      )}

      {/* ── Modale : confirmation sur texte ── */}
      {modaleConfirm && (
        <Modal open onClose={() => setModaleConfirm(null)} title="Confirmer sur texte officiel">
          <p className={cx('mb-4 text-sm', TEXT_MUTED)}>
            Vous confirmez que le taux de la branche « {modaleConfirm.label} » correspond au
            texte en vigueur. Indiquez la référence : une validation sans source ne prouve rien.
          </p>
          <Champ label="Référence du texte" aide="ex. Décret n° 2026-xxx du jj/mm/aaaa, article 4">
            <Saisie
              value={modaleConfirm.source}
              onChange={(v) => setModaleConfirm({ ...modaleConfirm, source: v })}
            />
          </Champ>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModaleConfirm(null)}>Annuler</Button>
            <Button
              disabled={enCours || (modaleConfirm.source ?? '').trim().length < 10}
              onClick={() => envoyer('post', `/superadmin/paie/cotisations/${modaleConfirm.id}/confirmer`,
                { source: modaleConfirm.source }, 'Branche confirmée.')}
            >
              <FileText className="h-4 w-4" /> Confirmer
            </Button>
          </div>
        </Modal>
      )}
    </SuperAdminLayout>
  );
}
