# Guide Utilisateur IBIG SECRETIS — Chapitre 10 : Rapports & Tableaux de bord

> **Module** : Rapports & Business Intelligence  
> **Profils concernés** : Dirigeants, Managers, Administrateurs  
> **Accès** : Menu > Rapports

---

## 1. Comprendre le tableau de bord dirigeant

`Rapports > Tableau de bord Dirigeant`

Le tableau de bord dirigeant offre une vue stratégique de l'activité de l'organisation.

```
┌─────────────────────────────────────────────────────────────────┐
│  TABLEAU DE BORD DIRIGEANT — Juillet 2026                       │
│  Mise à jour : 21/07/2026 à 10h45                               │
├────────────────┬────────────────┬────────────────┬──────────────┤
│  COURRIER      │  RÉUNIONS      │  PROJETS       │  VISITEURS   │
│  ─────────     │  ──────────    │  ──────────    │  ──────────  │
│  142 ce mois   │  18 tenues     │  5 actifs      │  287 ce mois │
│  12 en retard  │  6 planifiées  │  3 en retard   │  62 RDV en   │
│  ▲ +8% vs M-1  │  93% taux prés.│  87% avancement│  ligne       │
├────────────────┴────────────────┴────────────────┴──────────────┤
│  ACTIVITÉ COURRIER — 6 derniers mois                            │
│  ─────────────────────────────────────────────────────          │
│  Entrant : ██████████████████████░░░░░  142                     │
│  Sortant : ████████████████░░░░░░░░░░░  98                      │
│  Traité  : ████████████████████████░░░  130 (91%)               │
├─────────────────────────────────────────────────────────────────┤
│  DÉCISIONS EN ATTENTE (8)                                       │
│  • DEC-044 — Lancer projet ERP Phase 2 (Échéance : 01/09/26)   │
│  • DEC-047 — Valider le plan de formation Q3 (01/08/26)         │
│  [Voir toutes les décisions]                                    │
├─────────────────────────────────────────────────────────────────┤
│  ABSENCES EN COURS & PRÉVUES (Semaine 30)                       │
│  • Konan A. : CPA du 04/08 au 08/08                            │
│  • Diallo S. : Mission Yamoussoukro 21-22/07                   │
└─────────────────────────────────────────────────────────────────┘
```

**Indicateurs clés du tableau de bord dirigeant :**

| KPI | Description | Seuil d'alerte |
|-----|-------------|---------------|
| Taux de traitement courrier | % de courriers traités dans les délais | < 85% |
| Taux de présence réunions | Présence effective / invités | < 80% |
| Décisions non réalisées | Nombre de décisions en retard | > 10 |
| Taux de satisfaction accueil | Basé sur les retours visiteurs | < 4/5 |
| Avancement projets | % global des projets actifs | < 70% |

---

## 2. Comprendre le tableau de bord secrétariat

`Rapports > Tableau de bord Secrétariat`

Le tableau de bord secrétariat est optimisé pour la gestion opérationnelle quotidienne.

```
┌─────────────────────────────────────────────────────────────────┐
│  TABLEAU DE BORD SECRÉTARIAT — 21/07/2026                       │
├───────────────────────┬─────────────────────────────────────────┤
│  AUJOURD'HUI          │  COURRIERS À TRAITER                    │
│  ─────────────        │  7 en attente                           │
│  3 réunions planifiées│  3 urgents — ⚠️ À traiter avant 12h    │
│  1 déjà terminée      │                                         │
│  12 visiteurs attendus│  TÂCHES DU JOUR                         │
│  3 absents signalés   │  5 tâches assignées à moi               │
│                       │  2 en retard                            │
├───────────────────────┴─────────────────────────────────────────┤
│  AGENDA DU JOUR                                                 │
│  09:00 - Réunion COMEX (Salle Émeraude) — En cours ●           │
│  11:00 - Réunion projet ERP (Salle Topaze)                      │
│  14:00 - Entretien candidat RH (Bureau DRH)                     │
│  15:30 - Comité de suivi budget (Salle Azur)                    │
├─────────────────────────────────────────────────────────────────┤
│  SARA — Suggestions du matin                                    │
│  "Vous avez 3 courriers urgents non traités. La réunion de      │
│   11h n'a pas encore d'ordre du jour. Souhaitez-vous que je le  │
│   prépare ?" [Oui, prépare l'ODJ] [Non merci]                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Générer un rapport

`Rapports > Générer un rapport`

### 3.1 Types de rapports disponibles

| Rapport | Description | Périodicité typique |
|---------|-------------|---------------------|
| **Rapport courrier** | Volume, délais, taux de traitement par agent/service | Mensuel |
| **Rapport réunions** | Nombre, durée, taux de présence, décisions | Mensuel |
| **Rapport tâches** | Avancement, retards, productivité par agent | Hebdomadaire |
| **Rapport visiteurs** | Volume, temps d'attente, motifs | Quotidien/Mensuel |
| **Rapport congés** | Soldes, absences par service, pics | Mensuel |
| **Rapport stocks** | Niveaux, consommation, alertes | Mensuel |
| **Rapport documents** | Volume GED, activité, types | Mensuel |
| **Rapport audit** | Toutes les actions des utilisateurs | Sur demande |
| **Rapport personnalisé** | Combinaison libre de métriques | Selon besoin |

### 3.2 Générer un rapport standard

1. Cliquez sur **Générer un rapport**
2. Sélectionnez le **type de rapport**
3. Définissez les paramètres (voir section 4)
4. Cliquez sur **Générer**
5. Le rapport s'affiche à l'écran (prévisualisation)
6. Exportez ou programmez si nécessaire

---

## 4. Personnaliser les filtres et la période

Chaque rapport dispose de filtres permettant d'affiner l'analyse :

### Filtres communs à tous les rapports

| Filtre | Options |
|--------|---------|
| **Période** | Aujourd'hui, Cette semaine, Ce mois, Trimestre, Année, Personnalisée |
| **Département** | Tous ou département spécifique |
| **Utilisateur** | Tous ou agent spécifique |
| **Statut** | Selon le type de rapport |

### Filtres avancés (rapport personnalisé)

`Rapports > Rapport personnalisé`

```
┌─────────────────────────────────────────────────────────────────┐
│  RAPPORT PERSONNALISÉ                                           │
├─────────────────────────────────────────────────────────────────┤
│  Modules à inclure :                                            │
│  [✓] Courrier  [✓] Réunions  [ ] Tâches  [ ] Visiteurs         │
│  [ ] Congés    [ ] Stocks    [ ] Documents                      │
│                                                                 │
│  Métriques sélectionnées :                                      │
│  + Volume courrier entrant / sortant                            │
│  + Taux de traitement                                           │
│  + Nombre de réunions par département                           │
│                                                                 │
│  Période : Du [01/07/2026] au [31/07/2026]                      │
│  Grouper par : [▼ Département ]                                 │
│  Granularité : [▼ Semaine     ]                                 │
│                                                                 │
│  [  Prévisualiser  ]  [  Générer  ]                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Exporter en PDF et Excel

Depuis la prévisualisation d'un rapport :

### Export PDF

1. Cliquez sur **Exporter PDF**
2. Choisissez les options :
   - **Orientation** : Portrait ou Paysage
   - **Inclure les graphiques** : Oui / Non
   - **En-tête** : avec ou sans logo organisation
   - **Confidentialité** : mention de confidentialité à apposer
3. Cliquez sur **Télécharger PDF**

### Export Excel

1. Cliquez sur **Exporter Excel**
2. Choisissez les feuilles à inclure :
   - Données brutes (une ligne par entrée)
   - Tableaux de synthèse
   - Graphiques embarqués
3. Cliquez sur **Télécharger Excel (.xlsx)**

> **[ASTUCE]**  
> L'export Excel avec données brutes est idéal pour réaliser vos propres analyses dans votre tableur. Les données sont déjà formatées et les colonnes nommées clairement.

---

## 6. Programmer un rapport automatique

`Rapports > Rapports automatiques > + Nouveau`

Programmez des rapports envoyés automatiquement par email à intervalle régulier.

### 6.1 Configurer l'envoi automatique

```
┌─────────────────────────────────────────────────────────────────┐
│  NOUVEAU RAPPORT AUTOMATIQUE                                    │
├─────────────────────────────────────────────────────────────────┤
│  Nom          : [Rapport mensuel DG — Courrier & Réunions]      │
│  Type         : [▼ Rapport personnalisé                ]        │
│  Fréquence    : [▼ Mensuel — 1er de chaque mois        ]        │
│  Heure envoi  : [07:00]                                         │
│  Format       : [▼ PDF                ]                         │
│  Destinataires :                                                │
│    [✓] M. Bah Oumar (DG) — bah@organisation.ci                 │
│    [✓] Mme Yao Alice (DAF) — yao@organisation.ci               │
│    [ ] Ajouter un destinataire...                               │
│                                                                 │
│  Objet email  : [Rapport mensuel SECRETIS — {{mois}} {{annee}}] │
│  Message      : [Veuillez trouver ci-joint le rapport...]       │
│                                                                 │
│  [  Enregistrer  ]  [  Tester maintenant  ]                     │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Fréquences disponibles

| Fréquence | Exemple de déclenchement |
|-----------|-------------------------|
| Quotidien | Chaque jour à 07h00 |
| Hebdomadaire | Chaque lundi à 08h00 |
| Mensuel | Le 1er de chaque mois à 07h00 |
| Trimestriel | Le 1er du trimestre |
| Sur événement | Quand le stock passe sous le seuil |

### 6.3 Gérer les rapports programmés

`Rapports > Rapports automatiques`

Consultez la liste de tous les rapports programmés avec :
- Dernière exécution et statut (succès / échec)
- Prochain envoi prévu
- Options : modifier, désactiver, exécuter maintenant, supprimer

---

*Fin du chapitre 10 — Rapports & Tableaux de bord*

[← Chapitre précédent : 09 — RH Léger](09-rh-leger.md) | [Chapitre suivant : 11 — Administration →](11-administration.md)
