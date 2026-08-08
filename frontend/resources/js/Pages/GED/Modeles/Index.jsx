/**
 * GED/Modeles/Index.jsx — bibliothèque de modèles de lettres.
 *
 * Le geste central est la FUSION : choisir un modèle, remplir ce qui manque,
 * obtenir la lettre. Tout le reste — créer, modifier — est secondaire et vient
 * après.
 *
 * Le formulaire de fusion se construit tout seul : le serveur lit les variables
 * écrites dans le modèle. L'auteur n'a rien à déclarer, il écrit `{{ objet }}`
 * dans son texte et le champ apparaît.
 */

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import {
  FileText, Plus, Search, Wand2, Copy, Check, Trash2, Pencil, X,
} from 'lucide-react';
import AuthLayout from '@/Layouts/AuthLayout';
import {
  PageHeader, Button, Badge, Card, EmptyState, Modal,
  cx, CONTROL, TEXT_TITLE, TEXT_MUTED, TEXT_FAINT, BORDER,
} from '@/Components/UI';

const MODELE_VIDE = { name: '', description: '', category: 'courrier', content: '', access_level: 'organization' };

/** Un libellé lisible à partir d'un nom de variable. */
const libelle = (v) =>
  v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export default function ModelesIndex({ modeles = [], categories = {}, automatiques = {} }) {
  const [recherche, setRecherche]   = useState('');
  const [categorie, setCategorie]   = useState('');
  const [fusion, setFusion]         = useState(null);   // { modele, valeurs, resultat }
  const [edition, setEdition]       = useState(null);
  const [copie, setCopie]           = useState(false);
  const [enCours, setEnCours]       = useState(false);
  const [erreur, setErreur]         = useState(null);

  const auto = Object.keys(automatiques);

  const visibles = modeles.filter((m) => {
    const t = recherche.trim().toLowerCase();
    const okTexte = !t
      || m.name.toLowerCase().includes(t)
      || (m.description ?? '').toLowerCase().includes(t);
    return okTexte && (!categorie || m.category === categorie);
  });

  /** Ouvre la fusion en ne demandant QUE les variables non automatiques. */
  function ouvrirFusion(m) {
    const aSaisir = m.variables.filter((v) => !auto.includes(v));
    setFusion({
      modele: m,
      valeurs: Object.fromEntries(aSaisir.map((v) => [v, ''])),
      resultat: null,
    });
    setErreur(null);
    setCopie(false);
  }

  async function lancerFusion() {
    setEnCours(true);
    setErreur(null);
    try {
      const { data } = await axios.post(
        `/ged/modeles/${fusion.modele.id}/fusionner`,
        { valeurs: fusion.valeurs },
      );
      setFusion((f) => ({ ...f, resultat: data }));
    } catch (e) {
      setErreur(e.response?.data?.message ?? 'La fusion a échoué.');
    } finally {
      setEnCours(false);
    }
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(fusion.resultat.contenu);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setErreur("Copie impossible — sélectionnez le texte et copiez-le à la main.");
    }
  }

  function enregistrer() {
    const donnees = edition;
    const url = donnees.id ? `/ged/modeles/${donnees.id}` : '/ged/modeles';
    const methode = donnees.id ? 'put' : 'post';

    router[methode](url, donnees, {
      preserveScroll: true,
      onSuccess: () => setEdition(null),
      onError: (e) => setErreur(Object.values(e).flat().join(' / ')),
    });
  }

  return (
    <AuthLayout>
      <Head title="Modèles de lettres" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <PageHeader
          icon={FileText}
          title="Modèles de lettres"
          subtitle="Convocations, attestations, notes de service — rédigez à partir d'une base plutôt que d'une page blanche."
          actions={
            <Button onClick={() => { setEdition({ ...MODELE_VIDE }); setErreur(null); }}>
              <Plus className="h-4 w-4" /> Nouveau modèle
            </Button>
          }
        />

        {/* ── Filtres ── */}
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className={cx('pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2', TEXT_FAINT)} />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un modèle…"
              className={cx('w-full rounded-lg py-2 pl-9 pr-3 text-sm', CONTROL)}
            />
          </div>
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className={cx('rounded-lg px-3 py-2 text-sm', CONTROL)}
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* ── Bibliothèque ── */}
        {visibles.length === 0 ? (
          <Card>
            <EmptyState
              icon={FileText}
              title={modeles.length === 0 ? 'Aucun modèle' : 'Aucun résultat'}
              description={
                modeles.length === 0
                  ? "Créez un premier modèle : le texte peut contenir des variables comme {{ destinataire }}, remplacées au moment de l'utilisation."
                  : 'Aucun modèle ne correspond à cette recherche.'
              }
            />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibles.map((m) => (
              <Card key={m.id}>
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={cx('text-sm font-semibold', TEXT_TITLE)}>{m.name}</h3>
                    {m.category && (
                      <Badge variant="neutral">{categories[m.category] ?? m.category}</Badge>
                    )}
                  </div>

                  {m.description && (
                    <p className={cx('mt-1.5 text-xs', TEXT_MUTED)}>{m.description}</p>
                  )}

                  <p className={cx('mt-2 text-xs', TEXT_FAINT)}>
                    {m.variables.length} variable(s)
                    {m.usage_count > 0 && ` · utilisé ${m.usage_count} fois`}
                  </p>

                  <div className="mt-auto flex items-center gap-2 pt-3">
                    <Button variant="primary" size="sm" onClick={() => ouvrirFusion(m)}>
                      <Wand2 className="h-4 w-4" /> Utiliser
                    </Button>
                    <button
                      onClick={async () => {
                        const { data } = await axios.get(`/ged/modeles/${m.id}`);
                        setEdition(data.data);
                        setErreur(null);
                      }}
                      className={cx('rounded p-1.5 hover:bg-purple-50', TEXT_MUTED)}
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Retirer « ${m.name} » de la bibliothèque ?`)) {
                          router.delete(`/ged/modeles/${m.id}`, { preserveScroll: true });
                        }
                      }}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                      title="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Modale : fusion ── */}
      {fusion && (
        <Modal open onClose={() => setFusion(null)} title={fusion.modele.name} size="xl">
          {!fusion.resultat ? (
            <>
              <p className={cx('mb-4 text-sm', TEXT_MUTED)}>
                Renseignez les informations manquantes. La date, votre nom et les coordonnées
                de l'organisation sont ajoutés automatiquement.
              </p>

              {Object.keys(fusion.valeurs).length === 0 ? (
                <p className={cx('text-sm', TEXT_FAINT)}>
                  Ce modèle n'attend aucune saisie : tout est renseigné automatiquement.
                </p>
              ) : (
                <div className="grid max-h-[45vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {Object.keys(fusion.valeurs).map((v) => (
                    <label key={v} className="block">
                      <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>{libelle(v)}</span>
                      <textarea
                        rows={v.includes('corps') || v.includes('ordre') || v.includes('prestations') ? 4 : 1}
                        value={fusion.valeurs[v]}
                        onChange={(e) => setFusion((f) => ({ ...f, valeurs: { ...f.valeurs, [v]: e.target.value } }))}
                        className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
                      />
                    </label>
                  ))}
                </div>
              )}

              {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setFusion(null)}>Annuler</Button>
                <Button onClick={lancerFusion} disabled={enCours}>
                  <Wand2 className="h-4 w-4" /> Générer la lettre
                </Button>
              </div>
            </>
          ) : (
            <>
              {fusion.resultat.manquantes.length > 0 && (
                <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Non renseigné : {fusion.resultat.manquantes.map(libelle).join(', ')}.
                  Ces mentions restent visibles dans le texte — complétez-les avant signature.
                </div>
              )}

              <textarea
                readOnly
                value={fusion.resultat.contenu}
                rows={20}
                className={cx('w-full rounded-lg px-3 py-2 font-mono text-xs leading-relaxed', CONTROL)}
              />

              <div className="mt-4 flex justify-between">
                <Button variant="ghost" onClick={() => setFusion((f) => ({ ...f, resultat: null }))}>
                  <X className="h-4 w-4" /> Modifier les informations
                </Button>
                <Button onClick={copier}>
                  {copie ? <><Check className="h-4 w-4" /> Copié</> : <><Copy className="h-4 w-4" /> Copier le texte</>}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ── Modale : création / modification ── */}
      {edition && (
        <Modal
          open
          onClose={() => setEdition(null)}
          title={edition.id ? 'Modifier le modèle' : 'Nouveau modèle'}
          size="xl"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Nom</span>
              <input
                value={edition.name}
                onChange={(e) => setEdition({ ...edition, name: e.target.value })}
                className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
              />
            </label>
            <label className="block">
              <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Catégorie</span>
              <select
                value={edition.category ?? ''}
                onChange={(e) => setEdition({ ...edition, category: e.target.value })}
                className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
              >
                {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <div className="sm:col-span-2">
              <label className="block">
                <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>Description</span>
                <input
                  value={edition.description ?? ''}
                  onChange={(e) => setEdition({ ...edition, description: e.target.value })}
                  className={cx('w-full rounded-lg px-3 py-2 text-sm', CONTROL)}
                />
              </label>
            </div>
          </div>

          <div className="mt-4">
            <span className={cx('mb-1 block text-xs font-medium', TEXT_MUTED)}>
              Texte du modèle — écrivez {'{{ nom_de_variable }}'} là où une information devra être saisie
            </span>
            <textarea
              value={edition.content ?? ''}
              onChange={(e) => setEdition({ ...edition, content: e.target.value })}
              rows={16}
              className={cx('w-full rounded-lg px-3 py-2 font-mono text-xs leading-relaxed', CONTROL)}
            />
          </div>

          <details className="mt-3">
            <summary className={cx('cursor-pointer text-xs', TEXT_MUTED)}>
              Variables renseignées automatiquement ({auto.length})
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {auto.map((v) => (
                <code key={v} className={cx('rounded px-1.5 py-0.5 text-[11px]', 'bg-purple-50 text-purple-700')}>
                  {`{{ ${v} }}`}
                </code>
              ))}
            </div>
          </details>

          {erreur && <p className="mt-3 text-sm text-red-600">{erreur}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEdition(null)}>Annuler</Button>
            <Button onClick={enregistrer}>Enregistrer</Button>
          </div>
        </Modal>
      )}
    </AuthLayout>
  );
}
