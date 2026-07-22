import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery } from '@tanstack/react-query';
import SecretisAPI from '../../config/api';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import { formatRelativeTime, truncate } from '../../utils/formatting';
import type { Conversation } from '../../types';
import type { MessagesStackParamList } from '../../navigation/MainTabNavigator';

type Nav = StackNavigationProp<MessagesStackParamList>;

// ============================================================
// Élément de conversation
// ============================================================

function ConversationItem({ conv, onPress }: { conv: Conversation; onPress: () => void }) {
  const displayName = conv.isGroup
    ? conv.name ?? 'Groupe'
    : conv.participants.find(() => true)?.fullName ?? 'Contact';

  return (
    <TouchableOpacity style={styles.convItem} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.convAvatar}>
        <Avatar name={displayName} uri={conv.avatar} size="md" />
        {conv.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>
              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.convBody}>
        <View style={styles.convTop}>
          <Text style={[styles.convName, conv.unreadCount > 0 && styles.convNameUnread]}>
            {displayName}
          </Text>
          <Text style={styles.convTime}>
            {conv.lastMessage ? formatRelativeTime(conv.lastMessage.sentAt) : ''}
          </Text>
        </View>
        <Text
          style={[styles.convPreview, conv.unreadCount > 0 && styles.convPreviewUnread]}
          numberOfLines={1}
        >
          {conv.lastMessage
            ? truncate(conv.lastMessage.content, 55)
            : 'Aucun message'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================
// Écran
// ============================================================

export default function MessagesScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations', search],
    queryFn: async () => {
      const params = search.trim() ? { search: search.trim() } : {};
      const { data } = await SecretisAPI.get<Conversation[]>('/messages/conversations', { params });
      return data;
    },
    staleTime: 1000 * 30,
  });

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const name = c.isGroup
          ? c.name ?? ''
          : c.participants[0]?.fullName ?? '';
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.composeBtn}>
          <Ionicons name="create-outline" size={22} color={Colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une conversation..."
          placeholderTextColor={Colors.textDisabled}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Liste */}
      {isLoading ? (
        <LoadingSpinner message="Chargement des conversations..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="💬"
          title={search ? 'Aucun résultat' : 'Aucune conversation'}
          description={search ? `Aucune conversation correspondant à "${search}".` : 'Démarrez une nouvelle conversation.'}
          actionLabel="Nouvelle conversation"
          onAction={() => {}}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <ConversationItem
              conv={item}
              onPress={() =>
                navigation.navigate('Conversation', {
                  conversationId: item.id,
                  name: item.isGroup
                    ? item.name ?? 'Groupe'
                    : item.participants[0]?.fullName ?? 'Contact',
                })
              }
            />
          )}
        />
      )}

      {/* FAB nouvelle conversation */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color={Colors.textOnPrimary} />
      </TouchableOpacity>
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
  composeBtn: { padding: Spacing.xs },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    margin: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  searchInput: { flex: 1, fontSize: Typography.fontSize.base, color: Colors.textPrimary },

  list: { paddingBottom: Spacing['4xl'] },
  separator: { height: 1, backgroundColor: Colors.divider, marginLeft: 72 },

  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  convAvatar: { position: 'relative' },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
  unreadCount: { fontSize: 9, fontWeight: '800', color: Colors.textOnPrimary },
  convBody: { flex: 1, gap: 3 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convName: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  convNameUnread: { fontWeight: '800' },
  convTime: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  convPreview: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary },
  convPreviewUnread: { color: Colors.textPrimary, fontWeight: '600' },

  fab: {
    position: 'absolute',
    right: Spacing.base,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.lg,
  },
});
