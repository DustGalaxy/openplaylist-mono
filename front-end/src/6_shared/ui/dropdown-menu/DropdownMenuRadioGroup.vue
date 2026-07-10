<script setup lang="ts">
import { DropdownMenuRadioGroup, type DropdownMenuRadioGroupProps, type DropdownMenuRadioGroupEmits, useForwardPropsEmits } from 'radix-vue'

const props = defineProps<DropdownMenuRadioGroupProps>()
const emits = defineEmits<DropdownMenuRadioGroupEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DropdownMenuRadioGroup v-bind="forwarded" data-slot="dropdown-menu-radio-group">
    <slot />
  </DropdownMenuRadioGroup>
</template>