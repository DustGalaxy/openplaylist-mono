<script setup lang="ts">
import { DropdownMenuRoot, type DropdownMenuRootProps, type DropdownMenuRootEmits, useForwardPropsEmits } from 'radix-vue'
const props = defineProps<DropdownMenuRootProps>()
const emits = defineEmits<DropdownMenuRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DropdownMenuRoot v-bind="forwarded" data-slot="dropdown-menu">
    <slot />
  </DropdownMenuRoot>
</template>