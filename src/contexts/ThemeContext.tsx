import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import {
  DEFAULT_THEME_ID,
  getThemeDef,
  type ThemeColors,
  type ThemeDef,
  type ThemeId,
} from '@/constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedScheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'magic_app_theme_v1';

interface ThemePreference {
  themeId: ThemeId;
  mode: ThemeMode;
}

interface ThemeContextProps {
  themeId: ThemeId;
  themeDef: ThemeDef;
  mode: ThemeMode;
  resolvedScheme: ResolvedScheme;
  colors: ThemeColors;
  setThemeId: (id: ThemeId) => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextProps | null>(null);

const DEFAULT_PREFERENCE: ThemePreference = { themeId: DEFAULT_THEME_ID, mode: 'system' };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(DEFAULT_PREFERENCE);
  const systemScheme = useSystemColorScheme();

  const loadPreference = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ThemePreference>;
        setPreference({
          themeId: getThemeDef(parsed.themeId as ThemeId).id,
          mode: parsed.mode === 'light' || parsed.mode === 'dark' ? parsed.mode : 'system',
        });
      }
    } catch (e) {
      console.error('Failed to load theme preference:', e);
    }
  }, []);

  // Load persisted preference once on mount (async I/O must run in an effect).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only storage hydration
    loadPreference();
  }, [loadPreference]);

  const persist = useCallback(async (next: ThemePreference) => {
    setPreference(next);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error('Failed to save theme preference:', e);
    }
  }, []);

  const setThemeId = useCallback(
    (id: ThemeId) => persist({ ...preference, themeId: getThemeDef(id).id }),
    [persist, preference]
  );

  const setMode = useCallback((mode: ThemeMode) => persist({ ...preference, mode }), [persist, preference]);

  const value = useMemo<ThemeContextProps>(() => {
    const themeDef = getThemeDef(preference.themeId);
    const resolvedScheme: ResolvedScheme =
      preference.mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference.mode;
    return {
      themeId: themeDef.id,
      themeDef,
      mode: preference.mode,
      resolvedScheme,
      colors: themeDef[resolvedScheme],
      setThemeId,
      setMode,
    };
  }, [preference, systemScheme, setThemeId, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextProps {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme must be used within a ThemeProvider.');
  }
  return ctx;
}
