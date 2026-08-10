/**
 * LazyImage.jsx — Image avec lazy loading optimisé pour SECRETIS ERP
 *
 * Stratégie de chargement :
 *  1. Si le navigateur supporte loading="lazy" natif → l'utilise en priorité
 *  2. Fallback IntersectionObserver pour les anciens navigateurs
 *  3. Placeholder skeleton pendant le chargement
 *  4. Image de fallback si erreur de chargement
 *  5. Support srcSet pour les images responsives (WebP, tailles multiples)
 *
 * Usage :
 *   <LazyImage
 *     src="/avatars/user-42.webp"
 *     srcSet="/avatars/user-42-2x.webp 2x"
 *     alt="Jean Dupont"
 *     width={40}
 *     height={40}
 *     className="rounded-full"
 *   />
 */

import React, { useState, useRef } from 'react';
import { useIntersectionObserver } from '../../utils/performance';

// Image de fallback par défaut (SVG inline, zéro requête réseau)
const DEFAULT_FALLBACK_SVG = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect width="40" height="40" fill="#e5e7eb" rx="4"/>
  <path d="M20 20c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6zm0 3c-4 0-12 2-12 6v2h24v-2c0-4-8-6-12-6z" fill="#9ca3af"/>
</svg>
`)}`;

const AVATAR_FALLBACK_SVG = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <circle cx="20" cy="20" r="20" fill="#dbeafe"/>
  <path d="M20 20c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2.5c-3.33 0-10 1.67-10 5V29h20v-1.5c0-3.33-6.67-5-10-5z" fill="#3b82f6"/>
</svg>
`)}`;

// Détection du support natif loading="lazy"
const supportsNativeLazy = 'loading' in HTMLImageElement.prototype;

/**
 * @param {Object}  props
 * @param {string}  props.src            — URL de l'image principale
 * @param {string}  [props.srcSet]       — srcset pour les images responsives
 * @param {string}  [props.sizes]        — Attribut sizes pour le responsive
 * @param {string}  props.alt            — Texte alternatif (obligatoire pour l'accessibilité)
 * @param {number|string} [props.width]  — Largeur (évite le layout shift)
 * @param {number|string} [props.height] — Hauteur (évite le layout shift)
 * @param {string}  [props.className]    — Classes CSS additionnelles
 * @param {string}  [props.fallbackSrc]  — Image affichée si src échoue
 * @param {string}  [props.variant]      — 'image' | 'avatar' (change le fallback par défaut)
 * @param {string}  [props.objectFit]    — Valeur CSS object-fit (défaut: 'cover')
 * @param {Function} [props.onLoad]      — Callback quand l'image est chargée
 * @param {Function} [props.onError]     — Callback en cas d'erreur
 */
export default function LazyImage({
  src,
  srcSet,
  sizes,
  alt,
  width,
  height,
  className = '',
  fallbackSrc,
  variant = 'image',
  objectFit = 'cover',
  onLoad,
  onError,
  ...rest
}) {
  const ref = useRef(null);

  // IntersectionObserver fallback (uniquement si pas de lazy natif)
  const isInViewport = useIntersectionObserver(ref, {
    rootMargin: '200px', // Commencer à charger 200px avant l'entrée dans le viewport
    once: true,
    threshold: 0,
  });

  // État local
  const [loaded,  setLoaded]  = useState(false);
  const [errored, setErrored] = useState(false);

  // Détermine si on doit charger l'image
  const shouldLoad = supportsNativeLazy || isInViewport;

  // URL effective (fallback si erreur)
  const defaultFallback = variant === 'avatar' ? AVATAR_FALLBACK_SVG : DEFAULT_FALLBACK_SVG;
  const effectiveSrc    = errored ? (fallbackSrc ?? defaultFallback) : src;

  const handleLoad = (e) => {
    setLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    if (! errored) {
      setErrored(true);
      onError?.(e);
    }
  };

  return (
    <div
      ref={ref}
      className={`relative inline-block overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Skeleton placeholder (visible avant chargement) */}
      {! loaded && (
        <div
          className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700"
          style={{
            borderRadius: 'inherit',
          }}
          aria-hidden="true"
        />
      )}

      {/* Image — chargée seulement quand shouldLoad=true */}
      {shouldLoad && (
        <img
          src={effectiveSrc}
          srcSet={! errored ? srcSet : undefined}
          sizes={! errored ? sizes : undefined}
          alt={alt}
          width={width}
          height={height}
          // loading="lazy" natif si supporté
          loading={supportsNativeLazy ? 'lazy' : undefined}
          // decoding="async" : décode en arrière-plan sans bloquer le thread principal
          decoding="async"
          // fetchPriority="low" : signal au navigateur que ce n'est pas critique
          fetchpriority="low"
          className={[
            'transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
            'object-' + objectFit,
            'w-full h-full',
          ].join(' ')}
          onLoad={handleLoad}
          onError={handleError}
          {...rest}
        />
      )}
    </div>
  );
}

// =============================================================================
// Composant spécialisé : Avatar utilisateur
// =============================================================================

/**
 * Avatar avec initiales en fallback si l'image échoue ou n'est pas fournie.
 *
 * @param {Object}  props
 * @param {string}  [props.src]     — URL de l'avatar
 * @param {string}  props.name      — Nom de l'utilisateur (pour les initiales)
 * @param {number}  [props.size]    — Taille en pixels (défaut: 32)
 * @param {string}  [props.className]
 */
export function UserAvatar({ src, name = '?', size = 32, className = '' }) {
  const [errored, setErrored] = useState(false);

  // Initiales : 1 ou 2 caractères depuis le nom
  const initials = name
    .split(' ')
    .map(w => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  // Couleur de fond déterministe basée sur le nom (stable entre rendus)
  const bgColor = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

  if (! src || errored) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full font-medium text-white flex-shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: bgColor }}
        role="img"
        aria-label={name}
        title={name}
      >
        {initials || '?'}
      </div>
    );
  }

  return (
    <LazyImage
      src={src}
      alt={name}
      width={size}
      height={size}
      variant="avatar"
      objectFit="cover"
      className={`rounded-full flex-shrink-0 ${className}`}
      onError={() => setErrored(true)}
    />
  );
}

// Palette de couleurs pour les avatars générés (accessible, contrastées)
const AVATAR_COLORS = [
  '#3B82F6', // bleu
  '#8B5CF6', // violet
  '#10B981', // vert
  '#F59E0B', // ambre
  '#EF4444', // rouge
  '#6366F1', // indigo
  '#EC4899', // rose
  '#14B8A6', // teal
  '#F97316', // orange
  '#84CC16', // lime
];
export { LazyImage };
