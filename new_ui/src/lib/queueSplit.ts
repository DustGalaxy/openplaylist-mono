import type { ClientPlaylist, ModeSettings, SortSettings, Track } from '@/types/playlist'

/** Настройки текущего активного режима плейлиста. */
export function getActiveModeSettings(playlist: ClientPlaylist): ModeSettings {
  return playlist.settings.mode_settings[playlist.settings.mode]
}

/** Трек считается VIP, если брейк-поинт включён и приоритет трека его достиг. */
export function isVipTrack(track: Track, modeSettings: ModeSettings): boolean {
  return (
    modeSettings.priority_break_point > 0 &&
    track.priority >= modeSettings.priority_break_point
  )
}

function sortByRules(tracks: Array<Track>, rules: SortSettings): Array<Track> {
  if (rules.shuffle !== 'none') {
    return [...tracks]
      .map((t) => ({ t, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ t }) => t)
  }

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

export type SplitQueue = {
  vip: Array<Track>
  background: Array<Track>
}

/**
 * Делит track_data на VIP- и фоновую подочередь согласно настройкам текущего
 * режима. Ничего не хранит — чистая функция от текущего состояния плейлиста.
 *
 * - flow/static: "фон" — всё, что не VIP по priority_break_point.
 * - stream: "фон" — явный список background_track_ids (репит-плейлист автора),
 *   всё остальное — заявки зрителей, которые всегда ведут себя как VIP-кандидаты
 *   (см. isVipTrack — для stream разделение "прерывает немедленно / просто
 *   встаёт в очередь" всё ещё идёт через priority_break_point внутри заявок).
 */
export function splitQueue(playlist: ClientPlaylist): SplitQueue {
  const modeSettings = getActiveModeSettings(playlist)

  if (playlist.settings.mode === 'stream') {
    const backgroundIds = new Set(modeSettings.background_track_ids)
    const background = playlist.track_data.filter((t) => backgroundIds.has(t.id))
    const requests = playlist.track_data.filter((t) => !backgroundIds.has(t.id))
    return {
      vip: sortByRules(requests, modeSettings.sort_settings_vip),
      background: sortByRules(background, modeSettings.sort_settings_background),
    }
  }

  if (modeSettings.priority_break_point <= 0) {
    return {
      vip: [],
      background: sortByRules(playlist.track_data, modeSettings.sort_settings_background),
    }
  }

  const vip = playlist.track_data.filter((t) => isVipTrack(t, modeSettings))
  const background = playlist.track_data.filter((t) => !isVipTrack(t, modeSettings))
  return {
    vip: sortByRules(vip, modeSettings.sort_settings_vip),
    background: sortByRules(background, modeSettings.sort_settings_background),
  }
}