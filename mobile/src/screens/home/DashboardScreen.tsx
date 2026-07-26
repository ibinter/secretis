import React, { useState, useCallback, useRef } from 'react'
import {
  Animated,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { useOfflineSync } from '../../hooks/useOfflineSync'
import OfflineBanner from '../../components/OfflineBanner'
import SyncIndicator from '../../components/SyncIndicator'
import ConflictResolutionModal from '../../components/ConflictResolutionModal'
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme'
import type { ConflictItem } from '../../services/offlineQueue'

// ============================================================
// Types
// ============================================================

interface DashboardWidget {
  id: string
  title: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  count: number
  accentColor: string
  urgent?: boolean
}

// ============================================================
// FAB Actions
// ============================================================

const FAB_ACTIONS = [
  { id: 'event', icon: 'add-circle-outline' as const, label: 'Nouvel événement', color: Colors.primary },
  { id: 'courrier', icon: 'mail-outline' as const, label: 'Nouveau courrier', color: Colors.info },
  { id: 'task', icon: 'checkbox-outline' as const, label: 'Nouvelle tâche', color: Colors.success },
  { id: 'visitor', icon: 'person-add-outline' as const, label: 'Enregistrer un visiteur', color: Colors.secondary },
]

// ============================================================
// Mock widgets (replace with real API hooks)
// ============================================================

const INITIAL_WIDGETS: DashboardWidget[] = [
  { id: 'events', title: 'Événements du jour', icon: 'calendar', count: 3, accentColor: Colors.primary },
  { id: 'tasks', title: 'Tâches en retard', icon: 'alert-circle', count: 5, accentColor: Colors.danger, urgent: true },
  { id: 'courriers', title: 'Courriers en attente', icon: 'mail', count: 8, accentColor: Colors.warning },
  { id: 'visitors', title: 'Visiteurs attendus', icon: 'people', count: 2, accentColor: Colors.info },
  { id: 'notifications', title: 'Notifications non lues', icon: 'notifications', count: 12, accentColor: Colors.secondary },
]

// ============================================================
// Sub-components
// ============================================================

function WidgetCard({ widget }: { widget: DashboardWidget }) {
  return (
    <TouchableOpacity style={[styles.widget, Shadow.sm]} activeOpacity={0.8}>
      <View style={[styles.widgetIcon, { backgroundColor: widget.accentColor + '1A' }]}>
        <Ionicons name={widget.icon} size={22} color={widget.accentColor} />
      </View>
      <View style={styles.widgetBody}>
        <Text style={styles.widgetTitle}>{widget.title}</Text>
        <View style={styles.widgetCountRow}>
          <Text style={[styles.widgetCount, { color: widget.accentColor }]}>
            {widget.count}
          </Text>
          {widget.urgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textDisabled} />
    </TouchableOpacity>
  )
}

// ============================================================
// Main Component
// ============================================================

export default function DashboardScreen() {
  const { user } = useAuth()
  const { isOnline, pendingCount, isSyncing, conflicts, resolveConflict } = useOfflineSync()
  const [fabOpen, setFabOpen] = useState(false)
  const fabAnim = useRef(new Animated.Value(0)).current
  const [activeConflict, setActiveConflict] = useState<ConflictItem | null>(null)

  // Show first unresolved conflict
  const firstConflict = conflicts[0] ?? null

  const toggleFab = useCallback(() => {
    const toValue = fabOpen ? 0 : 1
    Animated.spring(fabAnim, {
      toValue,
      tension: 70,
      friction: 8,
      useNativeDriver: true,
    }).start()
    setFabOpen(!fabOpen)
  }, [fabOpen, fabAnim])

  const handleResolveConflict = useCallback(
    async (id: string, resolution: 'keep-local' | 'keep-server') => {
      await resolveConflict(id, resolution)
      setActiveConflict(null)
    },
    [resolveConflict],
  )

  const firstName = user?.name?.split(' ')[0] ?? 'vous'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Offline banner */}
      <OfflineBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {firstName} 👋</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <SyncIndicator pendingCount={pendingCount} isSyncing={isSyncing} />
          {/* Conflict indicator */}
          {firstConflict && (
            <TouchableOpacity
              onPress={() => setActiveConflict(firstConflict)}
              style={styles.conflictBtn}
            >
              <Ionicons name="git-merge-outline" size={20} color={Colors.warning} />
            </TouchableOpacity>
          )}
          {/* Avatar */}
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {(user?.name ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Widgets */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Tableau de bord</Text>
        {INITIAL_WIDGETS.map((w) => (
          <WidgetCard key={w.id} widget={w} />
        ))}
      </ScrollView>

      {/* FAB */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        {/* FAB sub-actions */}
        {FAB_ACTIONS.map((action, idx) => {
          const translateY = fabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(56 + 12) * (idx + 1)],
          })
          const opacity = fabAnim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
          })

          return (
            <Animated.View
              key={action.id}
              style={[
                styles.fabAction,
                { transform: [{ translateY }], opacity },
              ]}
              pointerEvents={fabOpen ? 'auto' : 'none'}
            >
              <Text style={styles.fabActionLabel}>{action.label}</Text>
              <TouchableOpacity
                style={[styles.fabActionBtn, { backgroundColor: action.color }]}
                onPress={() => {
                  toggleFab()
                  // TODO: navigate to creation screen
                }}
              >
                <Ionicons name={action.icon} size={22} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          )
        })}

        {/* Main FAB */}
        <TouchableOpacity style={styles.fab} onPress={toggleFab} activeOpacity={0.85}>
          <Animated.View
            style={{
              transform: [
                {
                  rotate: fabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '45deg'],
                  }),
                },
              ],
            }}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Conflict modal */}
      <ConflictResolutionModal
        conflict={activeConflict}
        visible={!!activeConflict}
        onResolve={handleResolveConflict}
        onDismiss={() => setActiveConflict(null)}
      />
    </SafeAreaView>
  )
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
  },
  greeting: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },
  date: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  conflictBtn: {
    padding: Spacing.xs,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: '#fff',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.base,
    gap: Spacing.sm,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  widget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  widgetIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetBody: { flex: 1 },
  widgetTitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  widgetCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  widgetCount: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '800',
  },
  urgentBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  urgentText: {
    color: '#fff',
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
  },
  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: Spacing['2xl'],
    right: Spacing.xl,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  fabAction: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fabActionLabel: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    ...Shadow.sm,
  },
  fabActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
})
