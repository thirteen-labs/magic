import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, ActivityIndicator, Platform, Alert, Image } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  pickImages,
  pickDocuments,
  formatFileSize,
  type ChatAttachment,
} from '@/services/attachments';

interface ChatInputProps {
  onSend: (text: string, attachments?: ChatAttachment[]) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const QUICK_PROMPTS = [
  '💡 Explain quantum computing simply',
  '📝 Write a poem about space',
  '💻 Debug React Native code',
  '⚡ Summarize the history of AI',
];

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [picking, setPicking] = useState(false);
  const theme = useTheme();

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && attachments.length === 0) || isLoading || disabled || picking) return;
    onSend(trimmed || '(see attached files)', attachments);
    setText('');
    setAttachments([]);
  };

  const handlePickImages = async () => {
    if (disabled || isLoading) return;
    setPicking(true);
    try {
      const picked = await pickImages();
      setAttachments((prev) => [...prev, ...picked].slice(0, 6));
    } catch (e) {
      Alert.alert('Image pick failed', e instanceof Error ? e.message : String(e));
    } finally {
      setPicking(false);
    }
  };

  const handlePickDocs = async () => {
    if (disabled || isLoading) return;
    setPicking(true);
    try {
      const picked = await pickDocuments();
      setAttachments((prev) => [...prev, ...picked].slice(0, 6));
    } catch (e) {
      Alert.alert('File pick failed', e instanceof Error ? e.message : String(e));
    } finally {
      setPicking(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const canSend = (text.trim() || attachments.length > 0) && !isLoading && !disabled && !picking;

  return (
    <View style={styles.container}>
      {attachments.length > 0 && (
        <View style={styles.attachPreviewRow}>
          {attachments.map((att) => (
            <View key={att.id} style={[styles.attachPreview, { backgroundColor: theme.backgroundElement }]}>
              {att.kind === 'image' && (att.dataUrl || att.uri) ? (
                <Image source={{ uri: att.dataUrl ?? att.uri }} style={styles.attachThumb} />
              ) : (
                <SymbolView
                  name={{ ios: 'doc.fill', android: 'description', web: 'description' }}
                  size={18}
                  tintColor={theme.textSecondary}
                />
              )}
              <View style={styles.attachInfo}>
                <ThemedText type="smallBold" numberOfLines={1} style={{ fontSize: 12 }}>
                  {att.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 11 }}>
                  {att.size ? formatFileSize(att.size) : att.kind}
                </ThemedText>
              </View>
              <Pressable onPress={() => removeAttachment(att.id)} style={styles.removeBtn} hitSlop={8}>
                <SymbolView
                  name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                  size={16}
                  tintColor={theme.textSecondary}
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputContainer}>
        <ThemedView
          type="backgroundElement"
          style={[styles.inputWrapper, { borderColor: theme.backgroundSelected }]}>
          <Pressable
            onPress={handlePickImages}
            disabled={disabled || isLoading || picking}
            style={({ pressed }) => [styles.attachButton, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'photo', android: 'image', web: 'image' }}
              size={20}
              tintColor={theme.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={handlePickDocs}
            disabled={disabled || isLoading || picking}
            style={({ pressed }) => [styles.attachButton, pressed && styles.pressed]}>
            <SymbolView
              name={{ ios: 'paperclip', android: 'attach_file', web: 'attach_file' }}
              size={20}
              tintColor={theme.textSecondary}
            />
          </Pressable>

          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder={disabled ? 'Configure API Key in Settings to chat...' : 'Ask AI anything...'}
            placeholderTextColor={theme.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={12000}
            editable={!disabled}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />

          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: canSend ? '#0274DF' : theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <SymbolView
                name={{ ios: 'arrow.up', android: 'send', web: 'send' }}
                size={16}
                tintColor={canSend ? '#FFFFFF' : theme.textSecondary}
              />
            )}
          </Pressable>
        </ThemedView>
      </View>
      {picking && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.pickingHint}>
          Reading files…
        </ThemedText>
      )}
    </View>
  );
}

export function QuickPromptChips({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  const theme = useTheme();

  return (
    <View style={styles.chipsContainer}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.chipsTitle}>
        Try asking:
      </ThemedText>
      <View style={styles.chipsRow}>
        {QUICK_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            onPress={() => onSelectPrompt(prompt.replace(/^[^\s]+\s*/, ''))}
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={styles.chipText}>
              {prompt}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  attachPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  attachPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 6,
    paddingRight: 8,
    maxWidth: '100%',
  },
  attachThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  attachInfo: {
    maxWidth: 140,
  },
  removeBtn: {
    padding: 2,
  },
  attachButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
    borderCurve: 'continuous',
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 24,
    paddingTop: Platform.OS === 'ios' ? 4 : 0,
    paddingBottom: Platform.OS === 'ios' ? 4 : 0,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  pickingHint: {
    marginTop: 4,
    textAlign: 'center',
  },
  chipsContainer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  chipsTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  chipText: {
    fontSize: 13,
  },
});
