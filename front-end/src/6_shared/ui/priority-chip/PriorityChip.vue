<script setup lang="ts">
import { ArrowUpCircleIcon } from 'lucide-vue-next'

defineProps<{ number: number }>()
</script>

<template>
  <div class="bg-level-2 rounded-[var(--rounded-std)] border-r-[3px] border-t-[3px] sm:border-r-[5px] sm:border-t-[5px] border-level-3 h-[28px] sm:h-[32px] md:h-[40px] shadow-[-1px_1px_6px_rgba(0,0,0,0.4),-1px_1px_4px_rgba(0,0,0,0.3)] sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.45),-2px_2px_4px_rgba(0,0,0,0.35)] px-1.5 sm:px-2 md:px-3 inline-flex items-center justify-center">
    <div class="text-center flex text-[20px] sm:text-[22px] md:text-[26px] gap-1 sm:gap-1.5 md:gap-2 items-center h-full">
      <ArrowUpCircleIcon class="w-[16px] h-[16px] sm:w-[20px] sm:h-[20px] md:w-[24px] md:h-[24px]" />
      {{ number }}
    </div>
  </div>
</template>