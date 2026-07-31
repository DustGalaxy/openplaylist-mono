// src/features/player/types.ts

import type { Track } from '@/types/playlist'

export type SeekSignal = { position: number; token: number } | null
export type RepeatMode = 'none' | 'all' | 'once'

export type PlaybackFeedCapabilities = {
  canSkip: boolean
  canSeekArbitrary: boolean
  canRequestSync: boolean
  canStop: boolean // owner-only "остановить вещание" (Square в PlayerBase)
}

export type PlaybackFeed = {
  feedId: string
  nowPlayingTrack: Track | undefined
  playing: boolean
  seekSignal: SeekSignal
  repeatMode: RepeatMode
  shuffle: boolean
  capabilities: PlaybackFeedCapabilities

  onPlayerStateChange: (playing: boolean) => void
  onEnded: () => void
  registerPositionGetter: (getter: () => number) => void

  setRepeatMode: (mode: RepeatMode) => void
  setShuffle: (shuffle: boolean) => void
  next: () => boolean
  prev: () => void
  seek: (seconds: number) => void
  stop?: () => void
  requestSync?: () => void
}
