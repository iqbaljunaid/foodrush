import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { tokens } from '../tokens';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  source?: ImageSourcePropType | null;
  uri?: string | null;
  name: string;
  size?: AvatarSize;
  style?: StyleProp<ViewStyle>;
}

const SIZES = { sm: 32, md: 48, lg: 72 } as const;
const FONT_SIZES = { sm: 12, md: 18, lg: 28 } as const;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  source,
  uri,
  name,
  size = 'md',
  style,
}: AvatarProps): React.JSX.Element {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);
  const dimension = SIZES[size];

  const containerStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: dimension / 2,
    backgroundColor: colors.primary,
    overflow: 'hidden',
  };

  const imageSource = source ?? (uri ? { uri } : null);
  const showImage = imageSource && !imageError;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Avatar for ${name}`}
      style={[containerStyle, styles.container, style]}
    >
      {showImage ? (
        <Image
          source={imageSource}
          style={styles.image}
          onError={() => setImageError(true)}
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              fontSize: FONT_SIZES[size],
              fontFamily: tokens.font.display.family,
              fontWeight: tokens.font.display.weight,
              color: '#FFFFFF',
            },
          ]}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  initials: {
    textAlign: 'center',
  },
});