import React, { useEffect, useRef } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors, Typography } from '../config/theme'

// ============================================================
// Props
// ============================================================

interface SyncIndicatorProps {
  pendingCount: number
  isSyncing: boolean
  allSynced?: boolean // briefly shown after sync completes
}

// ============================================================
// Component
// ============================================================

export default function SyncIndicator({
  pendingCount,
  isSyncing,
  allSynced = false,
}: SyncIndicatorProps) {
  const spinAnim = useRef(new Animated.Value(0)).current
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (isSyncing) {
      spinAnim.setValue(0)
      spinLoop.current = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      )
      spinLoop.current.start()
    } else {
      spinLoop.current?.stop()
      spinAnim.setValue(0)
    }
  }, [isSyncing, spinAnim])

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  // Show nothing when all synced and no pending
  if (!isSyncing && pendingCount === 0 && !allSynced) return null

  if (isSyncing) {
    return (
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="sync" size={20} color={Colors.textOnPrimary} />
      </Animated.View>
    )
  }

  if (allSynced) {
    return <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
  }

  // Pending badge
  return (
    <View style={styles.badgeWrapper}>
      <Ionicons name="cloud-upload-outline" size={20} color={Colors.textOnPrimary} />
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {pendingCount > 99 ? '99+' : String(pendingCount)}
          </Text>
        </View>
      )}
    </View>
  )
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  badgeWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: Typography.fontSize.xs - 1,
    fontWeight: '700',
    lineHeight: 14,
  },
})
