import React, { useEffect, useState } from 'react'
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { StackNavigationProp } from '@react-navigation/stack'
import { biometricAuthService, BiometricType } from '../../services/biometricAuth'
import { useAuth } from '../../hooks/useAuth'
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme'
import SecretisButton from '../../components/ui/SecretisButton'
import type { AuthStackParamList } from '../../navigation/AuthNavigator'

// ============================================================
// Types
// ============================================================

type BiometricSetupProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'BiometricSetup'>
}

// ============================================================
// Helpers
// ============================================================

function getBiometricIcon(type: BiometricType): React.ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'face':
      return 'scan-outline'
    case 'iris':
      return 'eye-outline'
    case 'fingerprint':
    default:
      return 'finger-print-outline'
  }
}

function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case 'face':
      return 'Face ID'
    case 'iris':
      return 'Iris'
    case 'fingerprint':
    default:
      return 'Empreinte digitale'
  }
}

// ============================================================
// Component
// ============================================================

export default function BiometricSetup({ navigation }: BiometricSetupProps) {
  const { user } = useAuth()
  const [biometricType, setBiometricType] = useState<BiometricType>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    biometricAuthService.isAvailable().then(({ type }) => setBiometricType(type))
  }, [])

  const handleEnable = async () => {
    setLoading(true)
    try {
      // Authenticate to confirm
      const result = await biometricAuthService.authenticate()
      if (!result.success) {
        Alert.alert('Échec', result.error ?? 'Authentification échouée.')
        return
      }

      // Enable for current user
      if (user?.id) {
        await biometricAuthService.enable(String(user.id))
      }

      setSuccess(true)

      // Navigate away after 2 seconds
      setTimeout(() => {
        navigation.replace('Login')
      }, 2000)
    } catch (err) {
      Alert.alert('Erreur', 'Impossible d\'activer la biométrie. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    navigation.replace('Login')
  }

  const iconName = getBiometricIcon(biometricType)
  const biometricLabel = getBiometricLabel(biometricType)

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Icon */}
        <View style={styles.iconWrapper}>
          <Ionicons name={iconName} size={72} color={Colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>
          Connexion avec {biometricLabel}
        </Text>

        {/* Description */}
        <Text style={styles.description}>
          Activez la connexion biométrique pour accéder à SECRETIS en{' '}
          <Text style={styles.bold}>une seule touche</Text>, sans saisir
          votre mot de passe à chaque fois.
        </Text>

        {success ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
            <Text style={styles.successText}>
              Biométrie activée — Prochaine connexion en 1 touche !
            </Text>
          </View>
        ) : (
          <View style={styles.actions}>
            <SecretisButton
              label={loading ? 'Activation…' : `Activer ${biometricLabel}`}
              onPress={handleEnable}
              loading={loading}
              fullWidth
              size="lg"
            />
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.skipText}>Pas maintenant</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer note */}
        <Text style={styles.note}>
          Vous pouvez activer ou désactiver cette option à tout moment dans
          les Paramètres de l'application.
        </Text>
      </View>
    </SafeAreaView>
  )
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.xl,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
    alignItems: 'center',
  },
  skipBtn: {
    padding: Spacing.md,
  },
  skipText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#ECFDF5',
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successText: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.success,
    fontWeight: '600',
  },
  note: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textDisabled,
    textAlign: 'center',
    lineHeight: 18,
  },
})
