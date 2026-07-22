# Guide Utilisateur IBIG SECRETIS — Chapitre 08 : Ressources

> **Module** : Gestion des Ressources (Salles, Matériel, Stocks, Véhicules)  
> **Profils concernés** : Responsable Logistique, Agents  
> **Accès** : Menu > Ressources

---

## 1. Gérer le catalogue des salles

`Ressources > Salles > Gestion`

### 1.1 Ajouter une salle

`Ressources > Salles > + Nouvelle salle`

| Champ | Description | Exemple |
|-------|-------------|---------|
| **Nom** | Identifiant de la salle | Salle Émeraude |
| **Bâtiment / Étage** | Localisation précise | Bâtiment A, 2e étage |
| **Capacité** | Nombre de personnes | 15 personnes |
| **Superficie** | En m² | 35 m² |
| **Équipements** | Liste des équipements disponibles | Vidéoprojecteur, Tableau blanc, Climatisation |
| **Configuration** | Disposition des sièges | Amphithéâtre, Réunion, Classe, U |
| **Tarif interne** | Coût de réservation (si applicable) | 0 XOF |
| **Photo** | Image de la salle | [Télécharger] |
| **Disponibilité** | Horaires d'accès | 07h00-19h00, Lundi-Vendredi |

### 1.2 Vue du catalogue des salles

```
┌──────────────────┬──────┬────────────────────────┬─────────────────┐
│  Salle           │ Cap. │  Équipements           │  Dispo auj.     │
├──────────────────┼──────┼────────────────────────┼─────────────────┤
│  Salle Émeraude  │  15  │ Vidéo, TB, Clim        │ 🟢 07h-12h, 14h+│
│  Salle Azur      │  30  │ Vidéo, SC, Sono, Clim  │ 🟡 09h30-11h30  │
│  Salle Topaze    │   6  │ TV, Tableau             │ 🟢 Disponible   │
│  Grande Salle    │  80  │ Scène, Sono, Vidéo      │ 🔴 Occupée J.   │
└──────────────────┴──────┴────────────────────────┴─────────────────┘
  🟢 Disponible  🟡 Partiellement  🔴 Occupée
```

---

## 2. Réserver une salle

### 2.1 Depuis le module Ressources

`Ressources > Salles > Réserver`

1. Cliquez sur **Réserver une salle** ou sur une salle spécifique
2. Sélectionnez la **date et les horaires** souhaités
3. Le système affiche les **salles disponibles** pour ce créneau
4. Sélectionnez la salle et cliquez sur **Réserver**
5. Complétez les informations de réservation :
   - **Objet** : pourquoi la salle est réservée
   - **Organisateur** : nom de la personne responsable
   - **Nombre attendu** : participants prévus
   - **Équipements requis** : besoin particulier

### 2.2 Depuis l'agenda

Lors de la création d'un événement, utilisez le sélecteur de salle intégré (voir chapitre 02, section 5).

### 2.3 Annuler une réservation

1. Naviguez vers `Ressources > Mes réservations`
2. Cliquez sur la réservation à annuler
3. Cliquez sur **Annuler la réservation**
4. Confirmez — la salle redevient disponible pour d'autres

> **[!] Attention**  
> Certaines salles ont un délai d'annulation minimum configuré par l'administrateur. Annulez toujours vos réservations dès que vous savez que vous n'en aurez pas besoin.

---

## 3. Gérer l'inventaire du matériel

`Ressources > Matériel > Inventaire`

### 3.1 Enregistrer un équipement

`Ressources > Matériel > + Nouvel équipement`

```
┌─────────────────────────────────────────────────────────────────┐
│  NOUVEL ÉQUIPEMENT                                              │
├─────────────────────────────────────────────────────────────────┤
│  Désignation  : [________________________]                      │
│  Référence    : [INV-2026-0158]  (auto)                         │
│  Catégorie    : [▼ Informatique    ]                            │
│  Marque/Modèle: [________________________]                      │
│  N° de série  : [________________________]                      │
│  Date achat   : [__/__/____]                                    │
│  Valeur achat : [__________] XOF                                │
│  Fournisseur  : [________________________]                      │
│  Localisation : [▼ Sélectionner bureau/salle]                   │
│  État         : [▼ Neuf              ]                          │
│  Garantie     : [__/__/____]                                    │
│  Photo        : [📷 Ajouter une photo]                         │
│  QR Code      : [Générer automatiquement]                       │
│                                                                 │
│  [  Enregistrer  ]                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Catégories d'équipements

| Catégorie | Exemples |
|-----------|---------|
| Informatique | Ordinateurs, imprimantes, écrans, disques |
| Audiovisuel | Vidéoprojecteurs, caméras, micros, enceintes |
| Mobilier | Tables, chaises, armoires |
| Téléphonie | Téléphones fixes, mobiles de service |
| Outillage | Perceuses, outils de maintenance |
| Sécurité | Caméras, détecteurs, extincteurs |
| Autre | Équipements ne correspondant pas aux catégories |

---

## 4. Assigner et désassigner du matériel

### 4.1 Assigner à un utilisateur

1. Ouvrez la fiche de l'équipement
2. Cliquez sur **Assigner**
3. Sélectionnez l'utilisateur ou le département bénéficiaire
4. Indiquez la **date d'assignation**
5. Notez les **conditions de prêt** si applicable
6. Cliquez sur **Confirmer l'assignation**

L'utilisateur reçoit une notification et peut consulter le matériel qui lui est assigné dans `Mon profil > Matériel assigné`.

### 4.2 Désassigner (retour de matériel)

1. Ouvrez la fiche de l'équipement
2. Cliquez sur **Enregistrer le retour**
3. Sélectionnez l'**état de retour** : Bon état, Endommagé, Perdu
4. Notez des observations si nécessaire
5. Cliquez sur **Confirmer le retour**

L'historique des assignations est conservé pour chaque équipement.

---

## 5. Gérer les stocks de fournitures

`Ressources > Stocks > Fournitures`

### 5.1 Enregistrer une fourniture

| Champ | Exemple |
|-------|---------|
| **Désignation** | Ramette papier A4 80g |
| **Référence** | STK-2026-0024 |
| **Catégorie** | Papeterie |
| **Unité** | Ramette |
| **Quantité actuelle** | 50 |
| **Stock minimum** | 10 |
| **Stock maximum** | 100 |
| **Fournisseur** | Papeterie Centrale |
| **Prix unitaire** | 2 500 XOF |
| **Localisation** | Réserve Bureau 102 |

### 5.2 Enregistrer des mouvements de stock

**Entrée de stock (réapprovisionnement) :**
1. `Stocks > Entrée de stock`
2. Sélectionnez la fourniture
3. Saisissez la **quantité reçue** et le **bon de commande**
4. Enregistrez

**Sortie de stock (consommation) :**
1. `Stocks > Sortie de stock`
2. Sélectionnez la fourniture et la quantité prélevée
3. Indiquez le **bénéficiaire** (personne ou service)
4. Enregistrez

---

## 6. Configurer les alertes de seuil minimum

`Ressources > Stocks > Paramètres d'alerte`

SECRETIS envoie des alertes automatiques quand le stock passe sous le seuil minimum :

1. Ouvrez la fiche de la fourniture
2. Renseignez le champ **Stock minimum** (seuil d'alerte)
3. Définissez les **destinataires de l'alerte** (responsable logistique, DAF)
4. Choisissez le **canal** : In-app, Email, WhatsApp

Lorsque le stock descend sous le seuil, tous les destinataires reçoivent une alerte :
> "ALERTE STOCK — Ramettes papier A4 : stock actuel 8 unités (seuil min. : 10). Réapprovisionnement recommandé."

---

## 7. Gérer les véhicules de service

`Ressources > Véhicules`

### 7.1 Enregistrer un véhicule

| Champ | Description |
|-------|-------------|
| **Immatriculation** | Numéro de plaque officiel |
| **Marque / Modèle** | Ex : Toyota Hilux |
| **Couleur** | Couleur du véhicule |
| **Année** | Année de mise en service |
| **Date assurance** | Date d'expiration de l'assurance |
| **Date visite technique** | Date d'expiration du contrôle technique |
| **Kilométrage actuel** | Relevé compteur à jour |
| **Chauffeur attitré** | Utilisateur assigné par défaut |
| **Statut** | Disponible, En mission, En maintenance |

### 7.2 Planifier une mission

1. Cliquez sur le véhicule souhaité > **Planifier une mission**
2. Renseignez :
   - **Date et heure de départ**
   - **Destination**
   - **Chauffeur** (si différent du chauffeur attitré)
   - **Passagers** (liste des occupants)
   - **Objet de la mission**
3. Cliquez sur **Valider la mission**

---

## 8. Tenir le carnet de bord numérique

Chaque véhicule dispose d'un **carnet de bord numérique** :

`Ressources > Véhicules > [Véhicule] > Carnet de bord`

### Enregistrer un trajet

Après chaque mission, le chauffeur ou l'agent logistique enregistre :

1. **Kilométrage de départ** et **kilométrage de retour**
2. **Destination** et **objet de la mission**
3. **Carburant consommé** (litres, coût)
4. **Incidents** : pannes, accidents, observations

### Tableau de bord véhicule

```
┌─────────────────────────────────────────────────────────────────┐
│  TOYOTA HILUX — CI-1234-AB                                      │
├──────────────────────────┬──────────────────────────────────────┤
│  Kilométrage actuel      │  87 432 km                           │
│  Prochain entretien      │  90 000 km (2 568 km restants)       │
│  Assurance               │  Expire le 31/12/2026               │
│  Visite technique        │  Expire le 30/09/2026               │
│  Missions ce mois        │  12 missions / 1 847 km              │
│  Carburant ce mois       │  186 litres / 148 000 XOF            │
│  Statut actuel           │  🟢 Disponible                       │
└──────────────────────────┴──────────────────────────────────────┘
```

> **[!] Attention**  
> SECRETIS envoie des alertes automatiques 30 jours avant l'expiration de l'assurance ou du contrôle technique. Assurez-vous que les dates sont à jour dans la fiche véhicule.

---

*Fin du chapitre 08 — Ressources*

[← Chapitre précédent : 07 — Accueil Visiteurs](07-accueil-visiteurs.md) | [Chapitre suivant : 09 — RH Léger →](09-rh-leger.md)
