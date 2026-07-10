<script setup lang="ts">
import { SelectGroup, type SelectGroupProps } from 'radix-vue'
const props = defineProps<SelectGroupProps>()
</script>
<template>
  <SelectGroup v-bind="props" data-slot="select-group">
    <slot />
  </SelectGroup>
</template>