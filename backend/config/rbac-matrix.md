# SECRETIS ERP — Matrice RBAC complète

> Version : 1.0 | Dernière mise à jour : 2025-07  
> Générée depuis `RolesAndPermissionsSeeder.php` — toute modification doit être répercutée dans le seeder.

## Légende

| Symbole | Signification |
|---------|--------------|
| ✅ | Permission accordée |
| ❌ | Permission refusée |
| 👑 | Via code (isSuperAdmin()) — pas de règle Spatie |

---

## Rôles

| Code rôle | Nom affiché | Description |
|-----------|-------------|-------------|
| `superadmin_ibig` | Super Admin IBIG | Employés IBIG — accès total plateforme (multi-tenant) |
| `admin_org` | Administrateur | Admin complet du tenant client |
| `director` | Directeur | Vue globale, validation, exports |
| `secretary` | Secrétaire | Gestion opérationnelle complète |
| `assistant` | Assistant | Opérations de base |
| `admin_responsible` | Responsable Admin | Gestion avancée, RH partiel |
| `receptionist` | Réceptionniste | Accueil, agenda, contacts |
| `communication_officer` | Chargé Communication | Communication externe |
| `auditor` | Auditeur | Lecture seule + export + audit trail |
| `operator` | Opérateur | Saisie minimale |

---

## Module : AGENDA

| Permission | superadmin_ibig | admin_org | director | secretary | assistant | admin_responsible | receptionist | communication_officer | auditor | operator |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| agenda.view | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| agenda.create | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| agenda.edit | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| agenda.delete | 👑 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| agenda.export | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| agenda.share | 👑 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Module : COURRIER

| Permission | superadmin_ibig | admin_org | director | secretary | assistant | admin_responsible | receptionist | communication_officer | auditor | operator |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| courrier.view | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| courrier.create | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| courrier.edit | 👑 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| courrier.delete | 👑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| courrier.export | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| courrier.archive | 👑 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| courrier.assign | 👑 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Module : TACHES

| Permission | superadmin_ibig | admin_org | director | secretary | assistant | admin_responsible | receptionist | communication_officer | auditor | operator |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| taches.view | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| taches.create | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| taches.edit | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| taches.delete | 👑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| taches.assign | 👑 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| taches.complete | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| taches.export | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## Module : CONTACTS

| Permission | superadmin_ibig | admin_org | director | secretary | assistant | admin_responsible | receptionist | communication_officer | auditor | operator |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| contacts.view | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| contacts.create | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| contacts.edit | 👑 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| contacts.delete | 👑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| contacts.export | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ |
| contacts.import | 👑 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Module : REUNIONS

| Permission | superadmin_ibig | admin_org | director | secretary | assistant | admin_responsible | receptionist | communication_officer | auditor | operator |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| reunions.view | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| reunions.create | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| reunions.edit | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| reunions.delete | 👑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| reunions.invite | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| reunions.export | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## Module : DOCUMENTS

| Permission | superadmin_ibig | admin_org | director | secretary | assistant | admin_responsible | receptionist | communication_officer | auditor | operator |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| documents.view | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| documents.create | 👑 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| documents.edit | 👑 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| documents.delete | 👑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| documents.download | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| documents.share | 👑 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| documents.archive | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Module : RH

| Permission | superadmin_ibig | admin_org | director | secretary | assistant | admin_responsible | receptionist | communication_officer | auditor | operator |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| rh.view | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| rh.create | 👑 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| rh.edit | 👑 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| rh.delete | 👑 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| rh.export | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| rh.manage_leave | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Module : COMMUNICATION

| Permission | superadmin_ibig | admin_org | director | secretary | assistant | admin_responsible | receptionist | communication_officer | auditor | operator |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| communication.view | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| communication.create | 👑 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| communication.edit | 👑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| communication.delete | 👑 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| communication.publish | 👑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| communication.broadcast | 👑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## Module : RAPPORTS

| Permission | superadmin_ibig | admin_org | director | secretary | assistant | admin_responsible | receptionist | communication_officer | auditor | operator |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| rapports.view | 👑 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| rapports.create | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| rapports.export | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| rapports.schedule | 👑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Module : ADMINISTRATION

| Permission | superadmin_ibig | admin_org | director | secretary | assistant | admin_responsible | receptionist | communication_officer | auditor | operator |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| administration.view | 👑 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ |
| administration.manage_users | 👑 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| administration.manage_roles | 👑 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| administration.manage_settings | 👑 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| administration.manage_billing | 👑 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| administration.view_audit | 👑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Règles de sécurité transverses

### Isolation tenant
- Chaque utilisateur est lié à **une seule organisation** (`organization_id` en BDD).
- `ResolveTenant` middleware vérifie l'appartenance à chaque requête.
- Les `superadmin_ibig` peuvent accéder à tous les tenants (support IBIG).

### Vérification de licence
- Effectuée **avant** toute action (middleware `EnsureValidLicense`).
- Basée sur **l'horloge serveur** (Carbon::now()), jamais sur des données client.
- Statuts : `active` > `trial` > `grace` (7j) > `expired` > `suspended`.

### Audit trail
- Toute action CRUD et tout refus d'accès est loggué dans `audit_logs`.
- La table est en **insert-only** (pas d'UPDATE/DELETE en application).
- Les données sensibles sont masquées (`[REDACTED]`) avant insertion.

### Verrouillage de compte
- 5 tentatives de connexion échouées → verrouillage 15 minutes.
- Rate limiting par email + IP (protection attaques distribuées).

---

## Évolution des permissions

Pour ajouter une permission :
1. Ajouter dans `$modules` du seeder sous le module concerné.
2. Ajouter dans `$rolePermissions` pour chaque rôle qui doit l'avoir.
3. Relancer : `php artisan db:seed --class=RolesAndPermissionsSeeder`.
4. Mettre à jour ce fichier.
