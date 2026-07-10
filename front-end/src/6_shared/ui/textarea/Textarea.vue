<script setup lang="ts">
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<{ class?: string }>()
</script>
<template>
  <textarea
    data-slot="textarea"
    :class="cn('border-input placeholder:text-text-secondary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm', props.class)"
  />
</template>