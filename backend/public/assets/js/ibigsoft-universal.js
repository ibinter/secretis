(function () { 'use strict';
/* =============================================================================
 *  IBIG SOFT - SCRIPT UNIVERSEL  v2.0
 *  Editeur : IBIG SOFT (Intermark Business International Group)
 *  Contact : +225 27 22 27 60 14 | +225 05 55 05 99 01
 *  WhatsApp: +225 07 78 88 25 92
 * ============================================================================*/

if (window.IBIGSOFT && window.IBIGSOFT.__mounted) return;
if (!window.IBIGSOFT) window.IBIGSOFT = {};
window.IBIGSOFT.__mounted = true;
window.IBIGSOFT.version = '2.0';

var SOLUTIONS = [
  { id:'stockflow',       nom:'StockFlow',        desc:'Gestion de stock et inventaire',       url:'https://stockflow.ibigsoft.com',       couleur:'#2563eb' },
  { id:'gescomxel',       nom:'GescomXel',        desc:'Gestion commerciale avancee',          url:'https://gescomxel.ibigsoft.com',       couleur:'#7c3aed' },
  { id:'scolaby',         nom:'Scolaby',          desc:'Gestion scolaire complete',            url:'https://scolaby.ibigsoft.com',         couleur:'#059669' },
  { id:'lokativo',        nom:'Lokativo',         desc:'Gestion immobiliere et location',      url:'https://lokativo.ibigsoft.com',        couleur:'#d97706' },
  { id:'ibigfleet360',    nom:'IBIGFleet360',     desc:'Gestion de flotte automobile',         url:'https://ibigfleet360.ibigsoft.com',    couleur:'#dc2626' },
  { id:'zelivry',         nom:'ZeLivry',          desc:'Gestion de livraisons et coursiers',   url:'https://zelivry.ibigsoft.com',         couleur:'#0891b2' },
  { id:'construiro',      nom:'ConstruIro',       desc:'Gestion de chantiers BTP',             url:'https://construiro.ibigsoft.com',      couleur:'#92400e' },
  { id:'santarex',        nom:'Santarex',         desc:'Gestion clinique et sante',            url:'https://santarex.ibigsoft.com',        couleur:'#be185d' },
  { id:'gestmoney',       nom:'GestMoney',        desc:'Gestion financiere et comptabilite',   url:'https://gestmoney.ibigsoft.com',       couleur:'#1d4ed8' },
  { id:'agrifrik',        nom:'AgriFrik',         desc:'Gestion agricole et elevage',          url:'https://agrifrik.ibigsoft.com',        couleur:'#15803d' },
  { id:'anouanze',        nom:'Anouanze',         desc:'Plateforme de petites annonces',       url:'https://anouanze.ibigsoft.com',        couleur:'#9333ea' },
  { id:'docpro',          nom:'DocPro',           desc:'Gestion documentaire professionnelle', url:'https://docpro.ibigsoft.com',          couleur:'#0369a1' },
  { id:'factpro',         nom:'FactPro',          desc:'Facturation et devis en ligne',        url:'https://factpro.ibigsoft.com',         couleur:'#b45309' },
  { id:'secretis',        nom:'SECRETIS',         desc:'Gestion des ressources humaines',      url:'https://secretis.ibigsoft.com',        couleur:'#7c3aed' },
  { id:'residencepro',    nom:'ResidencePro',     desc:'Gestion de residences et hotels',      url:'https://residencepro.ibigsoft.com',    couleur:'#0f766e' },
  { id:'businessplanpro', nom:'BusinessPlanPro',  desc:'Creation de business plan',            url:'https://businessplanpro.ibigsoft.com', couleur:'#1e40af' }
];

var CONTACTS = {
  tel1: '+225 27 22 27 60 14',
  tel2: '+225 05 55 05 99 01',
  whatsapp: '+225 07 78 88 25 92',
  email: 'contact@ibigsoft.com',
  site: 'https://ibigsoft.com',
  adresse: 'Abidjan, Cote d\'Ivoire'
};

var PAIEMENTS = [
  { nom:'Orange Money', numero:'+225 07 78 88 25 92', couleur:'#ff6600' },
  { nom:'Moov Money',   numero:'+225 01 53 59 55 44', couleur:'#0066cc' },
  { nom:'MTN MoMo',     numero:'+225 05 55 05 99 01', couleur:'#ffcc00' },
  { nom:'Wave',         numero:'+225 07 78 88 25 92', couleur:'#1a9bfc' }
];

function detectSolution() {
  var host = window.location.hostname;
  for (var i = 0; i < SOLUTIONS.length; i++) {
    if (host.indexOf(SOLUTIONS[i].id) !== -1) return SOLUTIONS[i];
  }
  return SOLUTIONS[13];
}

function injectStyles(accent) {
  var css = '.ibig-footer{background:#1a1a2e;color:#e2e8f0;padding:40px 20px 20px;font-family:sans-serif;margin-top:40px}'
    + '.ibig-footer-grid{display:flex;flex-wrap:wrap;gap:30px;max-width:1200px;margin:0 auto 30px}'
    + '.ibig-footer-col{flex:1;min-width:180px}'
    + '.ibig-footer-col h4{color:' + accent + ';margin-bottom:12px;font-size:14px;text-transform:uppercase;letter-spacing:1px}'
    + '.ibig-footer-col p,.ibig-footer-col a{font-size:13px;color:#94a3b8;line-height:1.8;display:block;text-decoration:none}'
    + '.ibig-footer-col a:hover{color:' + accent + '}'
    + '.ibig-footer-bottom{border-top:1px solid #334155;padding-top:16px;text-align:center;font-size:12px;color:#64748b;max-width:1200px;margin:0 auto}'
    + '.ibig-paiements{background:#f8fafc;padding:30px 20px;text-align:center;font-family:sans-serif}'
    + '.ibig-paiements h3{margin-bottom:20px;color:#1e293b}'
    + '.ibig-paiements-grid{display:flex;flex-wrap:wrap;gap:16px;justify-content:center}'
    + '.ibig-paiement-card{background:#fff;border-radius:12px;padding:16px 24px;box-shadow:0 2px 8px rgba(0,0,0,.08);min-width:150px}'
    + '.ibig-paiement-card .nom{font-weight:700;font-size:14px}'
    + '.ibig-paiement-card .num{font-size:13px;color:#64748b;margin-top:4px}'
    + '.ibig-carousel{padding:30px 20px;font-family:sans-serif;background:#fff}'
    + '.ibig-carousel h3{text-align:center;margin-bottom:20px;color:#1e293b}'
    + '.ibig-carousel-track{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}'
    + '.ibig-solution-card{border-radius:10px;padding:14px 18px;color:#fff;text-decoration:none;min-width:140px;text-align:center;transition:transform .2s}'
    + '.ibig-solution-card:hover{transform:translateY(-3px);color:#fff}'
    + '.ibig-solution-card .s-nom{font-weight:700;font-size:14px}'
    + '.ibig-solution-card .s-desc{font-size:11px;opacity:.85;margin-top:4px}'
    + '.ibig-bubble{position:fixed;bottom:20px;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.25);font-size:22px;text-decoration:none;transition:transform .2s}'
    + '.ibig-bubble:hover{transform:scale(1.1)}'
    + '.ibig-bubble-wa{right:20px;background:#25d366}'
    + '.ibig-bubble-sara{left:20px;background:' + accent + ';font-size:14px;color:#fff;font-weight:700}'
    + '.ibig-pwa-btn{position:fixed;bottom:80px;right:20px;background:' + accent + ';color:#fff;border:none;border-radius:24px;padding:10px 18px;font-size:13px;cursor:pointer;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.2);display:none}'
    + '.ibig-partners{background:#0f172a;color:#fff;padding:16px 20px;text-align:center;font-size:13px;font-family:sans-serif}'
    + '.ibig-partners span{color:' + accent + ';font-weight:700}';
  var s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
}

function renderCarousel(target) {
  var html = '<div class="ibig-carousel"><h3>Nos Solutions</h3><div class="ibig-carousel-track">';
  SOLUTIONS.forEach(function(s) {
    html += '<a href="' + s.url + '" class="ibig-solution-card" style="background:' + s.couleur + '" target="_blank">';
    html += '<div class="s-nom">' + s.nom + '</div>';
    html += '<div class="s-desc">' + s.desc + '</div></a>';
  });
  html += '</div></div>';
  target.innerHTML = html;
}

function renderPaiements(target) {
  var html = '<div class="ibig-paiements"><h3>Moyens de Paiement</h3><div class="ibig-paiements-grid">';
  PAIEMENTS.forEach(function(p) {
    html += '<div class="ibig-paiement-card">';
    html += '<div class="nom" style="color:' + p.couleur + '">' + p.nom + '</div>';
    html += '<div class="num">' + p.numero + '</div></div>';
  });
  html += '</div></div>';
  target.innerHTML = html;
}

function renderFooter(target, sol) {
  var html = '<footer class="ibig-footer"><div class="ibig-footer-grid">';
  html += '<div class="ibig-footer-col"><h4>' + sol.nom + '</h4><p>' + sol.desc + '</p><p>Par IBIG SOFT</p></div>';
  html += '<div class="ibig-footer-col"><h4>Contact</h4>';
  html += '<a href="tel:' + CONTACTS.tel1 + '">' + CONTACTS.tel1 + '</a>';
  html += '<a href="tel:' + CONTACTS.tel2 + '">' + CONTACTS.tel2 + '</a>';
  html += '<a href="mailto:' + CONTACTS.email + '">' + CONTACTS.email + '</a></div>';
  html += '<div class="ibig-footer-col"><h4>Nos Solutions</h4>';
  SOLUTIONS.slice(0,6).forEach(function(s) {
    html += '<a href="' + s.url + '" target="_blank">' + s.nom + '</a>';
  });
  html += '</div><div class="ibig-footer-col"><h4>Paiements</h4>';
  PAIEMENTS.forEach(function(p) {
    html += '<p>' + p.nom + ': ' + p.numero + '</p>';
  });
  html += '</div><div class="ibig-footer-col"><h4>Liens Utiles</h4>';
  html += '<a href="https://ibigsoft.com" target="_blank">ibigsoft.com</a>';
  html += '<a href="/mentions-legales">Mentions legales</a>';
  html += '<a href="/politique-confidentialite">Confidentialite</a>';
  html += '<a href="/cgu">CGU</a></div></div>';
  html += '<div class="ibig-footer-bottom">';
  html += '&copy; ' + new Date().getFullYear() + ' IBIG SOFT - ' + sol.nom + '. Tous droits reserves. ';
  html += CONTACTS.tel1 + ' | ' + CONTACTS.tel2;
  html += '</div></footer>';
  target.innerHTML = html;
}

function renderBulles(accent) {
  var wa = document.createElement('a');
  wa.className = 'ibig-bubble ibig-bubble-wa';
  wa.href = 'https://wa.me/2250778882592';
  wa.target = '_blank';
  wa.title = 'WhatsApp IBIG SOFT';
  wa.innerHTML = '&#128172;';
  document.body.appendChild(wa);
  var sara = document.createElement('div');
  sara.className = 'ibig-bubble ibig-bubble-sara';
  sara.title = 'Assistant SARA';
  sara.innerHTML = 'SARA';
  sara.onclick = function() { alert('Assistant SARA - IBIG SOFT\nContactez-nous: ' + CONTACTS.whatsapp); };
  document.body.appendChild(sara);
}

function renderPWAButton() {
  var btn = document.createElement('button');
  btn.className = 'ibig-pwa-btn';
  btn.id = 'ibig-pwa-install';
  btn.textContent = 'Installer l\'app';
  document.body.appendChild(btn);
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    btn.style.display = 'block';
  });
  btn.addEventListener('click', function() {
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; btn.style.display = 'none'; }
  });
}

function renderPartners() {
  var bar = document.createElement('div');
  bar.className = 'ibig-partners';
  bar.innerHTML = 'Propulse par <span>IBIG SOFT</span> - ' + CONTACTS.tel1 + ' | ' + CONTACTS.tel2 + ' | <a href="https://ibigsoft.com" style="color:#94a3b8">ibigsoft.com</a>';
  document.body.insertBefore(bar, document.body.firstChild);
}

function init() {
  var sol = detectSolution();
  var scriptTag = document.querySelector('script[data-ibigsoft], script[src*="ibigsoft-universal"]');
  var accent = sol.couleur;
  var renders = 'all';
  if (scriptTag) {
    if (scriptTag.dataset.accent) accent = scriptTag.dataset.accent;
    if (scriptTag.dataset.solution) {
      var found = SOLUTIONS.filter(function(s) { return s.id === scriptTag.dataset.solution; });
      if (found.length) sol = found[0];
    }
    if (scriptTag.dataset.render) renders = scriptTag.dataset.render;
  }
  injectStyles(accent);
  var carouselEl = document.getElementById('ibig-solutions') || document.querySelector('[data-ibig="solutions"]');
  if (carouselEl && (renders === 'all' || renders.indexOf('carousel') !== -1)) renderCarousel(carouselEl);
  var paiEl = document.getElementById('ibig-paiements') || document.querySelector('[data-ibig="paiements"]');
  if (paiEl && (renders === 'all' || renders.indexOf('paiements') !== -1)) renderPaiements(paiEl);
  var footerEl = document.getElementById('ibig-footer') || document.querySelector('[data-ibig="footer"]');
  if (footerEl && (renders === 'all' || renders.indexOf('footer') !== -1)) renderFooter(footerEl, sol);
  if (!scriptTag || scriptTag.dataset.bulles !== 'false') renderBulles(accent);
  if (!scriptTag || scriptTag.dataset.pwa !== 'false') renderPWAButton();
  if (!scriptTag || scriptTag.dataset.partners !== 'false') renderPartners();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.IBIGSOFT.solutions = SOLUTIONS;
window.IBIGSOFT.contacts = CONTACTS;
window.IBIGSOFT.paiements = PAIEMENTS;
window.IBIGSOFT.renderCarousel = renderCarousel;
window.IBIGSOFT.renderFooter = renderFooter;
window.IBIGSOFT.renderPaiements = renderPaiements;

})();
