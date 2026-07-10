<script setup lang="ts">
import { InfoCard } from '@/6_shared/ui/info-card'
import {
  ArrowUpRightIcon,
  ClockIcon,
  EyeIcon,
  ListIcon,
  RefreshCcwIcon,
  SettingsIcon,
  ThumbsUpIcon,
  UserIcon,
} from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'

// Temporary mock for i18n
const t = (key: string, opts?: any) => {
  if (opts && opts.count !== undefined) return `${opts.count}`
  return key.split('.').pop()
}

defineProps<{
  mode: string
  min_views: number
  min_likes: number
  max_duration: number
  track_cooldown: number
  user_cooldown: number
  max_playlist_size: number
  priorityMode: string
  class?: string
}>()
</script>

<template>
  <div :class="cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3', $props.class)">
    <InfoCard :label="t('playlist.stats.mode')" :value="mode">
      <template #icon><SettingsIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.minViews')" :value="min_views">
      <template #icon><EyeIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.minLikes')" :value="min_likes">
      <template #icon><ThumbsUpIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.maxDuration')" :value="t('playlist.stats.durationSec', { count: max_duration })">
      <template #icon><ClockIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.trackCd')" :value="t('playlist.stats.cooldownMin', { count: track_cooldown })">
      <template #icon><RefreshCcwIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.userCd')" :value="t('playlist.stats.cooldownMin', { count: user_cooldown })">
      <template #icon><UserIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.maxSize')" :value="max_playlist_size || t('playlist.stats.maxSizeUnlimited')">
      <template #icon><ListIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.priorityMode')" :value="priorityMode">
      <template #icon><ArrowUpRightIcon :size="14" /></template>
    </InfoCard>
  </div>
</template>