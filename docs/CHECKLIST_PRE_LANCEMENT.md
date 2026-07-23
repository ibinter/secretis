# Checklist pré-lancement IBIG SECRETIS v3.0

## Infrastructure
- [ ] Serveur de production configuré (Ubuntu 22.04, min 4 vCPU / 8 GB RAM)
- [ ] Docker et Docker Compose installés
- [ ] Certificat SSL Let's Encrypt configuré
- [ ] DNS pointant vers le serveur
- [ ] Pare-feu : ports 80, 443, 8080 (Reverb) ouverts
- [ ] Swap configuré (4 GB minimum)
- [ ] Sauvegardes automatiques configurées (cron backup.sh)
- [ ] Monitoring externe configuré (UptimeRobot ou équivalent)

## Application
- [ ] `.env` production créé avec toutes les variables
- [ ] `APP_KEY` unique généré (php artisan key:generate)
- [ ] `APP_DEBUG=false` en production
- [ ] Migrations exécutées (php artisan migrate)
- [ ] Seeders production exécutés (SuperAdminSeeder, PlanSeeder, etc.)
- [ ] Storage lié (php artisan storage:link)
- [ ] Caches générés (config:cache, route:cache, view:cache)
- [ ] Queue worker démarré (Supervisor ou Docker service)
- [ ] Scheduler démarré (cron ou Docker service)
- [ ] Reverb WebSocket démarré et accessible

## Paiements
- [ ] Clés API des fournisseurs de paiement configurées (prod, pas test)
- [ ] Webhooks enregistrés chez chaque fournisseur
- [ ] URL de webhook : https://app.secretis.ibigsoft.com/webhooks/{provider}
- [ ] Test manuel d'un paiement Mobile Money réel
- [ ] Test manuel d'un paiement CinetPay réel
- [ ] Secrets webhook HMAC configurés en base

## Emails
- [ ] Configuration SMTP production (SendGrid/Mailgun/SES)
- [ ] Domaine expéditeur vérifié (DKIM, SPF, DMARC)
- [ ] Test d'envoi email de bienvenue
- [ ] Test d'envoi email d'expiration de licence

## Sécurité
- [ ] Toutes les clés secrètes en variables d'environnement (pas en code)
- [ ] Scan de secrets passé (git log + trufflehog)
- [ ] Headers de sécurité vérifiés (securityheaders.com)
- [ ] Rate limiting activé (Nginx + Laravel)
- [ ] MFA SuperAdmin activé obligatoirement
- [ ] Journal d'audit fonctionnel

## Tests finaux
- [ ] Connexion avec chaque rôle (10 rôles vérifiés)
- [ ] Création d'un événement agenda
- [ ] Upload d'un document en GED
- [ ] Enregistrement d'un visiteur
- [ ] Soumission d'une preuve de paiement
- [ ] Réception d'un webhook de test
- [ ] SARA répond à une question
- [ ] PWA installable (iOS + Android)
- [ ] Mode hors ligne testé
- [ ] Backup déclenché manuellement
- [ ] Restauration testée depuis le dernier backup

## Go-Live
- [ ] Annonce interne aux équipes IBIG Soft
- [ ] Page de status configurée (https://status.secretis.ibigsoft.com)
- [ ] Premier SuperAdmin créé avec mot de passe fort
- [ ] Données de démo désactivées ou isolées
- [ ] URL de production communiquée aux premiers clients

---
**Signature de validation :**
- Technique : _______________
- Produit : _______________
- Sécurité : _______________
- Date : _______________
