import type {
  FeedTrack,
  InputPlaylist,
  ModeSettings,
  OrderMode,
  PausedBackground,
  Playlist,
  PlaylistCacheEntry,
  PlaylistMode,
  PlaylistRole,
  RuleType,
  RulesPatch,
  SocketLike,
  SortSettings,
  SplitQueue,
  Track,
  TrackAction,
  WireTrack,
} from '@/types/playlist'
import type { Socket } from 'socket.io-client'
import { computePriority, formatTime } from '@/lib/utils'

// ─── wire ↔ cache conversion ──────────────────────────────────────
export function toPlaylist(input: InputPlaylist): Playlist {
  const now_playing =
    input.now_playing &&
    input.track_data.find((t) => t.id === input.now_playing)
      ? toTrack(
          input.track_data.find((t) => t.id === input.now_playing),
          input.id,
          input,
        )
      : undefined
  const track_data = input.track_data.map((track) =>
    toTrack(track, input.id, input),
  )
  return { ...input, now_playing, track_data }
}

// ─── socket ────────────────────────────────────────────────────────
export function safeEmit(
  s: Socket | undefined | null,
  event: string,
  payload: any,
) {
  if (s !== undefined && s !== null && s.emit) s.emit(event, payload)
}

export function buildViewerFeed(
  pl: Playlist,
  sortOverride: SortSettings,
): Array<FeedTrack> {
  const { vip, regular, background } = splitQueue(pl)

  if (sortOverride.order_mode === 'host') {
    // mirror owner's live mode_settings exactly — splitQueue already applies server sort_settings_*
    return [
      ...vip.map((t) => ({ track: t, group: 'vip' as const })),
      ...regular.map((t) => ({ track: t, group: 'regular' as const })),
      ...background.map((t) => ({ track: t, group: 'background' as const })),
    ]
  }

  // viewer's own order_mode applies to both pools, background still pinned last as a block
  const sortedVipRegular = sortByRules([...vip, ...regular], sortOverride)
  const sortedBackground = sortByRules(background, sortOverride)
  const modeSettings = getActiveModeSettings(pl)

  return [
    ...sortedVipRegular.map((t) => ({
      track: t,
      group: (isVipTrack(t, modeSettings) ? 'vip' : 'regular') as const,
    })),
    ...sortedBackground.map((t) => ({
      track: t,
      group: 'background' as const,
    })),
  ]
}

export function toTrack(
  wire: WireTrack,
  playlistId: string,
  playlist: Playlist,
): Track {
  const withLabelPriority: Track = {
    id: wire.id,
    playlist_id: playlistId,
    yt_video_id: wire.yt_video_id,
    priority: wire.priority as unknown as number, // computePriority reads this as the raw label string first
    title: wire.title,
    duration: formatTime(wire.duration),
    requester_nickname: wire.requester_nickname,
    created_at: wire.created_at,
    source: wire.source,
    extra_data: wire.extra_data,
    from_owner: wire.from_owner,
  }
  return {
    ...withLabelPriority,
    priority: computePriority(withLabelPriority, playlist),
  }
}

export function mergeTrackAdded(playlist: Playlist, wire: WireTrack): Playlist {
  const track = toTrack(wire, playlist.id, playlist)
  return { ...playlist, track_data: [...playlist.track_data, track] }
}

export function mergeTrackRemoved(
  playlist: Playlist,
  trackId: string,
): Playlist {
  return {
    ...playlist,
    track_data: playlist.track_data.filter((t) => t.id !== trackId),
    now_playing:
      playlist.now_playing?.id === trackId ? undefined : playlist.now_playing,
  }
}

export function mergeNowPlaying(playlist: Playlist, trackId: string): Playlist {
  const track = playlist.track_data.find((t) => t.id === trackId)
  return { ...playlist, now_playing: track }
}

export function mergeSettingsChanged(
  playlist: Playlist,
  patch: Partial<Playlist>,
): Playlist {
  return { ...playlist, ...patch }
}

interface RuleItem {
  id: string
}

function applyRulesDelta<T extends RuleItem>(
  list: Array<T>,
  patch: { added: Array<T>; changed: Array<T>; removed: Array<T> },
): Array<T> {
  const removedIds = new Set(patch.removed.map((r) => r.id))
  const addedIds = new Set(patch.added.map((a) => a.id))
  const changedMap = new Map(patch.changed.map((c) => [c.id, c]))

  // drop anything removed, and drop anything that's about to be re-added (avoids duplicates
  // if this same item already exists locally from our own optimistic update)
  const base = list.filter(
    (item) => !removedIds.has(item.id) && !addedIds.has(item.id),
  )
  const updated = base.map((item) => changedMap.get(item.id) ?? item)

  return [...updated, ...patch.added]
}

const RULE_FIELD_MAP: Record<RuleType, keyof Playlist> = {
  content: 'content_settings',
  donation: 'donation_rules',
  chat: 'chat_rules',
  block: 'block_list',
}

export function mergeRulesPatch(
  playlist: Playlist,
  payload: RulesPatch,
): Playlist {
  const field = RULE_FIELD_MAP[payload.type]
  return {
    ...playlist,
    [field]: applyRulesDelta(playlist[field] as Array<RuleItem>, payload),
  } as Playlist
}

export function reorderStep(
  playlist: Playlist,
  trackId: string,
  group: string,
  dir: 'up' | 'down',
): Array<string> | void {
  const mode = playlist.mode
  const modeSettings = playlist.mode_settings[mode]
  let currentIds: Array<string>

  if (group === 'background') {
    if (mode !== 'stream') {
      console.error('Background group reorder only valid in stream mode')
      return
    }
    currentIds = modeSettings.background_track_ids
  } else {
    const settings =
      group === 'vip'
        ? modeSettings.sort_settings_vip
        : modeSettings.sort_settings_regular
    const { vip, regular } = splitQueue(playlist)
    const visibleGroup = group === 'vip' ? vip : regular
    const visibleIds = visibleGroup.map((t) => t.id)
    const visibleIdSet = new Set(visibleIds)

    const reconciled = settings.manual_order_ids.filter((id) =>
      visibleIdSet.has(id),
    )
    const knownIds = new Set(reconciled)
    const newIds = visibleIds.filter((id) => !knownIds.has(id))

    currentIds =
      settings.manual_order_ids.length > 0
        ? [...reconciled, ...newIds]
        : visibleIds
  }

  const idx = currentIds.indexOf(trackId)
  if (idx === -1) return

  const swapWith = dir === 'up' ? idx - 1 : idx + 1
  if (swapWith < 0 || swapWith >= currentIds.length) return

  const next = [...currentIds]
  ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
  return next
}

// ─── role / permissions (role slice) ──────────────────────────────
export function getRole(
  playlist: Playlist | undefined,
  userId: string | null,
): PlaylistRole {
  if (!playlist || !userId) return 'viewer'
  if (playlist.owner_id === userId) return 'owner'
  if (playlist.moderators?.some((m) => m.user_id === userId && m.is_active))
    return 'operator'
  return 'viewer'
}

const PERMISSIONS: Record<TrackAction, Array<PlaylistRole>> = {
  add: ['owner', 'operator', 'viewer'],
  remove: ['owner', 'operator'],
  reorder: ['owner', 'operator'],
  setSort: ['owner', 'operator', 'viewer'],
  setNowPlaying: ['owner', 'operator'],
  seek: ['owner', 'operator'],
  broadcast: ['owner'],
}

export function canAct(
  action: TrackAction,
  role: PlaylistRole,
  playlist: Playlist,
): boolean {
  if (!PERMISSIONS[action].includes(role)) return false
  if (
    action === 'add' &&
    role === 'viewer' &&
    !playlist.is_allow_external_requests
  )
    return false
  return true
}

// ─── queue splitting / sorting (feed building blocks) ─────────────

export function getActiveModeSettings(playlist: Playlist): ModeSettings {
  return playlist.mode_settings[playlist.mode]
}

export function sortByRules(
  tracks: Array<Track>,
  rules: SortSettings,
): Array<Track> {
  if (rules.order_mode === 'free') {
    const orderIndex = new Map(rules.manual_order_ids.map((id, i) => [id, i]))
    return [...tracks].sort((a, b) => {
      const ia = orderIndex.get(a.id)
      const ib = orderIndex.get(b.id)
      if (ia !== undefined && ib !== undefined) return ia - ib
      if (ia !== undefined) return -1
      if (ib !== undefined) return 1
      return a.created_at.localeCompare(b.created_at)
    })
  }

  return [...tracks].sort((a, b) => {
    if (rules.priority !== 'none') {
      const valA = a.priority ?? 0
      const valB = b.priority ?? 0
      if (valA !== valB)
        return rules.priority === 'asc' ? valA - valB : valB - valA
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

export function isBackgroundTrack(
  mode: PlaylistMode,
  background_track_ids: Array<string>,
  trackId: string,
): boolean {
  return mode === 'stream' && background_track_ids.includes(trackId)
}

export function splitQueue(playlist: Playlist): SplitQueue {
  const modeSettings = getActiveModeSettings(playlist)

  const pool: Array<Track> =
    playlist.mode === 'stream'
      ? playlist.track_data.filter(
          (t) => !playlist.background_track_ids.includes(t.id),
        )
      : playlist.track_data

  const background: Array<Track> =
    playlist.mode === 'stream'
      ? playlist.background_track_ids
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

export function isLastInGroup(
  list: Array<Track>,
  currentId: string | undefined,
): boolean {
  if (currentId === undefined || list.length === 0) return true
  const idx = list.findIndex((t) => t.id === currentId)
  return idx === -1 || idx === list.length - 1
}

export function getTrackGroup(track: Track | undefined, playlist: Playlist) {
  if (!track) return undefined
  else if (
    isBackgroundTrack(playlist.mode, playlist.background_track_ids, track.id)
  )
    return 'background'
  else if (isVipTrack(track, playlist.mode_settings[playlist.mode]))
    return 'vip'
  else return 'regular'
}

export function pickNextFromGroup(
  list: Array<Track>,
  currentId: string | undefined,
  shuffle: boolean,
  repeatAll: boolean,
): Track | undefined {
  if (list.length === 0) return undefined

  if (shuffle) {
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

// ─── next-track resolution (playback ops) ──────────────────────────
export interface NextTrackDecision {
  nextTrackId: string | undefined
  removeCurrentId: string | undefined
  resumePositionSeconds: number | undefined
  consumedPausedBackground: boolean
  consumedPausedRegular: boolean
}

export function resolveNextTrack(
  pl: Playlist,
  currentTrackId: string | undefined,
  entry: PlaylistCacheEntry,
): NextTrackDecision {
  return pickNext(pl, currentTrackId, entry)
}

export function resolveStaticNext(
  currentTrackId: string | undefined,
  vip: Array<Track>,
  regular: Array<Track>,
  currentWasVip: boolean,
  shuffle: boolean,
  repeatAll: boolean,
  resumed: PausedBackground | null,
) {
  const currentGroup = currentWasVip ? vip : regular
  if (currentTrackId === undefined)
    return {
      trackId: vip[0]?.id ?? regular[0]?.id,
      resumePositionSeconds: undefined,
      consumedPausedRegular: false,
    }
  if (!isLastInGroup(currentGroup, currentTrackId)) {
    return {
      trackId: pickNextFromGroup(currentGroup, currentTrackId, shuffle, false)
        ?.id,
      resumePositionSeconds: undefined,
      consumedPausedRegular: false,
    }
  }
  if (currentWasVip && resumed)
    return {
      trackId: resumed.track_id,
      resumePositionSeconds: resumed.position_seconds,
      consumedPausedRegular: true,
    }

  let trackId = undefined
  if (currentWasVip) {
    trackId = regular[0] ? regular[0].id : repeatAll ? vip[0]?.id : undefined
  } else {
    trackId = repeatAll ? (vip[0] ? vip[0].id : regular[0].id) : undefined
  }

  return {
    trackId: trackId,
    resumePositionSeconds: undefined,
    consumedPausedRegular: false,
  }
}

export function resolveFlowStreamNext(
  pl: Playlist,
  currentTrack: Track | undefined,
  modeSettings: ModeSettings,
  vip: Array<Track>,
  regular: Array<Track>,
  background: Array<Track>,
  vipOrder: OrderMode,
  regularOrder: OrderMode,
  resumeFromPausedBackground: () => PausedBackground | undefined,
): NextTrackDecision {
  // Определяем, относится ли ТЕКУЩИЙ трек к VIP или Regular
  const currentWasVip =
    currentTrack !== undefined && isVipTrack(currentTrack, modeSettings)
  const currentWasBackground = currentTrack
    ? isBackgroundTrack(pl.mode, modeSettings, currentTrack.id)
    : false
  const currentWasRegular =
    currentTrack !== undefined && !currentWasVip && !currentWasBackground

  // 1. ПРИОРИТЕТ 1: VIP ТРЕКИ
  // Если текущий был VIP, он уходит из очереди. Для всех остальных случаев берём весь список vip.
  const remainingVip = currentWasVip
    ? vip.filter((t) => t.id !== currentTrack.id)
    : vip

  if (remainingVip.length > 0) {
    // Вся группа VIP еще не отиграла -> берем самый верхний доступный трек
    const nextVip = pickNextFromGroup(remainingVip, undefined, vipOrder, false)
    return {
      nextTrackId: nextVip?.id,
      removeCurrentId: currentWasVip ? currentTrack.id : undefined,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    }
  }

  // 2. ПРИОРИТЕТ 2: REGULAR ТРЕКИ
  // VIP пуст. Если текущий трек был Regular, он завершился и должен быть удален.
  const remainingRegular = currentWasRegular
    ? regular.filter((t) => t.id !== currentTrack.id)
    : regular

  if (remainingRegular.length > 0) {
    // Берём самый верхний трек из Regular
    const nextRegular = pickNextFromGroup(
      remainingRegular,
      undefined,
      regularOrder,
      false,
    )
    return {
      nextTrackId: nextRegular?.id,
      // Удаляем либо завершившийся VIP (который только что доиграл), либо завершившийся Regular
      removeCurrentId:
        currentWasVip || currentWasRegular ? currentTrack.id : undefined,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    }
  }

  // 3. ПРИОРИТЕТ 3: ВОЗВРАТ ИЗ ПАУЗЫ (BACKGROUND)
  // И VIP, и Regular полностью пусты -> проверяем, не прерывали ли мы фоновый трек ранее
  const resumed = resumeFromPausedBackground()
  if (resumed) {
    return {
      nextTrackId: resumed.track_id,
      removeCurrentId:
        currentWasVip || currentWasRegular ? currentTrack.id : undefined,
      resumePositionSeconds: resumed.position_seconds,
      consumedPausedBackground: true,
    }
  }

  // 4. ПРИОРИТЕТ 4: ФОНОВЫЕ ТРЕКИ (BACKGROUND)
  // Если стартанули с нуля (нет текущего) или доиграл фоновый трек — крутим фоновую очередь по кругу
  const bgOrder = pl.shuffle ? 'random' : 'auto'
  const nextBg = pickNextFromGroup(
    background,
    currentWasBackground ? currentTrack.id : undefined,
    bgOrder,
    true,
  )

  return {
    nextTrackId: nextBg?.id,
    removeCurrentId:
      currentWasVip || currentWasRegular ? currentTrack.id : undefined,
    resumePositionSeconds: undefined,
    consumedPausedBackground: false,
  }
}

export function pickNext(
  pl: Playlist,
  currentTrackId: string | undefined,
  entry: PlaylistCacheEntry,
): NextTrackDecision {
  if (pl.track_data.length === 0)
    return {
      nextTrackId: undefined,
      removeCurrentId: undefined,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
      consumedPausedRegular: false,
    }

  const currentTrack = currentTrackId
    ? pl.track_data.find((t) => t.id === currentTrackId)
    : undefined
  const { vip, regular, background } = splitQueue(pl)
  const currentTrackGroup = getTrackGroup(currentTrack, pl)
  const repeatAll = pl.mode === 'stream' || entry.local.repeatMode === 'all'
  const removeCurrentId =
    pl.mode === 'stream' && currentTrackGroup !== 'background'
      ? currentTrackId
      : undefined

  if (entry.local.shuffle) {
    if (vip.length || regular.length) {
      const next = [...vip, ...regular][
        Math.floor(Math.random() * (vip.length + regular.length))
      ]
      return {
        nextTrackId: next.id,
        removeCurrentId: removeCurrentId,
        resumePositionSeconds: undefined,
        consumedPausedBackground: false,
        consumedPausedRegular: true,
      }
    }
  }

  if (pl.mode === 'static') {
    const {
      trackId: nextTrackId,
      resumePositionSeconds,
      consumedPausedRegular,
    } = resolveStaticNext(
      currentTrackId,
      vip,
      regular,
      currentTrackGroup === 'vip',
      false,
      repeatAll,
      entry.local.paused_regular,
    )
    console.log('pl = ', pl)
    console.log('repeatAll', repeatAll)
    console.log('nextTrackId', nextTrackId)

    return {
      nextTrackId: nextTrackId,
      removeCurrentId: undefined,
      resumePositionSeconds: resumePositionSeconds,
      consumedPausedBackground: false,
      consumedPausedRegular: consumedPausedRegular,
    }
  }

  if (currentTrackGroup === 'vip') {
    const last = vip.filter((t) => t.id !== currentTrackId)
    if (last.length)
      return {
        nextTrackId: pickNextFromGroup(vip, currentTrackId, false, repeatAll)
          ?.id,
        removeCurrentId: removeCurrentId,
        resumePositionSeconds: undefined,
        consumedPausedBackground: false,
        consumedPausedRegular: false,
      }
    else if (regular.length) {
      if (entry.local.paused_regular) {
        return {
          nextTrackId: entry.local.paused_regular.track_id,
          removeCurrentId: removeCurrentId,
          resumePositionSeconds: entry.local.paused_regular.position_seconds,
          consumedPausedBackground: false,
          consumedPausedRegular: true,
        }
      } else {
        return {
          nextTrackId: regular[0].id,
          removeCurrentId: removeCurrentId,
          resumePositionSeconds: undefined,
          consumedPausedBackground: false,
          consumedPausedRegular: false,
        }
      }
    } else if (background.length) {
      if (entry.local.paused_background)
        return {
          nextTrackId: entry.local.paused_background.track_id,
          removeCurrentId: removeCurrentId,
          resumePositionSeconds: entry.local.paused_background.position_seconds,
          consumedPausedBackground: true,
          consumedPausedRegular: false,
        }
      else
        return {
          nextTrackId: background[0].id,
          removeCurrentId: removeCurrentId,
          resumePositionSeconds: undefined,
          consumedPausedBackground: false,
          consumedPausedRegular: false,
        }
    }
  } else if (currentTrackGroup === 'regular') {
    const last = regular.filter((t) => t.id !== currentTrackId)
    if (last.length)
      return {
        nextTrackId: pickNextFromGroup(
          regular,
          currentTrackId,
          false,
          repeatAll,
        )?.id,
        removeCurrentId: removeCurrentId,
        resumePositionSeconds: undefined,
        consumedPausedBackground: false,
        consumedPausedRegular: false,
      }
    else if (vip.length) {
      return {
        nextTrackId: vip[0].id,
        removeCurrentId: removeCurrentId,
        resumePositionSeconds: undefined,
        consumedPausedBackground: false,
        consumedPausedRegular: false,
      }
    } else if (background.length) {
      if (entry.local.paused_background)
        return {
          nextTrackId: entry.local.paused_background.track_id,
          removeCurrentId: removeCurrentId,
          resumePositionSeconds: entry.local.paused_background.position_seconds,
          consumedPausedBackground: true,
          consumedPausedRegular: false,
        }
      else
        return {
          nextTrackId: background[0].id,
          removeCurrentId: removeCurrentId,
          resumePositionSeconds: undefined,
          consumedPausedBackground: false,
          consumedPausedRegular: false,
        }
    }
  } else if (currentTrackGroup === 'background') {
    if (vip.length || regular.length) {
      return {
        nextTrackId: vip.length ? vip[0].id : regular[0].id,
        removeCurrentId: undefined,
        resumePositionSeconds: undefined,
        consumedPausedBackground: false,
        consumedPausedRegular: false,
      }
    }

    let id = undefined
    const idx = background.findIndex((t) => t.id === currentTrackId)
    if (idx === -1) id = background[0].id
    if (idx + 1 < background.length) id = background[idx + 1].id

    return {
      nextTrackId: id,
      removeCurrentId: undefined,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
      consumedPausedRegular: false,
    }
  }
  return {
    nextTrackId: vip[0]?.id ?? regular[0]?.id,
    removeCurrentId: undefined,
    resumePositionSeconds: undefined,
    consumedPausedBackground: false,
    consumedPausedRegular: false,
  }
}
