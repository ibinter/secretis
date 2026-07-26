import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Typography, Spacing } from '../config/theme'

// ============================================================
// Props
// ============================================================

interface OfflineBannerProps {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
}

// ============================================================
// Component
// ============================================================

type BannerState = 'offline' | 'syncing' | 'synced' | 'hidden'

const BANNER_HEIGHT = 40

export default function OfflineBanner({
  isOnline,
  pendingCount,
  isSyncing,
}: OfflineBannerProps) {
  const translateY = useRef(new Animated.Value(-BANNER_HEIGHT)).current
  const opacity = useRef(new Animated.Value(0)).current
  const [bannerState, setBannerState] = useState<BannerState>('hidden')
  const synced_timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -BANNER_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setBannerState('hidden'))
  }

  useEffect(() => {
    if (synced_timer.current) clearTimeout(synced_timer.current)

    if (!isOnline) {
      setBannerState('offline')
      show()
    } else if (isSyncing) {
      setBannerState('syncing')
      show()
    } else if (bannerState === 'syncing' || bannerState === 'offline') {
      // Just came back online and finished syncing — show "Synced" briefly
      setBannerState('synced')
      show()
      synced_timer.current = setTimeout(() => {
        hide()
      }, 2000)
    }

    return () => {
      if (synced_timer.current) clearTimeout(synced_timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isSyncing])

  if (bannerState === 'hidden') return null

  const backgroundColor =
    bannerState === 'synced' ? '#27AE60' : bannerState === 'syncing' ? '#2B7DC0' : '#F39C12'

  const label =
    bannerState === 'synced'
      ? 'Synchronisé ✓'
      : bannerState === 'syncing'
        ? 'Synchronisation en cours…'
        : pendingCount > 0
          ? `Mode hors ligne — ${pendingCount} action${pendingCount > 1 ? 's' : ''} en attente de synchronisation`
          : 'Mode hors ligne'

  const iconName: React.ComponentProps<typeof Ionicons>['name'] =
    bannerState === 'synced'
      ? 'checkmark-circle'
      : bannerState === 'syncing'
        ? 'sync'
        : 'wifi-off'

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor, transform: [{ translateY }], opacity },
      ]}
    >
      <Ionicons name={iconName} size={16} color="#fff" />
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  )
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  banner: {
    height: BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    zIndex: 9999,
  },
  text: {
    color: '#fff',
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    flexShrink: 1,
  },
})
