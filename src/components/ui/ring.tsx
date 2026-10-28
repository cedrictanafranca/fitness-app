import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export interface RingProps {
  /** Outer diameter in px. */
  size: number;
  /** Stroke width in px. */
  stroke: number;
  /** Fill amount, 0..1 (clamped). */
  progress: number;
  /** Progress arc color. */
  color: string;
  /** Override the unfilled track color (defaults to theme.track). */
  trackColor?: string;
  /** Rendered centered inside the ring. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Ring({ size, stroke, progress, color, trackColor, children, style, accessibilityLabel }: RingProps) {
  const theme = useTheme();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const center = size / 2;

  return (
    <View
      accessible={accessibilityLabel != null}
      accessibilityLabel={accessibilityLabel}
      style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor ?? theme.track} strokeWidth={stroke} fill="none" />
        {clamped > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped)}
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        )}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
