<script setup lang="ts">
import { DropdownMenuPortal, type DropdownMenuPortalProps } from 'radix-vue'
const props = defineProps<DropdownMenuPortalProps>()
</script>
<template>
  <DropdownMenuPortal v-bind="props" data-slot="dropdown-menu-portal">
    <slot />
  </DropdownMenuPortal>
</template>