<script setup lang="ts">
import { DropdownMenuTrigger, type DropdownMenuTriggerProps } from 'radix-vue'
const props = defineProps<DropdownMenuTriggerProps>()
</script>
<template>
  <DropdownMenuTrigger v-bind="props" data-slot="dropdown-menu-trigger">
    <slot />
  </DropdownMenuTrigger>
</template>