<script setup lang="ts">
import { DropdownMenuCheckboxItem, type DropdownMenuCheckboxItemProps, DropdownMenuItemIndicator, type DropdownMenuCheckboxItemEmits, useForwardPropsEmits } from 'radix-vue'
import { CheckIcon } from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<DropdownMenuCheckboxItemProps & { class?: string }>()
const emits = defineEmits<DropdownMenuCheckboxItemEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DropdownMenuCheckboxItem
    v-bind="forwarded"
    data-slot="dropdown-menu-checkbox-item"
    :class="cn('focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4', props.class)"
  >
    <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownMenuItemIndicator>
        <CheckIcon class="size-4" />
      </DropdownMenuItemIndicator>
    </span>
    <slot />
  </DropdownMenuCheckboxItem>
</template>