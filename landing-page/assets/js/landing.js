/* ============================================================
   IBIG SECRETIS — Landing Page JavaScript
   Éditeur : IBIG Soft — IBIG SARL
   ============================================================ */

'use strict';

/* ============================================================
   i18n — Dictionnaire FR / EN
   ============================================================ */
const i18n = {
  fr: {
    topbar_try: 'Essayez IBIG SECRETIS gratuitement',
    topbar_support: 'Assistance : +225 XX XX XX XX',
    nav_home: 'Accueil',
    nav_features: 'Fonctionnalités',
    nav_modules: 'Modules',
    nav_pricing: 'Tarifs',
    nav_demo: 'Démonstration',
    nav_support: 'Assistance',
    nav_login: 'Connexion',
    btn_free_trial: 'Essai gratuit',
    btn_demo: 'Démonstration',
    hero_cta_try: 'Essayer gratuitement',
    hero_cta_demo: 'Demander une démonstration',
    pricing_monthly: 'Mensuel',
    pricing_annual: 'Annuel (−20%)',
    pricing_month: '/mois',
    sara_greeting: 'Bonjour, je suis SARA, l\'assistante intelligente d\'IBIG SECRETIS. Comment puis-je vous aider ?',
    sara_q1: 'Que fait ce logiciel ?',
    sara_q2: 'Combien ça coûte ?',
    sara_q3: 'Puis-je essayer gratuitement ?',
    sara_q4: 'Comment demander une démo ?',
    sara_q5: 'Comment installer l\'application ?',
    sara_a1: 'IBIG SECRETIS est un ERP de secrétariat et bureautique. Il centralise agenda, courriers, réunions, tâches, GED, communication et RH dans une seule plateforme pour votre organisation.',
    sara_a2: 'Nos formules démarrent à 15 000 FCFA/mois (Starter). La formule Pro est à 45 000 FCFA/mois et Enterprise à 120 000 FCFA/mois. Une économie de 20% est disponible en facturation annuelle.',
    sara_a3: 'Oui ! Vous pouvez démarrer avec un essai gratuit sans engagement. Cliquez sur "Essai gratuit" ou contactez notre équipe pour plus d\'informations.',
    sara_a4: 'Remplissez le formulaire de demande de démonstration sur cette page, ou contactez-nous via WhatsApp. Un conseiller vous contactera dans les 24h pour planifier votre démo.',
    sara_a5: 'IBIG SECRETIS est une application web progressive (PWA). Sur Android, une notification d\'installation apparaîtra automatiquement. Sur iPhone, ouvrez le menu Safari puis "Sur l\'écran d\'accueil".',
  },
  en: {
    topbar_try: 'Try IBIG SECRETIS for free',
    topbar_support: 'Support: +225 XX XX XX XX',
    nav_home: 'Home',
    nav_features: 'Features',
    nav_modules: 'Modules',
    nav_pricing: 'Pricing',
    nav_demo: 'Demo',
    nav_support: 'Support',
    nav_login: 'Login',
    btn_free_trial: 'Free Trial',
    btn_demo: 'Book a Demo',
    hero_cta_try: 'Start for free',
    hero_cta_demo: 'Request a demo',
    pricing_monthly: 'Monthly',
    pricing_annual: 'Annual (−20%)',
    pricing_month: '/mo',
    sara_greeting: 'Hello, I\'m SARA, the intelligent assistant for IBIG SECRETIS. How can I help you?',
    sara_q1: 'What does this software do?',
    sara_q2: 'How much does it cost?',
    sara_q3: 'Can I try it for free?',
    sara_q4: 'How to request a demo?',
    sara_q5: 'How to install the app?',
    sara_a1: 'IBIG SECRETIS is a secretariat and office management ERP. It centralizes scheduling, correspondence, meetings, tasks, document management, communication and HR in one platform for your organization.',
    sara_a2: 'Our plans start at 15,000 FCFA/month (Starter). Pro is 45,000 FCFA/month and Enterprise is 120,000 FCFA/month. A 20% discount is available with annual billing.',
    sara_a3: 'Yes! You can start with a free trial, no commitment required. Click "Free Trial" or contact our team for more information.',
    sara_a4: 'Fill out the demo request form on this page, or contact us via WhatsApp. An advisor will reach out within 24 hours to schedule your demo.',
    sara_a5: 'IBIG SECRETIS is a Progressive Web App (PWA). On Android, an installation prompt will appear automatically. On iPhone, open the Safari menu and select "Add to Home Screen".',
  }
};

let currentLang = localStorage.getItem('ibig_lang') || 'fr';

function t(key) {
  return (i18n[currentLang] && i18n[currentLang][key]) || (i18n['fr'][key]) || key;
}

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  document.documentElement.setAttribute('lang', currentLang);
}

function setLang(lang) {
  if (!i18n[lang]) return;
  currentLang = lang;
  localStorage.setItem('ibig_lang', lang);
  applyLang();
  trackEvent('language_switch', { lang });
}

/* ============================================================
   Hero Carousel
   ============================================================ */
(function initCarousel() {
  let currentSlide = 0;
  let timer = null;
  let isPaused = false;

  function goTo(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots   = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;
    slides.forEach((s, i) => s.classList.toggle('active', i === index));
    dots.forEach((d, i)   => d.classList.toggle('active', i === index));
    currentSlide = index;
  }

  function next() {
    const slides = document.querySelectorAll('.hero-slide');
    goTo((currentSlide + 1) % slides.length);
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => { if (!isPaused) next(); }, 5000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const hero = document.getElementById('hero-carousel');
    if (!hero) return;

    goTo(0);
    startTimer();

    hero.addEventListener('mouseenter', () => { isPaused = true; });
    hero.addEventListener('mouseleave', () => { isPaused = false; });

    // Touch swipe
    let startX = 0;
    hero.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) {
        const slides = document.querySelectorAll('.hero-slide');
        diff > 0
          ? goTo((currentSlide + 1) % slides.length)
          : goTo((currentSlide - 1 + slides.length) % slides.length);
        startTimer();
      }
    }, { passive: true });

    // Expose for dot buttons
    window.heroGoTo = (i) => { goTo(i); startTimer(); };
  });
})();

/* ============================================================
   Header Scroll
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }
});

/* ============================================================
   Mobile Drawer
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const overlay   = document.getElementById('mobile-overlay');
  const drawer    = document.getElementById('mobile-drawer');
  if (!hamburger || !drawer) return;

  function openDrawer() {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    hamburger.setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger.addEventListener('click', () => {
    drawer.classList.contains('open') ? closeDrawer() : openDrawer();
  });
  overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
});

/* ============================================================
   Pricing Toggle
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtns = document.querySelectorAll('.pricing-toggle-btn');
  const prices = {
    starter:    { monthly: 15000,  annual: 12000  },
    pro:        { monthly: 45000,  annual: 36000  },
    enterprise: { monthly: 120000, annual: 96000  },
  };

  function formatPrice(n) {
    return n.toLocaleString('fr-FR');
  }

  function updatePrices(mode) {
    Object.entries(prices).forEach(([plan, p]) => {
      const el = document.querySelector(`[data-price="${plan}"]`);
      if (el) el.textContent = formatPrice(mode === 'annual' ? p.annual : p.monthly);
    });
    document.querySelectorAll('.pricing-annual-note').forEach(el => {
      el.style.visibility = mode === 'annual' ? 'visible' : 'hidden';
    });
  }

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePrices(btn.dataset.mode);
      trackEvent('pricing_toggle', { mode: btn.dataset.mode });
    });
  });
});

/* ============================================================
   FAQ Accordion
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.faq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      // close all
      document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
      trackEvent('faq_open', { question: btn.textContent.trim().substring(0, 60) });
    });
  });
});

/* ============================================================
   Lightbox
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('lightbox');
  const lightboxLabel = document.getElementById('lightbox-label');
  if (!lightbox) return;

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      if (lightboxLabel) lightboxLabel.textContent = item.querySelector('.gallery-item-label')?.textContent || '';
      lightbox.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  });

  document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && lightbox.style.display === 'flex') closeLightbox(); });

  function closeLightbox() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
  }
});

/* ============================================================
   SARA Chatbot
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const floatBtn    = document.getElementById('sara-float-btn');
  const chatWindow  = document.getElementById('sara-chat-window');
  const chatBody    = document.getElementById('sara-chat-body');
  if (!floatBtn || !chatWindow || !chatBody) return;

  let isOpen = false;

  function toggleSara() {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'block' : 'none';
    floatBtn.setAttribute('aria-expanded', isOpen.toString());
    if (isOpen && chatBody.children.length === 0) {
      addMsg(t('sara_greeting'), false);
      trackEvent('sara_open');
    }
  }

  function addMsg(text, isUser = false) {
    const div = document.createElement('div');
    div.className = 'sara-msg' + (isUser ? ' user' : '');
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function sendToSara(message) {
    addMsg(message, true);
    try {
      const res = await fetch('/api/v1/sara/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ message, lang: currentLang })
      });
      if (!res.ok) throw new Error('network');
      const data = await res.json();
      addMsg(data.reply || data.message || '…');
    } catch {
      // Fallback local answers
      const key = saraLocalAnswer(message);
      addMsg(key);
    }
  }

  function saraLocalAnswer(msg) {
    const m = msg.toLowerCase();
    if (m.includes('coût') || m.includes('prix') || m.includes('combien') || m.includes('cost') || m.includes('price')) return t('sara_a2');
    if (m.includes('essai') || m.includes('gratuit') || m.includes('free') || m.includes('trial')) return t('sara_a3');
    if (m.includes('démo') || m.includes('demo')) return t('sara_a4');
    if (m.includes('install') || m.includes('application') || m.includes('mobile') || m.includes('app')) return t('sara_a5');
    return t('sara_a1');
  }

  floatBtn.addEventListener('click', toggleSara);

  document.querySelectorAll('.sara-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qKey = btn.dataset.qkey;
      const aKey = btn.dataset.akey;
      if (qKey && aKey) {
        addMsg(t(qKey), true);
        setTimeout(() => addMsg(t(aKey), false), 350);
        trackEvent('sara_quick_question', { key: qKey });
      }
    });
  });

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) { toggleSara(); }
  });
});

/* ============================================================
   PWA Install Prompt
   ============================================================ */
let pwaPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  pwaPrompt = e;
  document.querySelectorAll('.pwa-install-btn').forEach(btn => btn.style.display = 'inline-flex');
});

function installPWA() {
  if (!pwaPrompt) {
    alert(currentLang === 'fr'
      ? 'Pour installer : ouvrez le menu de votre navigateur et choisissez "Installer l\'application" ou "Ajouter à l\'écran d\'accueil".'
      : 'To install: open your browser menu and choose "Install app" or "Add to Home Screen".');
    return;
  }
  pwaPrompt.prompt();
  pwaPrompt.userChoice.then(r => {
    trackEvent('pwa_install', { outcome: r.outcome });
    pwaPrompt = null;
  });
}

/* ============================================================
   Cookie Consent
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  if (localStorage.getItem('ibig_cookies_accepted')) { banner.remove(); return; }

  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem('ibig_cookies_accepted', 'all');
    banner.remove();
    trackEvent('cookie_consent', { choice: 'accept_all' });
  });
  document.getElementById('cookie-refuse')?.addEventListener('click', () => {
    localStorage.setItem('ibig_cookies_accepted', 'essential');
    banner.remove();
    trackEvent('cookie_consent', { choice: 'essential_only' });
  });
});

/* ============================================================
   Smooth Scroll
   ============================================================ */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const target = document.querySelector(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  const headerH = document.getElementById('header')?.offsetHeight || 64;
  const top = target.getBoundingClientRect().top + window.scrollY - headerH - 8;
  window.scrollTo({ top, behavior: 'smooth' });
});

/* ============================================================
   Intersection Observer — Scroll Animations
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});

/* ============================================================
   Active Nav Link
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('#nav-main a[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });

  sections.forEach(s => io.observe(s));
});

/* ============================================================
   Analytics Events
   ============================================================ */
const _analytics = { scrollDepthReported: new Set(), startTime: Date.now() };

function trackEvent(name, params = {}) {
  // Send to custom endpoint
  try {
    if (typeof gtag === 'function') {
      gtag('event', name, params);
    }
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/v1/analytics', JSON.stringify({ event: name, params, lang: currentLang, ts: Date.now() }));
    }
  } catch(e) { /* silent */ }
}

// CTA click tracking
document.addEventListener('click', e => {
  const cta = e.target.closest('[data-track]');
  if (cta) trackEvent('cta_click', { label: cta.dataset.track, text: cta.textContent.trim().substring(0, 40) });
});

// Scroll depth
window.addEventListener('scroll', () => {
  const scrolled = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  [25, 50, 75, 100].forEach(depth => {
    if (scrolled >= depth && !_analytics.scrollDepthReported.has(depth)) {
      _analytics.scrollDepthReported.add(depth);
      trackEvent('scroll_depth', { depth });
    }
  });
}, { passive: true });

// Time on page
window.addEventListener('beforeunload', () => {
  trackEvent('time_on_page', { seconds: Math.round((Date.now() - _analytics.startTime) / 1000) });
});

/* ============================================================
   Demo Form Submission
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('demo-form');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = currentLang === 'fr' ? 'Envoi en cours…' : 'Sending…';

    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch('/api/v1/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        form.innerHTML = `
          <div style="text-align:center;padding:2rem">
            <div style="font-size:3rem;margin-bottom:1rem">✓</div>
            <h3 style="color:var(--c-success);margin-bottom:0.5rem">${currentLang === 'fr' ? 'Demande envoyée !' : 'Request sent!'}</h3>
            <p style="color:var(--c-text-muted)">${currentLang === 'fr'
              ? 'Merci ! Un conseiller vous contactera dans les 24 heures pour confirmer votre démonstration.'
              : 'Thank you! An advisor will contact you within 24 hours to confirm your demonstration.'}</p>
          </div>`;
        trackEvent('demo_request_submitted');
      } else {
        throw new Error('server_error');
      }
    } catch {
      btn.disabled = false;
      btn.textContent = originalText;
      alert(currentLang === 'fr'
        ? 'Une erreur est survenue. Veuillez réessayer ou nous contacter via WhatsApp.'
        : 'An error occurred. Please try again or contact us via WhatsApp.');
    }
  });
});

/* ============================================================
   Video Placeholder
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const videoWrap = document.getElementById('video-placeholder');
  if (!videoWrap) return;

  videoWrap.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/VOTRE_VIDEO_ID?autoplay=1&rel=0';
    iframe.allow = 'autoplay; encrypted-media';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'width:100%;height:100%;border:none;';
    videoWrap.innerHTML = '';
    videoWrap.appendChild(iframe);
    trackEvent('video_play');
  });
});

/* ============================================================
   Init
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  applyLang();

  // Lang toggle buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  trackEvent('page_view', { lang: currentLang, referrer: document.referrer });
});
