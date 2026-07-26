import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration des types d'annonces
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  info: {
    banner : 'bg-purple-50  border-purple-200  text-purple-900',
    modal  : 'bg-purple-600',
    badge  : 'bg-purple-100  text-purple-800',
    icon   : InfoIcon,
    label  : 'Information',
  },
  warning: {
    banner : 'bg-amber-50  border-amber-200  text-amber-900',
    modal  : 'bg-amber-500',
    badge  : 'bg-amber-100  text-amber-800',
    icon   : WarningIcon,
    label  : 'Avertissement',
  },
  success: {
    banner : 'bg-green-50  border-green-200  text-green-900',
    modal  : 'bg-green-600',
    badge  : 'bg-green-100  text-green-800',
    icon   : SuccessIcon,
    label  : 'Succès',
  },
  maintenance: {
    banner : 'bg-red-50    border-red-200    text-red-900',
    modal  : 'bg-red-600',
    badge  : 'bg-red-100    text-red-800',
    icon   : MaintenanceIcon,
    label  : 'Maintenance',
  },
  feature: {
    banner : 'bg-purple-50  border-purple-200  text-purple-900',
    modal  : 'bg-purple-600',
    badge  : 'bg-purple-100  text-purple-800',
    icon   : FeatureIcon,
    label  : 'Nouveauté',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Icônes inline (SVG — sans dépendance externe)
// ─────────────────────────────────────────────────────────────────────────────

function InfoIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
    </svg>
  );
}

function WarningIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" />
    </svg>
  );
}

function SuccessIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" />
    </svg>
  );
}

function MaintenanceIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M14.5 2.343a1 1 0 011.414 0l1.743 1.743a1 1 0 010 1.414L16.5 6.657l-3.157-3.157 1.157-1.157zM11.93 4.914L3.5 13.344V16.5h3.156l8.43-8.43-3.156-3.156z" />
    </svg>
  );
}

function FeatureIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function CloseIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bandeau individuel
// ─────────────────────────────────────────────────────────────────────────────

function BannerItem({ announcement, onDismiss }) {
  const config = TYPE_CONFIG[announcement.type] ?? TYPE_CONFIG.info;
  const Icon   = config.icon;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-center gap-3 border-b px-4 py-2.5 text-sm ${config.banner}`}
      style={announcement.color ? { backgroundColor: announcement.color + '20', borderColor: announcement.color + '60', color: announcement.color } : {}}
    >
      {/* Icône */}
      <span className="shrink-0">
        <Icon className="w-4 h-4" />
      </span>

      {/* Texte */}
      <p className="flex-1 font-medium leading-snug">
        {announcement.title}
        {announcement.message && (
          <span className="ml-2 font-normal opacity-80">— {announcement.message}</span>
        )}
      </p>

      {/* CTA optionnel */}
      {announcement.cta_url && announcement.cta_label && (
        <a
          href={announcement.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md bg-white/40 px-3 py-0.5 text-xs font-semibold hover:bg-white/60 transition-colors"
        >
          {announcement.cta_label}
        </a>
      )}

      {/* Bouton fermeture */}
      {announcement.is_dismissible && (
        <button
          type="button"
          aria-label="Fermer cette annonce"
          onClick={() => onDismiss(announcement.id)}
          className="shrink-0 rounded p-0.5 hover:bg-black/10 transition-colors"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal d'annonce
// ─────────────────────────────────────────────────────────────────────────────

function AnnouncementModal({ announcement, onDismiss, onClose }) {
  const config = TYPE_CONFIG[announcement.type] ?? TYPE_CONFIG.info;
  const Icon   = config.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`announcement-modal-title-${announcement.id}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* En-tête coloré */}
        <div className={`flex items-center gap-3 px-6 py-4 text-white ${config.modal}`}
          style={announcement.color ? { backgroundColor: announcement.color } : {}}>
          <Icon className="w-6 h-6 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {config.label}
          </span>
        </div>

        {/* Corps */}
        <div className="px-6 py-5">
          <h2 id={`announcement-modal-title-${announcement.id}`}
            className="text-lg font-bold text-gray-900 mb-3">
            {announcement.title}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            {announcement.message}
          </p>
        </div>

        {/* Pied de page */}
        <div className="flex justify-end gap-3 px-6 pb-5">
          {announcement.cta_url && announcement.cta_label && (
            <a
              href={announcement.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
            >
              {announcement.cta_label}
            </a>
          )}
          {announcement.is_dismissible ? (
            <button
              type="button"
              onClick={() => onDismiss(announcement.id)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Ne plus afficher
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal — AnnouncementBanner
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * AnnouncementBanner — Affiche les annonces actives depuis le SuperAdmin.
 *
 * - Les annonces de type 'banner' s'affichent en bandeau sous la navbar.
 * - Les annonces de type 'modal' s'affichent en modal au premier chargement.
 * - Les annonces de type 'both' apparaissent dans les deux modes.
 * - Les annonces fermées (dismissed) ne réapparaissent plus (stocké en BDD).
 * - Polling toutes les 5 minutes pour détecter de nouvelles annonces.
 *
 * Intégration : Placer ce composant juste en dessous de la <Navbar />.
 *
 * @example
 *   <Navbar />
 *   <AnnouncementBanner />
 *   <main>…</main>
 */
export default function AnnouncementBanner() {
  const [bannerAnnouncements, setBannerAnnouncements] = useState([]);
  const [modalAnnouncement, setModalAnnouncement]     = useState(null);
  const [loading, setLoading]                         = useState(true);
  const seenModalIds                                  = useRef(new Set());
  const intervalRef                                   = useRef(null);

  // ── Chargement des annonces ────────────────────────────────────────────────

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/v1/announcements/active');
      const list = data.data ?? [];

      // Bandeaux
      const banners = list.filter(a => a.display === 'banner' || a.display === 'both');
      setBannerAnnouncements(banners);

      // Modal — afficher la première annonce modale non encore vue cette session
      const modals = list.filter(a => (a.display === 'modal' || a.display === 'both')
                                   && !seenModalIds.current.has(a.id));
      if (modals.length > 0 && !modalAnnouncement) {
        const next = modals[0];
        seenModalIds.current.add(next.id);
        setModalAnnouncement(next);
      }
    } catch (err) {
      // Silencieux : ne jamais bloquer l'application pour des annonces
      if (err.response?.status !== 401) {
        console.warn('[AnnouncementBanner] Impossible de charger les annonces :', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [modalAnnouncement]);

  // Chargement initial + polling
  useEffect(() => {
    fetchAnnouncements();

    intervalRef.current = setInterval(fetchAnnouncements, POLL_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fermeture d'une annonce ────────────────────────────────────────────────

  const handleDismiss = useCallback(async (id) => {
    // Masquer immédiatement (optimistic UI)
    setBannerAnnouncements(prev => prev.filter(a => a.id !== id));
    if (modalAnnouncement?.id === id) {
      setModalAnnouncement(null);
    }

    // Persister en BDD
    try {
      await axios.post(`/api/v1/announcements/${id}/dismiss`);
    } catch (err) {
      console.warn('[AnnouncementBanner] Dismiss échoué :', err.message);
    }
  }, [modalAnnouncement]);

  const handleCloseModal = useCallback(() => {
    setModalAnnouncement(null);
  }, []);

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading || (bannerAnnouncements.length === 0 && !modalAnnouncement)) {
    return null;
  }

  return (
    <>
      {/* Bandeaux — empilés sous la navbar */}
      {bannerAnnouncements.length > 0 && (
        <div role="region" aria-label="Annonces de la plateforme">
          {bannerAnnouncements.map(announcement => (
            <BannerItem
              key={announcement.id}
              announcement={announcement}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      {/* Modal — premier plan */}
      {modalAnnouncement && (
        <AnnouncementModal
          announcement={modalAnnouncement}
          onDismiss={handleDismiss}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
export { AnnouncementBanner };
