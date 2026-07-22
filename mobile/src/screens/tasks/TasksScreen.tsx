import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTasks, useUpdateTaskStatus } from '../../hooks/useTasks';
import StatusBadge, { PriorityBadge } from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Avatar from '../../components/ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import { formatDate, isOverdue } from '../../utils/formatting';
import type { Task, SecretisStatus } from '../../types';
import type { TasksStackParamList } from '../../navigation/MainTabNavigator';

type Nav = StackNavigationProp<TasksStackParamList>;

// ============================================================
// Onglets
// ============================================================

type TabId = 'mine' | 'all' | 'overdue';

const TABS: { id: TabId; label: string }[] = [
  { id: 'mine', label: 'Mes tâches' },
  { id: 'all', label: 'Toutes' },
  { id: 'overdue', label: 'En retard' },
];

// ============================================================
// Chips de filtre
// ============================================================

const STATUS_FILTERS: Array<{ label: string; value: SecretisStatus | 'ALL' }> = [
  { label: 'Tout', value: 'ALL' },
  { label: 'En cours', value: 'EN_COURS' },
  { label: 'En attente', value: 'EN_ATTENTE' },
  { label: 'Terminé', value: 'TERMINE' },
  { label: 'Annulé', value: 'ANNULE' },
];

// ============================================================
// Carte de tâche
// ============================================================

function TaskCard({
  task,
  onPress,
  onComplete,
}: {
  task: Task;
  onPress: () => void;
  onComplete: () => void;
}) {
  const overdue = isOverdue(task.dueDate) && task.status !== 'TERMINE';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.taskCard, pressed && { opacity: 0.88 }]}
    >
      {/* Indicateur de retard */}
      {overdue && <View style={styles.overdueBar} />}

      <View style={styles.taskContent}>
        {/* Checkbox */}
        <TouchableOpacity style={styles.checkBtn} onPress={onComplete} hitSlop={12}>
          <Ionicons
            name={task.status === 'TERMINE' ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={task.status === 'TERMINE' ? Colors.accent : Colors.border}
          />
        </TouchableOpacity>

        <View style={styles.taskBody}>
          <Text
            style={[styles.taskTitle, task.status === 'TERMINE' && styles.taskTitleDone]}
            numberOfLines={2}
          >
            {task.title}
          </Text>

          <View style={styles.taskMeta}>
            <StatusBadge status={task.status} size="sm" />
            <PriorityBadge priority={task.priority} size="sm" />
          </View>

          {task.dueDate && (
            <View style={styles.taskDue}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={overdue ? Colors.danger : Colors.textSecondary}
              />
              <Text style={[styles.taskDueText, overdue && styles.taskDueOverdue]}>
                {overdue ? 'En retard — ' : ''}{formatDate(task.dueDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Assignés */}
        {task.assignedTo.length > 0 && (
          <View style={styles.taskAssignee}>
            <Avatar
              name={task.assignedTo[0].fullName}
              uri={task.assignedTo[0].avatar}
              size="sm"
            />
            {task.assignedTo.length > 1 && (
              <Text style={styles.moreAssignees}>+{task.assignedTo.length - 1}</Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ============================================================
// Écran
// ============================================================

export default function TasksScreen() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<TabId>('mine');
  const [statusFilter, setStatusFilter] = useState<SecretisStatus | 'ALL'>('ALL');

  const filters = {
    assignedToMe: activeTab === 'mine',
    status: activeTab === 'overdue' ? ('OVERDUE' as any) : statusFilter,
    pageSize: 50,
  };

  const { data, isLoading, refetch } = useTasks(filters);
  const updateStatus = useUpdateTaskStatus();

  const tasks = data?.data ?? [];

  const handleComplete = useCallback(
    (task: Task) => {
      if (task.status === 'TERMINE') return;
      Alert.alert('Marquer comme terminé', `"${task.title}"`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminer',
          onPress: () => updateStatus.mutate({ id: task.id, status: 'TERMINE' }),
        },
      ]);
    },
    [updateStatus],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tâches</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => Alert.alert('Créer', 'Formulaire de création de tâche')}
        >
          <Ionicons name="add" size={24} color={Colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtres status */}
      {activeTab !== 'overdue' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.chip, statusFilter === f.value && styles.chipActive]}
              onPress={() => setStatusFilter(f.value)}
            >
              <Text style={[styles.chipText, statusFilter === f.value && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Liste */}
      {isLoading ? (
        <LoadingSpinner message="Chargement des tâches..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="✅"
          title={activeTab === 'overdue' ? 'Aucune tâche en retard' : 'Aucune tâche'}
          description={
            activeTab === 'overdue'
              ? 'Félicitations ! Vous êtes à jour.'
              : 'Aucune tâche trouvée pour ces filtres.'
          }
          actionLabel="Créer une tâche"
          onAction={() => Alert.alert('Créer', 'Formulaire de création')}
        />
      ) : (
        <FlashList
          data={tasks}
          keyExtractor={(item) => item.id}
          estimatedItemSize={120}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
              onComplete={() => handleComplete(item)}
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
  headerTitle: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.textOnPrimary },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },

  filtersContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: Colors.textOnPrimary },

  listContent: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },

  taskCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  overdueBar: { width: 4, backgroundColor: Colors.danger },
  taskContent: { flex: 1, flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm, alignItems: 'flex-start' },
  checkBtn: { paddingTop: 2 },
  taskBody: { flex: 1, gap: Spacing.xs },
  taskTitle: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  taskMeta: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  taskDue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskDueText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  taskDueOverdue: { color: Colors.danger, fontWeight: '600' },
  taskAssignee: { alignItems: 'center', gap: 2 },
  moreAssignees: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
});
