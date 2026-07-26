import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useTodayEvents } from '../../hooks/useAgenda';
import SecretisAPI from '../../config/api';
import SecretisCard from '../../components/ui/SecretisCard';
import Avatar from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import { formatTime, formatRelativeTime } from '../../utils/formatting';
import type { KpiData, Notification, AgendaEvent } from '../../types';

// ============================================================
// KPI Card
// ============================================================

interface KpiCardProps {
  icon: string;
  label: string;
  value: number;
  color: string;
  urgent?: boolean;
}

function KpiCard({ icon, label, value, color, urgent }: KpiCardProps) {
  return (
    <SecretisCard style={styles.kpiCard} elevation="md">
      <View style={[styles.kpiIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.kpiValue, urgent && value > 0 ? { color: Colors.danger } : {}]}>
        {value}
      </Text>
      <Text style={styles.kpiLabel} numberOfLines={2}>{label}</Text>
    </SecretisCard>
  );
}

// ============================================================
// Event Timeline Item
// ============================================================

function TimelineItem({ event }: { event: AgendaEvent }) {
  const typeColors: Record<string, string> = {
    REUNION: Colors.primary,
    TACHE: Colors.secondary,
    FORMATION: Colors.info,
    CONGE: Colors.accent,
    RAPPEL: Colors.warning,
    AUTRE: Colors.textSecondary,
  };
  const color = typeColors[event.type] ?? Colors.textSecondary;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineTime}>
        <Text style={styles.timelineHour}>{formatTime(event.startDate)}</Text>
        <View style={[styles.timelineDot, { backgroundColor: color }]} />
      </View>
      <View style={[styles.timelineContent, { borderLeftColor: color }]}>
        <Text style={styles.timelineTitle} numberOfLines={1}>{event.title}</Text>
        {event.location ? (
          <View style={styles.timelineMeta}>
            <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.timelineMetaText} numberOfLines={1}>{event.location}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ============================================================
// Notification Item
// ============================================================

function NotifItem({ notif }: { notif: Notification }) {
  const icons: Record<string, string> = {
    TASK: 'checkmark-circle-outline',
    MAIL: 'mail-outline',
    AGENDA: 'calendar-outline',
    VISITOR: 'person-outline',
    MESSAGE: 'chatbubble-outline',
    SYSTEM: 'information-circle-outline',
  };
  return (
    <View style={styles.notifItem}>
      <Ionicons name={icons[notif.type] as any ?? 'notifications-outline'} size={18} color={Colors.primary} />
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
        <Text style={styles.notifTime}>{formatRelativeTime(notif.createdAt)}</Text>
      </View>
      {!notif.isRead && <View style={styles.notifDot} />}
    </View>
  );
}

// ============================================================
// Écran principal
// ============================================================

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();

  const {
    data: kpi,
    isLoading: kpiLoading,
    refetch: refetchKpi,
  } = useQuery({
    queryKey: ['kpi'],
    queryFn: async () => {
      const { data } = await SecretisAPI.get<KpiData>('/dashboard/kpi');
      return data;
    },
    staleTime: 1000 * 60 * 3,
  });

  const { data: todayEvents = [], refetch: refetchEvents } = useTodayEvents();

  const {
    data: notifications = [],
    refetch: refetchNotifs,
  } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      const { data } = await SecretisAPI.get<Notification[]>('/notifications?limit=3');
      return data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchKpi(), refetchEvents(), refetchNotifs(), refreshUser()]);
    setRefreshing(false);
  }, [refetchKpi, refetchEvents, refetchNotifs, refreshUser]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.firstName ?? 'Utilisateur'} 👋
            </Text>
            <Text style={styles.userRole}>{user?.roleLabel}</Text>
          </View>
          <Avatar
            name={user?.fullName ?? ''}
            uri={user?.avatar}
            size="lg"
            borderColor={Colors.secondary}
          />
        </View>

        {/* KPIs */}
        <Text style={styles.sectionTitle}>Tableau de bord</Text>
        {kpiLoading ? (
          <LoadingSpinner message="Chargement..." />
        ) : (
          <View style={styles.kpiGrid}>
            <KpiCard
              icon="alert-circle"
              label="Tâches en retard"
              value={kpi?.tasksOverdue ?? 0}
              color={Colors.danger}
              urgent
            />
            <KpiCard
              icon="mail"
              label="Courriers non traités"
              value={kpi?.mailsUnprocessed ?? 0}
              color={Colors.warning}
            />
            <KpiCard
              icon="calendar"
              label="Réunions aujourd'hui"
              value={kpi?.meetingsToday ?? 0}
              color={Colors.primary}
            />
            <KpiCard
              icon="people"
              label="Visiteurs présents"
              value={kpi?.visitorsPresent ?? 0}
              color={Colors.accent}
            />
          </View>
        )}

        {/* Timeline du jour */}
        <Text style={styles.sectionTitle}>Agenda du jour</Text>
        <SecretisCard elevation="sm" padding="md" style={styles.timelineCard}>
          {todayEvents.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Ionicons name="calendar-outline" size={32} color={Colors.textDisabled} />
              <Text style={styles.emptyText}>Aucun événement aujourd'hui</Text>
            </View>
          ) : (
            todayEvents.slice(0, 5).map((event) => (
              <TimelineItem key={event.id} event={event} />
            ))
          )}
        </SecretisCard>

        {/* Notifications récentes */}
        <Text style={styles.sectionTitle}>Notifications récentes</Text>
        <SecretisCard elevation="sm" padding="sm" style={styles.notifsCard}>
          {notifications.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Ionicons name="notifications-off-outline" size={28} color={Colors.textDisabled} />
              <Text style={styles.emptyText}>Aucune notification</Text>
            </View>
          ) : (
            notifications.map((n) => <NotifItem key={n.id} notif={n} />)
          )}
        </SecretisCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing.base, gap: Spacing.md, paddingBottom: Spacing['3xl'] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    margin: -Spacing.base,
    marginBottom: 0,
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  headerLeft: { gap: 2 },
  greeting: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.7)' },
  userName: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.textOnPrimary },
  userRole: { fontSize: Typography.fontSize.xs, color: 'rgba(255,255,255,0.6)' },

  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  kpiLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },

  timelineCard: { gap: Spacing.sm },
  timelineItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  timelineTime: { alignItems: 'center', width: 44, gap: 4 },
  timelineHour: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  timelineContent: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    gap: 2,
    paddingBottom: Spacing.xs,
  },
  timelineTitle: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary },
  timelineMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timelineMetaText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, flex: 1 },

  emptyTimeline: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: Typography.fontSize.sm, color: Colors.textDisabled },

  notifsCard: { gap: 0 },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  notifContent: { flex: 1, gap: 2 },
  notifTitle: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  notifTime: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
