#!/usr/bin/env node
/**
 * verifier-i18n-licence.mjs
 * -----------------------------------------------------------------------------
 * Contrôle de cohérence des fichiers de traduction pour la surface 5 du
 * cahier IBIG (section 12.4 « Clés de traduction normalisées »).
 *
 *   node docs/verifier-i18n-licence.mjs
 *
 * Vérifie, sur frontend/resources/js/i18n/*.json :
 *   1. JSON valide.
 *   2. Arborescence `licence.*` identique d'une langue à l'autre.
 *      Les suffixes de pluriel i18next (_zero _one _two _few _many _other)
 *      sont normalisés avant comparaison : chaque langue a son propre jeu de
 *      catégories CLDR (2 en anglais, 3 en français, 6 en arabe) et il serait
 *      faux d'exiger les mêmes suffixes partout.
 *   3. Chaque langue fournit exactement les catégories CLDR que
 *      Intl.PluralRules lui attribue, pour les clés pluralisées.
 *   4. Aucune chaîne vide (une clé manquante doit retomber sur le français,
 *      jamais sur du vide).
 *   5. Aucun nombre en dur : durée, plafond ou prix (règle 12.1).
 *   6. Variables entre accolades cohérentes avec le français.
 *   7. Termes bannis (glossaire 12.3), avec la nuance FR/EN : « trial » et
 *      « free » sont bannis en français, légitimes en anglais.
 *
 * Sortie : rapport lisible, code de sortie 1 si au moins une anomalie.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI  = dirname(fileURLToPath(import.meta.url))
const I18N = join(ICI, '..', 'frontend', 'resources', 'js', 'i18n')
const REF  = 'fr'

const SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other']

const problemes = []
const ko = (fichier, cle, message) => problemes.push({ fichier, cle, message })

// ─── lecture ──────────────────────────────────────────────────────────────────
const fichiers = readdirSync(I18N).filter((f) => f.endsWith('.json')).sort()
const arbres = {}

for (const f of fichiers) {
  const locale = f.replace(/\.json$/, '')
  let data
  try {
    data = JSON.parse(readFileSync(join(I18N, f), 'utf8'))
  } catch (e) {
    ko(f, '—', `JSON invalide : ${e.message}`)
    continue
  }
  if (!data.licence) { ko(f, 'licence', 'arborescence licence.* absente'); continue }
  arbres[locale] = data.licence
}

// ─── aplatissement ────────────────────────────────────────────────────────────
function aplatir(objet, prefixe = '', sortie = {}) {
  for (const [k, v] of Object.entries(objet)) {
    const cle = prefixe ? `${prefixe}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) aplatir(v, cle, sortie)
    else sortie[cle] = v
  }
  return sortie
}

/** « banniere.trial_one » → { base: 'banniere.trial', forme: 'one' } */
function decouper(cle) {
  const m = cle.match(new RegExp(`^(.*)_(${SUFFIXES.join('|')})$`))
  return m ? { base: m[1], forme: m[2] } : { base: cle, forme: null }
}

const plats = Object.fromEntries(
  Object.entries(arbres).map(([l, a]) => [l, aplatir(a)]),
)

// bases (suffixes de pluriel retirés) + formes présentes
const bases = {}
const formes = {}
for (const [locale, plat] of Object.entries(plats)) {
  const b = new Set(); const fm = {}
  for (const cle of Object.keys(plat)) {
    const { base, forme } = decouper(cle)
    b.add(base)
    if (forme) (fm[base] ??= new Set()).add(forme)
  }
  bases[locale] = b
  formes[locale] = fm
}

// ─── 2. arborescences identiques ──────────────────────────────────────────────
if (!bases[REF]) {
  ko(`${REF}.json`, 'licence', 'langue de référence absente — contrôle interrompu')
} else {
  const ref = bases[REF]
  for (const locale of Object.keys(bases)) {
    if (locale === REF) continue
    for (const cle of ref) if (!bases[locale].has(cle)) ko(`${locale}.json`, cle, 'clé manquante par rapport au français')
    for (const cle of bases[locale]) if (!ref.has(cle)) ko(`${locale}.json`, cle, 'clé absente du français (arborescence divergente)')
  }
}

// ─── 3. catégories de pluriel CLDR ────────────────────────────────────────────
const clesPluralisees = new Set(Object.keys(formes[REF] ?? {}))
for (const [locale, fm] of Object.entries(formes)) {
  const langue = locale
  let attendues
  try {
    attendues = new Set(new Intl.PluralRules(langue).resolvedOptions().pluralCategories)
  } catch { continue }
  for (const base of clesPluralisees) {
    const presentes = fm[base]
    if (!presentes) { ko(`${locale}.json`, base, 'clé pluralisée en français mais sans forme de pluriel ici'); continue }
    for (const cat of attendues) if (!presentes.has(cat)) ko(`${locale}.json`, `${base}_${cat}`, `forme de pluriel CLDR « ${cat} » manquante`)
    for (const cat of presentes) if (!attendues.has(cat)) ko(`${locale}.json`, `${base}_${cat}`, `forme de pluriel « ${cat} » inutile pour cette langue`)
  }
  for (const base of Object.keys(fm)) if (!clesPluralisees.has(base)) ko(`${locale}.json`, base, 'pluralisée ici mais pas en français')
}

// ─── 4/5/6/7. contrôle des valeurs ────────────────────────────────────────────
const NOMBRES = /(?<![\w{])\d+(?![\w}])/          // un chiffre isolé dans le texte
const VARIABLE = /\{\{\s*([\w]+)\s*\}\}/g

const BANNIS_UNIVERSELS = [
  "version d'évaluation", 'période test', 'mode gratuit', 'compte free',
  'licence à vie', 'licence perpétuelle', 'compte suspendu', 'compte bloqué',
  'accès révoqué', 'lifetime license', 'perpetual license', 'account suspended',
  'account blocked', 'access revoked', 'unlimited',
]
// bannis uniquement dans les langues où ce sont des anglicismes / faux amis
const BANNIS_FR = ['trial', 'free', 'illimité']
const BANNIS_PAR_LOCALE = {
  fr: BANNIS_FR,
  'pt-BR': ['trial', 'ilimitado'], 'pt-MZ': ['trial', 'ilimitado'], 'pt-ST': ['trial', 'ilimitado'],
  ar: ['trial'], 'ar-MA': ['trial'], 'ar-TN': ['trial'],
  ha: ['trial'], sw: ['trial'],
  en: [], // « trial », « free » sont les termes officiels du glossaire en anglais
}

for (const [locale, plat] of Object.entries(plats)) {
  const platRef = plats[REF] ?? {}
  for (const [cle, valeur] of Object.entries(plat)) {
    if (typeof valeur !== 'string') { ko(`${locale}.json`, cle, `valeur non textuelle (${typeof valeur})`); continue }

    // 4. jamais de chaîne vide
    if (valeur.trim() === '') ko(`${locale}.json`, cle, 'chaîne vide — le repli sur le français ne se déclenchera pas')

    // 5. aucun nombre en dur (les valeurs viennent de licence.config.json)
    const n = valeur.match(NOMBRES)
    if (n) ko(`${locale}.json`, cle, `nombre en dur « ${n[0]} » — doit venir de licence.config.json`)
    if (/FCFA|XOF|XAF|€|\$/.test(valeur)) ko(`${locale}.json`, cle, 'montant ou devise en dur')

    // 6. variables cohérentes avec le français
    const ici = new Set([...valeur.matchAll(VARIABLE)].map((m) => m[1]))
    const { base, forme } = decouper(cle)
    const refValeur = platRef[cle] ?? platRef[base] ?? platRef[`${base}_other`] ?? platRef[`${base}_one`]
    // Exception linguistique : aux formes zero / one / two, beaucoup de langues
    // (arabe en tête) expriment la quantité par la morphologie du nom et
    // n'affichent aucun chiffre. {{count}} y est donc facultatif.
    const formeSansChiffre = forme === 'zero' || forme === 'one' || forme === 'two'
    if (locale !== REF && typeof refValeur === 'string') {
      const attendues = new Set([...refValeur.matchAll(VARIABLE)].map((m) => m[1]))
      for (const v of attendues) {
        if (ici.has(v)) continue
        if (v === 'count' && formeSansChiffre) continue
        ko(`${locale}.json`, cle, `variable {{${v}}} absente de la traduction`)
      }
      for (const v of ici) if (!attendues.has(v)) ko(`${locale}.json`, cle, `variable {{${v}}} inconnue du français`)
    }
    // pas de concaténation implicite : une variable doit être entière
    if (/\{[^{]|[^}]\}/.test(valeur.replace(/\{\{[\w]+\}\}/g, ''))) ko(`${locale}.json`, cle, 'accolade orpheline — variable mal formée')
    // un pluriel doit être piloté par « count »
    if (forme && !ici.has('count') && !formeSansChiffre) ko(`${locale}.json`, cle, 'forme de pluriel sans {{count}} — i18next ne la sélectionnera pas correctement')

    // 7. vocabulaire banni
    const bas = valeur.toLowerCase()
    for (const t of [...BANNIS_UNIVERSELS, ...(BANNIS_PAR_LOCALE[locale] ?? BANNIS_FR)]) {
      if (bas.includes(t)) ko(`${locale}.json`, cle, `terme banni « ${t} »`)
    }
  }
}

// ─── rapport ──────────────────────────────────────────────────────────────────
const nbCles = bases[REF] ? bases[REF].size : 0
console.log(`Fichiers examinés : ${fichiers.length} — clés licence.* de référence : ${nbCles}`)
if (problemes.length === 0) {
  console.log('Contrôle de cohérence : AUCUNE ANOMALIE.')
  process.exit(0)
}
console.log(`\n${problemes.length} anomalie(s) :\n`)
for (const p of problemes) console.log(`  ${p.fichier.padEnd(12)} ${p.cle.padEnd(38)} ${p.message}`)
process.exit(1)
