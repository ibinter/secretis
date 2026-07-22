/**
 * IBIG SECRETIS — imageOptimization.js
 * Utilitaires d'optimisation d'images
 *
 * - Génération d'URLs optimisées (WebP avec fallback JPEG)
 * - Placeholder blur-hash (base64 minuscule pendant le chargement)
 * - srcset responsive automatique : 320w, 640w, 1024w, 1920w
 */

// ─── Configuration ────────────────────────────────────────────────────────────
const BREAKPOINTS = [320, 640, 1024, 1920];

const DEFAULT_QUALITY = {
  webp: 82,
  jpeg: 85,
  png:  90,
};

/**
 * Détecte le support WebP du navigateur (via canvas).
 * Résultat mis en cache.
 */
let _webpSupported = null;

export async function isWebpSupported() {
  if (_webpSupported !== null) return _webpSupported;

  if (typeof window === 'undefined') {
    _webpSupported = false;
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    _webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    _webpSupported = false;
  }

  return _webpSupported;
}

// Version synchrone (post-détection)
export function isWebpSupportedSync() {
  return _webpSupported === true;
}

// ─── Génération d'URL optimisée ───────────────────────────────────────────────
/**
 * Génère une URL d'image optimisée.
 * Supporte plusieurs backends : Imgproxy, Cloudinary, ou URL native.
 *
 * @param {string} url     — URL source de l'image
 * @param {number} width   — largeur cible en px
 * @param {number} height  — hauteur cible (optionnelle)
 * @param {string} format  — 'webp' | 'jpeg' | 'png' | 'auto'
 * @param {number} quality — qualité 1-100
 * @returns {string}
 */
export function getOptimizedImageUrl(url, width, height, format = 'auto', quality) {

  if (!url) return url;

  // URLs absolues externes ou data: — retourner telles quelles
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const resolvedFormat = format === 'auto'
    ? (isWebpSupportedSync() ? 'webp' : 'jpeg')
    : format;

  const q = quality ?? DEFAULT_QUALITY[resolvedFormat] ?? 85;

  // ── Cloudinary ────────────────────────────────────────────────────────────
  if (url.includes('cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      const transforms = [
        `w_${width}`,
        height ? `h_${height}` : null,
        'c_fill',
        `q_${q}`,
        `f_${resolvedFormat}`,
      ].filter(Boolean).join(',');
      return `${parts[0]}/upload/${transforms}/${parts[1]}`;
    }
  }

  // ── Imgproxy ──────────────────────────────────────────────────────────────
  const imgproxyBase = window.__SECRETIS_IMGPROXY__ || null;
  if (imgproxyBase) {
    const encoded  = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const resize   = `resize:fit:${width}:${height || 0}:0`;
    const qualityT = `q:${q}`;
    const formatT  = `ext:${resolvedFormat}`;
    return `${imgproxyBase}/insecure/${resize}/${qualityT}/${formatT}/plain/${encoded}`;
  }

  // ── URL native avec paramètres query (Laravel backend) ───────────────────
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.searchParams.set('w', width);
    if (height) parsed.searchParams.set('h', height);
    parsed.searchParams.set('q', q);
    parsed.searchParams.set('fmt', resolvedFormat);
    return parsed.toString();
  } catch {
    // URL relative sans origin — retourner avec query string directe
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}w=${width}&q=${q}&fmt=${resolvedFormat}`;
  }
}

// ─── srcset responsive ────────────────────────────────────────────────────────
/**
 * Génère un attribut srcset avec plusieurs résolutions.
 *
 * @param {string} url       — URL source
 * @param {number[]} widths  — largeurs (défaut: BREAKPOINTS)
 * @param {string} format    — 'webp' | 'jpeg' | 'auto'
 * @param {number} quality
 * @returns {string}         — valeur du srcset
 */
export function generateSrcSet(url, widths = BREAKPOINTS, format = 'auto', quality) {
  return widths
    .map(w => `${getOptimizedImageUrl(url, w, null, format, quality)} ${w}w`)
    .join(', ');
}

/**
 * Génère les attributs srcset + sizes pour une image responsive.
 *
 * @param {string} url
 * @param {Object} options
 * @param {number[]} options.widths     — points de rupture
 * @param {string}  options.sizes       — attribut sizes (ex: "(max-width: 768px) 100vw, 50vw")
 * @param {boolean} options.webpFallback — générer srcset WebP + JPEG
 * @returns {{ srcSet: string, sizes: string, srcSetWebp?: string }}
 */
export function getResponsiveImageProps(url, options = {}) {
  const {
    widths       = BREAKPOINTS,
    sizes        = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    webpFallback = true,
  } = options;

  const srcSet = generateSrcSet(url, widths, webpFallback ? 'webp' : 'auto');
  const srcSetFallback = webpFallback ? generateSrcSet(url, widths, 'jpeg') : undefined;

  return {
    srcSet,
    sizes,
    srcSetFallback,
    src: getOptimizedImageUrl(url, widths[widths.length - 1]),
  };
}

// ─── BlurHash placeholder ─────────────────────────────────────────────────────
/**
 * Génère une image de placeholder floue en base64 (1x1 px coloré).
 * En production, utilisez un vrai BlurHash ou LQIP (Low Quality Image Placeholder).
 *
 * @param {string} dominantColor — couleur hexadécimale dominante (ex: "#A8C0D6")
 * @param {number} width         — largeur du placeholder
 * @param {number} height        — hauteur du placeholder
 * @returns {string}             — data:image/svg+xml;base64,...
 */
export function generatePlaceholder(dominantColor = '#E5E7EB', width = 4, height = 3) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${dominantColor}" />
    <filter id="blur">
      <feGaussianBlur stdDeviation="0.5" />
    </filter>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Placeholder générique animé (shimmer CSS).
 * Utilisé avant que le vrai placeholder soit disponible.
 */
export const SHIMMER_PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="30">
    <rect width="100%" height="100%" fill="#E5E7EB" />
  </svg>
`);

// ─── Calcul du ratio d'aspect ─────────────────────────────────────────────────
/**
 * Retourne un ratio en pourcentage pour le padding-bottom trick.
 * Utilisé pour réserver l'espace et éviter le CLS.
 *
 * @param {number} width
 * @param {number} height
 * @returns {string} — ex: "56.25%"
 */
export function getAspectRatioPadding(width, height) {
  if (!width || !height) return '56.25%'; // 16:9 par défaut
  return `${(height / width) * 100}%`;
}

/**
 * Ratios prédéfinis courants.
 */
export const ASPECT_RATIOS = {
  '1:1':  { width: 1,   height: 1,   padding: '100%' },
  '4:3':  { width: 4,   height: 3,   padding: '75%' },
  '16:9': { width: 16,  height: 9,   padding: '56.25%' },
  '3:2':  { width: 3,   height: 2,   padding: '66.67%' },
  '21:9': { width: 21,  height: 9,   padding: '42.86%' },
  'auto': null, // pas de réservation
};

// ─── Initialisation WebP ──────────────────────────────────────────────────────
// Détecter le support WebP au démarrage
if (typeof window !== 'undefined') {
  isWebpSupported(); // fire-and-forget
}

export default {
  getOptimizedImageUrl,
  generateSrcSet,
  getResponsiveImageProps,
  generatePlaceholder,
  isWebpSupported,
  isWebpSupportedSync,
  getAspectRatioPadding,
  ASPECT_RATIOS,
  BREAKPOINTS,
  SHIMMER_PLACEHOLDER,
};
