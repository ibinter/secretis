/* =============================================================================
 *  IBIG SOFT — SCRIPT UNIVERSEL  v1.0
 *  Éditeur : IBIG SOFT (Intermark Business International Group)
 *  -----------------------------------------------------------------------
 *  Ce fichier unique injecte, dans n'importe quelle solution IBIG SOFT :
 *    1) une section « Nos solutions » dynamique et défilante (carrousel infini)
 *       avec liens internes cliquables vers chaque produit ;
 *    2) un footer universel (contacts, e-mails, réseaux sociaux, mentions).
 *
 *  INSTALLATION (1 ligne, avant </body>) :
 *    <script src="/assets/js/ibigsoft-universal.js"
 *            data-solution="stockflow"
 *            data-accent="#1D6FE0"></script>
 *
 *  - data-solution : clé de la solution courante (voir SOLUTIONS ci-dessous).
 *                    Si absent, détection automatique par le nom de domaine.
 *  - data-accent   : couleur d'accent du site hôte (optionnel).
 *  - data-render   : "all" (défaut) | "solutions" | "footer" | "none"
 *  - data-speed    : vitesse du défilement en px/seconde (défaut 45)
 *
 *  PLACEMENT MANUEL (optionnel) :
 *    <div data-ibig="solutions"></div>
 *    <div data-ibig="footer"></div>
 *  Sans ces conteneurs, les blocs sont ajoutés à la fin du <body>.
 *
 *  API : window.IBIGSOFT.data / .solutions / .current / .render() / .config
 * ===========================================================================*/
(function () {
  'use strict';

  if (window.IBIGSOFT && window.IBIGSOFT.__mounted) return;

  /* ==========================================================================
   *  1. DONNÉES UNIVERSELLES  —  source de vérité unique
   *     Pour ajouter une solution : ajouter un objet dans SOLUTIONS.
   * ========================================================================*/

  var EDITEUR = {
    nom: 'IBIG SOFT',
    nomLong: 'Intermark Business International Group',
    site: 'https://ibigsoft.com/',
    logo: 'https://ibigsoft.com/assets/images/ibig-soft-logo.png',
    embleme: 'https://ibigsoft.com/assets/images/ibig-soft-emblem.png',
    mailContact: 'contact@ibigsoft.com',
    mailSupport: 'support@ibigsoft.com',
    mailLegal: 'legal@ibigsoft.com',
    baseline: 'Des logiciels de gestion pensés pour les entreprises africaines.'
  };

  var CONTACTS = {
    tel1: '+225 27 22 27 60 14',
    tel2: '+225 05 55 05 99 01',
    whatsapp: '+225 07 78 88 25 92',
    whatsappLien: 'https://wa.me/2250778882592',
    ville: 'Abidjan, Côte d\u2019Ivoire',
    horaires: 'Lun – Sam · 8h00 – 18h00'
  };

  var RESEAUX = [
    { nom: 'Facebook',        url: 'https://www.facebook.com/ibigsoft',                                  icone: 'facebook'  },
    { nom: 'LinkedIn',        url: 'https://www.linkedin.com/company/ibigsoft/',                         icone: 'linkedin'  },
    { nom: 'YouTube',         url: 'https://www.youtube.com/@IBIGSOFT',                                  icone: 'youtube'   },
    { nom: 'TikTok',          url: 'https://www.tiktok.com/@ibigsoft',                                   icone: 'tiktok'    },
    { nom: 'Instagram',       url: 'https://www.instagram.com/ibigsoft/',                                icone: 'instagram' },
    { nom: 'Groupe Facebook', url: 'https://www.facebook.com/groups/1655325562202049',                   icone: 'groupe'    },
    { nom: 'Chaîne WhatsApp', url: 'https://whatsapp.com/channel/0029VbD8TIr9xVJmniJ8m81w',              icone: 'whatsapp'  }
  ];

  /* Logos officiels récupérés sur les sites IBIG SOFT.
     Un logo vide ("") déclenche automatiquement la pastille monogramme. */
  var CDN = 'https://ibigsoft.com/uploads/logos/';

  var SOLUTIONS = [
    { cle:'stockflow',      nom:'STOCKFLOW ERP',          mono:'SF', secteur:'Commerce & stock',   desc:"ERP commercial multi-tenant : stock, ventes, achats, POS, paiements et logistique.", url:'https://stockflow.ibigsoft.com',        mail:'stockflow@ibigsoft.com',       logo: CDN + 'logo_20260527_160550_9dbee6a47a.png', teinte:'#1D6FE0', statut:'live' },
    { cle:'gescomxel',      nom:'GESCOMXEL',              mono:'GX', secteur:'Gestion commerciale',desc:"Gestion commerciale, CRM et facturation sur Excel automatisé et application web.",  url:'https://ibigsoft.com/gescomxel.php',    mail:'gescomxel@ibigsoft.com',       logo: CDN + 'logo_20260608_031430_8988fcd86e.png', teinte:'#0F9D58', statut:'live' },
    { cle:'scolaby',        nom:'Scolaby',                mono:'SC', secteur:'Éducation',          desc:"Gestion scolaire web et mobile, de la maternelle au supérieur : scolarité, notes, paiements.", url:'https://scolaby.com/',          mail:'support@scolaby.com',          logo: CDN + 'logo_20260620_063019_2519c04616.png', teinte:'#7C3AED', statut:'live' },
    { cle:'lokativo',       nom:'Lokativo',               mono:'LK', secteur:'Immobilier',         desc:"Gestion immobilière pour agences, propriétaires et syndics : biens, baux, loyers.", url:'https://lokativo.com/',                mail:'support@lokativo.com',         logo: CDN + 'logo_20260620_064052_6ab46f00c1.png', teinte:'#E4572E', statut:'live' },
    { cle:'ibigfleet360',   nom:'IBIG Fleet 360',         mono:'F3', secteur:'Flotte & parc auto', desc:"Gestion de flotte : véhicules, entretiens, carburant, coût au km et chauffeurs.",  url:'https://ibigfleet360.com/',            mail:'support@ibigfleet360.com',     logo: CDN + 'logo_20260620_063923_7cd5ae832d.png', teinte:'#0EA5A4', statut:'live' },
    { cle:'zelivry',        nom:'Zelivry',                mono:'ZL', secteur:'Livraison',          desc:"Gestion des livraisons en PWA : commandes, clients, livreurs, stock et encaissements.", url:'https://zelivry.com/',             mail:'support@zelivry.com',          logo: CDN + 'logo_20260620_062120_1332f49f8b.png', teinte:'#F4A300', statut:'live' },
    { cle:'construiro',     nom:'CONSTRUIRO ERP',         mono:'CO', secteur:'BTP & Construction', desc:"ERP BTP : projets, chantiers, RH, stock, équipements, finance et comptabilité.",   url:'https://construiro.com/',              mail:'support@construiro.com',       logo: CDN + 'logo_20260717_160556_664d2719fb.png', teinte:'#F58220', statut:'live' },
    { cle:'santarex',       nom:'SANTAREX ERP',           mono:'SX', secteur:'Santé',              desc:"Gestion hospitalière : dossiers patients, pharmacie, laboratoire, urgences, facturation.", url:'https://santarex.ibigsoft.com/', mail:'santarex@ibigsoft.com',        logo: CDN + 'logo_20260717_160519_6fd4162296.png', teinte:'#DC2626', statut:'live' },
    { cle:'gestmoney',      nom:'GESTMONEY',              mono:'GM', secteur:'Mobile Money',       desc:"Gestion des réseaux Mobile Money : transactions, float, commissions, KYC et fraude.", url:'https://gestmoney.ibigsoft.com/',    mail:'gestmoney@ibigsoft.com',       logo: CDN + 'logo_20260717_160348_e29eb350a7.png', teinte:'#059669', statut:'live' },
    { cle:'agrifrik',       nom:'AGRIFRIK',               mono:'AF', secteur:'Agriculture',        desc:"ERP agricole : cultures, élevage, pisciculture, intrants, exportation et SYSCOHADA.", url:'https://agrifrik.ibigsoft.com/',     mail:'agrifrik@ibigsoft.com',        logo: CDN + 'logo_20260717_160429_6e0dee1b1c.png', teinte:'#65A30D', statut:'live' },
    { cle:'anouanze',       nom:'ANOUANZÊ ERP',           mono:'AN', secteur:'ONG & Associations', desc:"ERP associatif : membres, cotisations, dons, projets et comptabilité SYCEBNL (OHADA).", url:'https://anouanze.ibigsoft.com/',   mail:'anouanze@ibigsoft.com',        logo: CDN + 'logo_20260717_160233_9ff3c7a8ae.png', teinte:'#B45309', statut:'live' },
    { cle:'docpro',         nom:'IBIG DocPro',            mono:'DP', secteur:'Documents',          desc:"Génération intelligente de documents conformes OHADA : contrats, statuts, CV, baux.", url:'https://docpro.ibigsoft.com/',       mail:'docpro@ibigsoft.com',          logo:'https://docpro.ibigsoft.com/logo-icone.svg', teinte:'#4F46E5', statut:'live' },
    { cle:'factpro',        nom:'IBIG FactPro',           mono:'FP', secteur:'Facturation & ERP',  desc:"ERP SaaS complet : facturation, devis, POS, stocks, CRM, projets, RH, API et 100+ templates PDF conformes OHADA.",  url:'https://factpro.ibigsoft.com/',        mail:'factpro@ibigsoft.com',         logo:'https://factpro.ibigsoft.com/logo_icon.svg', teinte:'#0284C7', statut:'live' },
    { cle:'secretis',       nom:'SECRETIS ERP',           mono:'SE', secteur:'Secrétariat',        desc:"Gestion du courrier et du secrétariat : arrivée, départ, parapheur et archivage.", url:'https://secretis.ibigsoft.com/',       mail:'secretis@ibigsoft.com',        logo:'', teinte:'#9333EA', statut:'live' },
    { cle:'residencepro',   nom:'IBIG Residence Pro',     mono:'RP', secteur:'Résidences meublées',desc:"Réservations, séjours et facturation pour résidences meublées et appart-hôtels.",  url:'https://residencepro.ibigsoft.com/',   mail:'residencepro@ibigsoft.com',    logo:'', teinte:'#DB2777', statut:'bientot' },
    { cle:'businessplanpro',nom:'IBIG Business Plan Pro', mono:'BP', secteur:'Conseil',            desc:"Rédaction et chiffrage de business plans bancables, prêts pour les financeurs.",   url:'https://businessplanpro.ibigsoft.com/', mail:'businessplanpro@ibigsoft.com',logo:'', teinte:'#334155', statut:'bientot' }
  ];

  var LEGAL = [
    { nom: 'Mentions légales',             url: 'https://ibigsoft.com/mentions-legales.php' },
    { nom: 'Confidentialité',              url: 'https://ibigsoft.com/politique-confidentialite.php' },
    { nom: 'CGU',                          url: 'https://ibigsoft.com/cgu.php' },
    { nom: 'CGV',                          url: 'https://ibigsoft.com/cgv.php' },
    { nom: 'Cookies',                      url: 'https://ibigsoft.com/cookies.php' }
  ];

  /* ==========================================================================
   *  2. CONFIGURATION (lue sur la balise <script>)
   * ========================================================================*/

  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

  function attr(nom, defaut) {
    var v = script && script.getAttribute('data-' + nom);
    return (v === null || v === undefined || v === '') ? defaut : v;
  }

  var CONFIG = {
    solution: attr('solution', ''),
    accent: attr('accent', ''),
    render: attr('render', 'all'),
    speed: parseFloat(attr('speed', '45')),
    masquerCourante: attr('masquer-courante', 'false') === 'true',
    chargerPolices: attr('polices', 'true') !== 'false'
  };

  /* Détection de la solution courante : attribut, puis nom de domaine. */
  function detecterSolution() {
    if (CONFIG.solution) {
      for (var i = 0; i < SOLUTIONS.length; i++) {
        if (SOLUTIONS[i].cle === CONFIG.solution.toLowerCase()) return SOLUTIONS[i];
      }
    }
    var hote = (location.hostname || '').toLowerCase();
    var chemin = (location.pathname || '').toLowerCase();
    for (var j = 0; j < SOLUTIONS.length; j++) {
      var s = SOLUTIONS[j];
      if (hote.indexOf(s.cle) !== -1) return s;
      if (chemin.indexOf(s.cle) !== -1) return s;
    }
    return null;
  }

  var COURANTE = detecterSolution();
  var ACCENT = CONFIG.accent || (COURANTE ? COURANTE.teinte : '#1D6FE0');

  /* ==========================================================================
   *  3. UTILITAIRES
   * ========================================================================*/

  function el(tag, classe, html) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICONES = {
    facebook:  '<path d="M14 8h2V5h-2a4 4 0 0 0-4 4v2H8v3h2v7h3v-7h2.2l.8-3H13V9a1 1 0 0 1 1-1Z"/>',
    linkedin:  '<path d="M6.5 8A1.75 1.75 0 1 0 6.5 4.5 1.75 1.75 0 0 0 6.5 8ZM5 9.5h3V20H5V9.5Zm5 0h2.9v1.4A3.3 3.3 0 0 1 16 9.3c2.4 0 3.9 1.5 3.9 4.3V20h-3v-5.7c0-1.4-.6-2.2-1.8-2.2s-2 .8-2 2.2V20h-3V9.5Z"/>',
    youtube:   '<path d="M21.6 8.2a2.5 2.5 0 0 0-1.7-1.8C18.3 6 12 6 12 6s-6.3 0-7.9.4A2.5 2.5 0 0 0 2.4 8.2 26 26 0 0 0 2 12c0 1.3.1 2.6.4 3.8a2.5 2.5 0 0 0 1.7 1.8C5.7 18 12 18 12 18s6.3 0 7.9-.4a2.5 2.5 0 0 0 1.7-1.8c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8ZM10 15V9l5.2 3L10 15Z"/>',
    tiktok:    '<path d="M14 3h3a5 5 0 0 0 4 4v3a8 8 0 0 1-4-1.2V15a6 6 0 1 1-6-6c.3 0 .7 0 1 .1v3.2A2.8 2.8 0 1 0 14 15V3Z"/>',
    instagram: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM17 6.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM7.5 3h9A4.5 4.5 0 0 1 21 7.5v9a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 16.5v-9A4.5 4.5 0 0 1 7.5 3Zm0 2A2.5 2.5 0 0 0 5 7.5v9A2.5 2.5 0 0 0 7.5 19h9a2.5 2.5 0 0 0 2.5-2.5v-9A2.5 2.5 0 0 0 16.5 5h-9Z"/>',
    groupe:    '<path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.5 12.5c-3 0-5.5 1.6-5.5 3.6V19h11v-2.9c0-2-2.5-3.6-5.5-3.6Zm7.5.5c-.7 0-1.3.1-1.9.3 1 .9 1.6 2 1.6 3.3V19h5v-2.4c0-1.9-2.2-3.1-4.7-3.1Z"/>',
    whatsapp:  '<path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 1 1-3.6 13l-.3-.2-2.3.6.6-2.2-.2-.3A7 7 0 0 1 12 5Zm-2.6 3.6c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.7 2.7 4.2 3.7 2 .8 2.5.6 2.9.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.3-1.6-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.1-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5v-.5l-.8-1.9c-.2-.4-.4-.4-.6-.4h-.3Z"/>'
  };

  function iconeSvg(nom) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONES[nom] || '') + '</svg>';
  }

  /* ==========================================================================
   *  4. STYLES (injectés une seule fois, préfixe .ibigx- pour éviter les conflits)
   * ========================================================================*/

  function injecterStyles() {
    if (document.getElementById('ibigx-styles')) return;

    if (CONFIG.chargerPolices && !document.getElementById('ibigx-fonts')) {
      var f = el('link');
      f.id = 'ibigx-fonts';
      f.rel = 'stylesheet';
      f.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap';
      document.head.appendChild(f);
    }

    var css = [
      ':root{--ibigx-accent:' + ACCENT + ';}',
      '.ibigx-root{--ibigx-ink:#0B1220;--ibigx-ink-2:#4A5568;--ibigx-line:rgba(11,18,32,.10);',
      '--ibigx-bg:#FFFFFF;--ibigx-soft:#F5F7FA;--ibigx-radius:14px;',
      "--ibigx-display:'Space Grotesk',ui-sans-serif,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
      "--ibigx-body:'Inter',ui-sans-serif,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;",
      'font-family:var(--ibigx-body);color:var(--ibigx-ink);line-height:1.55;box-sizing:border-box;}',
      '.ibigx-root *,.ibigx-root *::before,.ibigx-root *::after{box-sizing:border-box;}',
      '.ibigx-wrap{max-width:1200px;margin:0 auto;padding:0 20px;}',

      /* ---------- Section solutions ---------- */
      '.ibigx-solutions{background:var(--ibigx-soft);padding:64px 0 56px;overflow:hidden;}',
      '.ibigx-head{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end;justify-content:space-between;margin-bottom:32px;}',
      '.ibigx-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;color:var(--ibigx-accent);margin:0 0 10px;}',
      '.ibigx-eyebrow::before{content:"";width:22px;height:2px;background:var(--ibigx-accent);display:block;}',
      '.ibigx-title{font-family:var(--ibigx-display);font-size:clamp(26px,3.4vw,40px);line-height:1.12;font-weight:700;margin:0;letter-spacing:-.02em;}',
      '.ibigx-sub{margin:12px 0 0;color:var(--ibigx-ink-2);max-width:52ch;font-size:15px;}',
      '.ibigx-ctrls{display:flex;gap:8px;}',
      '.ibigx-btn{width:42px;height:42px;border-radius:50%;border:1px solid var(--ibigx-line);background:var(--ibigx-bg);color:var(--ibigx-ink);cursor:pointer;display:grid;place-items:center;transition:background .18s,color .18s,border-color .18s;}',
      '.ibigx-btn:hover{background:var(--ibigx-accent);border-color:var(--ibigx-accent);color:#fff;}',
      '.ibigx-btn:focus-visible{outline:2px solid var(--ibigx-accent);outline-offset:3px;}',
      '.ibigx-btn svg{width:18px;height:18px;fill:currentColor;}',

      '.ibigx-viewport{position:relative;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-ms-overflow-style:none;cursor:grab;-webkit-overflow-scrolling:touch;}',
      '.ibigx-viewport::-webkit-scrollbar{display:none;}',
      '.ibigx-viewport.is-drag{cursor:grabbing;}',
      '.ibigx-track{display:flex;gap:16px;padding:6px 2px 18px;width:max-content;}',

      '.ibigx-card{position:relative;flex:0 0 268px;background:var(--ibigx-bg);border:1px solid var(--ibigx-line);border-radius:var(--ibigx-radius);padding:18px;text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:12px;transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;}',
      '.ibigx-card:hover,.ibigx-card:focus-visible{transform:translateY(-4px);box-shadow:0 14px 30px rgba(11,18,32,.10);border-color:rgba(11,18,32,.18);}',
      '.ibigx-card:focus-visible{outline:2px solid var(--ibigx-accent);outline-offset:3px;}',
      '.ibigx-card::after{content:"";position:absolute;left:0;top:16px;bottom:16px;width:3px;border-radius:0 3px 3px 0;background:var(--tint);opacity:.85;}',
      '.ibigx-cardtop{display:flex;align-items:center;gap:12px;}',
      '.ibigx-logotile{width:52px;height:52px;flex:0 0 52px;border-radius:12px;display:grid;place-items:center;overflow:hidden;background:#fff;border:1px solid var(--ibigx-line);padding:6px;}',
      '.ibigx-logotile img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;}',
      '.ibigx-mono{width:52px;height:52px;flex:0 0 52px;border-radius:12px;display:grid;place-items:center;font-family:var(--ibigx-display);font-weight:700;font-size:16px;color:#fff;background:var(--tint);letter-spacing:.02em;}',
      '.ibigx-name{font-family:var(--ibigx-display);font-weight:600;font-size:16px;margin:0;line-height:1.2;}',
      '.ibigx-sector{font-size:11.5px;color:var(--ibigx-ink-2);text-transform:uppercase;letter-spacing:.08em;margin-top:3px;display:block;}',
      '.ibigx-desc{font-size:13.5px;color:var(--ibigx-ink-2);margin:0;flex:1;}',
      '.ibigx-cardfoot{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12.5px;font-weight:600;color:var(--tint);}',
      '.ibigx-arrow{transition:transform .2s ease;}',
      '.ibigx-card:hover .ibigx-arrow{transform:translateX(4px);}',
      '.ibigx-tag{position:absolute;top:14px;right:14px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px;border-radius:999px;}',
      '.ibigx-tag.soon{background:#FEF3C7;color:#92400E;}',
      '.ibigx-tag.here{background:var(--tint);color:#fff;}',
      '.ibigx-card.is-current{border-color:var(--tint);}',

      '.ibigx-legend{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:6px;font-size:13px;color:var(--ibigx-ink-2);}',
      '.ibigx-legend a{color:var(--ibigx-accent);font-weight:600;text-decoration:none;}',
      '.ibigx-legend a:hover{text-decoration:underline;}',

      /* ---------- Footer ---------- */
      '.ibigx-footer{background:#0B1220;color:#C7D0DC;padding:56px 0 0;}',
      '.ibigx-fgrid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.1fr;gap:36px;padding-bottom:40px;}',
      '.ibigx-fbrand{font-family:var(--ibigx-display);font-size:20px;font-weight:700;color:#fff;margin:0 0 4px;}',
      '.ibigx-fsmall{font-size:12px;color:#8A97A8;margin:0 0 14px;}',
      '.ibigx-ftext{font-size:13.5px;margin:0 0 18px;max-width:36ch;}',
      '.ibigx-ftitle{font-family:var(--ibigx-display);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#fff;margin:0 0 16px;font-weight:600;}',
      '.ibigx-flist{list-style:none;margin:0;padding:0;display:grid;gap:9px;}',
      '.ibigx-flist a,.ibigx-footer a{color:#C7D0DC;text-decoration:none;font-size:13.5px;transition:color .18s;}',
      '.ibigx-flist a:hover,.ibigx-footer a:hover{color:#fff;}',
      '.ibigx-flist a:focus-visible,.ibigx-social a:focus-visible{outline:2px solid var(--ibigx-accent);outline-offset:3px;border-radius:4px;}',
      '.ibigx-fcols2{columns:2;column-gap:18px;}',
      '.ibigx-fcols2 li{break-inside:avoid;margin-bottom:9px;}',
      '.ibigx-dot{width:6px;height:6px;border-radius:50%;background:#22C55E;display:inline-block;margin-right:7px;vertical-align:middle;}',
      '.ibigx-dot.soon{background:#F59E0B;}',
      '.ibigx-flogo{width:26px;height:26px;flex:0 0 26px;border-radius:7px;background:#fff;display:grid;place-items:center;overflow:hidden;padding:3px;}',
      '.ibigx-flogo img{max-width:100%;max-height:100%;object-fit:contain;display:block;}',
      '.ibigx-flogo.mono{background:var(--tint);color:#fff;font-size:10px;font-weight:700;font-family:var(--ibigx-display);}',
      '.ibigx-flist a.ibigx-frow{display:flex;align-items:center;gap:9px;}',
      '.ibigx-fbrandlogo{max-width:190px;height:auto;display:block;margin:0 0 14px;}',
      '.ibigx-badgesoon{font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#F59E0B;margin-left:4px;}',
      '.ibigx-social{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;}',
      '.ibigx-social a{width:36px;height:36px;border-radius:9px;border:1px solid rgba(255,255,255,.14);display:grid;place-items:center;transition:background .18s,border-color .18s,transform .18s;}',
      '.ibigx-social a:hover{background:var(--ibigx-accent);border-color:var(--ibigx-accent);transform:translateY(-2px);}',
      '.ibigx-social svg{width:17px;height:17px;fill:#fff;}',
      '.ibigx-fbottom{border-top:1px solid rgba(255,255,255,.10);padding:18px 0 26px;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;font-size:12.5px;color:#8A97A8;}',
      '.ibigx-fbottom nav{display:flex;flex-wrap:wrap;gap:16px;}',
      '.ibigx-mail{font-weight:600;color:#fff;}',

      /* ---------- Responsive & accessibilité ---------- */
      '@media (max-width:980px){.ibigx-fgrid{grid-template-columns:1fr 1fr;gap:30px;}}',
      '@media (max-width:640px){.ibigx-fgrid{grid-template-columns:1fr;}.ibigx-card{flex-basis:240px;}',
      '.ibigx-solutions{padding:48px 0 40px;}.ibigx-head{align-items:flex-start;}}',
      '@media (prefers-reduced-motion:reduce){.ibigx-root *{animation:none!important;transition:none!important;}}'
    ].join('\n');

    var style = el('style');
    style.id = 'ibigx-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ==========================================================================
   *  5. SECTION « NOS SOLUTIONS » — carrousel infini
   * ========================================================================*/

  function visuelHtml(s, taille) {
    /* taille : 'card' (carrousel) ou 'foot' (liste du footer) */
    var mono = taille === 'card'
      ? '<span class="ibigx-mono" aria-hidden="true">' + esc(s.mono) + '</span>'
      : '<span class="ibigx-flogo mono" aria-hidden="true">' + esc(s.mono) + '</span>';
    if (!s.logo) return mono;
    var cls = taille === 'card' ? 'ibigx-logotile' : 'ibigx-flogo';
    return '<span class="' + cls + '" data-fallback="' + esc(s.mono) + '" aria-hidden="true">' +
      '<img src="' + esc(s.logo) + '" alt="" loading="lazy" decoding="async"></span>';
  }

  /* Si un logo distant ne charge pas, la pastille monogramme prend le relais. */
  function activerRepliLogos(racine) {
    var imgs = racine.querySelectorAll('.ibigx-logotile img, .ibigx-flogo img');
    Array.prototype.forEach.call(imgs, function (img) {
      img.addEventListener('error', function () {
        var tuile = img.parentNode;
        var mono = tuile.getAttribute('data-fallback') || '';
        tuile.classList.add('mono');
        if (tuile.classList.contains('ibigx-logotile')) {
          tuile.className = 'ibigx-mono';
        }
        tuile.textContent = mono;
      });
    });
  }

  function carteHtml(s) {
    var estCourante = COURANTE && s.cle === COURANTE.cle;
    var tag = '';
    if (estCourante) tag = '<span class="ibigx-tag here">Vous êtes ici</span>';
    else if (s.statut === 'bientot') tag = '<span class="ibigx-tag soon">Bientôt</span>';

    return '<a class="ibigx-card' + (estCourante ? ' is-current' : '') + '" href="' + esc(s.url) + '"' +
      (estCourante ? '' : ' target="_blank" rel="noopener"') +
      ' style="--tint:' + s.teinte + '" aria-label="' + esc(s.nom + ' — ' + s.desc) + '">' +
      tag +
      '<div class="ibigx-cardtop">' +
        visuelHtml(s, 'card') +
        '<span><span class="ibigx-name">' + esc(s.nom) + '</span>' +
        '<span class="ibigx-sector">' + esc(s.secteur) + '</span></span>' +
      '</div>' +
      '<p class="ibigx-desc">' + esc(s.desc) + '</p>' +
      '<span class="ibigx-cardfoot"><span>' + (estCourante ? 'Solution actuelle' : 'Découvrir') + '</span>' +
      '<span class="ibigx-arrow" aria-hidden="true">&rarr;</span></span>' +
    '</a>';
  }

  function construireSolutions() {
    var liste = SOLUTIONS.filter(function (s) {
      return !(CONFIG.masquerCourante && COURANTE && s.cle === COURANTE.cle);
    });

    var section = el('section', 'ibigx-root ibigx-solutions');
    section.id = 'solutions-ibigsoft';
    section.setAttribute('aria-label', 'Les solutions IBIG SOFT');

    var cartes = liste.map(carteHtml).join('');

    section.innerHTML =
      '<div class="ibigx-wrap">' +
        '<div class="ibigx-head">' +
          '<div>' +
            '<p class="ibigx-eyebrow">L\u2019\u00e9cosyst\u00e8me IBIG SOFT</p>' +
            '<h2 class="ibigx-title">' + liste.length + ' logiciels de gestion,<br>un seul \u00e9diteur.</h2>' +
            '<p class="ibigx-sub">Chaque m\u00e9tier a son outil. Parcourez les solutions IBIG SOFT et ouvrez celle qui correspond \u00e0 votre activit\u00e9.</p>' +
          '</div>' +
          '<div class="ibigx-ctrls">' +
            '<button type="button" class="ibigx-btn" data-act="prev" aria-label="Solutions pr\u00e9c\u00e9dentes"><svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7z"/></svg></button>' +
            '<button type="button" class="ibigx-btn" data-act="toggle" aria-label="Mettre en pause le d\u00e9filement"><svg viewBox="0 0 24 24"><path d="M8 5h3v14H8zM13 5h3v14h-3z"/></svg></button>' +
            '<button type="button" class="ibigx-btn" data-act="next" aria-label="Solutions suivantes"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7z"/></svg></button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="ibigx-viewport" tabindex="0" role="region" aria-label="Carrousel des solutions IBIG SOFT">' +
        '<div class="ibigx-track">' + cartes + cartes + '</div>' +
      '</div>' +
      '<div class="ibigx-wrap"><p class="ibigx-legend">' +
        'Besoin d\u2019aide pour choisir ? \u00c9crivez \u00e0 <a href="mailto:' + EDITEUR.mailContact + '">' + EDITEUR.mailContact + '</a> ' +
        'ou WhatsApp <a href="' + CONTACTS.whatsappLien + '" target="_blank" rel="noopener">' + CONTACTS.whatsapp + '</a>.' +
      '</p></div>';

    return section;
  }

  function animerCarrousel(section) {
    var vp = section.querySelector('.ibigx-viewport');
    var track = section.querySelector('.ibigx-track');
    if (!vp || !track) return;

    var reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var enPause = reduit;
    var pauseTemporaire = false;
    var minuteur = null;
    var dernier = null;

    function demiLargeur() { return track.scrollWidth / 2; }

    function boucle(t) {
      if (dernier === null) dernier = t;
      var dt = (t - dernier) / 1000;
      dernier = t;
      if (!enPause && !pauseTemporaire && document.visibilityState === 'visible') {
        vp.scrollLeft += CONFIG.speed * dt;
      }
      var demi = demiLargeur();
      if (demi > 0) {
        if (vp.scrollLeft >= demi) vp.scrollLeft -= demi;
        else if (vp.scrollLeft <= 0) vp.scrollLeft += demi;
      }
      requestAnimationFrame(boucle);
    }
    requestAnimationFrame(boucle);

    function suspendre(ms) {
      pauseTemporaire = true;
      clearTimeout(minuteur);
      minuteur = setTimeout(function () { pauseTemporaire = false; }, ms || 1500);
    }

    vp.addEventListener('mouseenter', function () { pauseTemporaire = true; clearTimeout(minuteur); });
    vp.addEventListener('mouseleave', function () { pauseTemporaire = false; });
    vp.addEventListener('focusin', function () { pauseTemporaire = true; clearTimeout(minuteur); });
    vp.addEventListener('focusout', function () { pauseTemporaire = false; });
    vp.addEventListener('wheel', function () { suspendre(1800); }, { passive: true });
    vp.addEventListener('touchstart', function () { pauseTemporaire = true; clearTimeout(minuteur); }, { passive: true });
    vp.addEventListener('touchend', function () { suspendre(2500); }, { passive: true });

    /* Glisser-déposer à la souris */
    var down = false, xDepart = 0, scrollDepart = 0, aGlisse = false;
    vp.addEventListener('mousedown', function (e) {
      down = true; aGlisse = false; xDepart = e.pageX; scrollDepart = vp.scrollLeft;
      vp.classList.add('is-drag'); pauseTemporaire = true;
    });
    window.addEventListener('mousemove', function (e) {
      if (!down) return;
      var delta = e.pageX - xDepart;
      if (Math.abs(delta) > 5) aGlisse = true;
      e.preventDefault();
      vp.scrollLeft = scrollDepart - delta;
    });
    window.addEventListener('mouseup', function () {
      if (!down) return;
      down = false; vp.classList.remove('is-drag'); suspendre(1500);
      setTimeout(function () { aGlisse = false; }, 0);
    });

    /* Boutons */
    var pas = 284;
    section.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'next') { vp.scrollLeft += pas; suspendre(1600); }
      if (act === 'prev') { vp.scrollLeft -= pas; suspendre(1600); }
      if (act === 'toggle') {
        enPause = !enPause;
        b.setAttribute('aria-label', enPause ? 'Reprendre le défilement' : 'Mettre en pause le défilement');
        b.innerHTML = enPause
          ? '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M8 5h3v14H8zM13 5h3v14h-3z"/></svg>';
      }
    });

    /* Clavier : flèches gauche/droite quand le carrousel a le focus */
    vp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { vp.scrollLeft += pas; suspendre(2000); }
      if (e.key === 'ArrowLeft') { vp.scrollLeft -= pas; suspendre(2000); }
    });

    /* Un clic ne doit pas ouvrir un lien à la fin d'un glissement */
    track.addEventListener('click', function (e) {
      if (aGlisse) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  /* ==========================================================================
   *  6. FOOTER UNIVERSEL
   * ========================================================================*/

  function construireFooter() {
    var mailSolution = COURANTE ? COURANTE.mail : EDITEUR.mailSupport;
    var nomSolution = COURANTE ? COURANTE.nom : EDITEUR.nom;
    var annee = new Date().getFullYear();

    var liens = SOLUTIONS.map(function (s) {
      return '<li><a class="ibigx-frow" style="--tint:' + s.teinte + '" href="' + esc(s.url) + '"' +
        (COURANTE && s.cle === COURANTE.cle ? '' : ' target="_blank" rel="noopener"') + '>' +
        visuelHtml(s, 'foot') + '<span>' + esc(s.nom) +
        (s.statut === 'bientot' ? '<span class="ibigx-badgesoon">bientôt</span>' : '') +
        '</span></a></li>';
    }).join('');

    var socials = RESEAUX.map(function (r) {
      return '<a href="' + esc(r.url) + '" target="_blank" rel="noopener" aria-label="' + esc(r.nom) + '" title="' + esc(r.nom) + '">' + iconeSvg(r.icone) + '</a>';
    }).join('');

    var legal = LEGAL.map(function (l) {
      return '<a href="' + esc(l.url) + '">' + esc(l.nom) + '</a>';
    }).join('');

    var footer = el('footer', 'ibigx-root ibigx-footer');
    footer.id = 'footer-ibigsoft';
    footer.innerHTML =
      '<div class="ibigx-wrap">' +
        '<div class="ibigx-fgrid">' +

          '<div>' +
            (COURANTE && COURANTE.logo
              ? '<img class="ibigx-fbrandlogo" src="' + esc(COURANTE.logo) + '" alt="' + esc(COURANTE.nom) + '">'
              : '<p class="ibigx-fbrand">' + esc(nomSolution) + '</p>') +
            '<p class="ibigx-fsmall">Édité par ' + esc(EDITEUR.nom) + ' — ' + esc(EDITEUR.nomLong) + '</p>' +
            '<p class="ibigx-ftext">' + esc(EDITEUR.baseline) + ' Déploiement, formation et support assurés par nos équipes.</p>' +
            '<p style="margin:0 0 14px"><a href="' + EDITEUR.site + '" target="_blank" rel="noopener">' +
              '<img src="' + EDITEUR.logo + '" alt="IBIG Soft" style="max-width:150px;height:auto;display:block"></a></p>' +
            '<div class="ibigx-social">' + socials + '</div>' +
          '</div>' +

          '<div>' +
            '<p class="ibigx-ftitle">Nos solutions</p>' +
            '<ul class="ibigx-flist ibigx-fcols2">' + liens + '</ul>' +
          '</div>' +

          '<div>' +
            '<p class="ibigx-ftitle">Nous joindre</p>' +
            '<ul class="ibigx-flist">' +
              '<li><a href="tel:' + CONTACTS.tel1.replace(/\s/g, '') + '">' + CONTACTS.tel1 + '</a></li>' +
              '<li><a href="tel:' + CONTACTS.tel2.replace(/\s/g, '') + '">' + CONTACTS.tel2 + '</a></li>' +
              '<li><a href="' + CONTACTS.whatsappLien + '" target="_blank" rel="noopener">WhatsApp ' + CONTACTS.whatsapp + '</a></li>' +
              '<li><a href="mailto:' + EDITEUR.mailContact + '">' + EDITEUR.mailContact + '</a></li>' +
              '<li>' + CONTACTS.ville + '</li>' +
              '<li>' + CONTACTS.horaires + '</li>' +
            '</ul>' +
          '</div>' +

          '<div>' +
            '<p class="ibigx-ftitle">Support &amp; documents</p>' +
            '<ul class="ibigx-flist">' +
              '<li>Support ' + esc(nomSolution) + ' :<br><a class="ibigx-mail" href="mailto:' + mailSolution + '">' + mailSolution + '</a></li>' +
              '<li>Support général :<br><a class="ibigx-mail" href="mailto:' + EDITEUR.mailSupport + '">' + EDITEUR.mailSupport + '</a></li>' +
              '<li>Documents légaux :<br><a class="ibigx-mail" href="mailto:' + EDITEUR.mailLegal + '">' + EDITEUR.mailLegal + '</a></li>' +
            '</ul>' +
          '</div>' +

        '</div>' +
        '<div class="ibigx-fbottom">' +
          '<span>© ' + annee + ' ' + esc(EDITEUR.nom) + ' — Tous droits réservés.</span>' +
          '<nav aria-label="Liens légaux">' + legal + '</nav>' +
        '</div>' +
      '</div>';

    return footer;
  }

  /* ==========================================================================
   *  7. MONTAGE
   * ========================================================================*/

  function monter() {
    injecterStyles();

    var cible = CONFIG.render;
    if (cible === 'none') return;

    if (cible === 'all' || cible === 'solutions') {
      var hoteS = document.querySelector('[data-ibig="solutions"]');
      var sec = construireSolutions();
      if (hoteS) hoteS.appendChild(sec); else document.body.appendChild(sec);
      activerRepliLogos(sec);
      animerCarrousel(sec);
    }

    if (cible === 'all' || cible === 'footer') {
      var hoteF = document.querySelector('[data-ibig="footer"]');
      var foot = construireFooter();
      if (hoteF) hoteF.appendChild(foot); else document.body.appendChild(foot);
      activerRepliLogos(foot);
    }
  }

  window.IBIGSOFT = {
    __mounted: true,
    data: { editeur: EDITEUR, contacts: CONTACTS, reseaux: RESEAUX, legal: LEGAL },
    solutions: SOLUTIONS,
    current: COURANTE,
    config: CONFIG,
    render: monter
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monter);
  } else {
    monter();
  }
})();
