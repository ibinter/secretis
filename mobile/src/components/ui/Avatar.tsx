import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, BorderRadius } from '../../config/theme';
import { initials } from '../../utils/formatting';

// ============================================================
// Types
// ============================================================

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string;
  uri?: string | null;
  size?: AvatarSize;
  style?: ViewStyle;
  borderColor?: string;
}

// ============================================================
// Tailles
// ============================================================

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 52,
  xl: 72,
};

const FONT_MAP: Record<AvatarSize, number> = {
  xs: 9,
  sm: 12,
  md: 15,
  lg: 18,
  xl: 26,
};

// Génère une couleur de fond déterministe à partir du nom
function avatarColor(name: string): string {
  const palette = [
    '#1A3A5C', '#2B5082', '#28A745', '#E8A020', '#17A2B8',
    '#8B5CF6', '#F97316', '#EF4444', '#059669', '#0EA5E9',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

// ============================================================
// Composant
// ============================================================

export default function Avatar({
  name = '',
  uri,
  size = 'md',
  style,
  borderColor,
}: AvatarProps) {
  const dim = SIZE_MAP[size];
  const fontSize = FONT_MAP[size];
  const bgColor = avatarColor(name || 'U');

  const containerStyle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    backgroundColor: bgColor,
    alignItems: 'center',
    justifyContent: 'center',
    ...(borderColor ? { borderWidth: 2, borderColor } : {}),
  };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[containerStyle, styles.image, style]}
        defaultSource={require('../../../assets/icon.png')}
      />
    );
  }

  return (
    <View style={[containerStyle, style]}>
      <Text style={[styles.initials, { fontSize }]}>
        {initials(name) || '?'}
      </Text>
    </View>
  );
}

// Groupe d'avatars empilés
interface AvatarGroupProps {
  users: Array<{ name: string; avatar?: string | null }>;
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  const dim = SIZE_MAP[size];
  const overlap = dim * 0.35;

  return (
    <View style={{ flexDirection: 'row', height: dim }}>
      {visible.map((u, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: visible.length - i }}>
          <Avatar
            name={u.name}
            uri={u.avatar}
            size={size}
            borderColor={Colors.surface}
          />
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: Colors.border,
              marginLeft: -overlap,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: Colors.surface,
            },
          ]}
        >
          <Text style={{ fontSize: FONT_MAP[size], color: Colors.textSecondary, fontWeight: '600' }}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  initials: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  image: {
    resizeMode: 'cover',
  },
});
