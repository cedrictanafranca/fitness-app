import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icons';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSpeechToText } from '@/services/speech';

interface ComposerProps {
  busy: boolean;
  /** Controlled text, owned by the screen so suggestions and retries can prefill it. */
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
}

/** Outlined pill input with mic (dev build only) and a black send button. */
export function Composer({ busy, value: text, onChangeText: setText, onSend }: ComposerProps) {
  const theme = useTheme();
  const speech = useSpeechToText();
  const base = useRef('');

  // Stream the live transcript (an external system) into the field while listening.
  useEffect(() => {
    if (!speech.listening && !speech.transcript) return;
    const b = base.current;
    setText(speech.transcript ? `${b}${b ? ' ' : ''}${speech.transcript}` : b);
  }, [speech.transcript, speech.listening, setText]);

  const toggleMic = () => {
    if (speech.listening) speech.stop();
    else {
      base.current = text.trim();
      void speech.start();
    }
  };

  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    if (speech.listening) speech.stop();
    onSend(t);
    setText('');
  };

  const canSend = text.trim().length > 0 && !busy;

  return (
    <View style={styles.wrap}>
      {speech.error ? (
        <ThemedText type="small" style={{ color: theme.warning }}>
          {speech.error}
        </ThemedText>
      ) : null}
      <View style={[styles.row, { backgroundColor: theme.surface, borderColor: speech.listening ? theme.warning : theme.border }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={speech.listening ? 'Listening…' : 'Ask or tell me what you ate…'}
          placeholderTextColor={theme.textSecondary}
          multiline
          blurOnSubmit
          onSubmitEditing={submit}
          returnKeyType="send"
          accessibilityLabel="Message"
          style={[styles.input, { color: theme.text }]}
        />
        {speech.available ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={speech.listening ? 'Stop voice input' : 'Start voice input'}
            onPress={toggleMic}
            style={[styles.round, { backgroundColor: speech.listening ? theme.warning : theme.backgroundElement }]}>
            <Icon name={speech.listening ? 'stop' : 'mic'} size={16} color={speech.listening ? '#fff' : theme.text} />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={submit}
          style={[styles.round, { backgroundColor: canSend ? theme.primary : theme.primaryDisabled }]}>
          <Icon name="arrow-up" size={16} strokeWidth={2.4} color={theme.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.two,
  },
  input: { flex: 1, fontSize: 16, lineHeight: 22, maxHeight: 120, paddingVertical: Spacing.one },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
