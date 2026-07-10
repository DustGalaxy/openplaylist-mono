<script setup lang="ts">
import { ref, computed } from 'vue'

const activeId = ref('default')
const customHue = ref(0)
const customMode = ref<'light' | 'dark'>('light')

const handleModeToggle = () => {
  customMode.value = customMode.value === 'light' ? 'dark' : 'light'
}

const allThemes = [
  { id: 'default', name: 'Default Dark', level1: '#111', level2: '#222', level3: '#333' }
]
</script>
<template>
  <div class="flex flex-col gap-2 p-1" style="width: 232px">
    <div class="flex flex-col gap-1 max-h-[280px] overflow-y-auto pr-0.5">
      <button
        v-for="theme in allThemes"
        :key="theme.id"
        class="group flex items-center gap-3 px-3 py-2.5 rounded-[var(--rounded-std)] transition-all text-left w-full shrink-0 border border-transparent hover:bg-level-1/60"
        :class="{ 'bg-level-1 border-level-3/50': theme.id === activeId }"
      >
        <div class="flex items-center gap-1 shrink-0">
          <span class="block rounded-full w-2.5 h-2.5 border border-white/10" :style="{ background: theme.level1 }" />
          <span class="block rounded-full w-2.5 h-2.5 border border-white/10" :style="{ background: theme.level2 }" />
          <span class="block rounded-full w-2.5 h-2.5" :style="{ background: theme.level3 }" />
        </div>
        <span class="flex-1 text-sm truncate transition-colors text-text-secondary group-hover:text-text-main">
          {{ theme.name }}
        </span>
      </button>
    </div>
    <div class="border-t border-white/8 pt-2.5 px-1 flex flex-col gap-2">
      <div class="flex items-center justify-between gap-2">
        <label class="text-[11px] text-text-secondary font-medium uppercase tracking-wider">Тест палитры</label>
        <button @click="handleModeToggle" class="text-[10px] px-1.5 py-0.5 rounded bg-level-1 border border-white/8 hover:border-white/14 text-text-main transition-colors">
          {{ customMode === 'light' ? '☀️ Light' : '🌙 Dark' }}
        </button>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-text-placeholder select-none font-mono">H:</span>
        <input type="number" v-model="customHue" min="0" max="360" class="flex-1 min-w-0 bg-level-1 border border-white/8 rounded px-1.5 py-0.5 text-xs text-text-main font-mono focus:outline-none focus:border-level-3/50 text-right" placeholder="0-360" />
      </div>
    </div>
  </div>
</template>