/**
 * vite.config.js — Configuration Vite optimisée pour SECRETIS ERP
 *
 * Stratégie de code splitting :
 *  - vendor   : React, ReactDOM, Inertia.js (stable, fortement caché)
 *  - charts   : Recharts (lourd, chargé à la demande)
 *  - editor   : TipTap (éditeur de texte riche, lazy)
 *  - calendar : FullCalendar (très lourd, chargé uniquement sur la page agenda)
 *  - utils    : Librairies utilitaires partagées (date-fns, etc.)
 *  - pages    : Chaque page Inertia dans son propre chunk (code splitting par route)
 *
 * Optimisations actives :
 *  - Brotli + Gzip (vite-plugin-compression)
 *  - Tree shaking agressif (rollup)
 *  - Hash dans les noms de fichiers (cache busting automatique)
 *  - Analyse du bundle (rollup-plugin-visualizer, activé via ANALYZE=true)
 *  - Mangling des noms de variables en production
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { resolve } from 'path';

// Plugins conditionnels (à installer selon le besoin)
// npm install --save-dev vite-plugin-compression rollup-plugin-visualizer vite-plugin-pwa
let viteCompression, visualizer, VitePWA;
try {
  viteCompression = (await import('vite-plugin-compression')).default;
} catch {
  viteCompression = null;
  console.warn('[vite.config] vite-plugin-compression non installé — compression désactivée');
}
try {
  visualizer = (await import('rollup-plugin-visualizer')).visualizer;
} catch {
  visualizer = null;
}
try {
  VitePWA = (await import('vite-plugin-pwa')).VitePWA;
} catch {
  VitePWA = null;
}

export default defineConfig(({ mode }) => {
  const env      = loadEnv(mode, process.cwd(), '');
  const isAnalyze = env.ANALYZE === 'true';
  const isProd    = mode === 'production';

  return {
    // ── Plugins ─────────────────────────────────────────────────────────
    plugins: [
      // Plugin Laravel Inertia — gère les manifests et hot reload
      laravel({
        input: ['resources/js/app.jsx', 'resources/css/app.css'],
        refresh: true,
      }),

      // React avec Fast Refresh (dev) et optimisations prod
      react({
        // Babel options pour optimiser le JSX en production
        babel: isProd ? {
          plugins: [
            // Supprime les PropTypes en production (non nécessaires au runtime)
            'transform-react-remove-prop-types',
          ],
        } : {},
      }),

      // Compression Brotli (meilleur ratio que gzip, supporté par tous les CDN modernes)
      viteCompression && viteCompression({
        algorithm: 'brotliCompress',
        ext:       '.br',
        threshold: 1024,          // Ne compresser que si > 1 Ko
        filter:    /\.(js|css|html|svg|json)$/,
        deleteOriginFile: false,  // Garder le fichier original (fallback gzip)
      }),

      // Compression Gzip (fallback pour les clients sans Brotli)
      viteCompression && viteCompression({
        algorithm: 'gzip',
        ext:       '.gz',
        threshold: 1024,
        filter:    /\.(js|css|html|svg|json)$/,
        deleteOriginFile: false,
      }),

      // PWA — Service Worker avec cache offline
      VitePWA && VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'logo.png', 'logo-192.png', 'logo-512.png'],
        manifest: {
          name:             'IBIG SECRETIS',
          short_name:       'SECRETIS',
          description:      'Plateforme de gestion secrétariat & administration IBIG Soft',
          theme_color:      '#1A3A5C',
          background_color: '#F9FAFB',
          display:          'standalone',
          start_url:        '/',
          icons: [
            { src: '/logo-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          // Précacher les assets statiques
          globPatterns:  ['**/*.{js,css,html,ico,png,svg,woff2}'],
          // Ne pas mettre en cache les requêtes API
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler:    'CacheFirst',
              options:    { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
          ],
        },
      }),

      // Analyse du bundle : ANALYZE=true npm run build
      isAnalyze && visualizer?.({
        filename:  'dist/bundle-analysis.html',
        open:      true,
        gzipSize:  true,
        brotliSize: true,
        template:  'treemap',  // 'treemap' | 'sunburst' | 'network'
      }),
    ].filter(Boolean),

    // ── Résolution des modules ──────────────────────────────────────────
    resolve: {
      alias: {
        '@':          resolve(__dirname, 'resources/js'),
        '@components': resolve(__dirname, 'resources/js/Components'),
        '@pages':     resolve(__dirname, 'resources/js/Pages'),
        '@hooks':     resolve(__dirname, 'resources/js/hooks'),
        '@utils':     resolve(__dirname, 'resources/js/utils'),
        '@assets':    resolve(__dirname, 'resources/assets'),
      },
    },

    // ── Optimisation des dépendances ───────────────────────────────────
    optimizeDeps: {
      // Pré-bundle les dépendances communes en développement (accélère le HMR)
      include: [
        'react',
        'react-dom',
        '@inertiajs/react',
        '@tanstack/react-query',
        'axios',
        'date-fns',
      ],
      // Exclure les librairies chargées à la demande
      exclude: [
        '@fullcalendar/react',
        '@tiptap/react',
        'recharts',
      ],
    },

    // ── Configuration du build production ─────────────────────────────
    build: {
      // Répertoire de sortie (relatif à la racine du projet)
      outDir:    'public/build',
      assetsDir: 'assets',

      // Source maps en production (pour le monitoring Sentry/Datadog)
      // Mettre sur false si les erreurs ne doivent pas exposer le code source
      sourcemap: env.VITE_SOURCEMAP === 'true' ? true : false,

      // Seuil d'avertissement pour les chunks volumineux (en Ko)
      chunkSizeWarningLimit: 600,

      // Cible ES moderne — exclut IE11 (non supporté par SECRETIS)
      target: ['es2020', 'chrome90', 'firefox90', 'safari14'],

      // Minification par esbuild (plus rapide que terser, qualité équivalente)
      minify: isProd ? 'esbuild' : false,

      // Options esbuild pour la minification
      esbuildOptions: isProd ? {
        // Supprimer les console.log en production (garder console.error/warn)
        drop: ['debugger'],
        pure: ['console.log', 'console.debug', 'console.info'],
        // Compression maximale des identifiants
        minifyIdentifiers: true,
        minifySyntax:      true,
        minifyWhitespace:  true,
      } : {},

      rollupOptions: {
        output: {
          // ── Hash dans les noms de fichiers (cache busting) ─────────────
          // [hash] change uniquement si le contenu change → cache CDN efficace
          entryFileNames:  'assets/[name]-[hash].js',
          chunkFileNames:  'assets/chunks/[name]-[hash].js',
          assetFileNames:  'assets/[name]-[hash].[ext]',

          // ── Code splitting manuel par famille de librairies ────────────
          manualChunks(id) {
            // ── Vendor React (cœur, très stable) ─────────────────────────
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/scheduler/')) {
              return 'vendor-react';
            }

            // ── Inertia.js ────────────────────────────────────────────────
            if (id.includes('node_modules/@inertiajs/')) {
              return 'vendor-inertia';
            }

            // ── TanStack Query (data fetching) ────────────────────────────
            if (id.includes('node_modules/@tanstack/')) {
              return 'vendor-query';
            }

            // ── Charts — Recharts (lourd : ~450 Ko minifié) ───────────────
            // Chargé uniquement sur les pages Rapports et Dashboard
            if (id.includes('node_modules/recharts') ||
                id.includes('node_modules/d3-') ||
                id.includes('node_modules/victory')) {
              return 'chunk-charts';
            }

            // ── Éditeur riche TipTap (~300 Ko avec extensions) ────────────
            if (id.includes('node_modules/@tiptap/') ||
                id.includes('node_modules/prosemirror-')) {
              return 'chunk-editor';
            }

            // ── Calendrier FullCalendar (~400 Ko) ─────────────────────────
            if (id.includes('node_modules/@fullcalendar/')) {
              return 'chunk-calendar';
            }

            // ── Utilitaires dates ─────────────────────────────────────────
            if (id.includes('node_modules/date-fns') ||
                id.includes('node_modules/dayjs') ||
                id.includes('node_modules/moment')) {
              return 'vendor-dates';
            }

            // ── PDF et fichiers lourds ────────────────────────────────────
            if (id.includes('node_modules/pdfmake') ||
                id.includes('node_modules/jspdf') ||
                id.includes('node_modules/xlsx')) {
              return 'chunk-file-processing';
            }

            // ── Reste des node_modules → vendor-misc ──────────────────────
            if (id.includes('node_modules/')) {
              return 'vendor-misc';
            }

            // ── Pages Inertia : un chunk par module fonctionnel ───────────
            if (id.includes('/Pages/Dashboard/')) return 'page-dashboard';
            if (id.includes('/Pages/Agenda/') ||
                id.includes('/Pages/Reunions/')) return 'page-agenda';
            if (id.includes('/Pages/Taches/')) return 'page-tasks';
            if (id.includes('/Pages/Courrier/')) return 'page-mail';
            if (id.includes('/Pages/GED/')) return 'page-ged';
            if (id.includes('/Pages/RH/')) return 'page-rh';
            if (id.includes('/Pages/Rapports/')) return 'page-reports';
            if (id.includes('/Pages/SuperAdmin/')) return 'page-superadmin';
            if (id.includes('/Pages/Parametres/')) return 'page-settings';
            if (id.includes('/Pages/Ressources/')) return 'page-resources';

            // Par défaut : pas de chunk manuel (rollup décide)
            return undefined;
          },
        },

        // ── Tree shaking agressif ────────────────────────────────────────
        treeshake: {
          // Considérer tous les modules sans effets de bord sauf indication contraire
          moduleSideEffects: (id) => {
            // CSS et polyfills ont des effets de bord (importation globale)
            return id.endsWith('.css') || id.includes('polyfill');
          },
          // Éliminer les exports non utilisés même dans les barrels (index.js)
          preset: 'recommended',
        },
      },

      // Désactiver la copie des fichiers public/ dans outDir (Laravel les gère)
      copyPublicDir: false,
    },

    // ── CSS ──────────────────────────────────────────────────────────────
    css: {
      // PostCSS est configuré dans postcss.config.js (Tailwind + Autoprefixer)
      devSourcemap: true,
    },

    // ── Serveur de développement ─────────────────────────────────────────
    server: {
      host:   '0.0.0.0',
      port:   5173,
      // HMR (Hot Module Replacement) via WebSocket
      hmr: {
        host: 'localhost',
      },
    },

    // ── Variables d'environnement exposées au frontend ────────────────────
    // Seules les variables préfixées VITE_ sont exposées au navigateur
    define: {
      __DEV__:  JSON.stringify(! isProd),
      __PROD__: JSON.stringify(isProd),
    },
  };
});
