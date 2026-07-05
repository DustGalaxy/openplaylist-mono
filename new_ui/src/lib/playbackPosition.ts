import type { PlaybackPosition } from '@/types/playlist'
import { getPlaybackState, postPositionState } from '@/api/api-playlist'
const STORAGE_PREFIX = 'playbackPosition:'

/**
 * Единый контракт для чтения/записи позиции воспроизведения, используемый
 * и localStorage-, и бэкенд-реализацией — переключатель "синхронизировать
 * тайминг" в настройках просто выбирает, какая из них активна, без веток
 * по всему остальному коду.
 */
export type PlaybackPositionStore = {
  save: (playlistId: string, pos: PlaybackPosition) => Promise<void>
  load: (playlistId: string) => Promise<PlaybackPosition | null>
  clear: (playlistId: string) => Promise<void>
}

function storageKey(playlistId: string) {
  return `${STORAGE_PREFIX}${playlistId}`
}

export const localPlaybackPositionStore: PlaybackPositionStore = {
  async save(playlistId, pos) {
    try {
      window.localStorage.setItem(storageKey(playlistId), JSON.stringify(pos))
    } catch {
      // ponytail: localStorage может быть недоступен (приватный режим,
      // квота) — тайминг не критичен для основной функциональности,
      // просто молча не сохраняем.
    }
  },

  async load(playlistId) {
    try {
      const raw = window.localStorage.getItem(storageKey(playlistId))
      if (!raw) return null
      return JSON.parse(raw) as PlaybackPosition
    } catch {
      return null
    }
  },

  async clear(playlistId) {
    try {
      window.localStorage.removeItem(storageKey(playlistId))
    } catch {
      // не критично
    }
  },
}

/**
 * Бэкенд-реализация (Redis-воркер). Контракт готов, сама интеграция
 * подключается когда появятся реальные эндпоинты — см. api-playlist.ts.
 * До готовности бэкенда бросает, чтобы не маскировать отсутствие фичи
 * молчаливым fallback-ом на пустоту.
 */
export const backendPlaybackPositionStore: PlaybackPositionStore = {
  async save(playlistId, pos) {
    await postPositionState(playlistId, pos.position)
  },
  async load(playlistId) {
    const raw = await getPlaybackState(playlistId)
    if (!raw || raw.position === undefined) return null
    return {
      track_id: raw.track_id,
      position: parseFloat(raw.position),
      updated_at: raw.updated_at,
    }
  },
  async clear() {
    // ponytail: DELETE для /state контрактом не предусмотрен — no-op,
    // следующий save перезапишет значение.
  },
}

/** Выбирает реализацию по флагу пользовательской настройки "синхронизировать тайминг". */
export function getPlaybackPositionStore(syncEnabled: boolean): PlaybackPositionStore {
  return syncEnabled ? backendPlaybackPositionStore : localPlaybackPositionStore
}