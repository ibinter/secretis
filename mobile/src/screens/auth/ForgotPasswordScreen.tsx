import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import SecretisAPI from '../../config/api';
import SecretisButton from '../../components/ui/SecretisButton';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = { navigation: StackNavigationProp<AuthStackParamList, 'ForgotPassword'> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await SecretisAPI.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textOnPrimary} />
          </TouchableOpacity>

          {sent ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={56} color={Colors.accent} />
              <Text style={styles.title}>Email envoyé !</Text>
              <Text style={styles.subtitle}>
                Consultez votre boîte mail {'\n'}
                <Text style={{ fontWeight: '700' }}>{email}</Text>
                {'\n'}pour réinitialiser votre mot de passe.
              </Text>
              <SecretisButton
                label="Retour à la connexion"
                onPress={() => navigation.navigate('Login')}
                variant="outline"
                size="md"
                style={{ marginTop: Spacing.xl, borderColor: Colors.textOnPrimary }}
                textStyle={{ color: Colors.textOnPrimary }}
              />
            </View>
          ) : (
            <View style={[styles.form, Shadow.lg]}>
              <Ionicons name="key-outline" size={40} color={Colors.primary} style={{ alignSelf: 'center' }} />
              <Text style={styles.formTitle}>Mot de passe oublié</Text>
              <Text style={styles.formSub}>
                Entrez votre adresse email pour recevoir un lien de réinitialisation.
              </Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="votre@email.com"
                  placeholderTextColor={Colors.textDisabled}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
              </View>
              <SecretisButton
                label="Envoyer le lien"
                onPress={handleSubmit}
                loading={loading}
                disabled={!email.trim()}
                fullWidth
                size="lg"
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  kav: { flex: 1 },
  container: { flex: 1, padding: Spacing.base, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: Spacing.base, left: Spacing.base, padding: Spacing.sm, zIndex: 10 },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.base,
  },
  formTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  formSub: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    minHeight: 50,
  },
  input: { flex: 1, fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  successBox: { alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: Colors.textOnPrimary, textAlign: 'center' },
  subtitle: { fontSize: Typography.fontSize.base, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24 },
});
