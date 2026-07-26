import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import SecretisButton from '../../components/ui/SecretisButton';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

// ============================================================
// Types
// ============================================================

type MfaScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'Mfa'>;
  route: RouteProp<AuthStackParamList, 'Mfa'>;
};

const VALIDITY_SECONDS = 30;
const CODE_LENGTH = 6;

// ============================================================
// Composant
// ============================================================

export default function MfaScreen({ navigation, route }: MfaScreenProps) {
  const { sessionToken, email } = route.params;
  const { verifyMfa } = useAuth();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(VALIDITY_SECONDS);
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Compte à rebours
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-submit quand 6 chiffres
  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      handleVerify(code);
    }
  }, [code]);

  const handleVerify = async (codeToVerify = code) => {
    if (codeToVerify.length !== CODE_LENGTH) return;
    setLoading(true);
    try {
      await verifyMfa(codeToVerify, sessionToken);
      // AuthProvider redirige automatiquement
    } catch (err: any) {
      // Animation shake
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      setCode('');
      Alert.alert('Code incorrect', err?.message ?? 'Veuillez vérifier votre code TOTP.');
    } finally {
      setLoading(false);
    }
  };

  // Saisie chiffre par chiffre — affichage visuel
  const digits = code.padEnd(CODE_LENGTH, '').split('');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Retour */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textOnPrimary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={36} color={Colors.secondary} />
            </View>
            <Text style={styles.title}>Vérification en 2 étapes</Text>
            <Text style={styles.subtitle}>
              Saisissez le code à 6 chiffres généré par votre application d'authentification
            </Text>
            <Text style={styles.email}>{email}</Text>
          </View>

          {/* Zone de code */}
          <Animated.View style={[styles.codeArea, { transform: [{ translateX: shakeAnim }] }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
              <View style={styles.digitsRow}>
                {digits.map((d, i) => (
                  <View
                    key={i}
                    style={[
                      styles.digitBox,
                      code.length === i && styles.digitBoxActive,
                      code.length > i && styles.digitBoxFilled,
                    ]}
                  >
                    {d.trim() ? (
                      <Text style={styles.digitText}>{d}</Text>
                    ) : code.length === i ? (
                      <View style={styles.cursor} />
                    ) : null}
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {/* Input invisible */}
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              autoFocus
              caretHidden
            />
          </Animated.View>

          {/* Compte à rebours */}
          <View style={styles.countdownRow}>
            <Ionicons
              name="time-outline"
              size={16}
              color={countdown < 10 ? Colors.danger : Colors.textSecondary}
            />
            <Text
              style={[
                styles.countdownText,
                countdown < 10 && { color: Colors.danger },
              ]}
            >
              Valide encore {countdown}s
            </Text>
          </View>

          {/* Bouton valider */}
          <SecretisButton
            label="Valider le code"
            onPress={() => handleVerify()}
            loading={loading}
            disabled={code.length < CODE_LENGTH || countdown === 0}
            fullWidth
            size="lg"
            style={styles.submitBtn}
          />

          {/* Renvoyer */}
          {countdown === 0 && (
            <TouchableOpacity
              onPress={() => {
                setCountdown(VALIDITY_SECONDS);
                setCode('');
                Alert.alert('Info', 'Un nouveau code a été envoyé.');
              }}
            >
              <Text style={styles.resendText}>Renvoyer un code</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  kav: { flex: 1 },
  container: { flex: 1, padding: Spacing.base, alignItems: 'center' },
  backBtn: { alignSelf: 'flex-start', padding: Spacing.sm, marginBottom: Spacing.md },
  header: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing['2xl'] },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '800',
    color: Colors.textOnPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  email: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.secondary,
  },
  codeArea: { width: '100%', alignItems: 'center', marginBottom: Spacing.base },
  digitsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  digitBox: {
    width: 48,
    height: 60,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBoxActive: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  digitBoxFilled: {
    borderColor: Colors.secondary,
    backgroundColor: 'rgba(232,160,32,0.2)',
  },
  digitText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.textOnPrimary,
  },
  cursor: {
    width: 2,
    height: 28,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  countdownText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  submitBtn: { marginBottom: Spacing.lg },
  resendText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.secondary,
    textDecorationLine: 'underline',
  },
});
