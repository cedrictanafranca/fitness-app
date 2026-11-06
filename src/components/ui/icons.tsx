import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type IconName =
  | 'home'
  | 'chart'
  | 'book'
  | 'person'
  | 'plus'
  | 'close'
  | 'back'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'flame'
  | 'search'
  | 'pencil'
  | 'camera'
  | 'scan'
  | 'mic'
  | 'bookmark'
  | 'dumbbell'
  | 'sparkles'
  | 'run'
  | 'bike'
  | 'walk'
  | 'timer'
  | 'drumstick'
  | 'wheat'
  | 'drop'
  | 'image'
  | 'check'
  | 'more'
  | 'info'
  | 'trash'
  | 'bolt'
  | 'bowl'
  | 'text'
  | 'arrow-up'
  | 'arrow-up-right'
  | 'arrow-down-right'
  | 'arrow-right'
  | 'stop'
  | 'scale'
  | 'heart'
  | 'target'
  | 'bell'
  | 'coffee'
  | 'sun'
  | 'moon'
  | 'cookie';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Stroke width in the 24-unit viewBox. */
  strokeWidth?: number;
  /** Fill the shape instead of stroking it (used for selected tab icons). */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Line icons drawn with react-native-svg so they look the same on iOS, Android and web. */
export function Icon({ name, size = 22, color, strokeWidth = 1.8, filled = false, style }: IconProps) {
  const theme = useTheme();
  const stroke = color ?? theme.text;
  const common = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: filled ? stroke : 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {shape(name, common, stroke)}
    </Svg>
  );
}

type Common = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: string;
};

function shape(name: IconName, c: Common, stroke: string) {
  const open = { ...c, fill: 'none' };
  switch (name) {
    case 'home':
      return <Path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" {...c} />;
    case 'chart':
      return (
        <>
          <Rect x="4" y="12" width="4" height="8" rx="1" {...c} />
          <Rect x="10" y="7" width="4" height="13" rx="1" {...c} />
          <Rect x="16" y="3" width="4" height="17" rx="1" {...c} />
        </>
      );
    case 'book':
      return (
        <>
          <Path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" {...open} />
          <Path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5" {...c} />
        </>
      );
    case 'person':
      return (
        <>
          <Circle cx="12" cy="8" r="4" {...c} />
          <Path d="M4 21a8 8 0 0 1 16 0" {...c} />
        </>
      );
    case 'plus':
      return (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...open} />
          <Line x1="5" y1="12" x2="19" y2="12" {...open} />
        </>
      );
    case 'close':
      return (
        <>
          <Line x1="6" y1="6" x2="18" y2="18" {...open} />
          <Line x1="18" y1="6" x2="6" y2="18" {...open} />
        </>
      );
    case 'back':
      return (
        <>
          <Line x1="19" y1="12" x2="5" y2="12" {...open} />
          <Polyline points="11,6 5,12 11,18" {...open} />
        </>
      );
    case 'arrow-right':
      return (
        <>
          <Line x1="5" y1="12" x2="19" y2="12" {...open} />
          <Polyline points="13,6 19,12 13,18" {...open} />
        </>
      );
    case 'arrow-up':
      return (
        <>
          <Line x1="12" y1="19" x2="12" y2="5" {...open} />
          <Polyline points="6,11 12,5 18,11" {...open} />
        </>
      );
    case 'arrow-up-right':
      return (
        <>
          <Line x1="7" y1="17" x2="17" y2="7" {...open} />
          <Polyline points="9,7 17,7 17,15" {...open} />
        </>
      );
    case 'arrow-down-right':
      return (
        <>
          <Line x1="7" y1="7" x2="17" y2="17" {...open} />
          <Polyline points="17,9 17,17 9,17" {...open} />
        </>
      );
    case 'chevron-right':
      return <Polyline points="9,5 16,12 9,19" {...open} />;
    case 'chevron-down':
      return <Polyline points="5,9 12,16 19,9" {...open} />;
    case 'chevron-up':
      return <Polyline points="5,15 12,8 19,15" {...open} />;
    case 'flame':
      return (
        <Path
          d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.5.6-2.6 1.3-3.5.3 1 .9 1.6 1.7 1.8C10.6 7.6 11 5 12 3z"
          {...c}
        />
      );
    case 'search':
      return (
        <>
          <Circle cx="11" cy="11" r="6.5" {...open} />
          <Line x1="16" y1="16" x2="20.5" y2="20.5" {...open} />
        </>
      );
    case 'pencil':
      return <Path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z M13 8l3 3" {...open} />;
    case 'camera':
      return (
        <>
          <Path d="M4 8.5A1.5 1.5 0 0 1 5.5 7H8l1.5-2h5L16 7h2.5A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" {...open} />
          <Circle cx="12" cy="13" r="3.5" {...open} />
        </>
      );
    case 'scan':
      return (
        <>
          <Path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3" {...open} />
          <Circle cx="12" cy="12" r="2.5" {...c} />
        </>
      );
    case 'mic':
      return (
        <>
          <Rect x="9" y="3" width="6" height="11" rx="3" {...c} />
          <Path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" {...open} />
        </>
      );
    case 'bookmark':
      return <Path d="M6 4h12v17l-6-4-6 4z" {...c} />;
    case 'dumbbell':
      return (
        <>
          <Rect x="2.5" y="9" width="3" height="6" rx="1" {...c} />
          <Rect x="6" y="7" width="3" height="10" rx="1" {...c} />
          <Rect x="15" y="7" width="3" height="10" rx="1" {...c} />
          <Rect x="18.5" y="9" width="3" height="6" rx="1" {...c} />
          <Line x1="9" y1="12" x2="15" y2="12" {...open} />
        </>
      );
    case 'sparkles':
      return (
        <>
          <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" {...c} />
          <Path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" {...c} />
        </>
      );
    case 'run':
      return (
        <>
          <Circle cx="15" cy="4.5" r="1.8" {...c} />
          <Path d="M9 21l2.5-6.5L9 12l3-4 3 2.5 3 .5M12.5 14.5 16 18l1 3M9 8 6 9.5l-1 3" {...open} />
        </>
      );
    case 'walk':
      return (
        <>
          <Circle cx="13" cy="4" r="1.8" {...c} />
          <Path d="M10 21l2-6-2-3 1-5 3 2 3 2M12 12l3 3 1 6M11 7 8 9l-1 3" {...open} />
        </>
      );
    case 'bike':
      return (
        <>
          <Circle cx="6" cy="16" r="3.5" {...open} />
          <Circle cx="18" cy="16" r="3.5" {...open} />
          <Path d="M6 16l4-7h5l3 7M10 9l3 7h-3M14 5h2" {...open} />
        </>
      );
    case 'timer':
      return (
        <>
          <Circle cx="12" cy="13.5" r="7" {...open} />
          <Path d="M12 9.5v4l2.5 1.5M10 3h4M12 3v3.5M18 7l1.5-1.5" {...open} />
        </>
      );
    case 'drumstick':
      return (
        <Path
          d="M14.5 3.5a5 5 0 0 1 3.5 8.5l-5.5 5.5-2-2 5.5-5.5a2.2 2.2 0 1 0-3-3L7.5 12.5l-2-2L11 5a5 5 0 0 1 3.5-1.5zM7 15.5l1.5 1.5-2 2.5-1.5 .5-.5-1.5z"
          {...c}
        />
      );
    case 'wheat':
      return (
        <Path d="M12 21V9M12 9c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zm0 0c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4zm0 5c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zm0 0c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4zm0 5c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zm0 0c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z" {...open} />
      );
    case 'drop':
      return <Path d="M12 3.5c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z" {...c} />;
    case 'image':
      return (
        <>
          <Rect x="3.5" y="5" width="17" height="14" rx="2.5" {...open} />
          <Circle cx="9" cy="10" r="1.6" {...c} />
          <Path d="M20 15l-4.5-4.5L8 18" {...open} />
        </>
      );
    case 'check':
      return <Polyline points="5,12.5 10,17.5 19,7" {...open} />;
    case 'more':
      return (
        <>
          <Circle cx="6" cy="12" r="1.6" fill={stroke} />
          <Circle cx="12" cy="12" r="1.6" fill={stroke} />
          <Circle cx="18" cy="12" r="1.6" fill={stroke} />
        </>
      );
    case 'info':
      return (
        <>
          <Circle cx="12" cy="12" r="8.5" {...open} />
          <Path d="M12 11v5M12 8v.5" {...open} />
        </>
      );
    case 'trash':
      return (
        <>
          <Path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13" {...open} />
          <Path d="M10 11v6M14 11v6" {...open} />
        </>
      );
    case 'bolt':
      return <Path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H13z" {...c} />;
    case 'bowl':
      return (
        <>
          <Path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" {...open} />
          <Path d="M8 19.5h8M9 7l1.5-3M12 7V3.5M15 7l-1.5-3" {...open} />
        </>
      );
    case 'text':
      return (
        <>
          <Path d="M4 6h16M4 12h10M4 18h13" {...open} />
        </>
      );
    case 'stop':
      return <Rect x="6" y="6" width="12" height="12" rx="2" fill={stroke} />;
    case 'scale':
      return (
        <>
          <Rect x="4" y="3.5" width="16" height="17" rx="3" {...open} />
          <Path d="M8 10a4 4 0 0 1 8 0M12 10l2-2" {...open} />
        </>
      );
    case 'heart':
      return <Path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" {...c} />;
    case 'target':
      return (
        <>
          <Circle cx="12" cy="12" r="8" {...open} />
          <Circle cx="12" cy="12" r="4" {...open} />
          <Circle cx="12" cy="12" r="1" fill={stroke} />
        </>
      );
    case 'bell':
      return <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" {...open} />;
    case 'coffee':
      return (
        <>
          <Path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" {...open} />
          <Path d="M16 10h1.5a2 2 0 0 1 0 4H16M6 4.5v1.5M10 4.5v1.5" {...open} />
        </>
      );
    case 'sun':
      return (
        <>
          <Circle cx="12" cy="12" r="4" {...open} />
          <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" {...open} />
        </>
      );
    case 'moon':
      return <Path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" {...c} />;
    case 'cookie':
      return (
        <>
          <Path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3z" {...open} />
          <Circle cx="9" cy="10" r="1" fill={stroke} />
          <Circle cx="14" cy="15" r="1" fill={stroke} />
          <Circle cx="9" cy="15.5" r="1" fill={stroke} />
        </>
      );
  }
}
