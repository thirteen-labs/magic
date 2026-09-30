import React, { useState } from 'react';
import {
  Modal,
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PREDEFINED_DOMAINS } from '@/constants/ai-domains';
import { useAiConfig, type AiConfig } from '@/contexts/AiConfigContext';
import { testAiConnection } from '@/services/ai-chat';

interface AiSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AiSettingsModal({ visible, onClose }: AiSettingsModalProps) {
  const { config, saveConfig, resetConfig } = useAiConfig();
  const theme = useTheme();

  const [form, setForm] = useState<AiConfig>(config);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [wasVisible, setWasVisible] = useState(visible);

  // Reset the form when the modal is (re)opened, without syncing state in an effect.
  if (visible && !wasVisible) {
    setWasVisible(true);
    setForm(config);
    setTestResult(null);
  } else if (!visible && wasVisible) {
    setWasVisible(false);
  }

  const activePreset = PREDEFINED_DOMAINS.find((p) => p.id === form.presetId) || PREDEFINED_DOMAINS[PREDEFINED_DOMAINS.length - 1];

  const handleSelectPreset = (presetId: string) => {
    const preset = PREDEFINED_DOMAINS.find((p) => p.id === presetId);
    if (!preset) return;

    setForm((prev) => ({
      ...prev,
      presetId: preset.id,
      domain: preset.id === 'custom' ? prev.domain || '' : preset.domain,
      model: preset.defaultModel,
      protocol: preset.protocol,
      customPath: preset.path,
    }));
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!form.domain.trim()) {
      Alert.alert('Error', 'Please enter a valid domain or base URL.');
      return;
    }
    if (!form.apiKey.trim()) {
      Alert.alert('Warning', 'API Key is empty. You will need an API key to send messages.');
    }
    await saveConfig(form);
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testAiConnection(form);
    setTestResult(res);
    setTesting(false);
  };

  const handleReset = async () => {
    await resetConfig();
    setTestResult(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle">AI Provider Settings</ThemedText>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
            <SymbolView name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }} size={24} tintColor={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Section 1: Predefined Domain Presets */}
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              Select Domain Preset
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {PREDEFINED_DOMAINS.map((preset) => {
                const isSelected = form.presetId === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => handleSelectPreset(preset.id)}
                    style={({ pressed }) => [
                      styles.presetChip,
                      {
                        backgroundColor: isSelected ? '#0274DF' : theme.backgroundElement,
                      },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={{ color: isSelected ? '#FFFFFF' : theme.text }}>
                      {preset.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Section 2: Domain / Endpoint Configuration */}
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              Domain & Endpoint
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Domain / Base URL
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={form.domain}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, domain: val }))}
                  placeholder="e.g. api.openai.com or custom-domain.com"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </ThemedView>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                API Endpoint Path
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={form.customPath}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, customPath: val }))}
                  placeholder="/v1/chat/completions"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </ThemedView>
            </View>
          </View>

          {/* Section 3: API Key */}
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              API Authentication
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Your API Key
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                <TextInput
                  style={[styles.textInput, { color: theme.text, flex: 1 }]}
                  value={form.apiKey}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, apiKey: val }))}
                  placeholder="sk-..."
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowApiKey(!showApiKey)} style={styles.eyeButton}>
                  <SymbolView
                    name={{
                      ios: showApiKey ? 'eye.slash' : 'eye',
                      android: showApiKey ? 'visibility_off' : 'visibility',
                      web: showApiKey ? 'visibility_off' : 'visibility',
                    }}
                    size={18}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
              </ThemedView>
            </View>
          </View>

          {/* Section 4: Model & Parameters */}
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
              Model & Prompt Configuration
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                AI Model Name
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.inputWrapper}>
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={form.model}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, model: val }))}
                  placeholder="gpt-4o-mini, claude-3-5-sonnet, etc."
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </ThemedView>

              {activePreset.suggestedModels.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modelPillsRow}>
                  {activePreset.suggestedModels.map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setForm((prev) => ({ ...prev, model: m }))}
                      style={({ pressed }) => [
                        styles.modelPill,
                        {
                          backgroundColor: form.model === m ? '#0274DF' : theme.backgroundSelected,
                        },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="code"
                        style={{ color: form.model === m ? '#FFFFFF' : theme.text }}>
                        {m}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                System Prompt
              </ThemedText>
              <ThemedView type="backgroundElement" style={[styles.inputWrapper, { height: 80 }]}>
                <TextInput
                  style={[styles.textInput, { color: theme.text, height: '100%', textAlignVertical: 'top' }]}
                  value={form.systemPrompt}
                  onChangeText={(val) => setForm((prev) => ({ ...prev, systemPrompt: val }))}
                  placeholder="You are a helpful assistant."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                />
              </ThemedView>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Temperature ({(form.temperature ?? 0.7).toFixed(1)})
              </ThemedText>
              <View style={styles.tempRow}>
                <Pressable
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      temperature: Math.max(0, Math.round(((prev.temperature ?? 0.7) - 0.1) * 10) / 10),
                    }))
                  }
                  style={({ pressed }) => [
                    styles.tempButton,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold">−</ThemedText>
                </Pressable>
                <View style={styles.tempTrack}>
                  <View
                    style={[
                      styles.tempFill,
                      { width: `${Math.min(100, ((form.temperature ?? 0.7) / 2) * 100)}%` },
                    ]}
                  />
                </View>
                <Pressable
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      temperature: Math.min(2, Math.round(((prev.temperature ?? 0.7) + 0.1) * 10) / 10),
                    }))
                  }
                  style={({ pressed }) => [
                    styles.tempButton,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText type="smallBold">+</ThemedText>
                </Pressable>
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.tempHint}>
                0.0 = precise, 1.0 = balanced, 2.0 = creative
              </ThemedText>
            </View>
          </View>

          {/* Test Connection Result Display */}
          {testResult && (
            <ThemedView
              style={[
                styles.resultCard,
                {
                  backgroundColor: testResult.success ? '#10B98120' : '#EF444420',
                  borderColor: testResult.success ? '#10B981' : '#EF4444',
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{ color: testResult.success ? '#10B981' : '#EF4444' }}>
                {testResult.success ? '✅ Test Succeeded' : '❌ Test Failed'}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.text, marginTop: 4 }}>
                {testResult.message}
              </ThemedText>
            </ThemedView>
          )}

          {/* Test Connection Button */}
          <Pressable
            onPress={handleTestConnection}
            disabled={testing}
            style={({ pressed }) => [
              styles.testButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            {testing ? (
              <ActivityIndicator color={theme.text} size="small" />
            ) : (
              <>
                <SymbolView
                  name={{ ios: 'network', android: 'network_check', web: 'network_check' }}
                  size={16}
                  tintColor={theme.text}
                />
                <ThemedText type="smallBold">Test API Connection</ThemedText>
              </>
            )}
          </Pressable>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [
                styles.resetButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Reset Defaults
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: '#0274DF' },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: '#FFFFFF' }}>
                Save Settings
              </ThemedText>
            </Pressable>
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
  presetsRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  presetChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
  },
  inputGroup: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  label: {
    fontSize: 13,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 44,
  },
  textInput: {
    fontSize: 14,
    flex: 1,
  },
  eyeButton: {
    padding: Spacing.one,
  },
  modelPillsRow: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  modelPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 8,
  },
  testButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: 12,
    gap: Spacing.two,
  },
  resultCard: {
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tempButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#88888830',
    overflow: 'hidden',
  },
  tempFill: {
    height: '100%',
    backgroundColor: '#0274DF',
    borderRadius: 4,
  },
  tempHint: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  resetButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButton: {
    flex: 2,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
