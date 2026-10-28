/**
 * Local UI pieces for the Recipes area. Kept inside the feature so it does not depend on the shared kit.
 */

import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------- Screen scaffolding ----------

interface ScreenProps {
  children: ReactNode;
  /** Tab screens have no navigation header, so they pad for the status bar and tab bar. */
  tab?: boolean;
  footer?: ReactNode;
}

export function Screen({ children, tab = false, footer }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ThemedView style={styles.flex}>
      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior={tab ? 'never' : 'automatic'}
        contentContainerStyle={[
          styles.screenContent,
          {
            paddingTop: tab ? insets.top + Spacing.three : Spacing.three,
            paddingBottom: (tab ? BottomTabInset : 0) + insets.bottom + Spacing.five,
          },
        ]}>
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>{footer}</View>
      ) : null}
    </ThemedView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {children}
    </ThemedView>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {action}
    </View>
  );
}

// ---------- Buttons ----------

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, small, style }: ButtonProps) {
  const theme = useTheme();
  const bg =
    variant === 'primary'
      ? theme.primary
      : variant === 'secondary'
        ? theme.backgroundElement
        : 'transparent';
  const fg =
    variant === 'primary' ? theme.onPrimary : variant === 'danger' ? theme.warning : theme.text;
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg },
        variant === 'danger' && { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: theme.warning },
        inactive && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <ThemedText type={small ? 'small' : 'default'} style={[styles.buttonLabel, { color: fg }]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? theme.primary : theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="small" style={{ color: selected ? theme.onPrimary : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundElement }]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && { backgroundColor: theme.background }]}>
            <ThemedText type="small" style={selected ? styles.segmentSelected : undefined} themeColor={selected ? 'text' : 'textSecondary'}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Form fields ----------

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  suffix?: string;
  hint?: string;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'search' | 'next';
  style?: StyleProp<ViewStyle>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline,
  suffix,
  hint,
  autoFocus,
  autoCapitalize = 'sentences',
  onSubmitEditing,
  returnKeyType,
  style,
}: FieldProps) {
  const theme = useTheme();
  return (
    <View style={[styles.field, style]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={[styles.inputWrap, { backgroundColor: theme.backgroundElement }, multiline && styles.inputWrapMulti]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType={keyboardType}
          multiline={multiline}
          autoFocus={autoFocus}
          autoCapitalize={autoCapitalize}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          accessibilityLabel={label}
          style={[styles.input, { color: theme.text }, multiline && styles.inputMulti]}
        />
        {suffix ? (
          <ThemedText type="small" themeColor="textSecondary">
            {suffix}
          </ThemedText>
        ) : null}
      </View>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <ThemedText type="default">{label}</ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}

// ---------- Feedback ----------

export function Notice({ tone, text, title }: { tone: 'info' | 'warn' | 'error'; text: string; title?: string }) {
  const theme = useTheme();
  const accent = tone === 'error' ? theme.warning : tone === 'warn' ? theme.carbs : theme.fat;
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.notice, { borderLeftColor: accent, backgroundColor: theme.backgroundElement }]}>
      {title ? <ThemedText type="smallBold">{title}</ThemedText> : null}
      <ThemedText type="small">{text}</ThemedText>
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'estimate' }) {
  const theme = useTheme();
  const estimate = tone === 'estimate';
  return (
    <View style={[styles.badge, { backgroundColor: estimate ? theme.carbs + '33' : theme.backgroundSelected }]}>
      <ThemedText type="small" style={styles.badgeText}>
        {estimate ? '≈ ' : ''}
        {label}
      </ThemedText>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
        {body}
      </ThemedText>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={styles.emptyAction} /> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.empty}>
      <ActivityIndicator />
    </View>
  );
}

// ---------- Sheet ----------

export function SheetModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const ios = Platform.OS === 'ios';
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={ios ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <View style={[styles.sheetHeader, { paddingTop: ios ? Spacing.three : insets.top + Spacing.two }]}>
          <ThemedText type="subtitle" style={styles.sheetTitle}>
            {title}
          </ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12}>
            <ThemedText themeColor="textSecondary">Cancel</ThemedText>
          </Pressable>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + Spacing.five }]}>
          {children}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

/** Large calories number + protein/carbs/fat row, reused in totals and portion previews. */
export function MacroSummary({
  calories,
  protein,
  carbs,
  fat,
  caption,
}: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  caption?: string;
}) {
  const theme = useTheme();
  const cell = (label: string, value: number, color: string) => (
    <View style={styles.macroCell}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
      <ThemedText type="default" style={styles.macroValue}>
        {Math.round(value * 10) / 10} g
      </ThemedText>
    </View>
  );
  return (
    <View>
      {caption ? (
        <ThemedText type="small" themeColor="textSecondary">
          {caption}
        </ThemedText>
      ) : null}
      <ThemedText style={[styles.calories, { color: theme.calories }]}>
        {Math.round(calories)}
        <ThemedText type="small" themeColor="textSecondary">
          {' '}
          kcal
        </ThemedText>
      </ThemedText>
      <View style={styles.macroRow}>
        {cell('Protein', protein, theme.protein)}
        {cell('Carbs', carbs, theme.carbs)}
        {cell('Fat', fat, theme.fat)}
      </View>
    </View>
  );
}

export const layout = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stack: { gap: Spacing.three },
  grow: { flex: 1 },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  card: { borderRadius: Radius.md, padding: Spacing.three, gap: Spacing.two },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  sectionTitle: { letterSpacing: 0.6 },
  button: {
    minHeight: 50,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: Spacing.three },
  buttonLabel: { fontWeight: 600 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 3 },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.md - 3,
  },
  segmentSelected: { fontWeight: 700 },
  field: { gap: Spacing.one },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    gap: Spacing.two,
  },
  inputWrapMulti: { alignItems: 'flex-start', paddingVertical: Spacing.two },
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.two },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  hint: { marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  notice: {
    borderLeftWidth: 4,
    borderRadius: Radius.sm,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  badge: { borderRadius: Radius.pill, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  badgeText: { fontSize: 12, lineHeight: 16 },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five, paddingHorizontal: Spacing.three },
  emptyTitle: { fontSize: 22, lineHeight: 28, textAlign: 'center' },
  emptyBody: { textAlign: 'center' },
  emptyAction: { marginTop: Spacing.two, alignSelf: 'stretch' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  sheetTitle: { fontSize: 22, lineHeight: 28 },
  sheetContent: { paddingHorizontal: Spacing.three, gap: Spacing.three, paddingTop: Spacing.two },
  calories: { fontSize: 40, lineHeight: 46, fontWeight: 700 },
  macroRow: { flexDirection: 'row', marginTop: Spacing.two },
  macroCell: { flex: 1, gap: 2 },
  macroValue: { fontWeight: 600 },
});
