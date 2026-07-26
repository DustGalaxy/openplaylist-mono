// src/features/playlist/hooks/useTrackActionsContext.ts
import { toast } from 'sonner'
import { usePlaylistView } from '../context/playlist-view-context'
import type { Track } from '@/types/playlist'
import type { TrackActionsContext } from '../lib/trackActions'
import { blockUser, submitPlaylistReport } from '@/api/api-playlist'
import { usePlaylistStore } from '@/stores/playlistStore'

export function useTrackActionsContext(
  onOpenReportModal?: (track: Track) => void,
): TrackActionsContext {
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
      navigator.clipboard.writeText(`https://song.link/y/${track.yt_video_id}`)
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
      if (onOpenReportModal) onOpenReportModal(track)
      console.debug(
        '[trackActions] block — needs settings_id + trigger_type/value from context',
        track.id,
      )
    },
  }
}
