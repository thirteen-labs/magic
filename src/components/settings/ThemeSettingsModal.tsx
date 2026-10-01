import React from 'react';
import { Modal, View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, THEMES } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppTheme, type ThemeMode } from '@/contexts/ThemeContext';

interface ThemeSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const MODES: { id: ThemeMode; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function ThemeSettingsModal({ visible, onClose }: ThemeSettingsModalProps) {
  const theme = useTheme();
  const { themeId, mode, resolvedScheme, setThemeId, setMode } = useAppTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Appearance</ThemedText>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }} size={24} tintColor={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              Theme ({THEMES.length})
            </ThemedText>
            <View style={styles.grid}>
              {THEMES.map((t) => {
                const isSelected = t.id === themeId;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setThemeId(t.id)}
                    style={({ pressed }) => [
                      styles.themeCard,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: isSelected ? '#0274DF' : 'transparent',
                      },
                      pressed && styles.pressed,
                    ]}>
                    <View style={[styles.swatchRow]}>
                      <View style={[styles.swatch, { backgroundColor: t.swatch }]} />
                      {isSelected && (
                        <SymbolView
                          name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                          size={18}
                          tintColor="#0274DF"
                        />
                      )}
                    </View>
                    <ThemedText type="smallBold" style={styles.themeName}>
                      {t.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.themeSub}>
                      {isSelected ? `${resolvedScheme} active` : ' '}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              Brightness
            </ThemedText>
            <View style={styles.modeRow}>
              {MODES.map((m) => {
                const isSelected = m.id === mode;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setMode(m.id)}
                    style={({ pressed }) => [
                      styles.modeButton,
                      { backgroundColor: isSelected ? '#0274DF' : theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold" style={{ color: isSelected ? '#FFFFFF' : theme.text }}>
                      {m.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              System follows your device setting. Currently showing the {resolvedScheme} palette.
            </ThemedText>
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingTop: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#88888840',
  },
  closeButton: {
    padding: Spacing.one,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  themeCard: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 2,
    padding: Spacing.two,
    gap: 6,
  },
  swatchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  themeName: {
    fontSize: 13,
  },
  themeSub: {
    fontSize: 11,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
