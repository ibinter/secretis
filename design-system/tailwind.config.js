/** @type {import('tailwindcss').Config} */
const colors = require('/var/www/secretis/frontend/node_modules/tailwindcss/colors');

module.exports = {
  // ── Dark mode via classe CSS sur <html> ─────────────────────────────────────
  // Appliqué par useTheme.js : document.documentElement.classList.toggle('dark')
  darkMode: 'class',

  content: [
    './resources/**/*.{js,jsx,ts,tsx,vue,blade.php}',
    './resources/js/**/*.{js,jsx,ts,tsx}',
    './resources/views/**/*.blade.php',
    './app/**/*.php',
  ],

  safelist: [
    // Couleurs primaires dynamiques
    { pattern: /bg-primary-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-primary-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /border-primary-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /ring-primary-(50|100|200|300|400|500|600|700|800|900)/ },
    // Couleurs secondaires dynamiques
    { pattern: /bg-secondary-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-secondary-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /border-secondary-(50|100|200|300|400|500|600|700|800|900)/ },
    // Accent
    { pattern: /bg-accent-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-accent-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /border-accent-(50|100|200|300|400|500|600|700|800|900)/ },
    // Statuts
    { pattern: /bg-(success|warning|danger|info)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /text-(success|warning|danger|info)-(50|100|200|300|400|500|600|700|800|900)/ },
    { pattern: /border-(success|warning|danger|info)-(50|100|200|300|400|500|600|700|800|900)/ },
    // Badges de statut
    'badge-pending', 'badge-active', 'badge-expired', 'badge-draft', 'badge-cancelled',
    // Boutons
    'btn', 'btn-primary', 'btn-secondary', 'btn-danger', 'btn-ghost', 'btn-icon',
    'btn-sm', 'btn-md', 'btn-lg',
    // Loading state
    'loading', 'animate-spin',
  ],

  theme: {
    extend: {
      // ─── Palette couleurs SECRETIS ───────────────────────────────────────────
      colors: {
        // Bleu marine (couleur primaire)
        primary: {
          50:  '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce', // ← couleur principale SECRETIS
          800: '#6b21a8',
          900: '#581c87',
          DEFAULT: '#9333ea',
        },
        // Bleu vif (couleur secondaire)
        secondary: {
          50:  '#E8F4FB',
          100: '#C5E1F4',
          200: '#9DCCEC',
          300: '#75B7E4',
          400: '#4EA2DC',
          500: '#2E86C1', // ← couleur principale
          600: '#256EA0',
          700: '#1D5680',
          800: '#153E5F',
          900: '#0C263F',
          DEFAULT: '#2E86C1',
        },
        // Or / Ambre (accent)
        accent: {
          50:  '#FEF9EC',
          100: '#FDEEC5',
          200: '#FBE29E',
          300: '#F9D577',
          400: '#F7C850',
          500: '#F39C12', // ← couleur principale
          600: '#D4880F',
          700: '#B5740C',
          800: '#966109',
          900: '#774D07',
          DEFAULT: '#F39C12',
        },
        // Vert forêt (succès)
        success: {
          50:  '#E8F5EC',
          100: '#C2E3CA',
          200: '#9CD1A8',
          300: '#76BF86',
          400: '#50AD64',
          500: '#1E8449', // ← couleur principale
          600: '#196E3C',
          700: '#14582F',
          800: '#0F4222',
          900: '#0A2C15',
          DEFAULT: '#1E8449',
        },
        // Orange (alerte)
        warning: {
          50:  '#FDF2E9',
          100: '#FAD9C1',
          200: '#F7C099',
          300: '#F4A771',
          400: '#F18E49',
          500: '#E67E22', // ← couleur principale
          600: '#C96B1C',
          700: '#AC5816',
          800: '#8F4510',
          900: '#72330A',
          DEFAULT: '#E67E22',
        },
        // Rouge (danger)
        danger: {
          50:  '#FAEAEA',
          100: '#F0C0C0',
          200: '#E69696',
          300: '#DC6C6C',
          400: '#D24242',
          500: '#C0392B', // ← couleur principale
          600: '#A23024',
          700: '#84271D',
          800: '#661E16',
          900: '#48150F',
          DEFAULT: '#C0392B',
        },
        // Neutres / UI
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F5F7FA',
        },
        border: {
          DEFAULT: '#BDC3C7',
          light: '#E8EAEC',
          dark: '#95A5A6',
        },
        text: {
          primary: '#1C1C1C',
          secondary: '#6C757D',
          muted: '#ADB5BD',
          inverse: '#FFFFFF',
        },
      },

      // ─── Typographie ────────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1rem' }],
        'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem',     { lineHeight: '1.5rem' }],
        'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
        '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':  ['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl':  ['3rem',     { lineHeight: '1.2' }],
        '6xl':  ['3.75rem',  { lineHeight: '1.2' }],
      },
      fontWeight: {
        thin:       '100',
        extralight: '200',
        light:      '300',
        normal:     '400',
        medium:     '500',
        semibold:   '600',
        bold:       '700',
        extrabold:  '800',
        black:      '900',
      },

      // ─── Espacement ─────────────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '17':  '4.25rem',
        '18':  '4.5rem',
        '22':  '5.5rem',
        '26':  '6.5rem',
        '30':  '7.5rem',
        '34':  '8.5rem',
        '68':  '17rem',
        '72':  '18rem',
        '76':  '19rem',
        '80':  '20rem',
        '84':  '21rem',
        '88':  '22rem',
        '92':  '23rem',
        '96':  '24rem',
      },

      // ─── Border Radius ──────────────────────────────────────────────────────
      borderRadius: {
        'none': '0',
        'sm':   '0.25rem',   // 4px
        DEFAULT: '0.375rem', // 6px
        'md':   '0.5rem',    // 8px  ← cards, modals
        'lg':   '0.75rem',   // 12px
        'xl':   '1rem',      // 16px
        '2xl':  '1.25rem',   // 20px
        '3xl':  '1.5rem',    // 24px
        'full': '9999px',    // badges, avatars
      },

      // ─── Ombres ─────────────────────────────────────────────────────────────
      boxShadow: {
        'none':  'none',
        'xs':    '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm':    '0 1px 3px 0 rgba(0, 0, 0, 0.10), 0 1px 2px -1px rgba(0, 0, 0, 0.10)',
        DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -2px rgba(0, 0, 0, 0.10)',
        'md':    '0 4px 8px 0 rgba(0, 0, 0, 0.12), 0 2px 4px 0 rgba(0, 0, 0, 0.08)',
        'lg':    '0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.10)',
        'xl':    '0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 8px 10px -6px rgba(0, 0, 0, 0.10)',
        '2xl':   '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        // Ombres colorées
        'primary': '0 4px 14px 0 rgba(26, 58, 92, 0.30)',
        'secondary': '0 4px 14px 0 rgba(46, 134, 193, 0.30)',
        'accent': '0 4px 14px 0 rgba(243, 156, 18, 0.30)',
        'success': '0 4px 14px 0 rgba(30, 132, 73, 0.30)',
        'danger': '0 4px 14px 0 rgba(192, 57, 43, 0.30)',
        // Card
        'card': '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px 0 rgba(0, 0, 0, 0.12)',
      },

      // ─── Transitions ────────────────────────────────────────────────────────
      transitionProperty: {
        'colors': 'color, background-color, border-color, text-decoration-color, fill, stroke',
        'opacity': 'opacity',
        'shadow': 'box-shadow',
        'transform': 'transform',
        'all': 'all',
      },
      transitionDuration: {
        '0':    '0ms',
        '75':   '75ms',
        '100':  '100ms',
        '150':  '150ms',
        '200':  '200ms',
        '300':  '300ms',
        '500':  '500ms',
        '700':  '700ms',
        '1000': '1000ms',
      },
      transitionTimingFunction: {
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out':    'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in':     'cubic-bezier(0.4, 0, 1, 1)',
        'bounce':      'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // ─── Z-index ────────────────────────────────────────────────────────────
      zIndex: {
        'auto':   'auto',
        '0':      '0',
        '10':     '10',
        '20':     '20',
        '30':     '30',
        '40':     '40',
        '50':     '50',
        'sidebar':  '100',
        'header':   '200',
        'dropdown': '300',
        'sticky':   '400',
        'modal':    '500',
        'popover':  '600',
        'toast':    '700',
        'tooltip':  '800',
      },

      // ─── Largeurs max ────────────────────────────────────────────────────────
      maxWidth: {
        'xs':   '20rem',
        'sm':   '24rem',
        'md':   '28rem',
        'lg':   '32rem',
        'xl':   '36rem',
        '2xl':  '42rem',
        '3xl':  '48rem',
        '4xl':  '56rem',
        '5xl':  '64rem',
        '6xl':  '72rem',
        '7xl':  '80rem',
        'full': '100%',
        'screen': '100vw',
        // Layouts SECRETIS
        'sidebar': '16rem',    // 256px
        'content': 'calc(100% - 16rem)',
      },

      // ─── Animations ──────────────────────────────────────────────────────────
      animation: {
        'spin-slow':   'spin 2s linear infinite',
        'spin-slower': 'spin 3s linear infinite',
        'ping-slow':   'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-in':    'slideIn 0.3s ease-out',
        'slide-up':    'slideUp 0.3s ease-out',
        'slide-up-full': 'slideUpFull 0.3s ease-out',
        'slide-down':  'slideDown 0.3s ease-in',
        'bounce-in':   'bounceIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-soft':  'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideUpFull: {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(0)',    opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
        bounceIn: {
          '0%':   { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },

      // ─── Grid ────────────────────────────────────────────────────────────────
      gridTemplateColumns: {
        'kpi-4':    'repeat(4, minmax(0, 1fr))',
        'kpi-3':    'repeat(3, minmax(0, 1fr))',
        'sidebar':  '16rem 1fr',
        'dashboard':'1fr 1fr 1fr 1fr',
      },
    },
  },

  // ─── Plugins ────────────────────────────────────────────────────────────────
  plugins: [
    require('/var/www/secretis/frontend/node_modules/@tailwindcss/forms')({
      strategy: 'class', // .form-input, .form-select, etc.
    }),
    require('/var/www/secretis/frontend/node_modules/@tailwindcss/typography'),
    require('/var/www/secretis/frontend/node_modules/@tailwindcss/aspect-ratio'),

    // Plugin utilitaires personnalisés SECRETIS
    function({ addComponents, addUtilities, theme }) {
      // ── Boutons ────────────────────────────────────────────────────────────
      addComponents({
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontFamily: theme('fontFamily.sans'),
          fontWeight: theme('fontWeight.medium'),
          borderRadius: theme('borderRadius.md'),
          transition: 'all 150ms ease-in-out',
          cursor: 'pointer',
          userSelect: 'none',
          '&:focus-visible': {
            outline: '2px solid transparent',
            outlineOffset: '2px',
            boxShadow: `0 0 0 3px ${theme('colors.primary.200')}`,
          },
          '&:disabled, &.disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
            pointerEvents: 'none',
          },
        },
        '.btn-sm':  { padding: '0.375rem 0.75rem',  fontSize: theme('fontSize.sm')[0] },
        '.btn-md':  { padding: '0.5rem 1rem',        fontSize: theme('fontSize.base')[0] },
        '.btn-lg':  { padding: '0.75rem 1.5rem',     fontSize: theme('fontSize.lg')[0] },
        '.btn-primary': {
          backgroundColor: theme('colors.primary.DEFAULT'),
          color: '#ffffff',
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.primary.800'),
            boxShadow: theme('boxShadow.primary'),
          },
          '&:active': { backgroundColor: theme('colors.primary.900') },
        },
        '.btn-secondary': {
          backgroundColor: theme('colors.secondary.DEFAULT'),
          color: '#ffffff',
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.secondary.600'),
            boxShadow: theme('boxShadow.secondary'),
          },
        },
        '.btn-danger': {
          backgroundColor: theme('colors.danger.DEFAULT'),
          color: '#ffffff',
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.danger.600'),
            boxShadow: theme('boxShadow.danger'),
          },
        },
        '.btn-ghost': {
          backgroundColor: 'transparent',
          color: theme('colors.primary.DEFAULT'),
          border: `1px solid ${theme('colors.primary.DEFAULT')}`,
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.primary.50'),
          },
        },
        '.btn-icon': {
          padding: '0.5rem',
          borderRadius: theme('borderRadius.md'),
          '&.btn-sm': { padding: '0.375rem' },
          '&.btn-lg': { padding: '0.75rem' },
        },

        // ── Cards ──────────────────────────────────────────────────────────
        '.card': {
          backgroundColor: '#ffffff',
          borderRadius: theme('borderRadius.md'),
          boxShadow: theme('boxShadow.card'),
          border: `1px solid ${theme('colors.border.DEFAULT')}`,
          padding: '1.5rem',
          transition: 'box-shadow 200ms ease-in-out',
        },
        '.card-hover': {
          '&:hover': { boxShadow: theme('boxShadow.card-hover') },
        },
        '.card-stats': {
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '1.25rem 1.5rem',
        },

        // ── Badges ────────────────────────────────────────────────────────
        '.badge': {
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.125rem 0.625rem',
          borderRadius: theme('borderRadius.full'),
          fontSize: theme('fontSize.xs')[0],
          fontWeight: theme('fontWeight.semibold'),
          lineHeight: '1.25rem',
        },
        '.badge-pending': {
          backgroundColor: theme('colors.warning.100'),
          color: theme('colors.warning.700'),
        },
        '.badge-active': {
          backgroundColor: theme('colors.success.100'),
          color: theme('colors.success.700'),
        },
        '.badge-expired': {
          backgroundColor: theme('colors.danger.100'),
          color: theme('colors.danger.700'),
        },
        '.badge-draft': {
          backgroundColor: theme('colors.border.light'),
          color: theme('colors.text.secondary'),
        },
        '.badge-cancelled': {
          backgroundColor: '#F3F4F6',
          color: '#6B7280',
          textDecoration: 'line-through',
        },
        '.badge-info': {
          backgroundColor: theme('colors.secondary.100'),
          color: theme('colors.secondary.700'),
        },
      });

      // ── Utilitaires ────────────────────────────────────────────────────────
      addUtilities({
        '.text-balance':    { textWrap: 'balance' },
        '.scrollbar-hide':  {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        '.scrollbar-thin':  {
          'scrollbar-width': 'thin',
          'scrollbar-color': `${theme('colors.border.DEFAULT')} transparent`,
        },
      });
    },
  ],
};
