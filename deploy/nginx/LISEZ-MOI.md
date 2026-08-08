# Configuration nginx — elle ne vit PAS dans ce dépôt

Les fichiers `secretis.conf` et `subdomain-wildcard.conf` ont été **supprimés
d'ici le 2026-08-08**, sur décision explicite : **la configuration nginx qui
fait foi est celle du serveur.**

## Pourquoi

Les deux versions avaient divergé sans que personne ne s'en aperçoive :
celle du dépôt faisait 12,7 Ko, celle du serveur 3,4 Ko, et elles ne disaient
pas la même chose. Une analyse menée sur le fichier du dépôt a conclu à un
défaut de cache qui, en production, n'existait pas — pendant que la vraie
configuration envoyait, elle, un en-tête `Clear-Site-Data` sur chaque page qui
vidait le cache du navigateur en continu.

Deux fichiers concurrents pour une seule vérité, c'est un piège. Un seul reste.

## Où la trouver

    /etc/nginx/sites-enabled/secretis        ← le fichier RÉELLEMENT chargé

⚠️ **`sites-enabled/secretis` n'est pas un lien symbolique** vers
`sites-available/` : ce sont deux fichiers distincts qui ont, eux aussi,
divergé. nginx charge `sites-enabled/*`. Éditer `sites-available` ne produit
aucun effet.

## Comment la modifier

    cp -a /etc/nginx/sites-enabled/secretis /root/secretis.nginx.bak-$(date +%F-%H%M%S)
    # éditer /etc/nginx/sites-enabled/secretis
    nginx -t                      # ne JAMAIS recharger sans ce test
    systemctl reload nginx        # reload, jamais restart
    curl -sI https://secretis.ibigsoft.com/login   # vérifier le résultat

## Conséquence assumée

La configuration n'est plus versionnée : pas d'historique, pas de revue, pas de
restauration automatique si le serveur est perdu. Les sauvegardes horodatées
dans `/root/` sont le seul filet. Si ce compromis devient gênant, la bonne
réponse n'est pas de recréer un second fichier ici, mais d'exporter
périodiquement la configuration vivante vers un dépôt d'infrastructure dédié.
