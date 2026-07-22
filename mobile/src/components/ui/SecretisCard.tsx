import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Colors, BorderRadius, Shadow, Spacing } from '../../config/theme';

// ============================================================
// Types
// ============================================================

interface SecretisCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: 'sm' | 'md' | 'lg' | 'none';
  padding?: keyof typeof Spacing | 0;
  borderColor?: string;
  backgroundColor?: string;
}

// ============================================================
// Composant
// ============================================================

export default function SecretisCard({
  children,
  style,
  onPress,
  elevation = 'sm',
  padding = 'base',
  borderColor,
  backgroundColor = Colors.surface,
}: SecretisCardProps) {
  const shadowStyle = elevation === 'none' ? undefined : Shadow[elevation];
  const paddingValue = padding === 0 ? 0 : Spacing[padding];

  const cardStyle = [
    styles.card,
    shadowStyle,
    {
      padding: paddingValue,
      backgroundColor,
      ...(borderColor ? { borderWidth: 1, borderColor } : {}),
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
        onPress={onPress}
        android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
