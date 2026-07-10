<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watchEffect, computed } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'

const props = withDefaults(defineProps<{
  timestamp: number | string | Date
  lang?: string
  class?: string
}>(), {
  lang: 'ru'
})

const locales: Record<string, any> = {
  ru,
  en: enUS,
}

const timeAgoText = ref('')
const tick = ref(0)

let interval: number | undefined

onMounted(() => {
  interval = window.setInterval(() => {
    tick.value++
  }, 60000)
})

onBeforeUnmount(() => {
  if (interval) clearInterval(interval)
})

const dateObj = computed(() => {
  const ts = props.timestamp
  if (ts instanceof Date) return ts
  if (typeof ts === 'string') {
    const utcString = ts.endsWith('Z') ? ts : `${ts}Z`
    return new Date(utcString)
  }
  return new Date(ts)
})

watchEffect(() => {
  // Dependency on tick to trigger re-eval
  tick.value
  
  try {
    timeAgoText.value = formatDistanceToNow(dateObj.value, {
      addSuffix: true,
      locale: locales[props.lang] || locales.ru,
    })
  } catch (e) {
    timeAgoText.value = ''
  }
})
</script>

<template>
  <div :class="props.class">{{ timeAgoText }}</div>
</template>