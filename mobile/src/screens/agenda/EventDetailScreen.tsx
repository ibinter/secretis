import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useEvent, useDeleteEvent } from '../../hooks/useAgenda';
import { AvatarGroup } from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import SecretisButton from '../../components/ui/SecretisButton';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import { formatDateRange } from '../../utils/formatting';
import type { AgendaStackParamList } from '../../navigation/MainTabNavigator';

type Props = {
  navigation: StackNavigationProp<AgendaStackParamList, 'EventDetail'>;
  route: RouteProp<AgendaStackParamList, 'EventDetail'>;
};

export default function EventDetailScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const { data: event, isLoading } = useEvent(eventId);
  const deleteEvent = useDeleteEvent();

  if (isLoading) return <LoadingSpinner fullScreen message="Chargement de l'événement..." />;
  if (!event) return <LoadingSpinner fullScreen message="Événement introuvable" />;

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'événement',
      `Voulez-vous supprimer "${event.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteEvent.mutateAsync(event.id);
            navigation.goBack();
          },
        },
      ],
    );
  };

  const handleJoin = () => {
    if (event.onlineLink) {
      Linking.openURL(event.onlineLink);
    }
  };

  const typeColors: Record<string, string> = {
    REUNION: Colors.primary,
    TACHE: Colors.secondary,
    FORMATION: Colors.info,
    CONGE: Colors.accent,
    RAPPEL: Colors.warning,
    AUTRE: Colors.textSecondary,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Badge type */}
        <View style={[styles.typeBanner, { backgroundColor: typeColors[event.type] ?? Colors.primary }]}>
          <Text style={styles.typeText}>{event.type}</Text>
        </View>

        {/* Titre */}
        <Text style={styles.title}>{event.title}</Text>

        <StatusBadge status={event.status} size="md" />

        {/* Infos */}
        <View style={styles.infoSection}>
          <InfoRow icon="time-outline" label="Date et heure">
            <Text style={styles.infoValue}>
              {event.allDay ? 'Toute la journée' : formatDateRange(event.startDate, event.endDate)}
            </Text>
          </InfoRow>

          {event.location && (
            <InfoRow icon="location-outline" label="Lieu">
              <Text style={styles.infoValue}>{event.location}</Text>
            </InfoRow>
          )}

          {event.onlineLink && (
            <InfoRow icon="videocam-outline" label="Lien en ligne">
              <TouchableOpacity onPress={handleJoin}>
                <Text style={[styles.infoValue, styles.link]}>{event.onlineLink}</Text>
              </TouchableOpacity>
            </InfoRow>
          )}

          <InfoRow icon="person-outline" label="Organisateur">
            <Text style={styles.infoValue}>{event.organizer.fullName}</Text>
          </InfoRow>
        </View>

        {/* Description */}
        {event.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        ) : null}

        {/* Participants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Participants ({event.participants.length})
          </Text>
          <AvatarGroup
            users={event.participants.map((p) => ({ name: p.fullName, avatar: p.avatar }))}
            max={6}
            size="md"
          />
          <View style={styles.participantList}>
            {event.participants.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <Text style={styles.participantName}>{p.fullName}</Text>
                <Text style={styles.participantRole}>{p.roleLabel}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Actions bas d'écran */}
      <View style={styles.footer}>
        {event.onlineLink ? (
          <SecretisButton
            label="Rejoindre la réunion"
            onPress={handleJoin}
            variant="primary"
            fullWidth
            leftIcon={<Ionicons name="videocam" size={18} color={Colors.textOnPrimary} />}
          />
        ) : null}
        <View style={styles.footerActions}>
          <SecretisButton
            label="Modifier"
            onPress={() => Alert.alert('Modifier', 'Formulaire de modification')}
            variant="outline"
            style={{ flex: 1 }}
            leftIcon={<Ionicons name="pencil-outline" size={16} color={Colors.primary} />}
          />
          <SecretisButton
            label="Supprimer"
            onPress={handleDelete}
            variant="danger"
            loading={deleteEvent.isPending}
            style={{ flex: 1 }}
            leftIcon={<Ionicons name="trash-outline" size={16} color={Colors.textOnPrimary} />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color={Colors.primary} style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing['2xl'] },
  typeBanner: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  typeText: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: Colors.textOnPrimary, letterSpacing: 1 },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: '800', color: Colors.textPrimary },
  infoSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  infoRow: { flexDirection: 'row', gap: Spacing.sm },
  infoIcon: { marginTop: 2 },
  infoContent: { flex: 1, gap: 2 },
  infoLabel: { fontSize: Typography.fontSize.xs, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  link: { color: Colors.primary, textDecorationLine: 'underline' },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.textPrimary },
  description: { fontSize: Typography.fontSize.base, color: Colors.textSecondary, lineHeight: 24 },
  participantList: { gap: Spacing.sm, marginTop: Spacing.sm },
  participantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  participantName: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary },
  participantRole: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  footer: { padding: Spacing.base, backgroundColor: Colors.surface, gap: Spacing.sm, ...Shadow.lg },
  footerActions: { flexDirection: 'row', gap: Spacing.sm },
});
