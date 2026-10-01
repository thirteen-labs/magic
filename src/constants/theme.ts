/**
 * Multi-theme system: 12 named themes, each with light & dark palettes.
 * Every palette exposes the same color roles so all components keep working
 * regardless of the active theme.
 */

import '@/global.css';

import { Platform } from 'react-native';

export interface ThemeColors {
  text: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
}

export type ThemeId =
  | 'default'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'midnight'
  | 'lavender'
  | 'rose'
  | 'mint'
  | 'amber'
  | 'crimson'
  | 'slate'
  | 'candy';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  /** Representative swatch color shown in the theme picker. */
  swatch: string;
  light: ThemeColors;
  dark: ThemeColors;
}

export const THEMES: ThemeDef[] = [
  {
    id: 'default',
    name: 'Default',
    swatch: '#0274DF',
    light: {
      text: '#000000',
      background: '#ffffff',
      backgroundElement: '#F0F0F3',
      backgroundSelected: '#E0E1E6',
      textSecondary: '#60646C',
    },
    dark: {
      text: '#ffffff',
      background: '#000000',
      backgroundElement: '#212225',
      backgroundSelected: '#2E3135',
      textSecondary: '#B0B4BA',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    swatch: '#0369A1',
    light: {
      text: '#0B2545',
      background: '#F2F7FD',
      backgroundElement: '#E2EDF9',
      backgroundSelected: '#C9DDF3',
      textSecondary: '#4A6A8A',
    },
    dark: {
      text: '#E6F1FB',
      background: '#04121F',
      backgroundElement: '#0B2237',
      backgroundSelected: '#14324E',
      textSecondary: '#8FB3D1',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    swatch: '#15803D',
    light: {
      text: '#12351F',
      background: '#F3F7F2',
      backgroundElement: '#E2EFE1',
      backgroundSelected: '#C8E2C7',
      textSecondary: '#4E7355',
    },
    dark: {
      text: '#E9F5EA',
      background: '#0A1A10',
      backgroundElement: '#14291B',
      backgroundSelected: '#1F3B28',
      textSecondary: '#93B89B',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    swatch: '#C2410C',
    light: {
      text: '#4A1F0B',
      background: '#FFF7F0',
      backgroundElement: '#FBE9D9',
      backgroundSelected: '#F5D3B8',
      textSecondary: '#96604A',
    },
    dark: {
      text: '#FDEFE2',
      background: '#1F100A',
      backgroundElement: '#33200F',
      backgroundSelected: '#4A2E18',
      textSecondary: '#C79A7D',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    swatch: '#3B4A8C',
    light: {
      text: '#1A2140',
      background: '#EEF0FA',
      backgroundElement: '#DEE3F2',
      backgroundSelected: '#C6CEE8',
      textSecondary: '#5A6285',
    },
    dark: {
      text: '#E8EBFA',
      background: '#05070F',
      backgroundElement: '#0E1428',
      backgroundSelected: '#1B2542',
      textSecondary: '#9AA3C7',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    swatch: '#7C3AED',
    light: {
      text: '#341B5E',
      background: '#F7F3FD',
      backgroundElement: '#E9E1F9',
      backgroundSelected: '#D5C6F2',
      textSecondary: '#7A63A3',
    },
    dark: {
      text: '#EFE9FB',
      background: '#150F24',
      backgroundElement: '#241A3E',
      backgroundSelected: '#372A58',
      textSecondary: '#A893D4',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    swatch: '#E11D48',
    light: {
      text: '#57101F',
      background: '#FDF3F5',
      backgroundElement: '#F9E1E7',
      backgroundSelected: '#F2C4D0',
      textSecondary: '#9C5568',
    },
    dark: {
      text: '#FBE9EE',
      background: '#200A10',
      backgroundElement: '#38121C',
      backgroundSelected: '#521C2A',
      textSecondary: '#D192A4',
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    swatch: '#0D9488',
    light: {
      text: '#0B3D31',
      background: '#F1FAF7',
      backgroundElement: '#DDF3EC',
      backgroundSelected: '#BCE6D9',
      textSecondary: '#4E7D6F',
    },
    dark: {
      text: '#E6F7F1',
      background: '#081915',
      backgroundElement: '#122A24',
      backgroundSelected: '#1D3F36',
      textSecondary: '#8ABBAE',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    swatch: '#B45309',
    light: {
      text: '#4A2E08',
      background: '#FDF8EE',
      backgroundElement: '#F6EAD2',
      backgroundSelected: '#EDD9AE',
      textSecondary: '#8A6B42',
    },
    dark: {
      text: '#FAF0DC',
      background: '#1C130A',
      backgroundElement: '#2F2110',
      backgroundSelected: '#4A3519',
      textSecondary: '#C7A76F',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    swatch: '#B91C1C',
    light: {
      text: '#4A0E0E',
      background: '#FBF1F1',
      backgroundElement: '#F3DCDC',
      backgroundSelected: '#E6BCBC',
      textSecondary: '#8F5555',
    },
    dark: {
      text: '#F9E7E7',
      background: '#1C0909',
      backgroundElement: '#331010',
      backgroundSelected: '#4E1818',
      textSecondary: '#C98F8F',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    swatch: '#475569',
    light: {
      text: '#23272E',
      background: '#F4F5F7',
      backgroundElement: '#E4E7EC',
      backgroundSelected: '#CFD4DC',
      textSecondary: '#62676F',
    },
    dark: {
      text: '#E8EAED',
      background: '#101216',
      backgroundElement: '#1B1E24',
      backgroundSelected: '#292E36',
      textSecondary: '#A3A8B2',
    },
  },
  {
    id: 'candy',
    name: 'Candy',
    swatch: '#DB2777',
    light: {
      text: '#54163D',
      background: '#FDF2FA',
      backgroundElement: '#F9E0F1',
      backgroundSelected: '#F2C2E2',
      textSecondary: '#9C5E86',
    },
    dark: {
      text: '#FBEAF4',
      background: '#210D1B',
      backgroundElement: '#3A162F',
      backgroundSelected: '#571F47',
      textSecondary: '#D194B9',
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'default';

export function getThemeDef(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Backwards-compatible default palette (same values as before theming). */
export const Colors = {
  light: THEMES[0].light,
  dark: THEMES[0].dark,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
