/**
 * Returns the active theme palette. Shape is unchanged from the old
 * light/dark system, so all components keep working.
 */

import { useAppTheme } from '@/contexts/ThemeContext';

export function useTheme() {
  return useAppTheme().colors;
}
