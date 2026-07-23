import React, { useState, useCallback } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme'
import { pushNotificationService } from '../../services/pushNotifications'

// ============================================================
// Types
// ============================================================

interface NotifPreference {
  key: string
  label: string
  description: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  enabled: boolean
}

// ============================================================
// Helpers
// ============================================================

function toDate(hours: number, minutes: number): Date {
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return d
}

function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}`
}

// ============================================================
// Component
// ============================================================

export default function NotificationPreferences() {
  const [globalEnabled, setGlobalEnabled] = useState(true)
  const [preferences, setPreferences] = useState<NotifPreference[]>([
    {
      key: 'event_reminder',
      label: 'Rappels d\'événements',
      description: 'Rappels avant vos réunions et rendez-vous',
      icon: 'calendar-outline',
      enabled: true,
    },
    {
      key: 'task_assigned',
      label: 'Tâches assignées',
      description: 'Quand une tâche vous est assignée ou modifiée',
      icon: 'checkbox-outline',
      enabled: true,
    },
    {
      key: 'document_validated',
      label: 'Documents validés',
      description: 'Quand un document que vous avez soumis est traité',
      icon: 'document-text-outline',
      enabled: true,
    },
    {
      key: 'visitor_arrived',
      label: 'Arrivée de visiteurs',
      description: 'Quand un visiteur vous est annoncé',
      icon: 'person-outline',
      enabled: true,
    },
    {
      key: 'message_received',
      label: 'Messages reçus',
      description: 'Nouveaux messages dans vos conversations',
      icon: 'chatbubble-outline',
      enabled: true,
    },
    {
      key: 'support_ticket',
      label: 'Tickets de support',
      description: 'Mises à jour sur vos demandes d\'assistance',
      icon: 'help-circle-outline',
      enabled: false,
    },
    {
      key: 'license_expiring',
      label: 'Expiration de licence',
      description: 'Alertes avant l\'expiration de votre abonnement',
      icon: 'shield-outline',
      enabled: true,
    },
  ])

  // Quiet hours
  const [quietEnabled, setQuietEnabled] = useState(true)
  const [quietStart, setQuietStart] = useState({ hours: 22, minutes: 0 })
  const [quietEnd, setQuietEnd] = useState({ hours: 8, minutes: 0 })
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)

  const togglePref = useCallback((key: string, value: boolean) => {
    setPreferences((prev) =>
      prev.map((p) => (p.key === key ? { ...p, enabled: value } : p)),
    )
  }, [])

  const handleStartChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(Platform.OS === 'ios')
    if (date) {
      setQuietStart({ hours: date.getHours(), minutes: date.getMinutes() })
    }
  }

  const handleEndChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowEndPicker(Platform.OS === 'ios')
    if (date) {
      setQuietEnd({ hours: date.getHours(), minutes: date.getMinutes() })
    }
  }

  const handleTest = async () => {
    await pushNotificationService.sendTestNotification()
    Alert.alert('Test envoyé', 'Vous devriez recevoir une notification dans quelques secondes.')
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Global toggle */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color={Colors.primary} />
              <View>
                <Text style={styles.rowTitle}>Activer les notifications</Text>
                <Text style={styles.rowSub}>Recevoir toutes les alertes SECRETIS</Text>
              </View>
            </View>
            <Switch
              value={globalEnabled}
              onValueChange={setGlobalEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Per-type preferences */}
        <Text style={styles.sectionTitle}>Types de notifications</Text>
        <View style={[styles.card, { gap: 0 }]}>
          {preferences.map((pref, idx) => (
            <React.Fragment key={pref.key}>
              <View style={styles.prefRow}>
                <View style={styles.prefLeft}>
                  <View style={[styles.prefIcon, !globalEnabled && styles.prefIconDisabled]}>
                    <Ionicons
                      name={pref.icon}
                      size={18}
                      color={globalEnabled ? Colors.primary : Colors.textDisabled}
                    />
                  </View>
                  <View style={styles.prefText}>
                    <Text style={[styles.prefLabel, !globalEnabled && styles.textDisabled]}>
                      {pref.label}
                    </Text>
                    <Text style={styles.prefDesc}>{pref.description}</Text>
                  </View>
                </View>
                <Switch
                  value={pref.enabled && globalEnabled}
                  onValueChange={(v) => togglePref(pref.key, v)}
                  disabled={!globalEnabled}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              {idx < preferences.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Quiet hours */}
        <Text style={styles.sectionTitle}>Heures calmes</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={22} color={Colors.primary} />
              <View>
                <Text style={styles.rowTitle}>Activer les heures calmes</Text>
                <Text style={styles.rowSub}>Silencieux pendant cette plage horaire</Text>
              </View>
            </View>
            <Switch
              value={quietEnabled}
              onValueChange={setQuietEnabled}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {quietEnabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Début</Text>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={styles.timeBtnText}>
                    {formatTime(quietStart.hours, quietStart.minutes)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.timeRow}>
                <Text style={styles.timeLabel}>Fin</Text>
                <TouchableOpacity
                  style={styles.timeBtn}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={styles.timeBtnText}>
                    {formatTime(quietEnd.hours, quietEnd.minutes)}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={toDate(quietStart.hours, quietStart.minutes)}
            mode="time"
            is24Hour
            display="default"
            onChange={handleStartChange}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={toDate(quietEnd.hours, quietEnd.minutes)}
            mode="time"
            is24Hour
            display="default"
            onChange={handleEndChange}
          />
        )}

        {/* Test button */}
        <TouchableOpacity style={styles.testBtn} onPress={handleTest}>
          <Ionicons name="notifications" size={20} color={Colors.primary} />
          <Text style={styles.testBtnText}>Tester une notification</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    padding: Spacing.base,
    gap: Spacing.sm,
    paddingBottom: Spacing['4xl'],
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadow.sm,
    gap: Spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  rowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  rowSub: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 2,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  prefLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  prefIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefIconDisabled: {
    opacity: 0.4,
  },
  prefText: { flex: 1 },
  prefLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  prefDesc: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  textDisabled: {
    color: Colors.textDisabled,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.primary,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: Spacing.sm,
  },
  testBtnText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.primary,
  },
})
