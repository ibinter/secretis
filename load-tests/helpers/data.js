import { SharedArray } from 'k6/data'

// Données de test partagées entre VUs (lecture seule)
export const users = new SharedArray('users', () => [
  { email: 'secretaire@demo-secretis.ci', password: 'Password123!' },
  { email: 'admin@demo-secretis.ci', password: 'Password123!' },
  { email: 'comptable@demo-secretis.ci', password: 'Password123!' },
  { email: 'rh@demo-secretis.ci', password: 'Password123!' },
  { email: 'chef_projet@demo-secretis.ci', password: 'Password123!' },
])

export const eventTitles = new SharedArray('events', () => [
  'Réunion direction', 'Formation interne', 'Appel client',
  'Point hebdomadaire', 'Revue de projet', 'Séance plénière',
])

export const documentNames = new SharedArray('docs', () => [
  'Rapport mensuel', 'Note de service', 'Procès-verbal',
  'Contrat fournisseur', 'Facture client', 'Devis travaux',
])

export function randomUser() {
  return users[Math.floor(Math.random() * users.length)]
}

export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
