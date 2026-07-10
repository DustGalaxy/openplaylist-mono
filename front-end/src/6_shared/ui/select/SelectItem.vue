<script setup lang="ts">
import { SelectItem, type SelectItemProps, SelectItemIndicator, SelectItemText } from 'radix-vue'
import { CheckIcon } from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<SelectItemProps & { class?: string }>()
</script>
<template>
  <SelectItem
    v-bind="props"
    data-slot="select-item"
    :class="cn(`focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-text-secondary relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2`, props.class)"
  >
    <span class="absolute right-2 flex size-3.5 items-center justify-center">
      <SelectItemIndicator>
        <CheckIcon class="size-4" />
      </SelectItemIndicator>
    </span>
    <SelectItemText><slot /></SelectItemText>
  </SelectItem>
</template>