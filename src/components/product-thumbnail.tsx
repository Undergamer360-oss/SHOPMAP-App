import { Image } from 'expo-image';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/text';
import { thumbnailSource } from '@/data/product-thumbnails';
import { useAppTheme } from '@/theme/theme-provider';
import { Radius } from '@/theme/tokens';

type ProductThumbnailProps = {
  name: string;
  departmentName?: string | null;
  size?: number;
  /** Share a row equally instead of using a fixed size. */
  fill?: boolean;
  /** Optional small number shown in the corner, e.g. the stop number. */
  index?: number | string | null;
  style?: StyleProp<ViewStyle>;
};

/**
 * A quiet, rounded tile for a product image. The source is resolved locally,
 * so every thumbnail works offline and needs no network request.
 */
export function ProductThumbnail({
  name,
  departmentName,
  size = 44,
  fill = false,
  index,
  style,
}: ProductThumbnailProps) {
  const { colors } = useAppTheme();
  const imageStyle: ImageStyle = fill
    ? { position: 'absolute', top: 4, bottom: 4, left: 4, right: 4 }
    : { width: size - 8, height: size - 8 };

  return (
    <View
      style={[
        styles.tile,
        {
          ...(fill ? { flex: 1, aspectRatio: 1 } : { width: size, height: size }),
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
        },
        style,
      ]}>
      {/* Twemoji artwork has padding already, so the glyph is inset slightly. */}
      <Image
        source={thumbnailSource(name, departmentName)}
        style={imageStyle}
        contentFit="contain"
        cachePolicy="memory"
        accessibilityLabel={name}
      />
      {index !== undefined && index !== null ? (
        <View style={[styles.index, { backgroundColor: colors.primary }]}>
          <AppText style={[styles.indexText, { color: colors.onPrimary }]}>{index}</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: Radius.sm,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  index: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
  },
});
