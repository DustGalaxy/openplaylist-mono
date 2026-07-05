/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import type { ClientPlaylist, ModeSettings, OrderMode, PlaylistMode, SocketLike, SortSettings, Track } from '@/types/playlist'
import type { SplitQueue } from './types'

/**
 * Выбор следующего трека внутри одной группы (vip/regular/background).
 * - random: случайный трек из группы (исключая текущий, если он ещё жив в списке).
 * - auto/free: последовательно по порядку массива (для free порядок уже задан
 *   manual_order_ids на этапе splitQueue/sortByRules, для auto — priority/date).
 * repeatAll: если true и дошли до конца списка — начинаем сначала (для static
 *   repeat_mode='all' и для background-репита, который крутится всегда по кругу).
 */
export function isLastInGroup(list: Array<Track>, currentId: string | undefined): boolean {
  if (currentId === undefined || list.length === 0) return true
  const idx = list.findIndex((t) => t.id === currentId)
  return idx === -1 || idx === list.length - 1
}

export function pickNextFromGroup(
  list: Array<Track>,
  currentId: string | undefined,
  orderMode: OrderMode,
  repeatAll: boolean,
): Track | undefined {
  if (list.length === 0) return undefined

  if (orderMode === 'random') {
    const pool = currentId ? list.filter((t) => t.id !== currentId) : list
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)]
    return repeatAll ? list[Math.floor(Math.random() * list.length)] : undefined
  }

  if (currentId === undefined) return list[0]
  const idx = list.findIndex((t) => t.id === currentId)
  if (idx === -1) return list[0]
  if (idx + 1 < list.length) return list[idx + 1]
  return repeatAll ? list[0] : undefined
}

export function isBackgroundTrack(
  mode: PlaylistMode,
  modeSettings: ModeSettings,
  trackId: string,
): boolean {
  return mode === 'stream' && modeSettings.background_track_ids.includes(trackId)
}

/** Safe emit — socket may be undefined or not yet support emit. */
export function safeEmit(s: SocketLike | undefined, event: string, payload: any) {
  if (s !== undefined && s.emit) s.emit(event, payload)
}

function sortByRules(tracks: Array<Track>, rules: SortSettings): Array<Track> {
  if (rules.order_mode === 'free') {
    const orderIndex = new Map(rules.manual_order_ids.map((id, i) => [id, i]))
    return [...tracks].sort((a, b) => {
      const ia = orderIndex.get(a.id)
      const ib = orderIndex.get(b.id)
      if (ia !== undefined && ib !== undefined) return ia - ib
      if (ia !== undefined) return -1 // известные — вперёд
      if (ib !== undefined) return 1
      // оба новые (ещё не в manual_order_ids) — по дате добавления
      return a.created_at.localeCompare(b.created_at)
    })
  }

  if (rules.order_mode === 'random') {
    return [...tracks].sort((a, b) => a.created_at.localeCompare(b.created_at))
  }

  // auto
  return [...tracks].sort((a, b) => {
    if (rules.priority !== 'none') {
      const valA = a.priority ?? 0
      const valB = b.priority ?? 0
      if (valA !== valB) {
        return rules.priority === 'asc' ? valA - valB : valB - valA
      }
    }
    if (rules.date !== 'none') {
      if (a.created_at !== b.created_at) {
        const cmp = a.created_at.localeCompare(b.created_at)
        return rules.date === 'asc' ? cmp : -cmp
      }
    }
    return 0
  })
}
export function isVipTrack(track: Track, modeSettings: ModeSettings): boolean {
  return (
    modeSettings.priority_break_point > 0 &&
    track.priority >= modeSettings.priority_break_point
  )
}


export function getActiveModeSettings(playlist: ClientPlaylist): ModeSettings {
  return playlist.settings.mode_settings[playlist.settings.mode]
}

export function splitQueue(playlist: ClientPlaylist): SplitQueue {
  const modeSettings = getActiveModeSettings(playlist)

  const pool =
    playlist.settings.mode === 'stream'
      ? playlist.track_data.filter(
        (t) => !modeSettings.background_track_ids.includes(t.id),
      )
      : playlist.track_data

  const background: Array<Track> =
    playlist.settings.mode === 'stream'
      ? modeSettings.background_track_ids
        .map((id) => playlist.track_data.find((t) => t.id === id))
        .filter((t): t is Track => t !== undefined)
      : []

  if (modeSettings.priority_break_point <= 0) {
    return {
      vip: [],
      regular: sortByRules(pool, modeSettings.sort_settings_regular),
      background,
    }
  }

  const vip = pool.filter((t) => isVipTrack(t, modeSettings))
  const regular = pool.filter((t) => !isVipTrack(t, modeSettings))
  return {
    vip: sortByRules(vip, modeSettings.sort_settings_vip),
    regular: sortByRules(regular, modeSettings.sort_settings_regular),
    background,
  }
}