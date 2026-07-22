// ============================================================
// SECRETIS — Thème global
// ============================================================

export const Colors = {
  primary: '#1A3A5C',
  primaryLight: '#2B5082',
  primaryDark: '#0F2238',
  secondary: '#E8A020',
  secondaryLight: '#F0B84A',
  accent: '#28A745',
  danger: '#DC3545',
  warning: '#FFC107',
  info: '#17A2B8',
  success: '#28A745',

  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F4F8',

  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  border: '#E5E7EB',
  borderFocus: '#1A3A5C',
  divider: '#F3F4F6',

  shadow: 'rgba(0, 0, 0, 0.08)',
} as const;

export const StatusColors: Record<string, string> = {
  BROUILLON: '#9CA3AF',
  EN_ATTENTE: '#F59E0B',
  EN_COURS: '#3B82F6',
  SOUMIS: '#8B5CF6',
  EN_REVISION: '#F97316',
  APPROUVE: '#10B981',
  REJETE: '#EF4444',
  ANNULE: '#6B7280',
  CLOTURE: '#1F2937',
  ARCHIVE: '#374151',
  SUSPENDU: '#B45309',
  PLANIFIE: '#0EA5E9',
  REPORTE: '#D97706',
  URGENT: '#DC2626',
  CRITIQUE: '#991B1B',
  TERMINE: '#059669',
  TRAITE: '#10B981',
  NON_TRAITE: '#F87171',
};

export const PriorityColors: Record<string, string> = {
  BASSE: '#10B981',
  NORMALE: '#3B82F6',
  HAUTE: '#F59E0B',
  URGENTE: '#EF4444',
};

export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
