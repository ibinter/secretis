import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { useEventsByDate, useDeleteEvent, useEventDates } from '../../hooks/useAgenda';
import SecretisCard from '../../components/ui/SecretisCard';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import { formatTime, formatDateRange } from '../../utils/formatting';
import type { AgendaEvent } from '../../types';
import type { AgendaStackParamList } from '../../navigation/MainTabNavigator';

dayjs.locale('fr');

type Nav = StackNavigationProp<AgendaStackParamList>;

// ============================================================
// Bande de dates horizontale
// ============================================================

function DateStrip({
  selectedDate,
  onSelectDate,
  eventDates,
}: {
  selectedDate: string;
  onSelectDate: (d: string) => void;
  eventDates: string[];
}) {
  const today = dayjs();
  const days = Array.from({ length: 30 }, (_, i) => today.add(i - 7, 'day'));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.stripContent}
    >
      {days.map((d) => {
        const key = d.format('YYYY-MM-DD');
        const isSelected = key === selectedDate;
        const isToday = d.isSame(today, 'day');
        const hasEvent = eventDates.includes(key);

        return (
          <TouchableOpacity
            key={key}
            onPress={() => onSelectDate(key)}
            style={[styles.dayCell, isSelected && styles.dayCellSelected]}
            activeOpacity={0.7}
          >
            <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
              {d.format('ddd').toUpperCase()}
            </Text>
            <Text style={[styles.dayNum, isToday && styles.dayNumToday, isSelected && styles.dayNumSelected]}>
              {d.format('D')}
            </Text>
            {hasEvent ? (
              <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />
            ) : (
              <View style={styles.eventDotPlaceholder} />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ============================================================
// Carte événement
// ============================================================

function EventCard({
  event,
  onPress,
  onDelete,
}: {
  event: AgendaEvent;
  onPress: () => void;
  onDelete: () => void;
}) {
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
    <Pressable
      onPress={onPress}
      onLongPress={onDelete}
      style={({ pressed }) => [styles.eventCard, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.eventAccent, { backgroundColor: color }]} />
      <View style={styles.eventBody}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.eventTime}>
          {event.allDay ? 'Toute la journée' : formatDateRange(event.startDate, event.endDate)}
        </Text>
        {event.location ? (
          <View style={styles.eventMeta}>
            <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.eventMetaText} numberOfLines={1}>{event.location}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.eventRight}>
        <Text style={[styles.eventType, { color }]}>{event.type}</Text>
        <Text style={styles.eventParticipants}>{event.participants.length} participants</Text>
      </View>
    </Pressable>
  );
}

// ============================================================
// Écran
// ============================================================

export default function AgendaScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));

  const year = dayjs(selectedDate).year();
  const month = dayjs(selectedDate).month() + 1;
  const eventDates = useEventDates(year, month);

  const { data: events = [], isLoading, refetch } = useEventsByDate(selectedDate);
  const deleteEvent = useDeleteEvent();

  const handleDelete = useCallback((event: AgendaEvent) => {
    Alert.alert(
      'Supprimer l\'événement',
      `Voulez-vous supprimer "${event.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => deleteEvent.mutate(event.id),
        },
      ],
    );
  }, [deleteEvent]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerMonth}>
            {dayjs(selectedDate).format('MMMM YYYY')}
          </Text>
          <Text style={styles.headerSub}>
            {dayjs(selectedDate).isToday() ? "Aujourd'hui" : dayjs(selectedDate).format('dddd D')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Créer', 'Formulaire de création d\'événement')}
        >
          <Ionicons name="add" size={24} color={Colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {/* Bande de dates */}
      <View style={styles.stripContainer}>
        <DateStrip
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          eventDates={eventDates}
        />
      </View>

      {/* Liste des événements */}
      {isLoading ? (
        <LoadingSpinner message="Chargement des événements..." />
      ) : events.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Aucun événement"
          description="Vous n'avez aucun événement ce jour."
          actionLabel="Créer un événement"
          onAction={() => Alert.alert('Créer', 'Formulaire de création')}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Shadow.sm,
  },
  headerMonth: { fontSize: Typography.fontSize.lg, fontWeight: '800', color: Colors.textOnPrimary },
  headerSub: { fontSize: Typography.fontSize.sm, color: 'rgba(255,255,255,0.65)', textTransform: 'capitalize' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stripContainer: { backgroundColor: Colors.surface, ...Shadow.sm },
  stripContent: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, gap: Spacing.xs },
  dayCell: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    minWidth: 48,
    gap: 2,
  },
  dayCellSelected: { backgroundColor: Colors.primary },
  dayName: { fontSize: 9, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 },
  dayNameSelected: { color: 'rgba(255,255,255,0.75)' },
  dayNum: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.textPrimary },
  dayNumToday: { color: Colors.secondary },
  dayNumSelected: { color: Colors.textOnPrimary },
  eventDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.secondary },
  eventDotSelected: { backgroundColor: Colors.textOnPrimary },
  eventDotPlaceholder: { width: 5, height: 5 },

  list: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: Spacing['4xl'] },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  eventAccent: { width: 5 },
  eventBody: { flex: 1, padding: Spacing.md, gap: 3 },
  eventTitle: { fontSize: Typography.fontSize.base, fontWeight: '700', color: Colors.textPrimary },
  eventTime: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  eventMetaText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, flex: 1 },
  eventRight: { padding: Spacing.md, alignItems: 'flex-end', gap: 4 },
  eventType: { fontSize: Typography.fontSize.xs, fontWeight: '700' },
  eventParticipants: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
});
