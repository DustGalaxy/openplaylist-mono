const fs = require('fs');
const path = require('path');

const widgetsDir = path.join(__dirname, 'src', 'widgets');

const mkdir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const createFsdWidget = (name, files) => {
  const dir = path.join(widgetsDir, name, 'ui');
  mkdir(dir);
  
  let exports = [];
  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, filename), content);
    if (filename.endsWith('.vue')) {
      const componentName = filename.replace('.vue', '');
      exports.push(`export { default as ${componentName} } from './ui/${filename}'`);
    }
  }
  
  if (!files['index.ts']) {
    fs.writeFileSync(path.join(widgetsDir, name, 'index.ts'), exports.join('\n') + '\n');
  }
};

// 1. footer
createFsdWidget('footer', {
  'Footer.vue': `<script setup lang="ts">
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
</template>`
});

// 2. header
createFsdWidget('header', {
  'Header.vue': `<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { SearchIcon, DiscIcon } from 'lucide-vue-next'
// Note: Turntable is not standard in lucide, using Disc as fallback if needed or a custom SVG.
// Using DiscIcon as placeholder for Turntable.
import { MenuDropdown } from '@/widgets/menu-dropdown'

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
</template>`
});

// 3. root-error
createFsdWidget('root-error', {
  'RootError.vue': `<script setup lang="ts">
import { AlertCircleIcon, RotateCcwIcon, HomeIcon } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { MyBtn } from '@/shared/ui/my-btn'

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
</template>`
});

// 4. menu-dropdown
createFsdWidget('menu-dropdown', {
  'ThemePicker.vue': `<script setup lang="ts">
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
</template>`,

  'MenuDropdown.vue': `<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChartColumnIncreasingIcon, HistoryIcon, LanguagesIcon, LogOutIcon, PaletteIcon, SettingsIcon, MoveIcon } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import ThemePicker from './ThemePicker.vue'

// Mock auth & store
const user = ref({ username: 'User', avatar_url: '' })
const router = useRouter()
const t = (k: string) => k.split('.').pop() || k

const language = ref('ru')
const languages = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' }
]

const moveMethod = ref('dnd')
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger>
      <div class="flex items-center gap-2 cursor-pointer">
        <div class="hidden sm:block text-lg font-medium text-text-main">
          {{ user.username }}
        </div>
        <div class="rounded-full w-[33px] h-[33px] bg-level-3 overflow-hidden">
          <img v-if="user.avatar_url" :src="user.avatar_url" class="w-full h-full object-cover" alt="" />
        </div>
      </div>
    </DropdownMenuTrigger>

    <DropdownMenuContent side="bottom" :side-offset="5" class="bg-level-2 border-level-3 text-text-main">
      <DropdownMenuLabel>{{ user.username }}</DropdownMenuLabel>
      <DropdownMenuSeparator class="bg-level-3" />

      <DropdownMenuSub>
        <DropdownMenuSubTrigger class="flex gap-2 items-center bg-level-2 text-text-main data-[state=open]:bg-level-1 focus:bg-level-1">
          <LanguagesIcon :size="16" />
          <span>{{ languages.find(l => l.code === language)?.label }}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent class="bg-level-2 text-text-main border-0">
            <DropdownMenuRadioGroup v-model="language">
              <DropdownMenuRadioItem v-for="lang in languages" :key="lang.code" :value="lang.code" class="text-text-main focus:bg-level-3 bg-level-2">
                {{ lang.label }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>

      <DropdownMenuSub>
        <DropdownMenuSubTrigger class="flex gap-2 items-center bg-level-2 text-text-main data-[state=open]:bg-level-1 focus:bg-level-1">
          <PaletteIcon :size="16" />
          {{ t('nav.theme') }}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent class="bg-level-2 text-text-main border border-white/10 p-2">
            <ThemePicker />
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>

      <DropdownMenuSub>
        <DropdownMenuSubTrigger class="flex gap-2 items-center bg-level-2 text-text-main data-[state=open]:bg-level-1 focus:bg-level-1">
          <MoveIcon :size="16" />
          {{ t('nav.moveMethod') }}
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent class="bg-level-2 text-text-main border-0">
            <DropdownMenuRadioGroup v-model="moveMethod">
              <DropdownMenuRadioItem value="dnd" class="text-text-main focus:bg-level-3 bg-level-2">{{ t('nav.moveMethod.dnd') }}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="arrows" class="text-text-main focus:bg-level-3 bg-level-2">{{ t('nav.moveMethod.arrows') }}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>

      <DropdownMenuItem disabled @click="router.push('/statistic')">
        <ChartColumnIncreasingIcon :size="16" /> {{ t('nav.statistic') }}
      </DropdownMenuItem>
      <DropdownMenuItem disabled @click="router.push('/history')">
        <HistoryIcon :size="16" /> {{ t('nav.history') }}
      </DropdownMenuItem>
      <DropdownMenuItem @click="router.push('/settings')">
        <SettingsIcon :size="16" /> {{ t('nav.settings') }}
      </DropdownMenuItem>

      <DropdownMenuSeparator class="bg-level-3" />

      <DropdownMenuItem variant="destructive" @click="router.push('/logout')">
        <LogOutIcon :size="16" /> {{ t('nav.logout') }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>`
});

console.log('Batch 3 executed successfully.');
