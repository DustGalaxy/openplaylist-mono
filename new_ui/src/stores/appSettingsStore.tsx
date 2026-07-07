import { create } from 'zustand'
import type { AppSettings } from '@/types/appSettings'
import { DEFAULT_APP_SETTINGS } from '@/types/appSettings'
import { getAppSettingsStore } from '@/lib/appSettings'

type AppSettingsState = {
  settings: AppSettings
  isLoaded: boolean
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  loadSettings: () => Promise<void>
}

export const useAppSettingsStore = create<AppSettingsState>((set, get) => ({
  settings: DEFAULT_APP_SETTINGS,
  isLoaded: false,

  setSetting: (key, value) => {
    const next = { ...get().settings, [key]: value }
    set({ settings: next })
    void getAppSettingsStore().save(next)
  },

  loadSettings: async () => {
    if (get().isLoaded) return
    const saved = await getAppSettingsStore().load()
    set({ settings: { ...DEFAULT_APP_SETTINGS, ...saved }, isLoaded: true })
  },
}))