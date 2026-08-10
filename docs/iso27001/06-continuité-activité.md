# Plan de Continuité d'Activité (PCA) et Plan de Reprise d'Activité (PRA)
## IBIG SECRETIS ERP — ISO/IEC 27001:2022 / ISO 22301

**Document :** ISO-27001-06  
**Version :** 1.0  
**Date :** 2026-07-22  
**Propriétaire :** RSSI + CTO — IBIG Soft  
**Approuvé par :** Direction Générale  
**Classification :** CONFIDENTIEL — DIFFUSION RESTREINTE  

---

## 1. Objectifs et Périmètre

### 1.1 Objectifs du PCA/PRA

Le Plan de Continuité d'Activité (PCA) vise à assurer la **continuité des services SECRETIS ERP** pendant une crise, tandis que le Plan de Reprise d'Activité (PRA) définit les procédures pour **restaurer les services** après un sinistre.

### 1.2 Objectifs de Continuité (RTO / RPO)

| Service | RTO | RPO | SLA mensuel |
|---|---|---|---|
| **SECRETIS ERP SaaS** (production clients) | **4 heures** | **1 heure** | 99,5 % (max 3,6h d'arrêt/mois) |
| **SECRETIS ERP Enterprise/On-Premise** (support) | **2 heures** | **1 heure** | 99,9 % (max 43 min/mois) |
| **API REST** (intégrations clients) | **4 heures** | **1 heure** | 99,5 % |
| **Portail d'administration** | **8 heures** | **4 heures** | 99,0 % |
| **Messagerie interne** | **24 heures** | **4 heures** | Meilleur effort |

**Définitions :**
- **RTO (Recovery Time Objective)** : durée maximale d'interruption acceptable avant reprise du service
- **RPO (Recovery Point Objective)** : perte de données maximale acceptable (en temps) — les données créées avant le sinistre jusqu'à la date du dernier backup doivent être restaurables

---

## 2. Analyse des Impacts (BIA — Business Impact Analysis)

### 2.1 Processus Critiques

| Processus | Impact si indisponible 4h | Impact si indisponible 24h | Impact si indisponible 1 sem. |
|---|---|---|---|
| Traitement comptable clients | Retard clôtures — MODÉRÉ | Pénalités contractuelles — MAJEUR | Résiliation contrats — CRITIQUE |
| Gestion de la paie | Aucun (mensuel) — FAIBLE | Si fin de mois : MAJEUR | Illégal — CRITIQUE |
| Accès documents archivés | Aucun — FAIBLE | Gêne opérationnelle — MODÉRÉ | Perte clients — ÉLEVÉ |
| API (intégrations tierces) | Synchronisations en attente — MODÉRÉ | Désync données — MAJEUR | Rupture contrats SLA — CRITIQUE |
| Support client (helpdesk) | Mécontentement — MODÉRÉ | Escalade — MAJEUR | Perte réputation — ÉLEVÉ |

### 2.2 Dépendances Critiques

| Dépendance | Type | Impact en cas de défaillance | Alternatif |
|---|---|---|---|
| Hébergeur cloud (AWS/GCP) | Infrastructure | Indisponibilité totale SaaS | Bascule cross-region |
| Base de données PostgreSQL | Données | Perte totale ou partielle | RDS Multi-AZ + réplique lecture |
| DNS (Route 53) | Réseau | Inaccessibilité URL | TTL court + DNS secondaire |
| CDN (CloudFront) | Performance | Dégradation (non bloquant) | Désactivation CDN, accès direct |
| Passerelle de paiement | Finance | Blocage nouvelles souscriptions | Paiement manuel temporaire |
| Email transactionnel (SES/SendGrid) | Communication | Blocage notifications | Basculer sur fournisseur alternatif |

---

## 3. Scénarios de Crise

### 3.1 Scénario SC01 — Panne Datacenter / Zone de Disponibilité

**Description :** La zone de disponibilité (AZ) principale subit une panne électrique ou réseau, rendant les serveurs inaccessibles.

**Indicateurs déclencheurs :**
- Alertes monitoring (taux d'erreur > 5%, latence > 10s)
- Dashboard hébergeur indiquant incident AZ
- Appels clients signalant inaccessibilité

**Procédure de réponse :**

```
T+0 — DÉTECTION
  • Monitoring automatique détecte la panne
  • Alerte PagerDuty → DevOps Lead (astreinte)
  • Notification RSSI + CTO

T+15 min — ÉVALUATION
  • Confirmer la nature de la panne (AZ ou hébergeur complet)
  • Vérifier statut.hebergeur.com

T+30 min — DÉCISION DE BASCULE
  • Si panne estimée > 1h : activer failover
  • CTO valide la décision de bascule

T+60 min — FAILOVER EN COURS
  • Route 53 : mise à jour DNS vers AZ secondaire (TTL 60s)
  • Vérification que RDS Multi-AZ a basculé automatiquement
  • Vérification Redis Cluster failover
  • Smoke tests sur environnement secondaire

T+90 min — SERVICE RESTAURÉ (objectif RTO : 4h max)
  • Service opérationnel sur AZ secondaire
  • Communication clients (page statut + email)
  • Monitoring renforcé

T+résolution — RETOUR À LA NORMALE
  • Retour sur AZ principale après confirmation stabilité
  • Post-mortem dans les 5 jours
```

---

### 3.2 Scénario SC02 — Cyberattaque / Ransomware

**Description :** Un ransomware ou une cyberattaque majeure chiffre ou détruit des données de production, rendant le service indisponible.

**Indicateurs déclencheurs :**
- Logs anormaux (accès massifs, modifications massives fichiers)
- Alerte EDR/SIEM sur comportement suspect
- Messages d'extorsion
- Inaccessibilité soudaine des données

**Procédure de réponse :**

```
T+0 — ISOLEMENT IMMÉDIAT
  ⚠️ NE PAS ÉTEINDRE les systèmes — préserver les preuves
  • Isoler les systèmes infectés du réseau (désactiver peering)
  • Couper l'accès internet entrant/sortant des systèmes compromis
  • Activer le mode de crise (war room)

T+0 à T+1h — ÉVALUATION DU PÉRIMÈTRE
  • Identifier les systèmes touchés vs systèmes sains
  • Vérifier l'intégrité des sauvegardes (sont-elles touchées ?)
  • Contacter l'hébergeur pour assistance forensique
  • Contacter l'assureur cyber (notification d'incident)

T+1h à T+4h — INVESTIGATION ET CONFINEMENT
  • Analyste forensique (interne ou externe) sur les logs
  • Identifier le vecteur d'entrée
  • Préserver les preuves (snapshot avant tout nettoyage)
  • Évaluer si des données clients ont été exfiltrées

T+4h à T+24h — DÉCISION DE RESTAURATION
  • Si backup sain disponible : procéder à la restauration
  • Démarrer la restauration depuis le dernier backup sain offline
  • Environnement propre (nouveau VPC si nécessaire)

T+24h à T+48h — RESTAURATION & VALIDATION
  • Restaurer les données depuis backup offline (hors de portée du ransomware)
  • Valider l'intégrité avant remise en service
  • Tests fonctionnels complets
  • Renforcer les contrôles avant remise en service

POST-INCIDENT — OBLIGATIONS LÉGALES
  • Si données personnelles compromises : notification CNIL/ARTCI < 72h
  • Notification aux clients affectés
  • Dépôt de plainte (Cybercriminalité)
  • Rapport complet pour assureur
```

**Politique concernant la rançon :** IBIG Soft ne paie pas de rançon. La restauration se fait exclusivement depuis des sauvegardes saines.

---

### 3.3 Scénario SC03 — Perte d'une Équipe Clé (Sinistre Humain)

**Description :** Accident, pandémie ou événement grave rendant indisponible simultanément plusieurs membres clés de l'équipe technique.

**Mesures préventives (en place) :**
- Documentation complète de toutes les procédures critiques
- Runbooks pour chaque composant de l'infrastructure
- Rotation des connaissances (bus factor minimum 2 pour chaque domaine)
- Accès aux systèmes partagés via Vault (pas de connaissance unique)
- Contacts de prestataires d'urgence pré-qualifiés

**Procédure de réponse :**

```
NIVEAU 1 — Perte de 1 à 2 personnes clés
  • Activer les suppléants désignés
  • Utiliser les runbooks documentés
  • Solliciter prestataire d'urgence si nécessaire (contrat cadre)

NIVEAU 2 — Perte de toute l'équipe technique (3+ personnes)
  • Activer le prestataire d'infogérance d'urgence (pré-qualifié)
  • Accès aux systèmes via coffre-fort numérique d'urgence (Vault breakglass)
  • Direction prend en charge la communication clients
  • Procédure de recrutement d'urgence activée
```

**Coffre-fort d'urgence (Breakglass) :**
Un compte d'urgence avec les accès minimaux nécessaires est conservé dans un coffre physique sécurisé au siège. Ses credentials sont changés après chaque utilisation.

---

## 4. Procédures de Bascule (Failover)

### 4.1 Failover Automatique

Les composants suivants ont un **failover automatique sans intervention humaine** :

| Composant | Mécanisme | RTO automatique |
|---|---|---|
| Base de données PostgreSQL | RDS Multi-AZ — bascule automatique | 1 à 3 minutes |
| Load Balancer | Health checks → retire serveurs défaillants | < 30 secondes |
| Application servers | Auto Scaling Group — remplace instances | 2 à 5 minutes |
| Redis Cache | ElastiCache Multi-AZ | 1 à 2 minutes |
| Route 53 (DNS) | Health checks → failover record | 60 secondes (TTL) |

### 4.2 Failover Manuel (Décision Humaine Requise)

| Scénario | Déclencheur | Acteur | Délai cible |
|---|---|---|---|
| Bascule cross-region | Panne AZ principale > 30 min | DevOps Lead | 90 minutes |
| Activation PRA complet | Sinistre datacenter | CTO + RSSI | 4 heures |
| Bascule fournisseur DNS | Panne Route 53 | DevOps Lead | 30 minutes |

---

## 5. Tests de Continuité

### 5.1 Programme de Tests Annuels

IBIG Soft conduit **2 exercices de continuité par an** :

**Test 1 — Exercice Technique (Semestre 1, mois de mars)**
- Type : Test de bascule technique (failover réel vers AZ secondaire)
- Durée : 4 heures (pendant fenêtre maintenance 2h00-6h00)
- Participants : Équipe DevOps + RSSI
- Objectif : Valider RTO/RPO réels, identifier les lacunes techniques

**Test 2 — Exercice Crise (Semestre 2, mois de septembre)**
- Type : Simulation de crise complète (tabletop exercise)
- Durée : Demi-journée
- Participants : Direction + RSSI + CTO + Lead Ops + DPO + Marketing
- Objectif : Valider les processus de décision, communication, notification réglementaire

### 5.2 Procédure de Test de Bascule Technique

```
PRÉ-TEST (J-7)
  □ Communication clients : maintenance planifiée (fenêtre de nuit)
  □ Validation des sauvegardes récentes
  □ Préparation de l'environnement de bascule secondaire
  □ Briefing équipe

PENDANT LE TEST
  □ T0 : Simuler l'indisponibilité de l'AZ principale
  □ T+30 : Activer le failover manuel vers AZ secondaire
  □ T+90 : Service opérationnel sur AZ secondaire → valider
  □ Mesurer le RTO réel
  □ Effectuer tests fonctionnels complets
  □ Retour sur AZ principale

POST-TEST (J+2)
  □ Rapport de test : RTO/RPO mesurés, écarts vs objectifs
  □ Liste des problèmes identifiés → tickets JIRA
  □ Mise à jour du PRA si nécessaire
  □ Présentation des résultats en revue de direction
```

### 5.3 Indicateurs de Succès

| Indicateur | Objectif | Fréquence de mesure |
|---|---|---|
| RTO réel (mesuré lors des tests) | ≤ 4h SaaS, ≤ 2h Enterprise | Semestriel |
| RPO réel (perte de données mesurée) | ≤ 1 heure | Semestriel |
| Taux de succès des tests de restauration | 100 % | Mensuel |
| Temps moyen de restauration backup | < 2 heures pour 500 GB | Trimestriel |
| Disponibilité réelle du service | ≥ 99,5 % SaaS | Mensuel |

---

## 6. Communication de Crise

### 6.1 Matrice de Communication

| Audience | Canal | Délai | Responsable |
|---|---|---|---|
| Équipe interne | Slack #crisis-room + téléphone | Immédiat | RSSI / CTO |
| Direction | Appel téléphonique | < 30 minutes | RSSI |
| Clients affectés (P1) | Page statut + email | < 1 heure | Communication / DG |
| Tous les clients (si impact large) | Email + page statut | < 2 heures | Communication / DG |
| Autorités (CNIL si données perso) | Notification formelle | < 72 heures (RGPD) | DPO |
| Presse / médias | Communiqué de presse | Décision DG | DG + Communication |
| Assureur | Notification sinistre | < 48 heures | DG + RSSI |

### 6.2 Page de Statut

IBIG Soft maintient une **page de statut public** (status.secretis.app) mise à jour pendant tout incident :
- Statut en temps réel de chaque composant du service
- Timeline des événements et actions en cours
- Mises à jour toutes les 30 minutes pendant un incident actif
- Post-mortem publié sous 5 jours après résolution

### 6.3 Templates de Communication Clients

**Email d'incident (P1) :**
> Objet : [SECRETIS ERP] Incident en cours — [Date]
> 
> Chers clients,
> Nous rencontrons actuellement un incident affectant [périmètre]. Nos équipes sont mobilisées et travaillent à la restauration du service.
> Statut actuel : [description]
> Impact estimé : [description]
> Prochaine mise à jour : [heure]
> Suivez l'évolution en temps réel : status.secretis.app

---

## 7. Contacts d'Urgence

| Contact | Rôle | Téléphone | Email |
|---|---|---|---|
| RSSI | Responsable crise sécurité | [Confidentiel] | security@ibigsoft.com |
| CTO | Décisions techniques | [Confidentiel] | cto@ibigsoft.com |
| Directeur Général | Décisions stratégiques | [Confidentiel] | dg@ibigsoft.com |
| DPO | Violations données personnelles | [Confidentiel] | dpo@ibigsoft.com |
| Hébergeur Cloud — Support P1 | Infrastructure critique | [Numéro contrat] | [Support URL] |
| Prestataire infogérance urgence | Backup équipe technique | [Contrat cadre] | [Email contrat] |
| Assureur cyber | Déclaration sinistre | [Numéro police] | [Email sinistre] |
| Avocat cybersécurité | Conseils juridiques | [Confidentiel] | [Email cabinet] |
| ARTCI (Côte d'Ivoire) | Notification autorité | +225 XX XX XX XX | [Email officiel] |

---

*Document approuvé par la Direction Générale d'IBIG Soft*  
*Prochaine révision : juillet 2027 ou après tout test ou incident*
