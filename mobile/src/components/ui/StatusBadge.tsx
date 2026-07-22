import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { StatusColors, PriorityColors, Typography, BorderRadius, Spacing } from '../../config/theme';
import type { SecretisStatus, TaskPriority } from '../../types';

// ============================================================
// Labels
// ============================================================

const STATUS_LABELS: Record<SecretisStatus, string> = {
  BROUILLON: 'Brouillon',
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  SOUMIS: 'Soumis',
  EN_REVISION: 'En révision',
  APPROUVE: 'Approuvé',
  REJETE: 'Rejeté',
  ANNULE: 'Annulé',
  CLOTURE: 'Clôturé',
  ARCHIVE: 'Archivé',
  SUSPENDU: 'Suspendu',
  PLANIFIE: 'Planifié',
  REPORTE: 'Reporté',
  URGENT: 'Urgent',
  CRITIQUE: 'Critique',
  TERMINE: 'Terminé',
  TRAITE: 'Traité',
  NON_TRAITE: 'Non traité',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
};

// ============================================================
// Types
// ============================================================

type BadgeSize = 'sm' | 'md';

interface StatusBadgeProps {
  status: SecretisStatus;
  size?: BadgeSize;
  style?: ViewStyle;
}

interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: BadgeSize;
  style?: ViewStyle;
}

// ============================================================
// StatusBadge
// ============================================================

export default function StatusBadge({ status, size = 'md', style }: StatusBadgeProps) {
  const color = StatusColors[status] ?? '#9CA3AF';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: `${color}20`, borderColor: `${color}50` },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, size === 'sm' ? styles.labelSm : styles.labelMd, { color }]}>
        {label}
      </Text>
    </View>
  );
}

// ============================================================
// PriorityBadge
// ============================================================

export function PriorityBadge({ priority, size = 'md', style }: PriorityBadgeProps) {
  const color = PriorityColors[priority] ?? '#9CA3AF';
  const label = PRIORITY_LABELS[priority] ?? priority;

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' ? styles.badgeSm : styles.badgeMd,
        { backgroundColor: `${color}20`, borderColor: `${color}50` },
        style,
      ]}
    >
      <Text style={[styles.label, size === 'sm' ? styles.labelSm : styles.labelMd, { color }]}>
        {label}
      </Text>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs + 2,
  },
  badgeMd: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelSm: { fontSize: Typography.fontSize.xs },
  labelMd: { fontSize: Typography.fontSize.sm },
});
