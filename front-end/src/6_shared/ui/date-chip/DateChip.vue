<script setup lang="ts">
import { CalendarIcon } from 'lucide-vue-next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/6_shared/ui/tooltip'

const props = defineProps<{ date: string }>()

// Fallback logic for i18n
const locale = 'en-US'
const dateObj = new Date(props.date)

const formattedDate = dateObj.toLocaleDateString(locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const fullDate = dateObj.toLocaleDateString(locale, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
})
</script>

<template>
  <div class="bg-level-2 rounded-[var(--rounded-std)] border-t-[3px] sm:border-t-[5px] border-level-3 h-[28px] sm:h-[32px] md:h-[40px] px-1.5 sm:px-2 md:px-3 shadow-[-1px_1px_6px_rgba(0,0,0,0.4),-1px_1px_4px_rgba(0,0,0,0.3)] sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.45),-2px_2px_4px_rgba(0,0,0,0.35)] inline-flex items-center justify-center">
    <div class="text-center flex text-[14px] sm:text-[16px] md:text-[18px] gap-1 sm:gap-1.5 md:gap-2 items-center h-full">
      <CalendarIcon class="w-[16px] h-[16px] sm:w-[20px] sm:h-[20px] md:w-[24px] md:h-[24px]" />
      <Tooltip>
        <TooltipTrigger>
          <span class="text-text-main pb-1 text-[12px] sm:text-[16px] md:text-[18px]">
            {{ formattedDate }}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ fullDate }}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>