import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ModeSettings,
  Playlist,
  PlaylistCacheEntry,
  SortSettings,
  Track,
} from '@/types/playlist'
import {
  isBackgroundTrack,
  isLastInGroup,
  isVipTrack,
  pickNextFromGroup,
  resolveNextTrack,
  resolveStaticNext,
  splitQueue,
} from '@/stores/playlistStore/helpers'

import { DEFAULT_SORT, Platform, PlaylistMode } from '@/types/playlist'

const makeSortSettings = (
  orderMode: SortSettings['order_mode'] = 'auto',
): SortSettings => ({
  ...DEFAULT_SORT,
  order_mode: orderMode,
})

const makeModeSettings = ({
  priorityBreakPoint = 100,
  backgroundTrackIds = [],
  vipOrder = 'auto',
  regularOrder = 'auto',
}: {
  priorityBreakPoint?: number
  backgroundTrackIds?: Array<string>
  vipOrder?: SortSettings['order_mode']
  regularOrder?: SortSettings['order_mode']
} = {}): ModeSettings => ({
  priority_break_point: priorityBreakPoint,
  sort_settings_vip: makeSortSettings(vipOrder),
  sort_settings_regular: makeSortSettings(regularOrder),
  ...(backgroundTrackIds.length > 0 ? { backgroundTrackIds } : {}),
})

const makeTrack = (id: string, priority = 0): Track => ({
  id,
  playlist_id: 'playlist-1',
  yt_video_id: `video-${id}`,
  priority,
  title: `Track ${id}`,
  duration: '180',
  requester_nickname: 'test-user',
  created_at: '2026-01-01T00:00:00.000Z',
  source: Platform.Web,
  extra_data: {},
})

const makePlaylist = ({
  mode = PlaylistMode.Static,
  tracks = [],
  settings = makeModeSettings(),
  background_track_ids,
  shuffle = false,
}: {
  mode?: PlaylistMode
  tracks?: Array<Track>
  settings?: ModeSettings
  background_track_ids?: Array<string>
  shuffle?: boolean
} = {}): Playlist => ({
  id: 'playlist-1',
  owner_id: 'owner-1',
  owner_nickname: 'owner',
  name: 'Test playlist',
  description: '',
  tags: [],
  is_public: false,
  is_favorite: false,
  is_allow_external_requests: true,
  allow_sources: [],
  track_data: tracks,
  max_playlist_size: 100,
  mode,
  repeat_mode: 'none',
  mode_settings: {
    [PlaylistMode.Static]: settings,
    [PlaylistMode.Flow]: settings,
    [PlaylistMode.Stream]: settings,
  },
  sync_playback_position: false,
  shuffle,
  cost_mode: 'add',
  background_track_ids:
    background_track_ids !== undefined
      ? background_track_ids
      : (settings as any).backgroundTrackIds || [],
  track_black_list: [],
  content_settings: [],
  block_list: [],
  donation_rules: [],
  chat_rules: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  now_playing: undefined,
})

const makeCacheEntry = ({
  repeatMode = 'none',
  pausedBackground = null,
}: {
  repeatMode?: PlaylistCacheEntry['local']['repeatMode']
  pausedBackground?: PlaylistCacheEntry['local']['paused_background']
} = {}): PlaylistCacheEntry => ({
  data: makePlaylist(),
  refCount: 1,
  owner: {} as PlaylistCacheEntry['owner'],
  local: {
    history: [],
    sortOverride: DEFAULT_SORT,
    paused_background: pausedBackground,
    playbackPosition: null,
    syncSeek: null,
    syncPause: null,
    pendingResume: null,
    acceptSync: false,
    pendingInterrupt: null,
    repeatMode,
  },
})

describe('isVipTrack', () => {
  it('returns true when priority is equal to the breakpoint', () => {
    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    expect(isVipTrack(makeTrack('track-1', 100), settings)).toBe(true)
  })

  it('returns true when priority is greater than the breakpoint', () => {
    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    expect(isVipTrack(makeTrack('track-1', 101), settings)).toBe(true)
  })

  it('returns false when priority is below the breakpoint', () => {
    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    expect(isVipTrack(makeTrack('track-1', 99), settings)).toBe(false)
  })

  it('returns false when breakpoint is zero', () => {
    const settings = makeModeSettings({
      priorityBreakPoint: 0,
    })

    expect(isVipTrack(makeTrack('track-1', 999), settings)).toBe(false)
  })

  it('returns false when breakpoint is negative', () => {
    const settings = makeModeSettings({
      priorityBreakPoint: -1,
    })

    expect(isVipTrack(makeTrack('track-1', 999), settings)).toBe(false)
  })
})

describe('isBackgroundTrack', () => {
  it('returns true for a configured stream background track', () => {
    const settings = makePlaylist({
      background_track_ids: ['background-1'],
    })

    expect(
      isBackgroundTrack(
        PlaylistMode.Stream,
        settings.background_track_ids,
        'background-1',
      ),
    ).toBe(true)
  })

  it('returns false for a track that is not configured as background', () => {
    const settings = makeModeSettings({
      backgroundTrackIds: ['background-1'],
    })

    expect(isBackgroundTrack(PlaylistMode.Stream, settings, 'regular-1')).toBe(
      false,
    )
  })

  it('returns false for a background id when mode is not stream', () => {
    const settings = makeModeSettings({
      backgroundTrackIds: ['background-1'],
    })

    expect(
      isBackgroundTrack(PlaylistMode.Static, settings, 'background-1'),
    ).toBe(false)
  })
})

describe('isLastInGroup', () => {
  const tracks = [
    makeTrack('track-1'),
    makeTrack('track-2'),
    makeTrack('track-3'),
  ]

  it('returns true when currentId is undefined', () => {
    expect(isLastInGroup(tracks, undefined)).toBe(true)
  })

  it('returns true for an empty list', () => {
    expect(isLastInGroup([], 'track-1')).toBe(true)
  })

  it('returns false when current track is not the last track', () => {
    expect(isLastInGroup(tracks, 'track-1')).toBe(false)
  })

  it('returns true when current track is the last track', () => {
    expect(isLastInGroup(tracks, 'track-3')).toBe(true)
  })

  it('returns true when current track is not found', () => {
    expect(isLastInGroup(tracks, 'unknown')).toBe(true)
  })
})

describe('pickNextFromGroup', () => {
  const tracks = [
    makeTrack('track-1'),
    makeTrack('track-2'),
    makeTrack('track-3'),
  ]

  it('returns undefined for an empty list', () => {
    expect(pickNextFromGroup([], undefined, 'auto', false)).toBeUndefined()
  })

  it('returns the first track when currentId is undefined', () => {
    expect(pickNextFromGroup(tracks, undefined, 'auto', false)?.id).toBe(
      'track-1',
    )
  })

  it('returns the next track in auto mode', () => {
    expect(pickNextFromGroup(tracks, 'track-1', 'auto', false)?.id).toBe(
      'track-2',
    )
  })

  it('returns the first track after the last one when repeatAll is enabled', () => {
    expect(pickNextFromGroup(tracks, 'track-3', 'auto', true)?.id).toBe(
      'track-1',
    )
  })

  it('returns undefined after the last track when repeatAll is disabled', () => {
    expect(pickNextFromGroup(tracks, 'track-3', 'auto', false)).toBeUndefined()
  })

  it('returns the first track when currentId is unknown', () => {
    expect(pickNextFromGroup(tracks, 'unknown', 'auto', false)?.id).toBe(
      'track-1',
    )
  })

  it('does not return the current track in random mode when another track exists', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = pickNextFromGroup(tracks, 'track-2', 'random', false)

    expect(result?.id).toBe('track-1')
  })

  it('can repeat the only track in random mode when repeatAll is enabled', () => {
    const onlyTrack = [makeTrack('track-1')]

    vi.spyOn(Math, 'random').mockReturnValue(0)

    const result = pickNextFromGroup(onlyTrack, 'track-1', 'random', true)

    expect(result?.id).toBe('track-1')
  })
})

describe('splitQueue', () => {
  it('puts tracks into VIP and regular groups', () => {
    const vip = makeTrack('vip-1', 100)
    const regular = makeTrack('regular-1', 1)

    const pl = makePlaylist({
      mode: PlaylistMode.Static,
      tracks: [vip, regular],
      settings: makeModeSettings({
        priorityBreakPoint: 100,
      }),
    })

    const result = splitQueue(pl)

    expect(result.vip.map((track) => track.id)).toEqual(['vip-1'])
    expect(result.regular.map((track) => track.id)).toEqual(['regular-1'])
    expect(result.background).toEqual([])
  })

  it('does not create VIP group when breakpoint is disabled', () => {
    const highPriority = makeTrack('high-1', 999)
    const regular = makeTrack('regular-1', 1)

    const pl = makePlaylist({
      mode: PlaylistMode.Static,
      tracks: [highPriority, regular],
      settings: makeModeSettings({
        priorityBreakPoint: 0,
      }),
    })

    const result = splitQueue(pl)

    expect(result.vip).toEqual([])
    expect(result.regular.map((track) => track.id)).toEqual([
      'high-1',
      'regular-1',
    ])
  })

  it('removes background tracks from the stream regular pool', () => {
    const background = makeTrack('background-1')
    const regular = makeTrack('regular-1')

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [background, regular],
      settings: makeModeSettings({
        backgroundTrackIds: ['background-1'],
      }),
    })

    const result = splitQueue(pl)

    expect(result.background.map((track) => track.id)).toEqual(['background-1'])

    expect(result.regular.map((track) => track.id)).toEqual(['regular-1'])
  })

  it('ignores background ids that do not exist in track_data', () => {
    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [makeTrack('track-1')],
      settings: makeModeSettings({
        backgroundTrackIds: ['missing-track'],
      }),
    })

    const result = splitQueue(pl)

    expect(result.background).toEqual([])
  })
})

describe('resolveStaticNext', () => {
  it('returns the first VIP track when there is no current track', () => {
    const vip = makeTrack('vip-1', 100)
    const regular = makeTrack('regular-1', 1)

    const result = resolveStaticNext(
      undefined,
      [vip],
      [regular],
      false,
      'auto',
      'auto',
      false,
      () => undefined,
    )

    expect(result).toEqual({
      trackId: 'vip-1',
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    })
  })

  it('returns the next track in the current group', () => {
    const vip1 = makeTrack('vip-1', 100)
    const vip2 = makeTrack('vip-2', 200)

    const result = resolveStaticNext(
      vip1,
      [vip1, vip2],
      [],
      true,
      'auto',
      'auto',
      false,
      () => undefined,
    )

    expect(result.trackId).toBe('vip-2')
  })

  it('moves from VIP to regular after the last VIP track', () => {
    const vip = makeTrack('vip-1', 100)
    const regular = makeTrack('regular-1', 1)

    const result = resolveStaticNext(
      vip,
      [vip],
      [regular],
      true,
      'auto',
      'auto',
      false,
      () => undefined,
    )

    expect(result.trackId).toBe('regular-1')
  })

  it('resumes paused background after the current group ends', () => {
    const vip = makeTrack('vip-1', 100)

    const result = resolveStaticNext(
      vip,
      [vip],
      [],
      true,
      'auto',
      'auto',
      false,
      () => ({
        track_id: 'background-1',
        position_seconds: 42,
      }),
    )

    expect(result).toEqual({
      trackId: 'background-1',
      resumePositionSeconds: 42,
      consumedPausedBackground: true,
    })
  })

  it('repeats the current group when repeatAll is enabled', () => {
    const vip = makeTrack('vip-1', 100)

    const result = resolveStaticNext(
      vip,
      [vip],
      [],
      true,
      'auto',
      'auto',
      true,
      () => undefined,
    )

    expect(result.trackId).toBe('vip-1')
  })
})

describe('resolveNextTrack — static mode', () => {
  it('starts with the first VIP track', () => {
    const vip = makeTrack('vip-1', 100)
    const regular = makeTrack('regular-1', 1)

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Static,
      tracks: [vip, regular],
      settings,
    })

    const result = resolveNextTrack(pl, undefined, makeCacheEntry())

    expect(result).toEqual({
      nextTrackId: 'vip-1',
      removeCurrentId: undefined,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    })
  })

  it('moves from VIP to regular', () => {
    const vip = makeTrack('vip-1', 100)
    const regular = makeTrack('regular-1', 1)

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Static,
      tracks: [vip, regular],
      settings,
    })

    const result = resolveNextTrack(pl, 'vip-1', makeCacheEntry())

    expect(result.nextTrackId).toBe('regular-1')
  })

  it('returns undefined after the last track when repeat is disabled', () => {
    const regular = makeTrack('regular-1', 1)

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Static,
      tracks: [regular],
      settings,
    })

    const result = resolveNextTrack(
      pl,
      'regular-1',
      makeCacheEntry({
        repeatMode: 'none',
      }),
    )

    expect(result.nextTrackId).toBeUndefined()
  })

  it('repeats the track when repeatMode is all', () => {
    const regular = makeTrack('regular-1', 1)

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Static,
      tracks: [regular],
      settings,
    })

    const result = resolveNextTrack(
      pl,
      'regular-1',
      makeCacheEntry({
        repeatMode: 'all',
      }),
    )

    expect(result.nextTrackId).toBe('regular-1')
  })
})

describe('resolveNextTrack — stream mode', () => {
  it('starts with VIP when there is no current track', () => {
    const vip = makeTrack('vip-1', 100)
    const regular = makeTrack('regular-1', 1)
    const background = makeTrack('background-1')

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
      backgroundTrackIds: ['background-1'],
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [vip, regular, background],
      settings,
    })

    const result = resolveNextTrack(pl, undefined, makeCacheEntry())

    expect(result.nextTrackId).toBe('vip-1')
    expect(result.removeCurrentId).toBeUndefined()
  })

  it('continues the VIP queue and removes the current VIP track', () => {
    const vip1 = makeTrack('vip-1', 100)
    const vip2 = makeTrack('vip-2', 200)

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [vip1, vip2],
      settings,
    })

    const result = resolveNextTrack(pl, 'vip-1', makeCacheEntry())

    expect(result).toEqual({
      nextTrackId: 'vip-2',
      removeCurrentId: 'vip-1',
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    })
  })

  it('moves from the last VIP track to regular', () => {
    const vip = makeTrack('vip-1', 100)
    const regular = makeTrack('regular-1', 1)

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [vip, regular],
      settings,
    })

    const result = resolveNextTrack(pl, 'vip-1', makeCacheEntry())

    expect(result.nextTrackId).toBe('regular-1')
    expect(result.removeCurrentId).toBe('vip-1')
  })

  it('removes the current regular track when moving to the next regular track', () => {
    const regular1 = makeTrack('regular-1', 1)
    const regular2 = makeTrack('regular-2', 2)

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [regular1, regular2],
      settings,
    })

    const result = resolveNextTrack(pl, 'regular-1', makeCacheEntry())

    expect(result).toEqual({
      nextTrackId: 'regular-2',
      removeCurrentId: 'regular-1',
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    })
  })

  it('resumes paused background after VIP and regular queues are empty', () => {
    const vip = makeTrack('vip-1', 100)

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [vip],
      settings,
    })

    const result = resolveNextTrack(
      pl,
      'vip-1',
      makeCacheEntry({
        pausedBackground: {
          track_id: 'background-1',
          position_seconds: 73,
        },
      }),
    )

    expect(result).toEqual({
      nextTrackId: 'background-1',
      removeCurrentId: 'vip-1',
      resumePositionSeconds: 73,
      consumedPausedBackground: true,
    })
  })

  it('starts background playback when VIP and regular queues are empty', () => {
    const background = makeTrack('background-1')

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
      backgroundTrackIds: ['background-1'],
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [background],
      settings,
    })

    const result = resolveNextTrack(pl, undefined, makeCacheEntry())

    expect(result).toEqual({
      nextTrackId: 'background-1',
      removeCurrentId: undefined,
      resumePositionSeconds: undefined,
      consumedPausedBackground: false,
    })
  })

  it('moves to the next background track', () => {
    const background1 = makeTrack('background-1')
    const background2 = makeTrack('background-2')

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
      backgroundTrackIds: ['background-1', 'background-2'],
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [background1, background2],
      settings,
    })

    const result = resolveNextTrack(pl, 'background-1', makeCacheEntry())

    expect(result.nextTrackId).toBe('background-2')
    expect(result.removeCurrentId).toBeUndefined()
  })

  it('loops background tracks after the last background track', () => {
    const background1 = makeTrack('background-1')
    const background2 = makeTrack('background-2')

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
      backgroundTrackIds: ['background-1', 'background-2'],
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [background1, background2],
      settings,
    })

    const result = resolveNextTrack(pl, 'background-2', makeCacheEntry())

    expect(result.nextTrackId).toBe('background-1')
    expect(result.removeCurrentId).toBeUndefined()
  })

  it('does not remove the current background track', () => {
    const background = makeTrack('background-1')
    const regular = makeTrack('regular-1')

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
      backgroundTrackIds: ['background-1'],
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [background, regular],
      settings,
    })

    const result = resolveNextTrack(pl, 'background-1', makeCacheEntry())

    expect(result.removeCurrentId).toBeUndefined()
    expect(result.nextTrackId).toBe('regular-1')
  })
})

describe('resolveNextTrack — shuffle', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('uses random order for VIP tracks', () => {
    const vip1 = makeTrack('vip-1', 100)
    const vip2 = makeTrack('vip-2', 200)

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [vip1, vip2],
      settings,
      shuffle: true,
    })

    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    const result = resolveNextTrack(pl, undefined, makeCacheEntry())

    expect(result.nextTrackId).toBe('vip-2')
  })

  it('uses random order for background tracks', () => {
    const background1 = makeTrack('background-1')
    const background2 = makeTrack('background-2')

    const settings = makeModeSettings({
      priorityBreakPoint: 100,
      backgroundTrackIds: ['background-1', 'background-2'],
    })

    const pl = makePlaylist({
      mode: PlaylistMode.Stream,
      tracks: [background1, background2],
      settings,
      shuffle: true,
    })

    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    const result = resolveNextTrack(pl, 'background-1', makeCacheEntry())

    expect(result.nextTrackId).toBe('background-2')
  })
})
