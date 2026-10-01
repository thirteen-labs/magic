import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { ChatInput, QuickPromptChips } from '@/components/chat/ChatInput';
import { AiSettingsModal } from '@/components/settings/AiSettingsModal';
import { ThemeSettingsModal } from '@/components/settings/ThemeSettingsModal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAiConfig } from '@/contexts/AiConfigContext';
import { sendMessage, sendMessageStream, type ChatMessage } from '@/services/ai-chat';
import { loadChatHistory, saveChatHistory, clearChatHistory } from '@/services/chat-history';
import type { ChatAttachment } from '@/services/attachments';

export default function HomeScreen() {
  const { config, isConfigured } = useAiConfig();
  const theme = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [themeVisible, setThemeVisible] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    (async () => {
      const history = await loadChatHistory();
      if (history.length > 0) setMessages(history);
      setHistoryLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    saveChatHistory(messages);
  }, [messages, historyLoaded]);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const scrollToBottomThrottled = () => {
    const now = Date.now();
    if (now - lastScrollRef.current > 500) {
      lastScrollRef.current = now;
      scrollToBottom();
    }
  };

  const runAssistantTurn = async (contextMessages: ChatMessage[]) => {
    setErrorMessage(null);
    setIsLoading(true);
    const assistantId = `assistant-${Date.now()}`;
    const placeholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };
    setMessages([...contextMessages, placeholder]);
    scrollToBottom();

    let streamed = '';
    try {
      const full = await sendMessageStream({
        config,
        messages: contextMessages,
        onChunk: (partial) => {
          streamed = partial;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: partial } : m))
          );
          scrollToBottomThrottled();
        },
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: full } : m))
      );
    } catch (err) {
      if (!streamed) {
        // Streaming unsupported or failed before the first token — fall back to non-streaming.
        try {
          const responseText = await sendMessage({ config, messages: contextMessages });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: responseText } : m))
          );
        } catch (fallbackErr: unknown) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setErrorMessage(fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
        }
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`${msg} (partial response kept)`);
      }
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleSend = async (text: string, attachments?: ChatAttachment[]) => {
    if (!isConfigured) {
      setSettingsVisible(true);
      return;
    }
    if (isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now(),
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await runAssistantTurn(newMessages);
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await Clipboard.setStringAsync(content);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  const handleRetry = async (failedAssistantMessage?: ChatMessage) => {
    if (messages.length === 0 || isLoading) return;

    // Filter out previous failed assistant message if applicable
    const contextMessages = messages.filter((m) => m !== failedAssistantMessage);
    setMessages(contextMessages);
    await runAssistantTurn(contextMessages);
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    Alert.alert('Clear Chat', 'Are you sure you want to clear this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          setMessages([]);
          setErrorMessage(null);
          await clearChatHistory();
        },
      },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: theme.backgroundElement }]}>
          <View style={styles.headerTitleRow}>
            <ThemedText type="subtitle" style={styles.appTitle}>
              Magic AI
            </ThemedText>
            <Pressable
              onPress={() => setSettingsVisible(true)}
              style={({ pressed }) => [
                styles.badge,
                { backgroundColor: isConfigured ? '#10B98120' : '#F59E0B20' },
                pressed && styles.pressed,
              ]}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConfigured ? '#10B981' : '#F59E0B' },
                ]}
              />
              <ThemedText
                type="code"
                style={{
                  color: isConfigured ? '#10B981' : '#F59E0B',
                  fontSize: 11,
                }}>
                {config.domain || 'Set Endpoint'} • {config.model}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.headerActions}>
            {messages.length > 0 && (
              <Pressable
                onPress={handleClearChat}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                <SymbolView
                  name={{ ios: 'trash', android: 'delete', web: 'delete' }}
                  size={18}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            )}

            <Pressable
              onPress={() => setThemeVisible(true)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'paintpalette.fill', android: 'palette', web: 'palette' }}
                size={20}
                tintColor={theme.text}
              />
            </Pressable>

            <Pressable
              onPress={() => setSettingsVisible(true)}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
                size={20}
                tintColor={theme.text}
              />
            </Pressable>
          </View>
        </View>

        {/* API Key missing banner */}
        {!isConfigured && (
          <Pressable
            onPress={() => setSettingsVisible(true)}
            style={({ pressed }) => [
              styles.setupBanner,
              { backgroundColor: '#0274DF15', borderColor: '#0274DF' },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              name={{ ios: 'key.fill', android: 'vpn_key', web: 'vpn_key' }}
              size={18}
              tintColor="#0274DF"
            />
            <View style={styles.bannerTextContainer}>
              <ThemedText type="smallBold" style={{ color: '#0274DF' }}>
                Setup API Key & Endpoint
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tap here to select OpenAI, Anthropic, Gemini or custom domain key.
              </ThemedText>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={16}
              tintColor="#0274DF"
            />
          </Pressable>
        )}

        {/* Chat Messages Keyboard View */}
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText type="title" style={styles.welcomeTitle}>
                How can I help you?
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.welcomeSubtitle}>
                Connected to {config.domain || 'custom API'} ({config.model})
              </ThemedText>

              <QuickPromptChips onSelectPrompt={handleSend} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: BottomTabInset + Spacing.four },
              ]}
              renderItem={({ item, index }) => (
                <ChatBubble
                  message={item}
                  onCopy={item.content ? handleCopyMessage : undefined}
                  onRetry={handleRetry}
                  isLastAssistant={
                    index === messages.length - 1 && item.role === 'assistant'
                  }
                  isStreaming={
                    isLoading && index === messages.length - 1 && item.role === 'assistant'
                  }
                />
              )}
            />
          )}

          {/* Error Banner */}
          {errorMessage && (
            <ThemedView style={[styles.errorCard, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
              <View style={styles.errorTextRow}>
                <SymbolView
                  name={{ ios: 'exclamationmark.triangle.fill', android: 'error', web: 'error' }}
                  size={16}
                  tintColor="#EF4444"
                />
                <ThemedText type="smallBold" style={{ color: '#EF4444', flex: 1 }}>
                  {errorMessage}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => handleRetry()}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                  Retry Request
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {/* Bottom Chat Input */}
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            disabled={!isConfigured}
          />
        </KeyboardAvoidingView>

        {/* Settings Modal */}
        <AiSettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />

        {/* Theme Modal */}
        <ThemeSettingsModal visible={themeVisible} onClose={() => setThemeVisible(false)} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconButton: {
    padding: Spacing.two,
    borderRadius: 20,
  },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: 14,
    borderWidth: 1,
    gap: Spacing.three,
  },
  bannerTextContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  welcomeTitle: {
    fontSize: 28,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  listContent: {
    paddingVertical: Spacing.three,
  },
  errorCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.two,
  },
  errorTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
});
