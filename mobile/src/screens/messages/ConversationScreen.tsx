import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import SecretisAPI from '../../config/api';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '../../config/theme';
import { formatTime } from '../../utils/formatting';
import type { Message } from '../../types';
import type { MessagesStackParamList } from '../../navigation/MainTabNavigator';

type Props = {
  route: RouteProp<MessagesStackParamList, 'Conversation'>;
};

// ============================================================
// Bulle de message
// ============================================================

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  return (
    <View style={[styles.bubbleWrapper, isMine && styles.bubbleWrapperMine]}>
      {!isMine && (
        <Avatar name={message.sender.fullName} uri={message.sender.avatar} size="xs" />
      )}
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {!isMine && (
          <Text style={styles.senderName}>{message.sender.fullName}</Text>
        )}
        {message.type === 'IMAGE' && message.attachment ? (
          <Image
            source={{ uri: message.attachment.url }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        ) : null}
        {message.content ? (
          <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
            {message.content}
          </Text>
        ) : null}
        <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
          {formatTime(message.sentAt)}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// Écran
// ============================================================

export default function ConversationScreen({ route }: Props) {
  const { conversationId, name } = route.params;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data } = await SecretisAPI.get<Message[]>(
        `/messages/conversations/${conversationId}/messages`,
      );
      return data;
    },
    refetchInterval: 5000, // Polling toutes les 5s (simplifié sans WebSocket)
  });

  // Scroll au dernier message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await SecretisAPI.post<Message>(
        `/messages/conversations/${conversationId}/messages`,
        { content, type: 'TEXT' },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    sendMessage.mutate(text.trim());
    setText('');
  }, [text, sendMessage]);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      // TODO: uploader l'image et envoyer le message avec type IMAGE
      Alert.alert('Image sélectionnée', result.assets[0].uri.split('/').pop() ?? 'Image');
    }
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Indicateur "en train d'écrire" */}
        {isTyping && (
          <View style={styles.typingBar}>
            <Text style={styles.typingText}>{name} est en train d'écrire...</Text>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMine={item.sender.id === user?.id}
            />
          )}
        />

        {/* Barre d'envoi */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.inputAction} onPress={handlePickImage}>
            <Ionicons name="image-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Votre message..."
            placeholderTextColor={Colors.textDisabled}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />

          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
          >
            <Ionicons name="send" size={18} color={Colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceAlt },
  typingBar: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  typingText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, fontStyle: 'italic' },
  messagesList: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.base },
  bubbleWrapper: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-end',
    maxWidth: '85%',
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
  },
  bubbleWrapperMine: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubble: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    maxWidth: '100%',
    gap: 4,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    ...Shadow.sm,
  },
  senderName: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bubbleTextMine: { color: Colors.textOnPrimary },
  bubbleTime: {
    fontSize: 10,
    color: Colors.textSecondary,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.6)' },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.md,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.sm,
    ...Shadow.lg,
  },
  inputAction: { padding: Spacing.xs, paddingBottom: Spacing.sm },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.textDisabled },
});
