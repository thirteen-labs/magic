import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@/services/ai-chat';

const HISTORY_KEY = 'magic_ai_chat_history_v1';
const MAX_MESSAGES = 50;

function stripForStorage(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_MESSAGES).map((m) => ({
    ...m,
    attachments: (m.attachments ?? []).map((a) => {
      // Drop large base64 payloads from persisted history to respect AsyncStorage quotas.
      // Keep metadata + text (capped) so history remains readable.
      if (a.kind === 'image') {
        const { dataUrl: _drop, ...rest } = a;
        return { ...rest, kind: 'file' as const, textContent: undefined };
      }
      return {
        ...a,
        textContent: a.textContent ? a.textContent.slice(0, 8000) : undefined,
        dataUrl: undefined,
      };
    }),
  }));
}

export async function loadChatHistory(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m) => m && (m.role === 'user' || m.role === 'assistant'));
  } catch {
    return [];
  }
}

export async function saveChatHistory(messages: ChatMessage[]): Promise<void> {
  try {
    const slim = stripForStorage(messages);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(slim));
  } catch {
    // Quota fallback: persist text-only, no attachments at all
    try {
      const textOnly = messages.slice(-MAX_MESSAGES).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      }));
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(textOnly));
    } catch {}
  }
}

export async function clearChatHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {}
}
