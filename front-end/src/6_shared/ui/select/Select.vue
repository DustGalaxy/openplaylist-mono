<script setup lang="ts">
import { SelectRoot, type SelectRootProps, type SelectRootEmits, useForwardPropsEmits } from 'radix-vue'
const props = defineProps<SelectRootProps>()
const emits = defineEmits<SelectRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <SelectRoot v-bind="forwarded" data-slot="select">
    <slot />
  </SelectRoot>
</template>