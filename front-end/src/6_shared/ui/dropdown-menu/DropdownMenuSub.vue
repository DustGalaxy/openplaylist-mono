<script setup lang="ts">
import { DropdownMenuSub, type DropdownMenuSubProps, type DropdownMenuSubEmits, useForwardPropsEmits } from 'radix-vue'
const props = defineProps<DropdownMenuSubProps>()
const emits = defineEmits<DropdownMenuSubEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DropdownMenuSub v-bind="forwarded" data-slot="dropdown-menu-sub">
    <slot />
  </DropdownMenuSub>
</template>