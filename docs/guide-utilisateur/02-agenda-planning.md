# Guide Utilisateur IBIG SECRETIS — Chapitre 02 : Agenda & Planning

> **Module** : Agenda & Calendrier  
> **Profils concernés** : Tous les utilisateurs  
> **Accès** : Menu > Agenda

---

## 1. Naviguer dans le calendrier

### 1.1 Les trois vues disponibles

SECRETIS propose trois vues calendrier adaptées à vos besoins :

| Vue | Raccourci | Usage recommandé |
|-----|-----------|-----------------|
| **Vue Mois** | `M` | Vue d'ensemble, planification long terme |
| **Vue Semaine** | `W` | Gestion quotidienne, disponibilités |
| **Vue Jour** | `D` | Détail d'une journée chargée |

```
┌─────────────────────────────────────────────────────────────────┐
│  [< Précédent]  Juillet 2026  [Suivant >]  [Mois][Semaine][Jour]│
├────────┬────────┬────────┬────────┬────────┬────────┬───────────┤
│  LUN   │  MAR   │  MER   │  JEU   │  VEN   │  SAM   │  DIM      │
├────────┼────────┼────────┼────────┼────────┼────────┼───────────┤
│   6    │   7    │   8    │   9    │  10    │  11    │  12       │
│ ■COMEX │        │ ■RH    │        │ ■Audit │        │           │
├────────┼────────┼────────┼────────┼────────┼────────┼───────────┤
│  13    │  14    │  15    │  16    │  17    │  18    │  19       │
│        │ ■Direc │        │ ■Forma │        │        │           │
└────────┴────────┴────────┴────────┴────────┴────────┴───────────┘
```

### 1.2 Changer de période

- **Flèches** `<` `>` : naviguer vers la période précédente / suivante
- **Bouton Aujourd'hui** : revenir à la date du jour
- **Clic sur une date** (vue mois) : basculer en vue jour

### 1.3 Filtrer les calendriers

Un utilisateur peut avoir accès à plusieurs calendriers :

- **Mon calendrier** : événements personnels
- **Calendrier de l'équipe** : événements partagés du département
- **Calendrier des salles** : disponibilités des salles de réunion
- **Calendrier organisation** : événements globaux (jours fériés, congés)

Cochez/décochez les calendriers dans le panneau gauche pour les afficher ou masquer.

---

## 2. Créer un événement

### 2.1 Création rapide

1. **Cliquez directement** sur le créneau souhaité dans le calendrier
2. Une fenêtre rapide s'ouvre :

```
┌──────────────────────────────────────────┐
│  Nouvel événement                        │
│  Titre : [__________________________]   │
│  Date  : Lundi 21 juillet 2026          │
│  Heure : [09:00] → [10:00]              │
│  [+ Plus d'options]  [Créer]            │
└──────────────────────────────────────────┘
```

3. Saisissez le **titre** et ajustez les horaires
4. Cliquez sur **Créer** pour un événement simple

### 2.2 Création avancée

Cliquez sur **+ Plus d'options** pour accéder au formulaire complet :

| Champ | Description |
|-------|-------------|
| **Titre** | Intitulé de l'événement (obligatoire) |
| **Description** | Détails, notes, informations complémentaires |
| **Date de début / fin** | Plage horaire précise |
| **Toute la journée** | Événement sans horaire précis |
| **Lieu / Salle** | Lieu physique ou salle réservée |
| **Participants** | Utilisateurs internes ou contacts externes |
| **Calendrier** | Calendrier cible (personnel, équipe, etc.) |
| **Couleur** | Code couleur pour identifier visuellement l'événement |
| **Récurrence** | Règle de répétition (voir section 4) |
| **Rappel** | Notification avant l'événement (15 min, 1h, 1 jour) |
| **Confidentialité** | Public, Privé (invisible pour les autres) |

---

## 3. Inviter des participants et gérer les réponses

### 3.1 Inviter des participants

Dans le formulaire de l'événement, champ **Participants** :

1. Commencez à taper le nom ou l'email d'un utilisateur
2. Sélectionnez-le dans la liste de suggestion
3. Définissez son statut : **Requis** ou **Optionnel**
4. Répétez pour chaque participant
5. Cochez **Envoyer une invitation par email** si souhaité

> **[ASTUCE]**  
> Vous pouvez inviter des personnes extérieures à l'organisation en saisissant directement leur email.

### 3.2 Gérer les réponses

Chaque participant invité peut répondre :

| Statut | Icône | Description |
|--------|-------|-------------|
| En attente | `?` | Invitation envoyée, pas encore répondu |
| Accepté | `✓` | Participant confirmé |
| Refusé | `✗` | Participant indisponible |
| Peut-être | `~` | Réponse incertaine |

En tant qu'organisateur, consultez les réponses dans la fiche de l'événement, onglet **Participants**.

---

## 4. Créer des événements récurrents

### 4.1 Configurer la récurrence

Dans le formulaire, activez **Répéter cet événement** :

```
┌──────────────────────────────────────────────────────────────┐
│  Récurrence                                                  │
│  Se répète : [▼ Hebdomadaire        ]                        │
│  Tous les  : [1] semaine(s)                                  │
│  Le        : [✓] Lun  [ ] Mar  [✓] Mer  [ ] Jeu  [ ] Ven   │
│  Se termine: (●) Jamais                                      │
│              ( ) Après [10] occurrences                      │
│              ( ) Le [31/12/2026]                             │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Exemples concrets

**Exemple 1 — Réunion d'équipe hebdomadaire**
- Se répète : Hebdomadaire
- Tous les : 1 semaine
- Le : Lundi
- Se termine : Le 31/12/2026

**Exemple 2 — Rapport mensuel**
- Se répète : Mensuel
- Le : Dernier vendredi du mois
- Se termine : Jamais

**Exemple 3 — Formation trimestrielle**
- Se répète : Mensuel
- Tous les : 3 mois
- Le : Premier lundi du mois
- Se termine : Après 4 occurrences

### 4.3 Modifier une récurrence

Lors de la modification d'un événement récurrent, SECRETIS vous demande :
- **Cet événement uniquement** : modifie uniquement l'occurrence sélectionnée
- **Cet événement et les suivants** : modifie à partir de cette date
- **Tous les événements** : modifie l'ensemble de la série

---

## 5. Réserver une salle depuis l'agenda

1. Dans le formulaire de l'événement, cliquez sur **Réserver une salle**
2. La fenêtre de disponibilité s'ouvre :

```
┌──────────────────────────────────────────────────────────────┐
│  Disponibilité des salles — Lundi 21 juillet, 09h-11h        │
├────────────────┬──────────┬──────────┬────────────────────────┤
│  Salle         │ Capacité │ Équipement│ Disponibilité          │
├────────────────┼──────────┼──────────┼────────────────────────┤
│  Salle Émeraude│   10     │ Vidéo    │ ✓ Disponible            │
│  Salle Azur    │   20     │ Vidéo+SC │ ✗ Occupée 09h-10h30    │
│  Salle Topaze  │    6     │ TV       │ ✓ Disponible            │
└────────────────┴──────────┴──────────┴────────────────────────┘
```

3. Sélectionnez la salle souhaitée
4. Cliquez sur **Confirmer la réservation**

La réservation est automatiquement liée à l'événement et bloque le créneau dans le calendrier des salles.

---

## 6. Exporter son calendrier

### 6.1 Export PDF

1. Naviguez vers la période souhaitée (mois, semaine, ou jour)
2. Cliquez sur **⋮ Options** > **Exporter en PDF**
3. Choisissez l'orientation (Portrait ou Paysage)
4. Cliquez sur **Télécharger**

> **[ASTUCE]**  
> L'export PDF est idéal pour imprimer votre planning de la semaine et l'afficher dans votre bureau.

### 6.2 Export ICS (synchronisation externe)

1. Cliquez sur **⋮ Options** > **Exporter ICS**
2. Choisissez la période : 30 jours, 90 jours, 1 an, ou toute la plage
3. Téléchargez le fichier `.ics`
4. Importez-le dans votre client de messagerie (Outlook, Gmail, Apple Calendar)

Pour une **synchronisation en temps réel**, copiez l'URL de flux ICS et abonnez-vous dans votre application préférée.

---

## 7. Utiliser SARA pour trouver un créneau libre

[SARA] SARA peut analyser les disponibilités de plusieurs participants et proposer automatiquement les meilleurs créneaux.

**Méthode 1 — Via le formulaire d'événement**

Après avoir ajouté vos participants :
1. Cliquez sur **[SARA] Trouver un créneau**
2. Indiquez vos contraintes :
   - Durée souhaitée : `2 heures`
   - Plage horaire : `08h00 - 18h00`
   - Dans les prochains : `7 jours`
3. SARA analyse les agendas et propose 3 créneaux optimaux

**Méthode 2 — Via le chat SARA**

Ouvrez SARA (`Ctrl+Espace`) et tapez :
> "Trouve un créneau de 2 heures pour une réunion avec Konan, Ahou et Yao cette semaine."

SARA répond avec les créneaux disponibles et peut créer l'événement directement.

---

## 8. Résolution des problèmes courants

| Problème | Cause probable | Solution |
|----------|---------------|----------|
| Un événement n'apparaît pas | Calendrier non coché | Vérifiez les filtres dans le panneau gauche |
| Je ne peux pas réserver une salle | Salle déjà occupée ou permissions insuffisantes | Consultez la vue disponibilités ou contactez l'admin |
| L'invitation n'a pas été reçue | Email mal configuré | Vérifiez les paramètres SMTP dans Administration |
| Mon agenda ne se synchronise pas | Flux ICS expiré | Regénérez l'URL ICS dans Paramètres > Calendrier |
| Les événements récurrents disparaissent | Filtre de date actif | Étendez la plage de dates affichées |
| SARA ne trouve pas de créneau | Agendas non partagés | Demandez aux participants de partager leur agenda |

---

*Fin du chapitre 02 — Agenda & Planning*

[← Chapitre précédent : 01 — Premiers pas](01-premiers-pas.md) | [Chapitre suivant : 03 — Courrier & GED →](03-courrier-ged.md)
