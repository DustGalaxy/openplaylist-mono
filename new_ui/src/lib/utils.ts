import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
import type { Playlist, PlaylistSettings, Track } from '@/types/playlist'
import { Platform } from '@/types/playlist'

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotImplementedError'
  }
}

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export const formatTime = (time: number): string => {
  if (typeof time !== 'number' || isNaN(time) || !isFinite(time) || time < 0)
    return '0:00'
  const minutes = Math.floor(time / 60)
  const seconds =
    time % 60 < 10 ? `0${Math.floor(time % 60)}` : Math.floor(time % 60)

  return `${minutes}:${seconds}`
}

export function parseDurationSeconds(dur: unknown): number {
  if (typeof dur === 'number' && !isNaN(dur) && isFinite(dur) && dur > 0)
    return dur
  if (typeof dur === 'string') {
    const trimmed = dur.trim()
    if (/^\d+$/.test(trimmed)) {
      const parsed = parseInt(trimmed, 10)
      return isNaN(parsed) ? 0 : parsed
    }
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':').map((p) => parseInt(p, 10))
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1]
      }
      if (
        parts.length === 3 &&
        !isNaN(parts[0]) &&
        !isNaN(parts[1]) &&
        !isNaN(parts[2])
      ) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
      }
    }
  }
  return 0
}

export function getRandomInt(max: number) {
  return Math.floor(Math.random() * max)
}

export function generateOAuthState(): string {
  const array = new Uint32Array(8) // Генерируем 8 случайных 32-битных чисел
  window.crypto.getRandomValues(array)
  // Преобразуем массив байтов в строку base64url
  return Array.from(array, (dec) => ('0' + dec.toString(16)).substr(-2))
    .join('')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '') // Удаляем padding
}

// Ключ для хранения state в localStorage
export const OAUTH_STATE_KEY = 'oauth_twitch_state'

export const REDIRECT_AFTER_LOGIN_KEY = 'redirect_after_login_path'

function hasSubstring(arr: string[], substring: string): boolean {
  return arr.some((item) => item.includes(substring))
}

export function computePriority(track: Track, playlist: Playlist): number {
  if (typeof track.priority === 'number') return track.priority
  const labels: Array<string> = (track.priority || '').split(':')
  if (labels.length === 0) return 0
  let vals: Array<number> = []
  let rules = []
  if (labels.length === 1 && labels[0].includes('donation')) {
    rules = playlist.donation_rules.filter(
      (r) =>
        ((r.platform as string) === track.source ||
          (r.platform as string) === Platform.General) &&
        r.currency === track.extra_data.donation_currency &&
        r.amount === track.extra_data.donation_amount,
    )
  } else if (hasSubstring(labels, 'custom-')) {
    const custom_labels = labels.filter((item) => item.includes('custom-'))
    rules = custom_labels.map((item) => {
      return { priority: +(item.split('-').pop() || 0) }
    })
  } else {
    rules = playlist.chat_rules.filter(
      (r) => (r.platform as string) === track.source && labels.includes(r.key),
    )
  }

  if (rules.length === 0) return 0

  vals = rules.map((r) => r.priority)

  return playlist.cost_mode === 'max'
    ? Math.max(...vals)
    : vals.reduce((a, b) => a + b, 0)
}

/**
 * Извлекает ID видео из различных YouTube ссылок.
 * Возвращает null если видео не найдено или ссылка не является YouTube.
 */
export function extractYouTubeVideoId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr)

    // normalize host
    const host = url.hostname.replace(/^www\./, '')

    // Case 1: youtu.be/<id>
    if (host === 'youtu.be') {
      const id = url.pathname.slice(1) // remove leading "/"
      return id.length > 0 ? id : null
    }

    // Case 2: youtube.com/watch?v=<id> or m.youtube.com/watch?v=<id>
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = url.searchParams.get('v')
      return id ? id : null
    }

    // Case 3: youtube.com/embed/<id>
    if (host === 'youtube.com' && url.pathname.startsWith('/embed/')) {
      const id = url.pathname.split('/')[2]
      return id ? id : null
    }

    // Некорректный домен => не YouTube
    return null
  } catch {
    // Некорректный URL
    return null
  }
}

export interface ParsedYouTubeUrl {
  videoId: string | null
  playlistId: string | null
  isPlaylist: boolean
  hasTargetVideo: boolean
}

/**
 * Распознает YouTube ссылки, включая видео и плейлисты (list=...).
 */
export function parseYouTubeUrl(urlStr: string): ParsedYouTubeUrl | null {
  if (!urlStr) return null
  try {
    const url = new URL(urlStr.trim())
    const host = url.hostname.replace(/^www\./, '').toLowerCase()

    let videoId: string | null = null
    const playlistId: string | null = url.searchParams.get('list') || null

    if (host === 'youtu.be') {
      const pathId = url.pathname.slice(1).split('/')[0]
      if (pathId) videoId = pathId
    } else if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com'
    ) {
      if (url.pathname === '/watch' || url.pathname === '/watch/') {
        videoId = url.searchParams.get('v') || null
      } else if (url.pathname.startsWith('/embed/')) {
        const parts = url.pathname.split('/').filter(Boolean)
        if (parts.length >= 2) videoId = parts[1]
      } else if (url.pathname.startsWith('/v/')) {
        const parts = url.pathname.split('/').filter(Boolean)
        if (parts.length >= 2) videoId = parts[1]
      }
    }

    if (!videoId && !playlistId) return null

    return {
      videoId,
      playlistId,
      isPlaylist: Boolean(playlistId),
      hasTargetVideo: Boolean(videoId && playlistId),
    }
  } catch {
    return null
  }
}


/**
 * Возвращает новый объект, в котором удалены все поля со значением null или undefined.
 * Не мутирует исходный объект.
 */
export function removeNullAndUndefined<T extends Record<string, any>>(
  obj: T,
): Partial<T> {
  const result: Partial<T> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      ;(result as any)[key] = value
    }
  }

  return result
}

export function getConfig() {
  if (typeof window !== 'undefined' && window.appConfig) {
    return window.appConfig
  }
  return {
    PROJECT_DOMAIN: 'http://localhost:3000',
    BACKEND_DOMAIN: 'http://localhost:8000',
    API_URL: 'http://localhost:8000/api',
    WS_API_URL: 'http://localhost:8000',
    SOCKET_PATH: '/api/socket.io',
    PLST_API_URL: 'http://localhost:8000/api/playlist',
    AUTH_API_URL: 'http://localhost:8000/api',
    ORDER_API_URL: 'http://localhost:8000/api/order',
    TWITCH_CLIENT_ID: '',
    TWITCH_REDIRECT_URI: '',
    TWITCH_SCOPES: [],
    GOOGLE_CLIENT_ID: '',
    GOOGLE_REDIRECT_URI: '',
    GOOGLE_SCOPES: [],
    DONATEX_CLIENT_ID: '',
    DONATEX_REDIRECT_URI: '',
    DONATEX_SCOPES: [],
    DONATEX_CODE_CHALLENGE_METHOD: 'S256',
    DA_CLIENT_ID: '19392',
    DA_REDIRECT_URI: '',
    DA_SCOPES: [],
  }
}
