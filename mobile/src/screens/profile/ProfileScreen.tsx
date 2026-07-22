import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { mmkv, STORAGE_KEYS } from '../../utils/storage';
import SecretisAPI from '../../config/api';
import Avatar from '../../components/ui/Avatar';
import SecretisButton from '../../components/ui/SecretisButton';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';

// ============================================================
// Composant
// ============================================================

export default function ProfileScreen() {
  const { user, refreshUser, enableBiometric, disableBiometric, isBiometricEnabled, biometricAvailable } = useAuth();

  const [biometricEnabled, setBiometricEnabled] = useState(isBiometricEnabled);
  const [notifEnabled, setNotifEnabled] = useState(
    mmkv.getBoolean(STORAGE_KEYS.NOTIFICATIONS_ENABLED) ?? true,
  );
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const updateAvatar = useMutation({
    mutationFn: async (uri: string) => {
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);
      await SecretisAPI.patch('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => refreshUser(),
    onError: (err: any) => Alert.alert('Erreur', err?.message ?? 'Erreur lors du changement de photo.'),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      await SecretisAPI.post('/auth/change-password', {
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
    },
    onSuccess: () => {
      Alert.alert('Succès', 'Mot de passe modifié avec succès.');
      setChangingPassword(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    },
    onError: (err: any) => Alert.alert('Erreur', err?.message ?? 'Impossible de changer le mot de passe.'),
  });

  const handlePickAvatar = async () => {
    Alert.alert('Changer la photo', 'Choisissez une source', [
      {
        text: 'Caméra',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
          if (!result.canceled) updateAvatar.mutate(result.assets[0].uri);
        },
      },
      {
        text: 'Galerie',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
          if (!result.canceled) updateAvatar.mutate(result.assets[0].uri);
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleBiometricToggle = async (val: boolean) => {
    if (val) {
      const ok = await enableBiometric();
      if (ok) setBiometricEnabled(true);
    } else {
      disableBiometric();
      setBiometricEnabled(false);
    }
  };

  const handleNotifToggle = (val: boolean) => {
    setNotifEnabled(val);
    mmkv.setBoolean(STORAGE_KEYS.NOTIFICATIONS_ENABLED, val);
  };

  const handleChangePassword = () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      Alert.alert('Champs requis', 'Remplissez tous les champs.');
      return;
    }
    if (newPwd !== confirmPwd) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPwd.length < 8) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    changePassword.mutate();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Avatar
              name={user?.fullName ?? ''}
              uri={user?.avatar}
              size="xl"
              borderColor={Colors.secondary}
            />
            <TouchableOpacity style={styles.cameraBtn} onPress={handlePickAvatar}>
              <Ionicons name="camera" size={16} color={Colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.fullName}</Text>
          <Text style={styles.userRole}>{user?.roleLabel}</Text>
        </View>

        {/* Infos du profil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline" label="Nom complet" value={user?.fullName ?? '—'} />
            <Divider />
            <InfoRow icon="mail-outline" label="Email" value={user?.email ?? '—'} />
            <Divider />
            <InfoRow icon="call-outline" label="Téléphone" value={user?.phone ?? '—'} />
            <Divider />
            <InfoRow icon="briefcase-outline" label="Rôle" value={user?.roleLabel ?? '—'} />
            <Divider />
            <InfoRow icon="business-outline" label="Organisation" value={user?.organisation ?? '—'} />
          </View>
        </View>

        {/* Sécurité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <View style={styles.card}>
            {biometricAvailable && (
              <>
                <View style={styles.switchRow}>
                  <Ionicons name="finger-print-outline" size={20} color={Colors.primary} />
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchTitle}>Biométrie (Face ID / Empreinte)</Text>
                    <Text style={styles.switchSub}>Connexion rapide et sécurisée</Text>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.textOnPrimary}
                  />
                </View>
                <Divider />
              </>
            )}

            {!changingPassword ? (
              <TouchableOpacity style={styles.actionRow} onPress={() => setChangingPassword(true)}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
                <Text style={styles.actionLabel}>Changer le mot de passe</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                <PwdInput
                  placeholder="Mot de passe actuel"
                  value={currentPwd}
                  onChangeText={setCurrentPwd}
                />
                <PwdInput
                  placeholder="Nouveau mot de passe"
                  value={newPwd}
                  onChangeText={setNewPwd}
                />
                <PwdInput
                  placeholder="Confirmer le nouveau mot de passe"
                  value={confirmPwd}
                  onChangeText={setConfirmPwd}
                />
                <View style={styles.pwdActions}>
                  <SecretisButton
                    label="Annuler"
                    onPress={() => setChangingPassword(false)}
                    variant="outline"
                    size="sm"
                    style={{ flex: 1 }}
                  />
                  <SecretisButton
                    label="Confirmer"
                    onPress={handleChangePassword}
                    loading={changePassword.isPending}
                    size="sm"
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>Notifications push</Text>
                <Text style={styles.switchSub}>Recevoir les alertes en temps réel</Text>
              </View>
              <Switch
                value={notifEnabled}
                onValueChange={handleNotifToggle}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textOnPrimary}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// Helpers
// ============================================================

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color={Colors.primary} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function PwdInput({
  placeholder,
  value,
  onChangeText,
}: {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.pwdInput}>
      <TextInput
        style={styles.pwdField}
        placeholder={placeholder}
        placeholderTextColor={Colors.textDisabled}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={() => setShow(!show)}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.xl, paddingBottom: Spacing['4xl'] },

  avatarSection: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  avatarWrapper: { position: 'relative' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.surface,
  },
  userName: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  userRole: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },

  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: Spacing.xs },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, ...Shadow.sm, overflow: 'hidden' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  infoContent: { flex: 1, gap: 2 },
  infoLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: Typography.fontSize.base, color: Colors.textPrimary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 54 },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  switchLabel: { flex: 1, gap: 2 },
  switchTitle: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary },
  switchSub: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  actionLabel: { flex: 1, fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary },

  passwordForm: { padding: Spacing.md, gap: Spacing.sm },
  pwdInput: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  pwdField: { flex: 1, fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  pwdActions: { flexDirection: 'row', gap: Spacing.sm },
});
