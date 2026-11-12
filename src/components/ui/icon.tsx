import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

type IconProps = {
  sf: SymbolViewProps['name'];
  md: keyof typeof MaterialIcons.glyphMap;
  size?: number;
  color: string;
  weight?: SymbolViewProps['weight'];
};

/**
 * Renders an SF Symbol on iOS and the matching Material icon everywhere else,
 * so no platform ends up with blank glyphs.
 */
export function Icon({ sf, md, size = 22, color, weight = 'regular' }: IconProps) {
  if (process.env.EXPO_OS === 'ios') {
    return (
      <SymbolView
        name={sf}
        tintColor={color}
        weight={weight}
        resizeMode="scaleAspectFit"
        style={{ width: size, height: size }}
      />
    );
  }

  return <MaterialIcons name={md} size={size} color={color} />;
}
