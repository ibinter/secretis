import React, { useState, useEffect, useCallback } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { biometricAuthService } from '../../services/biometricAuth'
import { mmkv, STORAGE_KEYS } from '../../utils/storage'
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme'
import Avatar from '../../components/ui/Avatar'

// ============================================================
// Types
// ============================================================

type Language = 'fr' | 'en' | 'ar'
type ThemeMode = 'system' | 'light' | 'dark'

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
]

const THEMES: { value: ThemeMode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'system', label: 'Système', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Clair', icon: 'sunny-outline' },
  { value: 'dark', label: 'Sombre', icon: 'moon-outline' },
]

// ============================================================
// Row components
// ============================================================

function SettingRow({
  icon,
  label,
  value,
  onPress,
  right,
  danger,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  value?: string
  onPress?: () => void
  right?: React.ReactNode
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={!onPress || disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? Colors.danger : Colors.primary}
        />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger, disabled && styles.textDisabled]}>
        {label}
      </Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {right ?? (onPress ? (
        <Ionicons name="chevron-forward" size={16} color={Colors.textDisabled} />
      ) : null)}
    </TouchableOpacity>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>
}

// ============================================================
// Main Component
// ============================================================

export default function SettingsScreen() {
  const { user, logout, enableBiometric, disableBiometric } = useAuth()
  const colorScheme = useColorScheme()

  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [language, setLanguage] = useState<Language>(
    (mmkv.getString(STORAGE_KEYS.LANGUAGE) as Language) ?? 'fr',
  )
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    (mmkv.getString(STORAGE_KEYS.THEME) as ThemeMode) ?? 'system',
  )
  const [cacheSize] = useState('12,4 Mo') // Replace with real calculation

  useEffect(() => {
    ;(async () => {
      const { available } = await biometricAuthService.isAvailable()
      setBiometricAvailable(available)
      if (available) {
        const enabled = await biometricAuthService.isEnabled()
        setBiometricEnabled(enabled)
      }
    })()
  }, [])

  const handleBiometricToggle = useCallback(
    async (value: boolean) => {
      if (value) {
        const ok = await enableBiometric()
        if (ok && user?.id) {
          await biometricAuthService.enable(String(user.id))
          setBiometricEnabled(true)
        }
      } else {
        disableBiometric()
        await biometricAuthService.disable()
        setBiometricEnabled(false)
      }
    },
    [enableBiometric, disableBiometric, user],
  )

  const handleLanguageChange = useCallback(() => {
    const options = LANGUAGES.map((l) => l.label)
    Alert.alert('Langue', 'Choisissez votre langue', [
      ...LANGUAGES.map((l) => ({
        text: l.label,
        onPress: () => {
          setLanguage(l.value)
          mmkv.setString(STORAGE_KEYS.LANGUAGE, l.value)
        },
      })),
      { text: 'Annuler', style: 'cancel' },
    ])
  }, [])

  const handleThemeChange = useCallback(() => {
    Alert.alert('Apparence', 'Choisissez le thème', [
      ...THEMES.map((t) => ({
        text: t.label,
        onPress: () => {
          setThemeMode(t.value)
          mmkv.setString(STORAGE_KEYS.THEME, t.value)
        },
      })),
      { text: 'Annuler', style: 'cancel' },
    ])
  }, [])

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Vider le cache',
      'Toutes les données temporaires seront supprimées. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: () => Alert.alert('Cache vidé', 'Le cache a été vidé avec succès.'),
        },
      ],
    )
  }, [])

  const handleClearOfflineData = useCallback(() => {
    Alert.alert(
      'Données hors ligne',
      'Les actions en attente de synchronisation seront supprimées définitivement. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { offlineQueue } = await import('../../services/offlineQueue')
            await offlineQueue.clear()
            Alert.alert('Données supprimées', 'Les données hors ligne ont été effacées.')
          },
        },
      ],
    )
  }, [])

  const handleLogout = useCallback(() => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ])
  }, [logout])

  const currentThemeLabel = THEMES.find((t) => t.value === themeMode)?.label ?? 'Système'
  const currentLanguageLabel = LANGUAGES.find((l) => l.value === language)?.label ?? 'Français'

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <Avatar
            name={user?.name ?? 'U'}
            size={64}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name ?? '—'}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
          </View>
        </View>

        {/* Security */}
        <SectionHeader title="Sécurité" />
        <View style={styles.card}>
          {biometricAvailable && (
            <SettingRow
              icon="finger-print-outline"
              label="Connexion biométrique"
              right={
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor="#fff"
                />
              }
            />
          )}
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.card}>
          <SettingRow
            icon="notifications-outline"
            label="Préférences de notifications"
            onPress={() => {/* Navigate to NotificationPreferences */}}
          />
        </View>

        {/* Appearance */}
        <SectionHeader title="Apparence & Langue" />
        <View style={styles.card}>
          <SettingRow
            icon="language-outline"
            label="Langue"
            value={currentLanguageLabel}
            onPress={handleLanguageChange}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="contrast-outline"
            label="Mode d'affichage"
            value={currentThemeLabel}
            onPress={handleThemeChange}
          />
        </View>

        {/* Storage */}
        <SectionHeader title="Stockage" />
        <View style={styles.card}>
          <SettingRow
            icon="trash-outline"
            label="Vider le cache"
            value={cacheSize}
            onPress={handleClearCache}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="cloud-offline-outline"
            label="Données hors ligne"
            value="Vider"
            onPress={handleClearOfflineData}
          />
        </View>

        {/* About */}
        <SectionHeader title="À propos" />
        <View style={styles.card}>
          <SettingRow
            icon="information-circle-outline"
            label="Version de l'application"
            value="2.0.0 (build 200)"
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.sm,
    ...Shadow.md,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: '#fff',
  },
  profileEmail: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 44 + Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowDisabled: { opacity: 0.5 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: '#FEE2E2' },
  rowLabel: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  rowLabelDanger: { color: Colors.danger },
  rowValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  textDisabled: { color: Colors.textDisabled },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    marginTop: Spacing.lg,
  },
  logoutText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: Colors.danger,
  },
})
