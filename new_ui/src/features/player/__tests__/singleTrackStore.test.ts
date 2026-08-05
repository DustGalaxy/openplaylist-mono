// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useSingleTrackStore } from '@/stores/singleTrackStore'
import { usePlaybackStore } from '@/stores/playbackStore'

describe('Single Track Store - Unit Tests', () => {
  beforeEach(() => {
    usePlaybackStore.getState().clearActivePlayback()
    useSingleTrackStore.setState({
      activeSingleTrack: null,
      isPlaying: false,
      seekSignal: null,
      repeatMode: 'none',
      savedSnapshot: null,
    })
  })

  it('starts single track preview correctly', () => {
    const track = {
      yt_video_id: 'video-123',
      title: 'Test Track Title',
      duration: 180,
      author: 'Test Author',
    }

    useSingleTrackStore.getState().playSingleTrack(track)

    const singleState = useSingleTrackStore.getState()
    const playbackState = usePlaybackStore.getState()

    expect(singleState.activeSingleTrack).toEqual(track)
    expect(singleState.isPlaying).toBe(true)
    expect(playbackState.activeMode).toBe('single')
    expect(playbackState.activePlaybackId).toBe('single-preview')
  })

  it('captures playlist snapshot when entering single track preview from active playlist', () => {
    // Simulate active playlist playback
    usePlaybackStore.getState().setActivePlayback('playlist-owner-1', 'owner')

    const track = {
      yt_video_id: 'video-999',
      title: 'Preview Song',
    }

    useSingleTrackStore.getState().playSingleTrack(track, {
      playlistId: 'playlist-owner-1',
      mode: 'owner',
      currentTrackId: 'track-456',
      currentPosition: 45,
      wasPlaying: true,
    })

    const singleState = useSingleTrackStore.getState()
    const playbackState = usePlaybackStore.getState()

    expect(playbackState.activeMode).toBe('single')
    expect(singleState.savedSnapshot).toEqual({
      playlistId: 'playlist-owner-1',
      mode: 'owner',
      trackId: 'track-456',
      position: 45,
      wasPlaying: true,
    })
  })

  it('restores playlist state when stopSingleTrack is called', () => {
    // Set up active playlist and then single track
    usePlaybackStore.getState().setActivePlayback('playlist-owner-1', 'owner')
    useSingleTrackStore.getState().playSingleTrack(
      { yt_video_id: 'vid-1', title: 'Song 1' },
      {
        playlistId: 'playlist-owner-1',
        mode: 'owner',
        currentTrackId: 'track-111',
        currentPosition: 12,
        wasPlaying: true,
      },
    )

    // Stop single track preview
    useSingleTrackStore.getState().stopSingleTrack()

    const singleState = useSingleTrackStore.getState()
    const playbackState = usePlaybackStore.getState()

    expect(singleState.activeSingleTrack).toBeNull()
    expect(singleState.savedSnapshot).toBeNull()
    expect(playbackState.activePlaybackId).toBe('playlist-owner-1')
    expect(playbackState.activeMode).toBe('owner')
  })

  it('clears active playback if no snapshot exists when stopSingleTrack is called', () => {
    useSingleTrackStore.getState().playSingleTrack({
      yt_video_id: 'vid-standalone',
      title: 'Standalone Track',
    })

    useSingleTrackStore.getState().stopSingleTrack()

    const playbackState = usePlaybackStore.getState()
    expect(playbackState.activePlaybackId).toBeNull()
    expect(playbackState.activeMode).toBeNull()
  })

  it('toggles repeat mode between none and once', () => {
    expect(useSingleTrackStore.getState().repeatMode).toBe('none')

    useSingleTrackStore.getState().toggleRepeatMode()
    expect(useSingleTrackStore.getState().repeatMode).toBe('once')

    useSingleTrackStore.getState().toggleRepeatMode()
    expect(useSingleTrackStore.getState().repeatMode).toBe('none')
  })
})
