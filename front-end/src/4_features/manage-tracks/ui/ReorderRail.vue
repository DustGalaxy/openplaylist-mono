<script setup lang="ts">
import { GripVerticalIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-vue-next'

const props = defineProps<{
  id: string
  mode: 'dnd' | 'arrows'
  isFirst: boolean
  isLast: boolean
  isActive: boolean
  isDragging?: boolean
}>()

const emit = defineEmits<{
  (e: 'move', dir: 'up' | 'down'): void
}>()
</script>

<template>
  <div 
    class="flex items-stretch gap-3 min-h-22"
    :style="{ opacity: isDragging ? 0 : 1 }"
  >
    <div class="flex-1 min-w-0">
      <slot :isDragging="isDragging" />
    </div>
    
    <div 
      :class="[
        'flex flex-col items-center justify-center w-6 shrink-0 rounded-sm bg-level-2 border border-level-3/15',
        isActive ? 'block' : 'hidden',
        mode === 'dnd' ? 'cursor-grab active:cursor-grabbing' : ''
      ]"
    >
      <template v-if="mode === 'dnd'">
        <div 
          aria-label="Drag to reorder"
          style="touch-action: none"
          class="w-full flex items-center justify-center text-text-placeholder hover:text-level-3 active:bg-level-1/40"
        >
          <GripVerticalIcon class="h-4 w-4" />
        </div>
      </template>
      <template v-else>
        <button
          :disabled="isFirst"
          @click="emit('move', 'up')"
          aria-label="Move up"
          class="flex-1 min-h-11 w-full flex items-center justify-center disabled:opacity-20 text-text-placeholder hover:text-level-3 active:bg-level-1/40"
        >
          <ChevronUpIcon class="h-3.5 w-3.5" />
        </button>
        <div class="h-px w-3 bg-white/5" />
        <button
          :disabled="isLast"
          @click="emit('move', 'down')"
          aria-label="Move down"
          class="flex-1 min-h-11 w-full flex items-center justify-center disabled:opacity-20 text-text-placeholder hover:text-level-3 active:bg-level-1/40"
        >
          <ChevronDownIcon class="h-3.5 w-3.5" />
        </button>
      </template>
    </div>
  </div>
</template>
