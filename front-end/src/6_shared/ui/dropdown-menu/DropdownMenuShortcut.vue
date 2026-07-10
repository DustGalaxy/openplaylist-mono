<script setup lang="ts">
import { cn } from '@/6_shared/lib/utils'
const props = defineProps<{ class?: string }>()
</script>
<template>
  <span data-slot="dropdown-menu-shortcut" :class="cn('text-text-secondary ml-auto text-xs tracking-widest', props.class)">
    <slot />
  </span>
</template>