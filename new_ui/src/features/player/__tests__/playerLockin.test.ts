// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { usePlaybackStore } from '@/stores/playbackStore'

describe('Player & PlaybackStore - Baseline Working State Lock-in', () => {
  beforeEach(() => {
    usePlaybackStore.getState().clearActivePlayback()
  })

  it('initially has no active playback', () => {
    const state = usePlaybackStore.getState()
    expect(state.activePlaybackId).toBeNull()
    expect(state.activeMode).toBeNull()
  })

  it('sets active playback correctly for owner mode', () => {
    usePlaybackStore.getState().setActivePlayback('playlist-123', 'owner')
    const state = usePlaybackStore.getState()
    expect(state.activePlaybackId).toBe('playlist-123')
    expect(state.activeMode).toBe('owner')
  })

  it('sets active playback correctly for viewer mode', () => {
    usePlaybackStore.getState().setActivePlayback('playlist-456', 'viewer')
    const state = usePlaybackStore.getState()
    expect(state.activePlaybackId).toBe('playlist-456')
    expect(state.activeMode).toBe('viewer')
  })

  it('sets active playback correctly for single track mode', () => {
    usePlaybackStore.getState().setActivePlayback('single-preview', 'single')
    const state = usePlaybackStore.getState()
    expect(state.activePlaybackId).toBe('single-preview')
    expect(state.activeMode).toBe('single')
  })

  it('prevents redundant state updates on identical active playback', () => {
    usePlaybackStore.getState().setActivePlayback('playlist-123', 'owner')
    const initialState = usePlaybackStore.getState()

    // Second call with same id and mode
    usePlaybackStore.getState().setActivePlayback('playlist-123', 'owner')
    const nextState = usePlaybackStore.getState()

    expect(nextState).toBe(initialState)
  })

  it('clears active playback correctly', () => {
    usePlaybackStore.getState().setActivePlayback('playlist-123', 'owner')
    usePlaybackStore.getState().clearActivePlayback()

    const state = usePlaybackStore.getState()
    expect(state.activePlaybackId).toBeNull()
    expect(state.activeMode).toBeNull()
  })
})
