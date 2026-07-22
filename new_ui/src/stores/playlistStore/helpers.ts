import type {
  InputPlaylist,
  ModeSettings,
  OrderMode,
  PlaylistMode,
  PlaylistSettings,
  SocketLike,
  SortSettings,
  Track,
} from '@/types/playlist'
import type {
  FeedTrack,
  PausedBackground,
  Playlist,
  PlaylistCacheEntry,
  PlaylistRole,
  SplitQueue,
  TrackAction,
  WireTrack,
} from './types'
import type { Socket } from 'socket.io-client'
import { computePriority, formatTime } from '@/lib/utils'

// ─── wire ↔ cache conversion ──────────────────────────────────────
export function toPlaylist(input: InputPlaylist): Playlist {
  const now_playing = input.now_playing
    ? input.track_data.find((t) => t.id === input.now_playing)
    : undefined
  return { ...input, now_playing }
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
  settings: PlaylistSettings,
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
    priority: computePriority(withLabelPriority, settings),
  }
}

export function mergeTrackAdded(playlist: Playlist, wire: WireTrack): Playlist {
  const track = toTrack(wire, playlist.id, playlist.settings)
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
  settings: PlaylistSettings,
): Playlist {
  return { ...playlist, settings }
}

// ─── role / permissions (role slice) ──────────────────────────────
export function getRole(
  playlist: Playlist | undefined,
  userId: string | null,
): PlaylistRole {
  if (!playlist || !userId) return 'viewer'
  if (playlist.owner_id === userId) return 'owner'
  // ponytail: operator_ids not yet in InputPlaylist — stub until backend contract lands
  // if (playlist.operator_ids?.includes(userId)) return 'operator'
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
export function isVipTrack(track: Track, modeSettings: ModeSettings): boolean {
  return (
    modeSettings.priority_break_point > 0 &&
    track.priority >= modeSettings.priority_break_point
  )
}

export function isBackgroundTrack(
  mode: PlaylistMode,
  modeSettings: ModeSettings,
  trackId: string,
): boolean {
  return (
    mode === 'stream' && modeSettings.background_track_ids.includes(trackId)
  )
}

export function getActiveModeSettings(playlist: Playlist): ModeSettings {
  return playlist.settings.mode_settings[playlist.settings.mode]
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

  if (rules.order_mode === 'random') {
    return [...tracks].sort((a, b) => a.created_at.localeCompare(b.created_at))
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

export function splitQueue(playlist: Playlist): SplitQueue {
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

export function isLastInGroup(
  list: Array<Track>,
  currentId: string | undefined,
): boolean {
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

export function reorderStep(
  playlist: Playlist,
  trackId: string,
  group: string,
  dir: 'up' | 'down',
): Array<string> | void {
  const mode = playlist.settings.mode
  const modeSettings = playlist.settings.mode_settings[mode]
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

// ─── next-track resolution (playback ops) ──────────────────────────
export interface NextTrackDecision {
  nextTrackId: string | undefined
  removeCurrentId: string | undefined
  resumePositionSeconds: number | undefined
  consumedPausedBackground: boolean
}

export function resolveNextTrack(
  pl: Playlist,
  currentTrackId: string | undefined,
  entry: PlaylistCacheEntry,
): NextTrackDecision {
  const currentTrack = currentTrackId
    ? pl.track_data.find((t) => t.id === currentTrackId)
    : undefined
  const modeSettings = getActiveModeSettings(pl)
  const { vip, regular, background } = splitQueue(pl)
  const currentWasVip =
    currentTrack !== undefined && isVipTrack(currentTrack, modeSettings)
  const repeatAll = pl.settings.repeat_mode === 'all'
  const vipOrder = pl.settings.shuffle
    ? 'random'
    : modeSettings.sort_settings_vip.order_mode
  const regularOrder = pl.settings.shuffle
    ? 'random'
    : modeSettings.sort_settings_regular.order_mode

  const resumeFromPausedBackground = () =>
    currentWasVip && entry.local.paused_background
      ? entry.local.paused_background
      : undefined

  if (pl.settings.mode === 'static') {
    const { trackId, resumePositionSeconds, consumedPausedBackground } =
      resolveStaticNext(
        currentTrack,
        vip,
        regular,
        currentWasVip,
        vipOrder,
        regularOrder,
        repeatAll,
        resumeFromPausedBackground,
      )
    return {
      nextTrackId: trackId,
      removeCurrentId: undefined,
      resumePositionSeconds,
      consumedPausedBackground,
    }
  }
  return resolveFlowStreamNext(
    pl,
    currentTrack,
    modeSettings,
    vip,
    regular,
    background,
    vipOrder,
    regularOrder,
    resumeFromPausedBackground,
  )
}

function resolveStaticNext(
  currentTrack: Track | undefined,
  vip: Array<Track>,
  regular: Array<Track>,
  currentWasVip: boolean,
  vipOrder: OrderMode,
  regularOrder: OrderMode,
  repeatAll: boolean,
  resumeFromPausedBackground: () => PausedBackground | undefined,
) {
  const currentGroup = currentWasVip ? vip : regular
  if (currentTrack === undefined)
    return {
      trackId: vip[0]?.id ?? regular[0]?.id,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    }
  if (!isLastInGroup(currentGroup, currentTrack.id)) {
    return {
      trackId: pickNextFromGroup(
        currentGroup,
        currentTrack.id,
        currentWasVip ? vipOrder : regularOrder,
        false,
      )?.id,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    }
  }
  const resumed = resumeFromPausedBackground()
  if (resumed)
    return {
      trackId: resumed.track_id,
      resumePositionSeconds: resumed.position_seconds,
      consumedPausedBackground: true,
    }
  return {
    trackId: currentWasVip
      ? (regular[0]?.id ?? (repeatAll ? vip[0]?.id : undefined))
      : (vip[0]?.id ?? (repeatAll ? regular[0]?.id : undefined)),
    resumePositionSeconds: undefined,
    consumedPausedBackground: false,
  }
}

function resolveFlowStreamNext(
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
  const remainingVip = currentTrack
    ? vip.filter((t) => t.id !== currentTrack.id)
    : vip
  if (remainingVip.length > 0) {
    return {
      nextTrackId: pickNextFromGroup(remainingVip, undefined, vipOrder, false)
        ?.id,
      removeCurrentId: undefined,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    }
  }
  const resumed = resumeFromPausedBackground()
  if (resumed)
    return {
      nextTrackId: resumed.track_id,
      removeCurrentId: undefined,
      resumePositionSeconds: resumed.position_seconds,
      consumedPausedBackground: true,
    }

  if (currentTrack === undefined) {
    return {
      nextTrackId: regular[0]?.id ?? background[0]?.id,
      removeCurrentId: undefined,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    }
  }

  const wasBackgroundTrack = isBackgroundTrack(
    pl.settings.mode,
    modeSettings,
    currentTrack.id,
  )
  if (pl.settings.mode === 'stream' && wasBackgroundTrack) {
    const bgOrder = pl.settings.shuffle ? 'random' : 'auto'
    return {
      nextTrackId: pickNextFromGroup(background, currentTrack.id, bgOrder, true)
        ?.id,
      removeCurrentId: undefined,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    }
  }

  return {
    nextTrackId:
      pickNextFromGroup(regular, currentTrack.id, regularOrder, false)?.id ??
      background[0]?.id,
    removeCurrentId: currentTrack.id,
    resumePositionSeconds: undefined,
    consumedPausedBackground: false,
  }
}
