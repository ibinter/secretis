import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTask, useUpdateTaskStatus, useToggleSubtask, useAddComment } from '../../hooks/useTasks';
import StatusBadge, { PriorityBadge } from '../../components/ui/StatusBadge';
import { AvatarGroup } from '../../components/ui/Avatar';
import Avatar from '../../components/ui/Avatar';
import SecretisButton from '../../components/ui/SecretisButton';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import { formatDateTime, formatRelativeTime, isOverdue } from '../../utils/formatting';
import type { SecretisStatus } from '../../types';
import type { TasksStackParamList } from '../../navigation/MainTabNavigator';

type Props = {
  navigation: StackNavigationProp<TasksStackParamList, 'TaskDetail'>;
  route: RouteProp<TasksStackParamList, 'TaskDetail'>;
};

const NEXT_STATUSES: Partial<Record<SecretisStatus, SecretisStatus>> = {
  EN_ATTENTE: 'EN_COURS',
  EN_COURS: 'TERMINE',
  SOUMIS: 'EN_REVISION',
  EN_REVISION: 'APPROUVE',
};

const STATUS_LABELS: Partial<Record<SecretisStatus, string>> = {
  EN_COURS: 'Démarrer',
  TERMINE: 'Marquer terminé',
  EN_REVISION: 'Soumettre en révision',
  APPROUVE: 'Approuver',
};

export default function TaskDetailScreen({ navigation, route }: Props) {
  const { taskId } = route.params;
  const { data: task, isLoading } = useTask(taskId);
  const updateStatus = useUpdateTaskStatus();
  const toggleSubtask = useToggleSubtask();
  const addComment = useAddComment();

  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  if (isLoading) return <LoadingSpinner fullScreen message="Chargement de la tâche..." />;
  if (!task) return <LoadingSpinner fullScreen message="Tâche introuvable" />;

  const nextStatus = NEXT_STATUSES[task.status];
  const overdue = isOverdue(task.dueDate) && task.status !== 'TERMINE';

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      await addComment.mutateAsync({ taskId, content: commentText.trim() });
      setCommentText('');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Erreur lors de l\'envoi du commentaire.');
    } finally {
      setSendingComment(false);
    }
  };

  const completedSubtasks = task.subtasks.filter((s) => s.isCompleted).length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* En-tête */}
          {overdue && (
            <View style={styles.overdueBanner}>
              <Ionicons name="warning" size={16} color={Colors.danger} />
              <Text style={styles.overdueText}>Cette tâche est en retard</Text>
            </View>
          )}

          <Text style={styles.title}>{task.title}</Text>

          <View style={styles.badges}>
            <StatusBadge status={task.status} size="md" />
            <PriorityBadge priority={task.priority} size="md" />
          </View>

          {/* Infos */}
          <View style={styles.infoCard}>
            <InfoRow icon="person-outline" label="Créé par">
              <Text style={styles.infoVal}>{task.createdBy.fullName}</Text>
            </InfoRow>
            {task.dueDate && (
              <InfoRow icon="calendar-outline" label="Échéance">
                <Text style={[styles.infoVal, overdue && { color: Colors.danger, fontWeight: '700' }]}>
                  {formatDateTime(task.dueDate)}
                </Text>
              </InfoRow>
            )}
            <InfoRow icon="time-outline" label="Créé le">
              <Text style={styles.infoVal}>{formatDateTime(task.createdAt)}</Text>
            </InfoRow>
            <InfoRow icon="refresh-outline" label="Modifié le">
              <Text style={styles.infoVal}>{formatDateTime(task.updatedAt)}</Text>
            </InfoRow>
          </View>

          {/* Description */}
          {task.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{task.description}</Text>
            </View>
          ) : null}

          {/* Assignés */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assignés ({task.assignedTo.length})</Text>
            <AvatarGroup
              users={task.assignedTo.map((u) => ({ name: u.fullName, avatar: u.avatar }))}
              max={6}
              size="md"
            />
          </View>

          {/* Sous-tâches */}
          {task.subtasks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.subtaskHeader}>
                <Text style={styles.sectionTitle}>
                  Sous-tâches ({completedSubtasks}/{task.subtasks.length})
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(completedSubtasks / task.subtasks.length) * 100}%` },
                    ]}
                  />
                </View>
              </View>
              {task.subtasks.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={styles.subtaskRow}
                  onPress={() =>
                    toggleSubtask.mutate({
                      taskId,
                      subtaskId: sub.id,
                      completed: !sub.isCompleted,
                    })
                  }
                >
                  <Ionicons
                    name={sub.isCompleted ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={sub.isCompleted ? Colors.accent : Colors.border}
                  />
                  <Text style={[styles.subtaskTitle, sub.isCompleted && styles.subtaskDone]}>
                    {sub.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Commentaires */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Commentaires ({task.comments.length})</Text>
            {task.comments.map((comment) => (
              <View key={comment.id} style={styles.commentItem}>
                <Avatar name={comment.author.fullName} uri={comment.author.avatar} size="sm" />
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.author.fullName}</Text>
                    <Text style={styles.commentTime}>{formatRelativeTime(comment.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              </View>
            ))}

            {/* Input commentaire */}
            <View style={styles.commentInput}>
              <TextInput
                style={styles.commentField}
                placeholder="Ajouter un commentaire..."
                placeholderTextColor={Colors.textDisabled}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !commentText.trim() && { opacity: 0.4 }]}
                onPress={handleSendComment}
                disabled={!commentText.trim() || sendingComment}
              >
                <Ionicons name="send" size={18} color={Colors.textOnPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bouton de changement de statut */}
        {nextStatus && (
          <View style={styles.footer}>
            <SecretisButton
              label={STATUS_LABELS[nextStatus] ?? `Passer à : ${nextStatus}`}
              onPress={() =>
                updateStatus.mutate({ id: taskId, status: nextStatus })
              }
              loading={updateStatus.isPending}
              fullWidth
              size="lg"
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={Colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.base, paddingBottom: Spacing['2xl'] },
  overdueBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: `${Colors.danger}15`, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.danger,
  },
  overdueText: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: Colors.danger },
  title: { fontSize: Typography.fontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  badges: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  infoCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md,
    gap: Spacing.sm, ...Shadow.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoLabel: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, fontWeight: '500', flex: 1 },
  infoVal: { fontSize: Typography.fontSize.sm, color: Colors.textPrimary, fontWeight: '600' },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.textPrimary },
  description: { fontSize: Typography.fontSize.base, color: Colors.textSecondary, lineHeight: 24 },
  subtaskHeader: { gap: Spacing.xs },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accent },
  subtaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  subtaskTitle: { flex: 1, fontSize: Typography.fontSize.base, color: Colors.textPrimary },
  subtaskDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  commentItem: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  commentBody: {
    flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    padding: Spacing.sm, gap: 4,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentAuthor: { fontSize: Typography.fontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  commentTime: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  commentText: { fontSize: Typography.fontSize.sm, color: Colors.textPrimary },
  commentInput: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm,
  },
  commentField: { flex: 1, fontSize: Typography.fontSize.base, color: Colors.textPrimary, maxHeight: 100 },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  footer: { padding: Spacing.base, backgroundColor: Colors.surface, ...Shadow.lg },
});
