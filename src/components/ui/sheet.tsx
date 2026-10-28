import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
}

/** Dependency-free bottom sheet: Modal + animated slide and backdrop fade. */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));
  const [mounted, setMounted] = useState(visible);

  // Mount synchronously on open so the first frame exists before the slide-in starts.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three, transform: [{ translateY }] },
          ]}>
          <View style={[styles.grabber, { backgroundColor: theme.track }]} />
          {title != null && (
            <ThemedText type="default" style={styles.title} accessibilityRole="header">
              {title}
            </ThemedText>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    maxHeight: '90%',
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginBottom: Spacing.three },
  title: { fontSize: 20, lineHeight: 26, fontWeight: 700, marginBottom: Spacing.three },
});
