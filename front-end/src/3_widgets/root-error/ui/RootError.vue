<script setup lang="ts">
import { AlertCircleIcon, RotateCcwIcon, HomeIcon } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { MyBtn } from '@/6_shared/ui/my-btn'

defineProps<{ error: Error }>()

// Mock i18n
const t = (key: string) => key.split('.').pop() || key
const router = useRouter()
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center relative overflow-hidden bg-background">
    <!-- Ambient Glow -->
    <div class="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[var(--color-accent-2)] opacity-[0.06] blur-[100px]" aria-hidden="true" />

    <div class="w-full z-10 px-4">
      <div class="bg-level-2 max-w-xl mx-auto p-8 sm:p-12 text-center relative z-10 rounded-[var(--rounded-std)] border-2 border-level-3 shadow-lg">
        <div class="h-16 w-16 rounded-(--rounded-std) bg-level-1 border border-level-3/40 text-level-3 mx-auto flex items-center justify-center mb-6 shadow-[0_0_24px_rgba(245,106,25,0.1)]">
          <AlertCircleIcon class="h-8 w-8" />
        </div>

        <p class="text-xs font-medium uppercase tracking-wider mb-2 text-transparent bg-clip-text bg-gradient-to-r from-level-3 to-level-4">
          {{ t('errorPage.eyebrow') }}
        </p>

        <h1 class="text-2xl sm:text-3xl font-bold text-text-main mb-4">
          {{ t('errorPage.title') }}
        </h1>

        <div class="rounded-(--rounded-std) border border-white/5 bg-level-1/40 backdrop-blur-sm p-4 mb-8 text-left">
          <p class="text-xs font-semibold uppercase tracking-wider text-text-placeholder mb-1">
            {{ t('errorPage.logLabel') }}
          </p>
          <p class="text-sm text-destructive font-mono break-words leading-relaxed">
            {{ error?.message || t('errorPage.unknownError') }}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <MyBtn class="px-6 h-12 text-base font-bold w-full sm:w-auto" @click="router.go(0)">
            <div class="flex items-center gap-2">
              <RotateCcwIcon class="h-4 w-4" /> {{ t('errorPage.retryBtn') }}
            </div>
          </MyBtn>

          <MyBtn class="px-6 h-12 text-base font-bold w-full sm:w-auto" @click="router.push('/')">
            <div class="flex items-center gap-2">
              <HomeIcon class="h-4 w-4" /> {{ t('errorPage.homeBtn') }}
            </div>
          </MyBtn>
        </div>
      </div>
    </div>
  </div>
</template>