/**
 * SECRETIS ERP — Legal/Show.jsx
 *
 * Page générique d'affichage d'une page légale IBIG SECRETIS.
 * Route : /legal/:slug
 *
 * Fonctionnalités :
 *   - Sidebar de navigation entre les 18 pages
 *   - Rendu HTML sécurisé du contenu (depuis la base)
 *   - Métadonnées : version, date de MAJ, date d'entrée en vigueur
 *   - Bouton "Télécharger en PDF" (endpoint GET /api/v1/legal/:slug/pdf)
 *   - Bouton "J'accepte" pour les pages requires_acceptance (POST /api/v1/legal/accept)
 *   - Bannière d'acceptation si requires_acceptance et non encore acceptée
 *   - Liens vers les pages connexes
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// ── Icônes ────────────────────────────────────────────────────────────────────
const Icons = {
  ChevronRight: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7"/>
    </svg>
  ),
  ChevronLeft: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  ),
  Download: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  Check: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Shield: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Alert: ({ s = 18 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Calendar: ({ s = 14 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Tag: ({ s = 14 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  Menu: ({ s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
};

const CATEGORY_COLORS = {
  general:    '#2563EB',
  usage:      '#7C3AED',
  commercial: '#065F46',
  privacy:    '#B45309',
  support:    '#BE185D',
};

// ── Bannière d'acceptation ────────────────────────────────────────────────────
function AcceptanceBanner({ page, onAccepted }) {
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const contentRef = useRef(null);

  // Surveiller si l'utilisateur a scrollé jusqu'en bas du contenu
  useEffect(() => {
    const el = document.getElementById('legal-content-area');
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 120) {
        setScrolledToBottom(true);
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleAccept = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/v1/legal/accept', {
        slug:    page.slug,
        version: page.version,
      });
      setAccepted(true);
      onAccepted?.();
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer ou contacter le support.");
    } finally {
      setLoading(false);
    }
  }, [page.slug, page.version, onAccepted]);

  if (accepted) {
    return (
      <div style={{
        background: '#D1FAE5',
        border: '1px solid #6EE7B7',
        borderRadius: '8px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#065F46',
        fontWeight: 600,
        marginBottom: '24px',
      }}>
        <Icons.Check s={18} />
        Vous avez accepté ce document. Votre consentement a été enregistré.
      </div>
    );
  }

  return (
    <div style={{
      background: '#FEF3C7',
      border: '1px solid #FCD34D',
      borderRadius: '10px',
      padding: '16px 20px',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ color: '#92400E', flexShrink: 0, marginTop: '2px' }}>
          <Icons.Alert s={20} />
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#78350F', fontSize: '14px' }}>
            Ce document requiert votre acceptation explicite.
          </p>
          <p style={{ margin: '0 0 14px', color: '#92400E', fontSize: '13px', lineHeight: 1.5 }}>
            Lisez attentivement le contenu ci-dessous dans son intégralité avant d'accepter.
            Votre acceptation, avec votre adresse IP et la date, sera enregistrée conformément au RGPD.
          </p>
          {!scrolledToBottom && (
            <p style={{ margin: '0 0 10px', color: '#92400E', fontSize: '12px', fontStyle: 'italic', opacity: 0.8 }}>
              Faites défiler le document jusqu'en bas pour activer le bouton d'acceptation.
            </p>
          )}
          {error && (
            <p style={{ margin: '0 0 10px', color: '#DC2626', fontSize: '13px' }}>{error}</p>
          )}
          <button
            onClick={handleAccept}
            disabled={loading || !scrolledToBottom}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: scrolledToBottom ? '#1E3A8A' : '#9CA3AF',
              color: '#fff',
              border: 'none',
              padding: '9px 20px',
              borderRadius: '7px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: loading || !scrolledToBottom ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, opacity 0.15s',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Icons.Check s={15} />
            {loading ? 'Enregistrement…' : `J'accepte — ${page.title?.fr}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar de navigation ─────────────────────────────────────────────────────
function LegalSidebar({ pages, currentSlug, onNavigate }) {
  const categories = {
    general:    'Général',
    usage:      'Utilisation',
    commercial: 'Commercial',
    privacy:    'Confidentialité',
    support:    'Support',
  };

  const grouped = Object.keys(categories).reduce((acc, cat) => {
    const catPages = pages.filter(p => p.category === cat);
    if (catPages.length > 0) acc[cat] = catPages;
    return acc;
  }, {});

  return (
    <nav aria-label="Pages légales" style={{ width: '240px', flexShrink: 0 }}>
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        overflow: 'hidden',
        position: 'sticky',
        top: '80px',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
      }}>
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
        }}>
          Documents légaux
        </div>

        {Object.entries(grouped).map(([cat, catPages]) => (
          <div key={cat}>
            <div style={{
              padding: '10px 16px 4px',
              fontSize: '10px',
              fontWeight: 700,
              color: CATEGORY_COLORS[cat],
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {categories[cat]}
            </div>
            {catPages.map(page => (
              <button
                key={page.slug}
                onClick={() => onNavigate(page.slug)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 16px',
                  fontSize: '13px',
                  fontWeight: page.slug === currentSlug ? 700 : 400,
                  color: page.slug === currentSlug ? '#1E3A8A' : 'var(--text-secondary)',
                  background: page.slug === currentSlug ? '#EFF6FF' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderLeft: page.slug === currentSlug ? '3px solid #1E3A8A' : '3px solid transparent',
                  transition: 'background 0.12s, color 0.12s',
                  lineHeight: 1.4,
                }}
                onMouseEnter={e => {
                  if (page.slug !== currentSlug) {
                    e.currentTarget.style.background = 'var(--surface)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (page.slug !== currentSlug) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
                aria-current={page.slug === currentSlug ? 'page' : undefined}
              >
                {page.title?.fr}
              </button>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function LegalShow() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [page, setPage]         = useState(null);
  const [allPages, setAllPages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      axios.get(`/api/v1/legal/${slug}`),
      axios.get('/api/v1/legal').catch(() => ({ data: { data: [] } })),
    ])
      .then(([pageRes, pagesRes]) => {
        setPage(pageRes.data?.data ?? null);
        setAllPages(pagesRes.data?.data ?? []);
        setAccepted(pageRes.data?.data?.user_accepted ?? false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      })
      .catch(() => setError('Page légale introuvable.'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleDownload = useCallback(async () => {
    try {
      const response = await axios.get(`/api/v1/legal/${slug}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SECRETIS-${slug}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Le téléchargement PDF n\'est pas disponible pour le moment.');
    }
  }, [slug]);

  const navigateTo = useCallback((newSlug) => {
    navigate(`/legal/${newSlug}`);
    setSidebarOpen(false);
  }, [navigate]);

  // Navigation Précédent / Suivant
  const currentIndex = allPages.findIndex(p => p.slug === slug);
  const prevPage = currentIndex > 0 ? allPages[currentIndex - 1] : null;
  const nextPage = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <p style={{ color: 'var(--text-muted)' }}>Chargement…</p>
    </div>
  );

  if (error || !page) return (
    <div style={{ padding: '24px', textAlign: 'center', color: '#DC2626' }}>
      <p>{error ?? 'Page introuvable.'}</p>
      <Link to="/legal" style={{ color: 'var(--accent)' }}>← Retour aux pages légales</Link>
    </div>
  );

  const catColor = CATEGORY_COLORS[page.category] ?? '#6B7280';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>

      {/* ── Breadcrumb ────────────────────────────────────────────────────────── */}
      <nav aria-label="Fil d'Ariane" style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Accueil</Link>
        <Icons.ChevronRight s={12} />
        <Link to="/legal" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Légal</Link>
        <Icons.ChevronRight s={12} />
        <span>{page.title?.fr}</span>
      </nav>

      {/* ── Layout principal ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>

        {/* ── Sidebar — desktop ─────────────────────────────────────────────── */}
        <div className="legal-sidebar-desktop" style={{ display: 'block' }}>
          {allPages.length > 0 && (
            <LegalSidebar
              pages={allPages}
              currentSlug={slug}
              onNavigate={navigateTo}
            />
          )}
        </div>

        {/* ── Contenu principal ─────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* En-tête de la page */}
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  background: `${catColor}15`,
                  color: catColor,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  marginBottom: '10px',
                }}>
                  {page.category}
                </span>
                <h1 style={{
                  margin: '0 0 12px',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                }}>
                  {page.title?.fr}
                </h1>

                {/* Métadonnées */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Icons.Tag s={13} />
                    Version {page.version}
                  </div>
                  {page.effective_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <Icons.Calendar s={13} />
                      En vigueur depuis le{' '}
                      {new Date(page.effective_date).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </div>
                  )}
                  {page.updated_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <Icons.Calendar s={13} />
                      Mis à jour le{' '}
                      {new Date(page.updated_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Bouton PDF */}
              <button
                onClick={handleDownload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '8px 14px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}
                aria-label="Télécharger ce document en PDF"
              >
                <Icons.Download s={15} />
                Télécharger PDF
              </button>
            </div>

            {/* Bannière d'acceptation */}
            {page.requires_acceptance && !accepted && (
              <div style={{ marginTop: '20px' }}>
                <AcceptanceBanner
                  page={page}
                  onAccepted={() => setAccepted(true)}
                />
              </div>
            )}

            {/* Confirmation d'acceptation déjà donnée */}
            {page.requires_acceptance && (accepted || page.user_accepted) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginTop: '16px',
                background: '#D1FAE5', color: '#065F46',
                borderRadius: '7px', padding: '10px 14px',
                fontSize: '13px', fontWeight: 600,
              }}>
                <Icons.Check s={16} />
                Vous avez accepté ce document (version {page.version}).
              </div>
            )}
          </div>

          {/* Contenu HTML du document */}
          <div
            id="legal-content-area"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '32px',
              marginBottom: '20px',
              maxHeight: page.requires_acceptance && !accepted ? '600px' : 'none',
              overflowY: page.requires_acceptance && !accepted ? 'auto' : 'visible',
            }}
          >
            <div
              className="legal-content"
              dangerouslySetInnerHTML={{ __html: page.content?.fr ?? '' }}
              style={{
                lineHeight: 1.75,
                color: 'var(--text-primary)',
                fontSize: '15px',
              }}
            />
          </div>

          {/* ── Navigation précédent / suivant ─────────────────────────────── */}
          <div style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            {prevPage && (
              <button
                onClick={() => navigateTo(prevPage.slug)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: 600,
                  padding: '10px 16px', borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  flex: 1, minWidth: '200px',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <Icons.ChevronLeft s={15} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {prevPage.title?.fr}
                </span>
              </button>
            )}

            <Link to="/legal" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: '13px',
              padding: '10px 16px', borderRadius: '8px',
              textDecoration: 'none', fontWeight: 500,
              flexShrink: 0,
            }}>
              Tous les documents
            </Link>

            {nextPage && (
              <button
                onClick={() => navigateTo(nextPage.slug)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: 600,
                  padding: '10px 16px', borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  flex: 1, minWidth: '200px',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextPage.title?.fr}
                </span>
                <Icons.ChevronRight s={15} />
              </button>
            )}
          </div>

          {/* Contact juridique */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: '#EFF6FF',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#1E40AF',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <Icons.Shield s={16} />
            <span>
              Questions sur ce document ?{' '}
              <a href="mailto:legal@ibigsoft.com" style={{ color: '#1D4ED8', fontWeight: 600 }}>
                legal@ibigsoft.com
              </a>
              {' '}— IBIG SARL, Abidjan – Côte d'Ivoire
            </span>
          </div>
        </div>
      </div>

      {/* ── Styles du contenu légal ───────────────────────────────────────────── */}
      <style>{`
        .legal-content h2 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 16px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--border);
        }
        .legal-content h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 24px 0 10px;
        }
        .legal-content h4 {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-secondary);
          margin: 18px 0 8px;
        }
        .legal-content p {
          margin: 0 0 14px;
          color: var(--text-secondary);
        }
        .legal-content ul, .legal-content ol {
          margin: 0 0 14px;
          padding-left: 24px;
          color: var(--text-secondary);
        }
        .legal-content li {
          margin-bottom: 6px;
          line-height: 1.7;
        }
        .legal-content a {
          color: #1D4ED8;
          font-weight: 500;
        }
        .legal-content strong {
          color: var(--text-primary);
          font-weight: 700;
        }
        .legal-content em {
          color: var(--text-muted);
          font-style: italic;
          font-size: 13px;
        }
        .legal-content code {
          font-family: 'Courier New', monospace;
          background: var(--surface);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 13px;
          color: #7C3AED;
        }
        .legal-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 13px;
          overflow-x: auto;
          display: block;
        }
        .legal-content th {
          background: var(--surface);
          color: var(--text-primary);
          font-weight: 700;
          padding: 10px 14px;
          text-align: left;
          border: 1px solid var(--border);
        }
        .legal-content td {
          padding: 9px 14px;
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }
        .legal-content tr:nth-child(even) td {
          background: var(--surface);
        }
        @media (prefers-color-scheme: dark) {
          .legal-content a { color: #60A5FA; }
          .legal-content code { color: #A78BFA; }
        }
      `}</style>
    </div>
  );
}
export { LegalShow };
