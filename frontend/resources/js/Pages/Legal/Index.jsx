/**
 * SECRETIS ERP — Legal/Index.jsx
 *
 * Page index de toutes les pages légales IBIG SECRETIS.
 * Route : /legal  (accessible sans connexion)
 *
 * Affiche :
 *   - En-tête avec la date d'entrée en vigueur
 *   - Grid des 18 pages légales avec catégorie, statut d'acceptation, date MAJ
 *   - Filtrage par catégorie
 *   - Indicateur "Lu" / "À accepter" / "Accepté" par l'utilisateur connecté
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from '../../hooks/useTranslation';

// ── Icônes ────────────────────────────────────────────────────────────────────
const Icons = {
  Shield:      ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Check:       ({ s = 14 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Clock:       ({ s = 14 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  ChevronRight:({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>,
  Building:    ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>,
  Document:    ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Eye:         ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Key:         ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  Server:      ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>,
  Tag:         ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  Cpu:         ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  User:        ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Chat:        ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  Warning:     ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Currency:    ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  Beaker:      ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M9 3v8L6.5 15M9 3H6.5M15 3v8l2.5 4M15 3h2.5M6.5 15l-.5 1.5A2 2 0 008 19h8a2 2 0 002-1.5L17.5 15M6.5 15h11"/></svg>,
  Lifebuoy:    ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/></svg>,
};

// Correspondance icône → composant
const ICON_MAP = {
  'building-office-2': Icons.Building,
  'document-check':    Icons.Document,
  'currency-dollar':   Icons.Currency,
  'key':               Icons.Key,
  'eye-slash':         Icons.Eye,
  'cursor-arrow-ripple':Icons.Document,
  'server':            Icons.Server,
  'lifebuoy':          Icons.Lifebuoy,
  'x-circle':          Icons.Document,
  'arrow-uturn-left':  Icons.Document,
  'shield-check':      Icons.Shield,
  'light-bulb':        Icons.Document,
  'tag':               Icons.Tag,
  'beaker':            Icons.Beaker,
  'cpu-chip':          Icons.Cpu,
  'exclamation-triangle': Icons.Warning,
  'user-circle':       Icons.User,
  'chat-bubble-left-right': Icons.Chat,
};

// ── Catégories et libellés ────────────────────────────────────────────────────
const CATEGORIES = {
  all:        { label: 'Toutes',          color: '#6B7280' },
  general:    { label: 'Général',         color: '#2563EB' },
  usage:      { label: 'Utilisation',     color: '#7C3AED' },
  commercial: { label: 'Commercial',      color: '#065F46' },
  privacy:    { label: 'Confidentialité', color: '#B45309' },
  support:    { label: 'Support',         color: '#BE185D' },
};

// ── Statut d'acceptation ──────────────────────────────────────────────────────
function AcceptanceBadge({ status }) {
  const configs = {
    accepted:   { bg: '#D1FAE5', color: '#065F46', label: 'Accepté',    icon: <Icons.Check s={11} /> },
    required:   { bg: '#FEF3C7', color: '#92400E', label: 'À accepter', icon: <Icons.Clock s={11} /> },
    read:       { bg: '#EFF6FF', color: '#1D4ED8', label: 'Lu',         icon: null },
    not_required: { bg: '#F3F4F6', color: '#6B7280', label: 'Optionnel', icon: null },
  };
  const cfg = configs[status] || configs.not_required;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: cfg.bg, color: cfg.color,
      fontSize: '11px', fontWeight: 600,
      padding: '2px 8px', borderRadius: '12px',
    }}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Carte de page légale ──────────────────────────────────────────────────────
function LegalCard({ page, acceptanceStatus, onClick }) {
  const IconComp = ICON_MAP[page.icon] || Icons.Document;
  const catCfg = CATEGORIES[page.category] || CATEGORIES.general;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '18px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'box-shadow 0.15s, border-color 0.15s, transform 0.1s',
        width: '100%',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      aria-label={`Consulter : ${page.title?.fr}`}
    >
      {/* Icône + catégorie */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{
          width: '40px', height: '40px', flexShrink: 0,
          background: `${catCfg.color}18`,
          color: catCfg.color,
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp s={20} />
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 600, color: catCfg.color,
          background: `${catCfg.color}15`,
          padding: '2px 7px', borderRadius: '10px',
          whiteSpace: 'nowrap',
        }}>
          {catCfg.label}
        </span>
      </div>

      {/* Titre */}
      <div>
        <p style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.4,
        }}>
          {page.title?.fr}
        </p>
      </div>

      {/* Pied : statut + version + date + flèche */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '8px',
        marginTop: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AcceptanceBadge status={acceptanceStatus} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            v{page.version}
          </span>
        </div>
        <span style={{ color: 'var(--accent)', opacity: 0.7 }}>
          <Icons.ChevronRight s={15} />
        </span>
      </div>

      {/* Date MAJ */}
      {page.updated_at && (
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
          Mis à jour le{' '}
          {new Date(page.updated_at).toLocaleDateString('fr-FR', {
            day: '2-digit', month: 'long', year: 'numeric',
          })}
        </p>
      )}
    </button>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function LegalIndex() {
  const navigate = useNavigate();

  const [pages, setPages]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [category, setCategory] = useState('all');
  const [acceptances, setAcceptances] = useState({});

  useEffect(() => {
    Promise.all([
      axios.get('/api/v1/legal'),
      axios.get('/api/v1/legal/my-acceptances').catch(() => ({ data: {} })),
    ])
      .then(([pagesRes, accRes]) => {
        setPages(pagesRes.data?.data ?? []);
        setAcceptances(accRes.data ?? {});
      })
      .catch(() => setError('Impossible de charger les pages légales.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    category === 'all'
      ? pages
      : pages.filter(p => p.category === category),
    [pages, category]
  );

  const getAcceptanceStatus = (page) => {
    if (!page.requires_acceptance) return 'not_required';
    const acc = acceptances[page.slug];
    if (acc?.accepted) return 'accepted';
    return 'required';
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
      <p style={{ color: 'var(--text-muted)' }}>Chargement des pages légales…</p>
    </div>
  );

  if (error) return (
    <div style={{ padding: '24px', color: '#DC2626', textAlign: 'center' }}>
      <p>{error}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>

      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Fil d'Ariane" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px',
        }}>
          <Link to="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Accueil</Link>
          <Icons.ChevronRight s={12} />
          <span>Pages légales</span>
        </nav>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', flexShrink: 0,
            background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <Icons.Shield s={26} />
          </div>
          <div>
            <h1 style={{
              margin: '0 0 6px',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              Informations légales
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
              Documents contractuels et réglementaires d'IBIG SECRETIS ERP.
              Droit applicable : droit ivoirien, OHADA et RGPD.
              En vigueur depuis le <strong>1er janvier 2026</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filtres catégories ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px',
      }}>
        {Object.entries(CATEGORIES).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: category === key
                ? `2px solid ${cfg.color}`
                : '2px solid var(--border)',
              background: category === key ? `${cfg.color}15` : 'var(--card-bg)',
              color: category === key ? cfg.color : 'var(--text-muted)',
              fontWeight: category === key ? 700 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {cfg.label}
            {key !== 'all' && (
              <span style={{ marginLeft: '5px', opacity: 0.6 }}>
                ({pages.filter(p => p.category === key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Compteur ─────────────────────────────────────────────────────────── */}
      <p style={{
        fontSize: '13px', color: 'var(--text-muted)',
        marginBottom: '16px',
      }}>
        {filtered.length} document{filtered.length !== 1 ? 's' : ''}
        {pages.filter(p => p.requires_acceptance && !acceptances[p.slug]?.accepted).length > 0 && (
          <span style={{
            marginLeft: '10px',
            color: '#92400E',
            background: '#FEF3C7',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {pages.filter(p => p.requires_acceptance && !acceptances[p.slug]?.accepted).length} à accepter
          </span>
        )}
      </p>

      {/* ── Grille des pages légales ──────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '14px',
      }}>
        {filtered.map(page => (
          <LegalCard
            key={page.slug}
            page={page}
            acceptanceStatus={getAcceptanceStatus(page)}
            onClick={() => navigate(`/legal/${page.slug}`)}
          />
        ))}
      </div>

      {/* ── Pied de page ──────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '13px',
        color: 'var(--text-muted)',
      }}>
        <p style={{ margin: 0 }}>
          IBIG SARL (Intermark Business International Group) — Abidjan, Côte d'Ivoire
        </p>
        <p style={{ margin: 0 }}>
          Questions juridiques :{' '}
          <a href="mailto:legal@ibigsoft.com" style={{ color: 'var(--accent)' }}>
            legal@ibigsoft.com
          </a>
        </p>
      </div>
    </div>
  );
}
export { LegalIndex };
