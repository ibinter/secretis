import React from 'react'
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../config/theme'
import type { ConflictItem } from '../services/offlineQueue'

// ============================================================
// Props
// ============================================================

interface ConflictResolutionModalProps {
  conflict: ConflictItem | null
  visible: boolean
  onResolve: (conflictId: string, resolution: 'keep-local' | 'keep-server') => void
  onDismiss: () => void
}

// ============================================================
// Helpers
// ============================================================

function formatDate(iso?: string | number): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function renderDataPreview(data: Record<string, unknown>): React.ReactNode {
  const entries = Object.entries(data).slice(0, 6)
  return entries.map(([k, v]) => (
    <View key={k} style={styles.dataRow}>
      <Text style={styles.dataKey}>{k}</Text>
      <Text style={styles.dataValue} numberOfLines={1}>
        {v === null ? 'null' : String(v)}
      </Text>
    </View>
  ))
}

// ============================================================
// Component
// ============================================================

export default function ConflictResolutionModal({
  conflict,
  visible,
  onResolve,
  onDismiss,
}: ConflictResolutionModalProps) {
  if (!conflict) return null

  const localDate = formatDate(conflict.action.timestamp)
  const serverDate = formatDate(conflict.serverUpdatedAt)
  const localData = conflict.action.body
  const serverData = conflict.serverData

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="git-merge-outline" size={24} color={Colors.warning} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Conflit de synchronisation</Text>
              <Text style={styles.subtitle}>
                Une modification a été faite sur cet élément depuis un autre appareil.
              </Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Two versions side by side */}
            <View style={styles.versionsRow}>
              {/* Local version */}
              <View style={[styles.versionCard, styles.localCard]}>
                <View style={styles.versionHeader}>
                  <Ionicons name="phone-portrait-outline" size={16} color={Colors.primary} />
                  <Text style={styles.versionTitle}>Ma version</Text>
                </View>
                <Text style={styles.versionDate}>{localDate}</Text>
                <View style={styles.versionData}>
                  {renderDataPreview(localData)}
                </View>
              </View>

              <View style={styles.vsWrapper}>
                <Text style={styles.vsText}>VS</Text>
              </View>

              {/* Server version */}
              <View style={[styles.versionCard, styles.serverCard]}>
                <View style={styles.versionHeader}>
                  <Ionicons name="cloud-outline" size={16} color={Colors.info} />
                  <Text style={styles.versionTitle}>Version serveur</Text>
                </View>
                <Text style={styles.versionDate}>{serverDate}</Text>
                <View style={styles.versionData}>
                  {renderDataPreview(serverData)}
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.localBtn]}
                onPress={() => onResolve(conflict.id, 'keep-local')}
              >
                <Ionicons name="phone-portrait-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Garder ma version</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.serverBtn]}
                onPress={() => onResolve(conflict.id, 'keep-server')}
              >
                <Ionicons name="cloud-outline" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Utiliser la version du serveur</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: '85%',
    ...Shadow.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  versionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  versionCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1.5,
  },
  localCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  serverCard: {
    backgroundColor: '#ECFEFF',
    borderColor: '#A5F3FC',
  },
  versionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  versionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  versionDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  versionData: {
    gap: 4,
  },
  dataRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dataKey: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    minWidth: 50,
  },
  dataValue: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.textPrimary,
  },
  vsWrapper: {
    paddingTop: Spacing['2xl'],
    alignItems: 'center',
  },
  vsText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '800',
    color: Colors.textDisabled,
  },
  actions: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  localBtn: {
    backgroundColor: Colors.primary,
  },
  serverBtn: {
    backgroundColor: Colors.info,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
  },
})
