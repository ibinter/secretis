# Politique de Sécurité de l'Information
## IBIG SECRETIS ERP

**Document :** ISO-27001-01  
**Version :** 2.0  
**Date d'approbation :** 2026-07-22  
**Propriétaire :** Direction Générale — IBIG Soft  
**Approuvé par :** Directeur Général  
**Classification :** PUBLIC (diffusion autorisée aux clients et partenaires)  
**Prochaine révision :** juillet 2027  

---

## 1. Déclaration d'Engagement de la Direction

La Direction Générale d'IBIG Soft affirme que **la sécurité de l'information est une priorité stratégique** inhérente à notre mission de fournir des solutions ERP fiables et conformes.

IBIG Soft s'engage à :

- Protéger la **confidentialité, l'intégrité et la disponibilité** de toutes les informations traitées dans le cadre de SECRETIS ERP, qu'elles appartiennent à nos clients, partenaires ou collaborateurs
- Mettre en œuvre et maintenir un **Système de Management de la Sécurité de l'Information (SMSI)** conforme à la norme ISO/IEC 27001:2022
- Se conformer à toutes les **obligations légales et réglementaires** applicables (RGPD, lois nationales de protection des données, OHADA)
- Allouer les **ressources suffisantes** (humaines, financières, technologiques) pour assurer l'efficacité du SMSI
- Promouvoir une **culture de sécurité** à tous les niveaux de l'organisation
- Améliorer **continuellement** la posture de sécurité par des audits, des mesures et des revues régulières

La présente politique est contraignante pour l'ensemble du personnel, des prestataires et de tout tiers accédant aux systèmes d'IBIG Soft.

---

## 2. Objectifs de Sécurité (Triade CIA)

### 2.1 Confidentialité

**Définition :** L'information n'est accessible qu'aux personnes autorisées.

**Objectifs mesurables :**
- Aucune fuite de données clients non détectée dans les 24 heures
- Couverture MFA ≥ 95 % pour tous les comptes administrateurs
- 100 % des données en transit chiffrées (TLS 1.3 minimum)
- 100 % des données au repos chiffrées (AES-256)
- Zéro accès non autorisé aux données de production

**Mesures principales :**
- Contrôle d'accès basé sur les rôles (RBAC)
- Authentification multifacteur (MFA) obligatoire
- Chiffrement de bout en bout
- Journalisation de tous les accès aux données sensibles
- Classification des données et labellisation

### 2.2 Intégrité

**Définition :** L'information est exacte, complète et n'a pas été altérée de manière non autorisée.

**Objectifs mesurables :**
- Zéro altération non détectée des données comptables
- Journaux d'audit immuables (append-only, signés)
- Vérification d'intégrité des sauvegardes à chaque restauration
- Signature cryptographique de tous les packages de déploiement

**Mesures principales :**
- Signatures numériques et hachages (SHA-256)
- Journaux d'audit non modifiables
- Contrôle de version du code source (Git avec protection des branches)
- Validation des entrées utilisateur et protection contre les injections
- Revues de code obligatoires avant déploiement

### 2.3 Disponibilité

**Définition :** L'information et les systèmes sont accessibles quand les utilisateurs autorisés en ont besoin.

**Objectifs mesurables :**
- SLA SaaS : disponibilité ≥ 99,5 % (hors maintenance planifiée)
- RTO (Recovery Time Objective) : ≤ 4 heures pour SaaS, ≤ 2 heures pour Enterprise
- RPO (Recovery Point Objective) : ≤ 1 heure
- Temps de détection d'incident : ≤ 1 heure
- Tests de restauration : mensuels avec rapport de résultats

**Mesures principales :**
- Architecture redondante (multi-zone)
- Sauvegardes automatiques toutes les heures
- Plan de continuité d'activité (PCA) testé 2 fois par an
- Monitoring 24/7 avec alertes automatiques
- Procédures de failover documentées

---

## 3. Principes Fondamentaux de Sécurité

### 3.1 Principe du Moindre Privilège
Chaque utilisateur, application et service ne dispose que des droits strictement nécessaires à l'accomplissement de ses fonctions. Les droits d'accès sont revus trimestriellement.

### 3.2 Défense en Profondeur
La sécurité repose sur plusieurs couches de contrôles indépendants. La compromission d'une couche ne suffit pas à compromettre l'ensemble du système.

### 3.3 Sécurité par Conception (Security by Design)
La sécurité est intégrée dès la phase de conception des nouvelles fonctionnalités, et non ajoutée après coup. Tout nouveau développement suit les principes OWASP.

### 3.4 Zéro Confiance (Zero Trust)
Aucune connexion n'est considérée comme fiable par défaut, qu'elle provienne de l'intérieur ou de l'extérieur du réseau. Toute communication est authentifiée, autorisée et chiffrée.

### 3.5 Traçabilité et Imputabilité
Toute action sur les systèmes d'information est journalisée et attribuable à un individu identifié. Les journaux sont conservés 12 mois minimum.

---

## 4. Rôles et Responsabilités

### 4.1 Direction Générale (DG)

**Responsabilités :**
- Approuver la politique de sécurité et ses révisions
- Allouer le budget sécurité (minimum 8 % du budget IT)
- Présider les revues de direction semestrielles
- Soutenir et communiquer l'importance du SMSI
- Valider le Plan de Traitement des Risques

**Reddition de compte :** La DG rend compte aux actionnaires et au conseil d'administration.

### 4.2 Responsable de la Sécurité des Systèmes d'Information (RSSI)

**Responsabilités :**
- Piloter et coordonner le SMSI au quotidien
- Maintenir et mettre à jour l'analyse des risques
- Superviser les audits internes et les tests de pénétration
- Gérer les incidents de sécurité (responsable du processus IRP)
- Produire les rapports mensuels de KPIs sécurité
- Assurer la veille sur les menaces et vulnérabilités (CVE)
- Coordonner les relations avec l'organisme de certification
- Former et sensibiliser les équipes

**Positionnement :** Rattaché à la Direction Générale, indépendant de la DSI opérationnelle.

### 4.3 Délégué à la Protection des Données (DPO)

**Responsabilités :**
- Assurer la conformité RGPD et lois locales de protection des données
- Maintenir le registre des traitements
- Gérer les droits des personnes concernées (accès, rectification, suppression)
- Notifier la CNIL/ARTCI en cas de violation de données (72h)
- Évaluer les impacts sur la vie privée (AIPD/DPIA)
- Conseiller l'équipe produit sur le Privacy by Design

**Positionnement :** Peut être mutualisé avec le RSSI dans les petites structures, mais les fonctions restent distinctes.

### 4.4 Équipe de Développement (R&D)

**Responsabilités :**
- Appliquer les pratiques de codage sécurisé (OWASP Top 10)
- Participer aux revues de code orientées sécurité
- Corriger les vulnérabilités identifiées dans les délais impartis (critique : 48h, haute : 7j, moyenne : 30j)
- Intégrer les contrôles de sécurité dans le pipeline CI/CD
- Maintenir le SBOM (Software Bill of Materials)
- Signaler immédiatement toute découverte de vulnérabilité

**Responsable :** Lead développeur / CTO

### 4.5 Équipe Opérations (DevOps / Infrastructure)

**Responsabilités :**
- Maintenir la sécurité de l'infrastructure cloud et On-Premise
- Appliquer les correctifs de sécurité dans les délais (critique : 48h)
- Surveiller les journaux de sécurité et alertes
- Gérer les sauvegardes et tester les restaurations
- Maintenir les configurations sécurisées (hardening)
- Gérer les certificats TLS (rotation avant expiration)
- Implémenter et maintenir le plan de continuité

**Responsable :** Responsable Infrastructure / DevOps Lead

### 4.6 Équipe Support Client (Helpdesk)

**Responsabilités :**
- Gérer les demandes d'accès des utilisateurs clients (création, modification, révocation)
- Signaler les comportements suspects signalés par les clients
- Appliquer les procédures de vérification d'identité avant toute action sur un compte
- Ne jamais contourner les contrôles d'accès, même à la demande d'un client

**Responsable :** Responsable Support

### 4.7 Ensemble du Personnel

**Responsabilités de chaque collaborateur :**
- Connaître et respecter la présente politique et les procédures associées
- Protéger les informations confidentielles auxquelles il a accès
- Signaler immédiatement tout incident ou comportement suspect au RSSI
- Suivre les formations de sensibilisation à la sécurité (obligatoires)
- Utiliser uniquement les outils et systèmes approuvés (no Shadow IT)
- Appliquer la politique de bureau propre (clean desk)
- Ne pas partager ses identifiants de connexion

---

## 5. Champ d'Application de la Politique

La présente politique s'applique à :

| Périmètre | Détails |
|---|---|
| **Personnel** | Tous les employés CDI, CDD, stagiaires |
| **Prestataires** | Consultants, développeurs freelance, infogéreurs |
| **Systèmes** | SECRETIS ERP SaaS, On-Premise, infrastructure cloud, postes de travail, téléphones professionnels |
| **Données** | Données clients, données RH, code source, données financières, configurations |
| **Localisations** | Tous les bureaux, sites clients, télétravail |

---

## 6. Politique d'Utilisation Acceptable

### 6.1 Utilisation des Systèmes d'Information
- Les systèmes d'IBIG Soft sont réservés à un usage professionnel
- L'usage personnel occasionnel est toléré s'il ne compromet pas la sécurité ni la productivité
- L'installation de logiciels non approuvés sur les équipements professionnels est interdite
- La connexion de périphériques personnels (clés USB, disques durs) sans autorisation est interdite

### 6.2 Mots de Passe et Authentification
- Longueur minimale : 12 caractères, complexité obligatoire
- MFA obligatoire pour tous les accès aux systèmes de production et aux outils de développement
- Interdiction formelle de partager ses identifiants
- Utilisation obligatoire du gestionnaire de mots de passe approuvé

### 6.3 Télétravail et Accès Distants
- Connexion via VPN corporate obligatoire pour accès aux systèmes internes
- Interdiction d'utiliser les réseaux Wi-Fi publics sans VPN actif
- Verrouillage automatique des postes après 10 minutes d'inactivité
- Règle du bureau propre applicable même en télétravail

### 6.4 Gestion des Emails et Communications
- Ne pas ouvrir les pièces jointes suspectes — signaler au RSSI
- Ne pas cliquer sur les liens d'origine inconnue
- Ne pas transmettre de données confidentielles par email non chiffré
- Vérifier l'identité de l'expéditeur avant tout transfert de fonds ou données sensibles

---

## 7. Gestion des Incidents de Sécurité

Tout collaborateur ayant connaissance d'un incident de sécurité (réel ou suspecté) doit :

1. **Signaler immédiatement** au RSSI via security@ibigsoft.com ou le canal Slack #security-alerts
2. **Ne pas tenter de résoudre** l'incident seul sauf si les procédures l'y autorisent
3. **Préserver les preuves** (ne pas éteindre les systèmes sauf instruction contraire)
4. **Ne pas communiquer** sur l'incident en dehors des canaux autorisés

Le délai maximum de signalement est de **1 heure** après détection.

---

## 8. Révision Annuelle Obligatoire

La politique de sécurité est révisée **au minimum une fois par an**, ou immédiatement en cas de :

- Modification significative de l'environnement technologique ou organisationnel
- Survenance d'un incident de sécurité majeur
- Évolution de la réglementation applicable
- Résultats d'audit nécessitant des ajustements
- Identification de nouveaux risques significatifs

**Processus de révision :**
1. Le RSSI prépare une proposition de mise à jour (T-30 jours)
2. Consultation de l'équipe juridique et du DPO
3. Présentation en revue de direction
4. Approbation par le Directeur Général
5. Communication à l'ensemble du personnel sous 15 jours
6. Mise à jour dans le système documentaire

---

## 9. Sanctions en Cas de Violation

### 9.1 Cadre Général

Le non-respect de la présente politique constitue une **faute professionnelle** pouvant entraîner des sanctions disciplinaires, sans préjudice des poursuites civiles ou pénales applicables.

### 9.2 Grille de Sanctions

| Catégorie de violation | Exemples | Sanction possible |
|---|---|---|
| **Violation mineure** | Oublier de verrouiller son poste, négliger la mise à jour d'un logiciel | Rappel à l'ordre verbal, formation obligatoire |
| **Violation modérée** | Partage accidentel de données hors périmètre, non-signalement d'un incident dans les délais | Avertissement écrit, mesures correctives obligatoires |
| **Violation grave** | Utilisation intentionnelle de données confidentielles à des fins personnelles, contournement délibéré des contrôles | Mise à pied, procédure disciplinaire, résiliation du contrat |
| **Violation très grave** | Vol ou divulgation malveillante de données clients, sabotage des systèmes, fraude | Licenciement immédiat, dépôt de plainte, poursuites judiciaires |

### 9.3 Procédure Disciplinaire

Toute violation présumée fait l'objet d'une investigation par le RSSI et les Ressources Humaines avant toute sanction. Le collaborateur a le droit d'être entendu et de présenter sa défense.

---

## 10. Documents Associés

| Document | Référence |
|---|---|
| Analyse des risques | ISO-27001-02 |
| Déclaration d'Applicabilité (SoA) | ISO-27001-03 |
| Plan de Traitement des Risques | ISO-27001-04 |
| Procédures Opérationnelles de Sécurité | ISO-27001-05 |
| Plan de Continuité d'Activité | ISO-27001-06 |
| Indicateurs et KPIs SMSI | ISO-27001-07 |
| Programme d'Audit Interne | ISO-27001-08 |
| Programme de Sensibilisation | ISO-27001-09 |
| Politique RGPD | docs/rgpd-conformite.md |
| Procédure de Gestion des Incidents | docs/incident-response.md |

---

*Approuvé par le Directeur Général d'IBIG Soft*  
*Date d'entrée en vigueur : 2026-07-22*  
*Version précédente : 1.0 (2025-01-01)*
