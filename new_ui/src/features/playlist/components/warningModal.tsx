import React from 'react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import Btn from '@/components/ui/my-btn'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import Warning from '@/components/icons/icon-warning'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import useMusicStore from '@/stores/musicStore'
import { blockUser, submitPlaylistReport } from '@/api/api-playlist'
import type { Platform, ReadBlockList } from '@/types/playlist'

const YT_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

function isUserBlocked(
  blockList: ReadBlockList[],
  platform: Platform,
  nickname: string,
  userId?: string,
): boolean {
  return blockList.some(
    (entry) =>
      entry.platform === platform &&
      ((entry.trigger_type === 'USER_NAME' &&
        entry.trigger_value === nickname) ||
        (userId != null &&
          entry.trigger_type === 'USER_ID' &&
          entry.trigger_value === userId)),
  )
}

export default function WarningModal({
  yt_video_id,
  requester_nickname,
  requester_platform,
  track_id,
  requester_id,
}: {
  yt_video_id: string
  requester_nickname: string
  requester_platform: Platform
  track_id?: string
  requester_id?: string
}) {
  const playlist = usePlaylist()
  const [open, setOpen] = React.useState(false)
  const [blockUserToggle, setBlockUserToggle] = React.useState(false)
  const [blockTrackToggle, setBlockTrackToggle] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const { requestPlSettings, requestRemoveTrack, syncPlSettings } =
    useMusicStore()

  const resetForm = () => {
    setBlockUserToggle(false)
    setBlockTrackToggle(false)
    setReason('')
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetForm()
  }

  const collectTracksToRemove = (): string[] => {
    if (!blockTrackToggle && !blockUserToggle) return []

    const ids = new Set<string>()
    if (blockTrackToggle) {
      for (const track of playlist.track_data) {
        if (track.yt_video_id === yt_video_id) ids.add(track.id)
      }
    }
    if (blockUserToggle) {
      for (const track of playlist.track_data) {
        if (
          track.requester_nickname === requester_nickname &&
          track.source === requester_platform
        ) {
          ids.add(track.id)
        }
      }
    }
    return [...ids]
  }

  const handleBlockTrack = async (): Promise<boolean> => {
    if (!YT_VIDEO_ID_REGEX.test(yt_video_id)) {
      toast.error('Invalid YouTube video ID.')
      return false
    }
    if (playlist.settings.track_black_list.includes(yt_video_id)) {
      return true
    }
    await requestPlSettings(playlist.id, {
      track_black_list: [...playlist.settings.track_black_list, yt_video_id],
    })
    return true
  }

  const handleBlockUser = async (): Promise<boolean> => {
    const trigger_type = requester_id ? 'USER_ID' : 'USER_NAME'
    const trigger_value = requester_id ?? requester_nickname

    if (
      isUserBlocked(
        playlist.settings.block_list,
        requester_platform,
        requester_nickname,
        requester_id,
      )
    ) {
      return true
    }

    const entry = await blockUser(
      playlist.id,
      playlist.settings.id,
      trigger_type,
      trigger_value,
      requester_platform,
    )

    if (!entry) {
      toast.error('Failed to block user.')
      return false
    }

    syncPlSettings(playlist.id, {
      ...playlist.settings,
      block_list: [...playlist.settings.block_list, entry],
    })
    return true
  }

  const handleSubmit = async () => {
    const trimmedReason = reason.trim()
    if (!trimmedReason && !blockUserToggle && !blockTrackToggle) {
      toast.error('Add a reason or choose to block the user and/or track.')
      return
    }

    setSubmitting(true)
    try {
      let blockedTrack = false
      let blockedUser = false

      if (blockTrackToggle) {
        blockedTrack = await handleBlockTrack()
        if (!blockedTrack) return
      }

      if (blockUserToggle) {
        blockedUser = await handleBlockUser()
        if (!blockedUser) return
      }

      const trackIdsToRemove = collectTracksToRemove()
      if (trackIdsToRemove.length > 0) {
        await Promise.all(
          trackIdsToRemove.map((id) =>
            requestRemoveTrack(playlist.id, id, 'reported'),
          ),
        )
      }

      const reportSent = await submitPlaylistReport({
        playlist_id: playlist.id,
        settings_id: playlist.settings.id,
        yt_video_id,
        track_id,
        requester_nickname,
        requester_id,
        platform: requester_platform,
        reason: trimmedReason,
        block_user: blockUserToggle,
        block_track: blockTrackToggle,
      })

      if (!reportSent && trimmedReason) {
        console.warn(
          'Report API not available yet; block/remove actions were applied locally.',
        )
      }

      const parts: string[] = []
      if (blockedUser) parts.push('user blocked')
      if (blockedTrack) parts.push('track blocked')
      if (trackIdsToRemove.length > 0) {
        parts.push(
          `${trackIdsToRemove.length} track${trackIdsToRemove.length === 1 ? '' : 's'} removed`,
        )
      }
      if (trimmedReason && reportSent) parts.push('report submitted')

      toast.success(
        parts.length > 0 ? parts.join(', ') + '.' : 'Report recorded.',
      )

      setOpen(false)
      resetForm()
    } catch {
      toast.error('Something went wrong while processing the report.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Btn text={<Warning />} className="px-1 bg-level-2" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-level-1 border-level-3 text-text-main overflow-scroll">
        <DialogHeader>
          <DialogTitle className="text-xl">Report</DialogTitle>
          <DialogDescription>
            Report a track or requester and optionally add them to your block
            lists.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="report-reason">Reason</Label>
          <Textarea
            id="report-reason"
            placeholder="Why are you reporting this track or user?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="block-user"
            checked={blockUserToggle}
            onCheckedChange={setBlockUserToggle}
            disabled={submitting}
          />
          <Label htmlFor="block-user" className="cursor-pointer">
            Block user: {requester_nickname} ({requester_platform})
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="block-track"
            checked={blockTrackToggle}
            onCheckedChange={setBlockTrackToggle}
            disabled={submitting}
          />
          <Label htmlFor="block-track" className="cursor-pointer">
            Block track: {yt_video_id}
          </Label>
        </div>

        <DialogFooter >
          <div className="flex justify-between w-full">

            <Btn
              text={submitting ? 'Submitting…' : 'Submit report'}
              className="w-full bg-level-2 sm:w-auto px-2"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            />
            <Btn
              text="Cancel"
              className="bg-level-2 px-2"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            />
          </div>

        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
