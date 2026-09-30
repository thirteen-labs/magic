import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabTwoScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="subtitle">AI & App Features</ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Explore predefined AI domains, custom proxy endpoints,{'\n'}and supported API key providers.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.sectionsWrapper}>
          <Collapsible title="Predefined Domains & Providers">
            <ThemedText type="small">
              The app supports built-in presets for major AI providers:
            </ThemedText>
            <ThemedText type="small" style={{ marginTop: 4 }}>
              • <ThemedText type="smallBold">OpenAI</ThemedText> (api.openai.com)
            </ThemedText>
            <ThemedText type="small">
              • <ThemedText type="smallBold">Anthropic Claude</ThemedText> (api.anthropic.com)
            </ThemedText>
            <ThemedText type="small">
              • <ThemedText type="smallBold">Google Gemini</ThemedText> (generativelanguage.googleapis.com)
            </ThemedText>
            <ThemedText type="small">
              • <ThemedText type="smallBold">DeepSeek</ThemedText> (api.deepseek.com)
            </ThemedText>
            <ThemedText type="small">
              • <ThemedText type="smallBold">Groq</ThemedText> (api.groq.com)
            </ThemedText>
            <ThemedText type="small">
              • <ThemedText type="smallBold">Together AI & OpenRouter</ThemedText>
            </ThemedText>
            <ThemedText type="small">
              • <ThemedText type="smallBold">OpenCode Zen</ThemedText> (opencode.ai/zen — one key, many models)
            </ThemedText>
          </Collapsible>

          <Collapsible title="Attachments, Markdown & History">
            <ThemedText type="small">
              Tap the photo or paperclip icons in the chat input to attach images (JPG/PNG/WebP/GIF) or documents (PDF, TXT, Markdown, JSON, code files, Word/Excel).
            </ThemedText>
            <ThemedText type="small" style={{ marginTop: 6 }}>
              Text files are inlined into the prompt. Images are sent as vision inputs to OpenAI-compatible, Anthropic, and Gemini endpoints.
            </ThemedText>
            <ThemedText type="small" style={{ marginTop: 6 }}>
              Assistant replies render Markdown and stream in token-by-token (SSE via XMLHttpRequest, works on native + web with automatic non-streaming fallback). Conversations persist locally, API keys are stored in SecureStore (native) or AsyncStorage (web), and temperature is adjustable in Settings.
            </ThemedText>
          </Collapsible>

          <Collapsible title="Custom Domains & Self-Hosted LLMs">
            <ThemedText type="small">
              You can connect to any custom AI domain, local proxy, or self-hosted LLM (like Ollama, LM Studio, or vLLM).
            </ThemedText>
            <ThemedText type="small" style={{ marginTop: 6 }}>
              1. Open <ThemedText type="code">Settings</ThemedText> in the chat tab.
            </ThemedText>
            <ThemedText type="small">
              2. Select <ThemedText type="smallBold">Custom Domain</ThemedText> preset.
            </ThemedText>
            <ThemedText type="small">
              3. Enter your custom base URL (e.g., <ThemedText type="code">my-llm.company.com</ThemedText> or <ThemedText type="code">localhost:11434</ThemedText>).
            </ThemedText>
            <ThemedText type="small">
              4. Click <ThemedText type="smallBold">Test API Connection</ThemedText> to verify your setup.
            </ThemedText>
          </Collapsible>

          <Collapsible title="Light and Dark Mode">
            <ThemedText type="small">
              The UI adapts to your device theme or browser preferences automatically.
            </ThemedText>
          </Collapsible>

          <Collapsible title="File-based Routing">
            <ThemedText type="small">
              This app relies on Expo Router:
            </ThemedText>
            <ThemedText type="small" style={{ marginTop: 4 }}>
              • <ThemedText type="code">src/app/index.tsx</ThemedText>: Main AI Chat screen
            </ThemedText>
            <ThemedText type="small">
              • <ThemedText type="code">src/app/explore.tsx</ThemedText>: Features & documentation
            </ThemedText>
          </Collapsible>
        </ThemedView>
        {Platform.OS === 'web' && <WebBadge />}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  titleContainer: {
    gap: Spacing.three,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    justifyContent: 'center',
    gap: Spacing.one,
    alignItems: 'center',
  },
  sectionsWrapper: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  collapsibleContent: {
    alignItems: 'center',
  },
  imageTutorial: {
    width: '100%',
    aspectRatio: 296 / 171,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
});
