<script setup lang="ts">
import { ref } from 'vue'
import { cn } from '@/6_shared/lib/utils'

const props = withDefaults(defineProps<{
  defaultValue?: 'left' | 'right'
  width?: string
  height?: string
  class?: string
}>(), {
  defaultValue: 'left',
  width: '140px',
  height: '33px'
})

const emit = defineEmits<{
  (e: 'change', side: 'left' | 'right'): void
}>()

const isRight = ref(props.defaultValue === 'right')

const toggle = () => {
  isRight.value = !isRight.value
  emit('change', isRight.value ? 'right' : 'left')
}
</script>

<template>
  <div
    @click="toggle"
    :style="{ width, height }"
    :class="cn('relative flex cursor-pointer select-none items-center rounded-2xl border-2 border-level-3/40 bg-level-2 p-1.5 transition-colors duration-300', props.class)"
  >
    <div
      :class="cn('absolute right-5 font-medium text-text-main transition-all duration-300 ease-out',
        isRight ? 'pointer-events-none scale-95 opacity-0' : 'scale-100 opacity-100')"
    >
      <slot name="leftLabel" />
    </div>
    
    <div
      :class="cn('absolute left-5 font-medium text-text-main transition-all duration-300 ease-out',
        isRight ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0')"
    >
      <slot name="rightLabel" />
    </div>
    
    <div
      :style="{ transform: isRight ? `translateX(calc(${width} - ${height} + 3px))` : 'translateX(0px)' }"
      class="h-full aspect-square rounded-xl bg-level-3 shadow-md transition-transform duration-300 ease-in-out"
    />
  </div>
</template>