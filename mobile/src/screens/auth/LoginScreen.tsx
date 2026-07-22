import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { mmkv, STORAGE_KEYS } from '../../utils/storage';
import SecretisButton from '../../components/ui/SecretisButton';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

// ============================================================
// Types
// ============================================================

type LoginScreenProps = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

// ============================================================
// Composant
// ============================================================

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { login, loginWithBiometric, isBiometricEnabled, biometricAvailable } = useAuth();

  const [email, setEmail] = useState(
    () => mmkv.getString(STORAGE_KEYS.SAVED_EMAIL) ?? '',
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez saisir votre email et votre mot de passe.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      // Mémoriser l'email
      mmkv.setString(STORAGE_KEYS.SAVED_EMAIL, email.trim());

      if (result.requiresMfa && result.sessionToken) {
        navigation.navigate('Mfa', { sessionToken: result.sessionToken, email: email.trim() });
      }
      // Si pas de MFA, l'AuthProvider s'occupe de la redirection
    } catch (err: any) {
      Alert.alert('Erreur de connexion', err?.message ?? 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setBioLoading(true);
    try {
      await loginWithBiometric();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Authentification biométrique échouée.');
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header / Logo */}
          <Animated.View style={[styles.header, { transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoLetter}>S</Text>
            </View>
            <Text style={styles.appName}>IBIG SECRETIS</Text>
            <Text style={styles.tagline}>Système de Gestion Intégrée</Text>
          </Animated.View>

          {/* Formulaire */}
          <Animated.View style={[styles.form, { opacity: fadeAnim }]}>
            <Text style={styles.formTitle}>Connexion</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adresse email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="exemple@organisation.com"
                  placeholderTextColor={Colors.textDisabled}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Mot de passe */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textDisabled}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Mot de passe oublié */}
            <TouchableOpacity
              style={styles.forgotLink}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Bouton connexion */}
            <SecretisButton
              label="Se connecter"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={styles.loginBtn}
            />

            {/* Biométrie */}
            {biometricAvailable && isBiometricEnabled && (
              <TouchableOpacity
                style={styles.bioBtn}
                onPress={handleBiometric}
                disabled={bioLoading}
              >
                <Ionicons
                  name={Platform.OS === 'ios' ? 'finger-print' : 'finger-print'}
                  size={28}
                  color={Colors.primary}
                />
                <Text style={styles.bioText}>
                  {Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Empreinte digitale'}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Footer */}
          <Text style={styles.footer}>IBIG Soft © {new Date().getFullYear()} • v1.0.0</Text>
        </ScrollView>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing['2xl'],
    gap: Spacing.sm,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
  logoLetter: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.textOnPrimary,
  },
  appName: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '800',
    color: Colors.textOnPrimary,
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: Typography.fontSize.sm,
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.5,
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadow.lg,
    gap: Spacing.base,
  },
  formTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  inputGroup: { gap: Spacing.xs },
  inputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    minHeight: 50,
  },
  inputIcon: { marginRight: Spacing.sm },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  eyeBtn: { padding: Spacing.xs },
  forgotLink: { alignSelf: 'flex-end' },
  forgotText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginBtn: { marginTop: Spacing.xs },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  bioText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.primary,
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xl,
  },
});
