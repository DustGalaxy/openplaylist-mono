<script setup lang="ts">
import { GripVerticalIcon } from 'lucide-vue-next'

defineProps<{
  title: string
  duration: string
}>()
</script>

<template>
  <div class="w-full h-23 rounded-(--rounded-std) border-2 border-level-3 bg-level-2 shadow-[0_12px_28px_rgba(0,0,0,0.5)] flex items-center px-3 gap-2 rotate-1">
    <span class="text-sm font-semibold text-text-main truncate">{{ title }}</span>
    <span class="ml-auto text-xs font-mono text-text-placeholder shrink-0">{{ duration }}</span>
    <GripVerticalIcon class="h-4 w-4 text-level-3 shrink-0" />
  </div>
</template>
