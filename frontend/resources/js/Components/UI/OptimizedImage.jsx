/**
 * IBIG SECRETIS — OptimizedImage.jsx
 * Combine LazyImage + WebP + BlurHash placeholder
 *
 * Fonctionnalités :
 *   - Fade-in à l'apparition (IntersectionObserver)
 *   - Rapport d'aspect réservé (CLS = 0)
 *   - WebP avec fallback JPEG via <picture>
 *   - Placeholder coloré pendant le chargement
 *   - Gestion d'erreur avec retry 1 fois
 *   - prefers-reduced-motion respecté
 *
 * @example
 *   <OptimizedImage
 *     src="/uploads/photo.jpg"
 *     alt="Photo de profil"
 *     width={400}
 *     height={300}
 *     aspectRatio="4:3"
 *     placeholder="#A8C0D6"
 *   />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  getOptimizedImageUrl,
  generateSrcSet,
  generatePlaceholder,
  ASPECT_RATIOS,
  SHIMMER_PLACEHOLDER,
  BREAKPOINTS,
} from '@/utils/imageOptimization';
import { isReducedMotion } from '@/utils/accessibility';

// ─── Composant principal ──────────────────────────────────────────────────────
export default function OptimizedImage({
  // Source
  src,
  alt = '',

  // Dimensions
  width,
  height,
  aspectRatio,  // '1:1' | '4:3' | '16:9' | '3:2' | '21:9' | custom

  // Optimisation
  sizes     = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  quality,
  widths    = BREAKPOINTS,
  priority  = false,  // true = pas de lazy loading (above-the-fold)

  // Placeholder
  placeholder = '#E5E7EB',  // couleur hex ou 'blur' ou 'shimmer'
  placeholderSrc,           // URL d'une vraie LQIP

  // Style
  className = '',
  imgClassName = '',
  objectFit = 'cover',
  rounded   = false,

  // Événements
  onLoad,
  onError,

  // Accessibilité
  role,
  'aria-hidden': ariaHidden,

  ...rest
}) {
  const [loaded, setLoaded]       = useState(false);
  const [error, setError]         = useState(false);
  const [retried, setRetried]     = useState(false);
  const [inView, setInView]       = useState(priority);
  const imgRef                    = useRef(null);
  const containerRef              = useRef(null);
  const reducedMotion             = isReducedMotion();

  // ── Calcul du ratio d'aspect ────────────────────────────────────────────────
  let paddingBottom = null;
  if (aspectRatio && ASPECT_RATIOS[aspectRatio]) {
    paddingBottom = ASPECT_RATIOS[aspectRatio].padding;
  } else if (aspectRatio) {
    // Format custom "W:H"
    const [w, h] = aspectRatio.split(':').map(Number);
    if (w && h) paddingBottom = `${(h / w) * 100}%`;
  } else if (width && height) {
    paddingBottom = `${(height / width) * 100}%`;
  }

  // ── IntersectionObserver pour lazy loading ──────────────────────────────────
  useEffect(() => {
    if (priority || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // pré-charger 200px avant d'être visible
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [priority]);

  // ── Gestion du chargement ───────────────────────────────────────────────────
  const handleLoad = useCallback(() => {
    setLoaded(true);
    setError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    if (!retried) {
      // Retry 1 fois après 1s
      setRetried(true);
      setTimeout(() => {
        if (imgRef.current) {
          imgRef.current.src = src; // retenter l'URL originale
        }
      }, 1000);
    } else {
      setError(true);
      onError?.();
    }
  }, [retried, src, onError]);

  // ── URLs optimisées ─────────────────────────────────────────────────────────
  const webpSrcSet  = generateSrcSet(src, widths, 'webp', quality);
  const jpegSrcSet  = generateSrcSet(src, widths, 'jpeg', quality);
  const fallbackSrc = getOptimizedImageUrl(src, widths[widths.length - 1], null, 'jpeg', quality);

  // ── Placeholder ─────────────────────────────────────────────────────────────
  const placeholderUrl = placeholderSrc
    || (placeholder === 'shimmer' ? SHIMMER_PLACEHOLDER
       : placeholder === 'blur'  ? SHIMMER_PLACEHOLDER
       : generatePlaceholder(placeholder));

  // ── Styles ──────────────────────────────────────────────────────────────────
  const containerStyle = paddingBottom
    ? { position: 'relative', paddingBottom, width: '100%', overflow: 'hidden' }
    : { position: 'relative', overflow: 'hidden' };

  if (width && !paddingBottom)  containerStyle.width  = typeof width  === 'number' ? `${width}px`  : width;
  if (height && !paddingBottom) containerStyle.height = typeof height === 'number' ? `${height}px` : height;

  const imgStyle = {
    objectFit,
    transition: reducedMotion ? 'none' : 'opacity 0.4s ease-in-out',
    opacity: loaded ? 1 : 0,
    ...(paddingBottom
      ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
      : { width: '100%', height: '100%', display: 'block' }),
  };

  const placeholderStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit,
    filter: 'blur(8px)',
    transform: 'scale(1.05)', // éviter les bords du blur
    transition: reducedMotion ? 'none' : 'opacity 0.3s ease-in-out',
    opacity: loaded ? 0 : 1,
  };

  return (
    <div
      ref={containerRef}
      className={`${rounded ? 'overflow-hidden rounded-lg' : ''} ${className}`}
      style={containerStyle}
      aria-hidden={ariaHidden}
      role={role}
    >
      {/* Placeholder (affiché tant que l'image principale n'est pas chargée) */}
      {!loaded && !error && (
        <img
          src={placeholderUrl}
          alt=""
          aria-hidden="true"
          style={placeholderStyle}
        />
      )}

      {/* Image de remplacement en cas d'erreur */}
      {error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center
            bg-gray-100 dark:bg-[#243447] text-gray-400 dark:text-[#6B8BA4]"
          role="img"
          aria-label={alt || 'Image non disponible'}
        >
          <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs">Image indisponible</span>
        </div>
      )}

      {/* Image principale */}
      {inView && !error && (
        <picture>
          {/* Source WebP */}
          <source
            type="image/webp"
            srcSet={webpSrcSet}
            sizes={sizes}
          />
          {/* Source JPEG (fallback) */}
          <source
            type="image/jpeg"
            srcSet={jpegSrcSet}
            sizes={sizes}
          />
          {/* img de base */}
          <img
            ref={imgRef}
            src={fallbackSrc}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            style={imgStyle}
            className={imgClassName}
            {...rest}
          />
        </picture>
      )}
    </div>
  );
}

// ─── Variante Avatar ──────────────────────────────────────────────────────────
export function AvatarImage({ src, name, size = 40, className = '' }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (!src) {
    return (
      <div
        className={`rounded-full flex items-center justify-center bg-purple-600 dark:bg-[#1565c0]
          text-white font-semibold flex-shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-label={name}
        role="img"
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={name || 'Avatar'}
      width={size}
      height={size}
      aspectRatio="1:1"
      className={`rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      objectFit="cover"
      widths={[size, size * 2]} // 1x + 2x pour retina
    />
  );
}
export { OptimizedImage };
