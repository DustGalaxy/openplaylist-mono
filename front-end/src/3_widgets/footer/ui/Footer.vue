<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { DiscIcon } from 'lucide-vue-next'

const productLinkKeys = [
  { to: '/view', labelKey: 'footer.searchPlaylists' },
  { to: '/login', labelKey: 'footer.login' },
  { to: '/register', labelKey: 'footer.register' },
] as const

const featureHighlightKeys = [
  'footer.highlights.realtimeQueue',
  'footer.highlights.rulesAndBlocks',
  'footer.highlights.donationPriority',
  'footer.highlights.integrations',
] as const

// Mocking i18n & auth
const t = (key: string, opts?: any) => key.split('.').pop() || key
const isAuthenticated = ref(false)

const year = new Date().getFullYear()
const inFocus = ref(false)
const windowWidth = ref(window.innerWidth)

const updateWidth = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', updateWidth))
onUnmounted(() => window.removeEventListener('resize', updateWidth))
</script>

<template>
  <footer class="w-full flex justify-center px-4 pb-6 pt-10 mt-auto" @click="inFocus = !inFocus">
    <div class="w-full max-w-5xl rounded-(--rounded-std) border-2 border-level-3 bg-level-2 sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.15),-2px_2px_4px_rgba(0,0,0,0.15)] overflow-hidden text-text-main">
      <div v-show="inFocus || windowWidth >= 600" class="px-6 py-8 sm:px-10 sm:py-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div class="flex flex-col gap-4 text-left">
          <RouterLink to="/" class="inline-flex items-center gap-2 w-fit group">
            <DiscIcon />
            <span class="text-lg font-bold text-transparent bg-linear-to-r from-(--color-accent-2) via-(--color-accent-3) to-(--color-accent-1) bg-clip-text bg-size-[200%_auto] animate-bg-move">
              {{ t('brand.name') }}
            </span>
          </RouterLink>
          <p class="text-text-secondary text-sm leading-relaxed max-w-sm">
            {{ t('footer.description') }}
          </p>
          <span class="inline-flex w-fit items-center rounded-full border border-level-3/60 bg-level-1 px-3 py-1 text-xs text-text-placeholder">
            {{ t('brand.version') }}
          </span>
        </div>

        <div class="text-left">
          <h3 class="text-sm font-semibold text-text-main uppercase tracking-wide mb-4">
            {{ t('footer.navigation') }}
          </h3>
          <ul class="flex flex-col gap-2.5">
            <li v-if="isAuthenticated">
              <RouterLink to="/dashboard" class="text-sm text-text-secondary hover:text-text-main transition-colors">
                {{ t('nav.myPlaylists') }}
              </RouterLink>
            </li>
            <li v-for="link in productLinkKeys" :key="link.to">
              <RouterLink :to="link.to" class="text-sm text-text-secondary hover:text-text-main transition-colors">
                {{ t(link.labelKey) }}
              </RouterLink>
            </li>
          </ul>
        </div>

        <div class="text-left">
          <h3 class="text-sm font-semibold text-text-main uppercase tracking-wide mb-4">
            {{ t('footer.features') }}
          </h3>
          <ul class="flex flex-col gap-2.5">
            <li v-for="key in featureHighlightKeys" :key="key" class="text-sm text-text-secondary flex items-start gap-2">
              <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-linear-to-r from-(--color-accent-2) to-(--color-accent-3)" aria-hidden="true" />
              {{ t(key) }}
            </li>
          </ul>
        </div>
      </div>

      <div class="border-t border-level-3/40 px-6 py-4 sm:px-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-text-secondary">
        <span>
          {{ t('footer.copyright.start', { year }) }}
          <a href="https://github.com/DustGalaxy" class="underline">
            {{ t('footer.copyright.link') }}
          </a>
          {{ t('footer.copyright.end') }}
        </span>
        <p class="text-text-secondary">{{ t('footer.techStack') }}</p>
      </div>
    </div>
  </footer>
</template>