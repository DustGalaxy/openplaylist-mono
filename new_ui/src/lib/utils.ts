import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
import { Platform, type PlaylistSettings, type Track } from '@/types/playlist'

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

export function computePriority(
  track: Track,
  settings: PlaylistSettings,
): number {
  if (typeof track.priority === 'number') return track.priority
  const labels = (track.priority || '').split(':')
  if (labels.length === 0) return 0
  var vals: number[] = []
  var rules = []
  if (labels.length === 1 && labels[0].includes('donation')) {
    rules = settings.donation_rules.filter(
      (r) =>
        ((r.platform as string) === track.source ||
          (r.platform as string) === Platform.General) &&
        r.currency === track.extra_data.donation_currency &&
        r.amount === track.extra_data.donation_amount,
    )
  } else {
    rules = settings.chat_rules.filter(
      (r) => (r.platform as string) === track.source && labels.includes(r.key),
    )
  }

  if (rules.length === 0) return 0

  vals = rules.map((r) => r.priority)

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
      ; (result as any)[key] = value
    }
  }

  return result
}

export function getConfig() {
  return window.appConfig
}
