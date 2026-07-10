<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { SearchIcon, DiscIcon } from 'lucide-vue-next'
// Note: Turntable is not standard in lucide, using Disc as fallback if needed or a custom SVG.
// Using DiscIcon as placeholder for Turntable.
import { MenuDropdown } from '@/3_widgets/menu-dropdown'

// Mocking i18n & auth
const i18n = ref({ language: 'ru', changeLanguage: (v: string) => { i18n.value.language = v } })
const t = (key: string) => key.split('.').pop() || key
const isAuthenticated = ref(false)

const router = useRouter()
const windowWidth = ref(window.innerWidth)

const updateWidth = () => { windowWidth.value = window.innerWidth }
onMounted(() => window.addEventListener('resize', updateWidth))
onUnmounted(() => window.removeEventListener('resize', updateWidth))
</script>

<template>
  <div class="w-full flex sticky top-0 z-50 justify-center">
    <header class="px-1 py-2 mx-5 mt-2 flex w-full md:w-225 rounded-full bg-level-2 text-text-main text-2xl justify-between border-2 border-level-3 sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.15),-2px_2px_4px_rgba(0,0,0,0.15)]">
      <nav class="flex flex-row justify-between w-full @container gap-2 items-center">
        <div class="flex gap-2">
          <div class="px-2">
            <RouterLink to="/" class="flex gap-2 items-center">
              <DiscIcon />
              <h1 class="hidden @[400px]:block text-lg sm:text-xl font-bold text-center h-full text-transparent relative drop-shadow-2xl bg-linear-to-r from-(--color-accent-2) via-(--color-accent-3) to-(--color-accent-1) bg-clip-text bg-size-[200%_auto] leading-normal animate-bg-move transition-all">
                <template v-if="windowWidth > 400">{{ t('brand.name') }}</template>
                <template v-if="windowWidth > 600">{{ t('brand.version') }}</template>
              </h1>
            </RouterLink>
          </div>

          <div v-if="isAuthenticated" class="px-2 flex place-content-center">
            <RouterLink to="/dashboard" class="flex items-center">
              <DiscIcon class="w-8 h-8 stroke-[1.2]" />
            </RouterLink>
          </div>

          <div class="px-2 flex place-content-center">
            <RouterLink to="/view" class="flex items-center">
              <SearchIcon class="w-8 h-8 stroke-[1.2]" />
            </RouterLink>
          </div>
        </div>

        <div class="flex gap-2 items-center">
          <div v-if="!isAuthenticated" class="flex items-center gap-4 pr-4">
            <select
              v-model="i18n.language"
              @change="(e) => { const target = e.target as HTMLSelectElement; i18n.changeLanguage(target.value); window.localStorage.setItem('Lng', target.value) }"
              class="bg-level-2 text-text-main text-base rounded-md p-1 border border-level-3/40 cursor-pointer outline-none"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>

            <button class="cursor-pointer text-base sm:text-lg" @click="router.push('/login')">
              {{ t('nav.login') }}
            </button>
          </div>
          <div v-else class="flex gap-2 h-8.25 items-center">
            <div class="px-2 flex items-center">
              <MenuDropdown />
            </div>
          </div>
        </div>
      </nav>
    </header>
  </div>
</template>