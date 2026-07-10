<script setup lang="ts">
import { DialogRoot, type DialogRootProps, type DialogRootEmits, useForwardPropsEmits } from 'radix-vue'
const props = defineProps<DialogRootProps>()
const emits = defineEmits<DialogRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DialogRoot v-bind="forwarded" data-slot="dialog">
    <slot />
  </DialogRoot>
</template>