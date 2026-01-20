import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
import type { PlaylistSettings, Track } from '@/types/playlist'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60)
  const seconds = time % 60 < 10 ? `0${time % 60}` : time % 60

  return `${minutes}:${seconds}`
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

const ROLE_TO_COST_FIELD: Record<string, keyof PlaylistSettings> = {
  b: 'cost_broacaster',
  m: 'cost_mod',
  s: 'cost_subscriber',
  d: 'cost_donater',
  v: 'cost_vip',
  t: 'cost_turbo',
  a: 'cost_artist',
  f: 'cost_fonder',
  o: 'cost_follower',
}

export function computePriority(
  priority: string | number,
  settings: PlaylistSettings,
): number {
  if (typeof priority === 'number') return priority

  const letters = (priority || '').split('')
  const vals = letters
    .map((ch) => ROLE_TO_COST_FIELD[ch])
    .filter(Boolean)
    .map((field) =>
      typeof settings[field] === 'number'
        ? (settings[field] as unknown as number)
        : 0,
    )
  if (vals.length === 0) return 0
  return settings.cost_mode === 'max'
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
  return window.appConfig
}
