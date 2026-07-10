<script setup lang="ts">
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
} from '@/6_shared/ui/dropdown-menu/index.ts'
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
</template>