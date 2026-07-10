<script setup lang="ts">
import { Toaster as Sonner, type ToasterProps } from 'vue-sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-vue-next'

const props = defineProps<ToasterProps>()

// In a real Vue app with next-themes equivalent, this would be reactive.
// Hardcoded to system for now, as useTheme is not migrated yet.
const theme = 'system'
</script>

<template>
  <Sonner
    v-bind="props"
    :theme="theme"
    class="toaster group"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    }"
  >
    <!-- Vue Sonner uses slots for custom icons -->
    <template #success-icon><CircleCheckIcon class="size-4" /></template>
    <template #info-icon><InfoIcon class="size-4" /></template>
    <template #warning-icon><TriangleAlertIcon class="size-4" /></template>
    <template #error-icon><OctagonXIcon class="size-4" /></template>
    <template #loading-icon><Loader2Icon class="size-4 animate-spin" /></template>
  </Sonner>
</template>