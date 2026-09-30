import React, { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { PREDEFINED_DOMAINS, DEFAULT_PRESET_ID } from '@/constants/ai-domains';
import type { DomainPreset } from '@/constants/ai-domains';

export interface AiConfig {
  presetId: string;
  domain: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  protocol: 'openai' | 'anthropic' | 'google';
  customPath: string;
  temperature: number;
}

const DEFAULT_PRESET = PREDEFINED_DOMAINS.find((p) => p.id === DEFAULT_PRESET_ID)!;

export const DEFAULT_CONFIG: AiConfig = {
  presetId: DEFAULT_PRESET.id,
  domain: DEFAULT_PRESET.domain,
  apiKey: '',
  model: DEFAULT_PRESET.defaultModel,
  systemPrompt: 'You are a helpful, smart, and precise AI assistant.',
  protocol: DEFAULT_PRESET.protocol,
  customPath: DEFAULT_PRESET.path,
  temperature: 0.7,
};

const CONFIG_STORAGE_KEY = 'magic_ai_chat_config_v2';
const LEGACY_STORAGE_KEY = 'magic_ai_chat_config';
const API_KEY_SECURE_KEY = 'magic_ai_chat_api_key';

async function getSecureApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;
    const available = await SecureStore.isAvailableAsync();
    if (!available) return null;
    return await SecureStore.getItemAsync(API_KEY_SECURE_KEY);
  } catch {
    return null;
  }
}

async function setSecureApiKey(value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    const available = await SecureStore.isAvailableAsync();
    if (!available) return;
    if (!value) {
      await SecureStore.deleteItemAsync(API_KEY_SECURE_KEY);
    } else {
      await SecureStore.setItemAsync(API_KEY_SECURE_KEY, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    }
  } catch (e) {
    console.warn('SecureStore save failed, falling back to AsyncStorage:', e);
  }
}

async function persistConfig(cfg: AiConfig): Promise<void> {
  const { apiKey, ...rest } = cfg;
  try {
    await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(rest));
  } catch (e) {
    console.error('Failed to persist AI configuration:', e);
  }
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(API_KEY_SECURE_KEY, apiKey);
    } else {
      await setSecureApiKey(apiKey);
      // Ensure no secret lingers in legacy keys
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {});
    }
  } catch (e) {
    console.error('Failed to persist API key:', e);
  }
}

interface AiConfigContextProps {
  config: AiConfig;
  isConfigured: boolean;
  saveConfig: (config: AiConfig) => Promise<void>;
  resetConfig: () => Promise<void>;
  applyPreset: (presetId: string) => void;
}

const AiConfigContext = createContext<AiConfigContextProps>({
  config: DEFAULT_CONFIG,
  isConfigured: false,
  saveConfig: async () => {},
  resetConfig: async () => {},
  applyPreset: () => {},
});

export function AiConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);

  const loadConfig = useCallback(async () => {
    try {
      // 1. Load non-secret config from AsyncStorage
      const stored = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
      let merged: AiConfig = { ...DEFAULT_CONFIG };

      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          merged = { ...merged, ...parsed, apiKey: '' };
        } catch {}
      } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Migrate legacy web localStorage config
        try {
          const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
          if (legacy) {
            const parsed = JSON.parse(legacy);
            merged = { ...merged, ...parsed };
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          }
        } catch {}
      }

      // 2. Load API key: SecureStore on native, AsyncStorage/legacy on web
      if (Platform.OS === 'web') {
        const webKey =
          merged.apiKey ||
          (await AsyncStorage.getItem(API_KEY_SECURE_KEY)) ||
          '';
        merged.apiKey = webKey;
        // If migrated legacy key was inside config blob, persist it separately
        if (webKey) {
          await AsyncStorage.setItem(API_KEY_SECURE_KEY, webKey).catch(() => {});
        }
      } else {
        const secureKey = await getSecureApiKey();
        if (secureKey) {
          merged.apiKey = secureKey;
        } else {
          // Fallback: key may have been stored inside old AsyncStorage blob
          const fallback = await AsyncStorage.getItem(LEGACY_STORAGE_KEY).catch(() => null);
          if (fallback) {
            try {
              const parsed = JSON.parse(fallback);
              if (parsed?.apiKey) {
                merged.apiKey = String(parsed.apiKey);
                await setSecureApiKey(merged.apiKey);
              }
            } catch {}
          }
        }
      }

      // Backfill domain/protocol/path when preset changed upstream
      const preset = PREDEFINED_DOMAINS.find((p) => p.id === merged.presetId);
      if (preset && !merged.domain) {
        merged.domain = preset.domain;
        merged.protocol = preset.protocol;
        merged.customPath = preset.path;
      }

      // Clamp temperature
      if (typeof merged.temperature !== 'number' || Number.isNaN(merged.temperature)) {
        merged.temperature = 0.7;
      }
      merged.temperature = Math.min(2, Math.max(0, merged.temperature));

      setConfig(merged);
      // Persist migrated shape (without secret on native)
      await persistConfig(merged);
    } catch (e) {
      console.error('Failed to load AI configuration:', e);
    }
  }, []);

  const saveConfig = async (newConfig: AiConfig) => {
    const clamped: AiConfig = {
      ...newConfig,
      domain: newConfig.domain.trim(),
      apiKey: newConfig.apiKey.trim(),
      model: newConfig.model.trim() || DEFAULT_CONFIG.model,
      temperature: Math.min(2, Math.max(0, Number(newConfig.temperature) || 0)),
    };
    setConfig(clamped);
    await persistConfig(clamped);
  };

  const resetConfig = async () => {
    try {
      setConfig(DEFAULT_CONFIG);
      await AsyncStorage.removeItem(CONFIG_STORAGE_KEY);
      if (Platform.OS === 'web') {
        await AsyncStorage.removeItem(API_KEY_SECURE_KEY);
        try {
          window.localStorage?.removeItem(LEGACY_STORAGE_KEY);
        } catch {}
      } else {
        await SecureStore.deleteItemAsync(API_KEY_SECURE_KEY).catch(() => {});
        await AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to reset AI configuration:', e);
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = PREDEFINED_DOMAINS.find((p) => p.id === presetId);
    if (!preset) return;

    setConfig((prev) => ({
      ...prev,
      presetId: preset.id,
      domain: preset.id === 'custom' ? prev.domain : preset.domain,
      model: preset.defaultModel,
      protocol: preset.protocol,
      customPath: preset.path,
    }));
  };

  // Load persisted config once on mount. Storage hydration must run in an
  // effect (async I/O), not during render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only storage hydration
    loadConfig();
  }, [loadConfig]);

  const isConfigured = Boolean(
    config.apiKey && config.apiKey.trim().length > 0 && config.domain && config.domain.trim().length > 0
  );

  return (
    <AiConfigContext.Provider
      value={{
        config,
        isConfigured,
        saveConfig,
        resetConfig,
        applyPreset,
      }}>
      {children}
    </AiConfigContext.Provider>
  );
}

export function useAiConfig() {
  return useContext(AiConfigContext);
}

export type { DomainPreset };
