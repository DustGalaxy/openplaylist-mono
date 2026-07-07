import type { AppSettings } from '@/types/appSettings'

const STORAGE_KEY = 'appSettings'

export type AppSettingsStore = {
  save: (settings: AppSettings) => Promise<void>
  load: () => Promise<Partial<AppSettings> | null>
}

export const localAppSettingsStore: AppSettingsStore = {
  async save(settings) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // ponytail: localStorage недоступен — не критично
    }
  },

  async load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Partial<AppSettings>) : null
    } catch {
      return null
    }
  },
}

/**
 * ponytail: эндпоинта под user-preferences пока нет (см. api-user.ts —
 * подключить, когда появится контракт). Не маскирует отсутствие фичи
 * молчаливым fallback-ом — явный stub с логом.
 */
export const backendAppSettingsStore: AppSettingsStore = {
  async save(settings) {
    console.debug('[appSettings] backend save stub, pending contract', settings)
  },
  async load() {
    console.debug('[appSettings] backend load stub, pending contract')
    return null
  },
}

export function getAppSettingsStore(useBackend = false): AppSettingsStore {
  return useBackend ? backendAppSettingsStore : localAppSettingsStore
}