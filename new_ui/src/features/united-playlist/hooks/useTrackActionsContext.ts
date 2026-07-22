// src/features/playlist/hooks/useTrackActionsContext.ts
import { usePlaylistStore } from '@/stores/playlistStore'
import { usePlaylistView } from '../context/playlist-view-context'
import { submitPlaylistReport, blockUser } from '@/api/api-playlist'
import { toast } from 'sonner'
import type { Track } from '@/stores/playlistStore/types'
import type { TrackActionsContext } from '../lib/trackActions'

export function useTrackActionsContext(): TrackActionsContext {
  const { slot, playlistId } = usePlaylistView()
  const { startTrack, removeTrack, reorderStepTrack } = usePlaylistStore()

  return {
    startTrack: (trackId) => {
      if (playlistId) startTrack(playlistId, trackId)
    },
    removeTrack: (trackId, reason) => removeTrack(slot, trackId, reason),
    reorderStep: (trackId, dir) => {
      // group resolution (vip/regular/background) happens where the action is rendered,
      // since a flat action-context doesn't know which group a given track sits in —
      // see QueueGroup.tsx, which wires this per-group instead of using this generic version
      console.debug(
        '[trackActions] reorderStep called without group context — use per-group wiring',
      )
    },
    copyLink: (track: Track) => {
      navigator.clipboard.writeText(
        `${window.location.origin}/view?p=${playlistId}&t=${track.id}`,
      )
      toast.success('Link copied')
    },
    report: async (track: Track) => {
      if (!playlistId) return
      // console.debug: exact PlaylistReportPayload fields (settings_id, platform, reason) need real values,
      // not derivable purely from track — wiring a report modal is a separate UI task, this is the action stub
      console.debug(
        '[trackActions] report — needs report modal for reason/platform input',
        track.id,
      )
    },
    block: async (track: Track) => {
      if (!playlistId) return
      console.debug(
        '[trackActions] block — needs settings_id + trigger_type/value from context',
        track.id,
      )
    },
  }
}
