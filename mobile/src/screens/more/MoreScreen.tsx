import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../../components/ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import type { MoreStackParamList } from '../../navigation/MainTabNavigator';

type Nav = StackNavigationProp<MoreStackParamList>;

// ============================================================
// Types
// ============================================================

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  sublabel?: string;
  color?: string;
  onPress: () => void;
  badge?: number;
}

// ============================================================
// Composants
// ============================================================

function MenuGroup({ title, items }: { title?: string; items: MenuItem[] }) {
  return (
    <View style={styles.group}>
      {title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.groupCard}>
        {items.map((item, i) => (
          <React.Fragment key={item.id}>
            <TouchableOpacity style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.menuIcon, { backgroundColor: `${item.color ?? Colors.primary}18` }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color ?? Colors.primary} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.sublabel && <Text style={styles.menuSublabel}>{item.sublabel}</Text>}
              </View>
              {item.badge ? (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{item.badge}</Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
            {i < items.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ============================================================
// Écran
// ============================================================

export default function MoreScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: logout },
      ],
    );
  };

  const mainMenuItems: MenuItem[] = [
    {
      id: 'mail',
      icon: 'mail',
      label: 'Courriers',
      sublabel: 'Gestion du courrier entrant/sortant',
      onPress: () => Alert.alert('Courriers', 'Module courriers'),
    },
    {
      id: 'visitors',
      icon: 'people',
      label: 'Visiteurs',
      sublabel: 'Registre des visiteurs',
      onPress: () => Alert.alert('Visiteurs', 'Module visiteurs'),
    },
    {
      id: 'resources',
      icon: 'cube',
      label: 'Ressources',
      sublabel: 'Réservation salles & équipements',
      color: Colors.info,
      onPress: () => Alert.alert('Ressources', 'Module ressources'),
    },
    {
      id: 'reports',
      icon: 'bar-chart',
      label: 'Rapports',
      sublabel: 'Tableaux de bord et statistiques',
      color: Colors.secondary,
      onPress: () => Alert.alert('Rapports', 'Module rapports'),
    },
  ];

  const userMenuItems: MenuItem[] = [
    {
      id: 'profile',
      icon: 'person-circle',
      label: 'Mon profil',
      sublabel: user?.email,
      onPress: () => navigation.navigate('Profile'),
    },
    {
      id: 'settings',
      icon: 'settings',
      label: 'Paramètres',
      sublabel: 'Notifications, sécurité, langue',
      color: Colors.textSecondary,
      onPress: () => Alert.alert('Paramètres', 'Écran des paramètres'),
    },
  ];

  const dangerItems: MenuItem[] = [
    {
      id: 'logout',
      icon: 'log-out',
      label: 'Se déconnecter',
      color: Colors.danger,
      onPress: handleLogout,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plus</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Carte utilisateur */}
        <View style={styles.userCard}>
          <Avatar name={user?.fullName ?? ''} uri={user?.avatar} size="lg" borderColor={Colors.secondary} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.fullName}</Text>
            <Text style={styles.userRole}>{user?.roleLabel}</Text>
            <Text style={styles.userOrg}>{user?.organisation}</Text>
          </View>
        </View>

        <MenuGroup title="Modules" items={mainMenuItems} />
        <MenuGroup title="Compte" items={userMenuItems} />
        <MenuGroup items={dangerItems} />

        {/* Info version */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>IBIG SECRETIS Mobile v1.0.0</Text>
          <Text style={styles.versionText}>
            Environnement : {process.env.APP_ENV ?? 'production'}
          </Text>
          <Text style={styles.versionText}>IBIG Soft © {new Date().getFullYear()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Shadow.sm,
  },
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.textOnPrimary },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing['4xl'] },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadow.md,
  },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: Typography.fontSize.md, fontWeight: '800', color: Colors.textOnPrimary },
  userRole: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  userOrg: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.55)' },

  group: { gap: Spacing.sm },
  groupTitle: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: Spacing.xs },
  groupCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, ...Shadow.sm, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.base },
  menuIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, gap: 1 },
  menuLabel: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary },
  menuSublabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  menuBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  menuBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.textOnPrimary },
  divider: { height: 1, backgroundColor: Colors.divider, marginLeft: 70 },

  versionInfo: { alignItems: 'center', gap: 4, paddingTop: Spacing.sm },
  versionText: { fontSize: Typography.fontSize.xs, color: Colors.textDisabled },
});
