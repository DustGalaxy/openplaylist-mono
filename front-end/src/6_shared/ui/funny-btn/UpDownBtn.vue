<script setup lang="ts">
import { cn } from '@/6_shared/lib/utils'

const props = withDefaults(defineProps<{
  getInputRef?: () => HTMLInputElement | null
  class?: string
}>(), {
  getInputRef: () => null
})

const emit = defineEmits<{
  (e: 'upClick'): void
  (e: 'downClick'): void
}>()

const handleAction = (type: 'up' | 'down') => {
  const inputElement = props.getInputRef()
  if (inputElement) {
    if (type === 'up') inputElement.stepUp()
    else inputElement.stepDown()
    
    inputElement.dispatchEvent(new Event('input', { bubbles: true }))
  }

  if (type === 'up') emit('upClick')
  else emit('downClick')
}
</script>

<template>
  <div :class="cn('rounded-(--rounded-std) flex flex-row items-center justify-center h-9', props.class)">
    <button
      @click="handleAction('up')"
      class="pl-2 pr-2 h-full w-full bg-level-2 hover:bg-level-3 active:bg-level-3/50"
    >
      ↑
    </button>
    <button
      @click="handleAction('down')"
      class="pr-2 pl-2 h-full w-full bg-level-2 hover:bg-level-3 active:bg-level-3/50"
    >
      ↓
    </button>
  </div>
</template>