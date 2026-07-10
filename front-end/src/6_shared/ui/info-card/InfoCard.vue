<script setup lang="ts">
// Using a hardcoded innerPanelClass since the landing feature styles haven't been ported yet
const innerPanelClass = 'bg-level-1 border border-level-3/40 rounded-xl shadow-sm'

defineProps<{
  label: string
  value: string | number
}>()
</script>

<template>
  <div
    :class="[
      innerPanelClass,
      'p-3 sm:p-4 flex flex-col gap-2 transition-colors hover:border-level-3/30'
    ]"
  >
    <div class="flex items-center gap-2 text-text-placeholder">
      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-level-2/80 text-level-3">
        <slot name="icon" />
      </span>
      <span class="text-[11px] uppercase tracking-wide leading-tight">
        {{ label }}
      </span>
    </div>
    <p class="text-base font-semibold text-text-main pl-9 sm:pl-0 sm:text-center sm:-mt-1">
      {{ value }}
    </p>
  </div>
</template>