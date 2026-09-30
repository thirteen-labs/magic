import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Markdown from 'react-native-markdown-display';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChatMessage } from '@/services/ai-chat';
import { formatFileSize } from '@/services/attachments';

interface ChatBubbleProps {
  message: ChatMessage;
  onCopy?: (text: string) => void;
  onRetry?: (message: ChatMessage) => void;
  isLastAssistant?: boolean;
  isStreaming?: boolean;
}

export function ChatBubble({ message, onCopy, onRetry, isLastAssistant, isStreaming }: ChatBubbleProps) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const attachments = message.attachments ?? [];

  const markdownStyle = {
    body: { color: isUser ? '#FFFFFF' : theme.text, fontSize: 15, lineHeight: 22 },
    paragraph: { marginTop: 0, marginBottom: 8 },
    heading1: { color: isUser ? '#FFFFFF' : theme.text },
    heading2: { color: isUser ? '#FFFFFF' : theme.text },
    heading3: { color: isUser ? '#FFFFFF' : theme.text },
    link: { color: isUser ? '#FFFFFF' : '#0274DF' },
    code_inline: {
      backgroundColor: isUser ? '#ffffff30' : theme.backgroundSelected,
      color: isUser ? '#FFFFFF' : theme.text,
      borderRadius: 4,
      paddingHorizontal: 4,
      fontSize: 13,
    },
    fence: {
      backgroundColor: isUser ? '#ffffff25' : theme.backgroundSelected,
      color: isUser ? '#FFFFFF' : theme.text,
      borderRadius: 8,
      padding: 8,
      fontSize: 13,
    },
    code_block: {
      backgroundColor: isUser ? '#ffffff25' : theme.backgroundSelected,
      color: isUser ? '#FFFFFF' : theme.text,
      borderRadius: 8,
      padding: 8,
      fontSize: 13,
    },
    blockquote: {
      backgroundColor: 'transparent',
      borderLeftColor: isUser ? '#ffffff80' : '#0274DF',
      borderLeftWidth: 3,
      paddingLeft: 8,
      opacity: 0.95,
    },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    list_item: { marginBottom: 4 },
    table: { borderColor: theme.textSecondary },
    th: { color: isUser ? '#FFFFFF' : theme.text },
    td: { color: isUser ? '#FFFFFF' : theme.text },
    tr: { borderColor: theme.textSecondary },
  } as const;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={styles.avatarRow}>
        <ThemedView
          style={[styles.avatar, { backgroundColor: isUser ? '#3C9FFE' : theme.backgroundElement }]}>
          <SymbolView
            name={{
              ios: isUser ? 'person.fill' : 'cpu.fill',
              android: isUser ? 'person' : 'memory',
              web: isUser ? 'person' : 'memory',
            }}
            size={14}
            tintColor={isUser ? '#FFFFFF' : theme.text}
          />
        </ThemedView>
        <ThemedText type="smallBold" style={styles.roleName}>
          {isUser ? 'You' : 'AI Assistant'}
        </ThemedText>
      </View>

      {attachments.length > 0 && (
        <View style={[styles.attachWrap, isUser ? styles.userAttach : styles.assistantAttach]}>
          {attachments.map((att) => (
            <View
              key={att.id}
              style={[styles.attachChip, { backgroundColor: theme.backgroundElement }]}>
              {att.kind === 'image' && (att.dataUrl || att.uri) ? (
                <Image
                  source={{ uri: att.dataUrl ?? att.uri }}
                  style={styles.attachImage}
                  resizeMode="cover"
                />
              ) : (
                <SymbolView
                  name={{
                    ios: 'doc.fill',
                    android: 'description',
                    web: 'description',
                  }}
                  size={16}
                  tintColor={theme.textSecondary}
                />
              )}
              <View style={styles.attachMeta}>
                <ThemedText type="smallBold" numberOfLines={1} style={styles.attachName}>
                  {att.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.attachSub}>
                  {att.kind.toUpperCase()}
                  {att.size ? ` • ${formatFileSize(att.size)}` : ''}
                  {!att.dataUrl && !att.textContent && att.kind !== 'file'
                    ? ' • from history'
                    : ''}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}

      <ThemedView
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: '#0274DF' }]
            : [styles.assistantBubble, { backgroundColor: theme.backgroundElement }],
        ]}>
        {isUser ? (
          <ThemedText selectable style={[styles.messageText, { color: '#FFFFFF' }]}>
            {message.content}
          </ThemedText>
        ) : (
          <View>
            {message.content ? (
              <Markdown style={markdownStyle}>{message.content}</Markdown>
            ) : (
              <ThemedText themeColor="textSecondary" style={styles.thinkingText}>
                Thinking…
              </ThemedText>
            )}
            {isStreaming && <ThemedText style={styles.streamCursor}>▍</ThemedText>}
          </View>
        )}
      </ThemedView>

      <View style={[styles.actionsRow, isUser ? styles.userActions : styles.assistantActions]}>
        {onCopy && (
          <Pressable
            onPress={() => onCopy(message.content)}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' }}
              size={12}
              tintColor={theme.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.actionText}>
              Copy
            </ThemedText>
          </Pressable>
        )}

        {!isUser && isLastAssistant && onRetry && (
          <Pressable
            onPress={() => onRetry(message)}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }}
              size={12}
              tintColor={theme.textSecondary}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.actionText}>
              Retry
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    maxWidth: '100%',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.one,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleName: {
    fontSize: 12,
    opacity: 0.8,
  },
  attachWrap: {
    gap: 6,
    marginBottom: 6,
    maxWidth: '88%',
  },
  userAttach: {
    alignItems: 'flex-end',
  },
  assistantAttach: {
    alignItems: 'flex-start',
  },
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 6,
    paddingRight: 10,
    maxWidth: '100%',
  },
  attachImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  attachMeta: {
    flexShrink: 1,
  },
  attachName: {
    fontSize: 12,
  },
  attachSub: {
    fontSize: 11,
  },
  bubble: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    maxWidth: '88%',
    borderCurve: 'continuous',
  },
  userBubble: {
    borderBottomRightRadius: Spacing.one,
  },
  assistantBubble: {
    borderBottomLeftRadius: Spacing.one,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  thinkingText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  streamCursor: {
    color: '#0274DF',
    fontSize: 15,
    lineHeight: 22,
    marginTop: -4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  userActions: {
    justifyContent: 'flex-end',
  },
  assistantActions: {
    justifyContent: 'flex-start',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  actionText: {
    fontSize: 11,
  },
  pressed: {
    opacity: 0.6,
  },
});
