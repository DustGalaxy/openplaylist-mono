import React from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import type { Platform, ReadBlockList, Track } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import Btn from '@/components/ui/my-btn'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { usePlaylistStore } from '@/stores/playlistStore'
import { blockUser, submitPlaylistReport } from '@/api/api-playlist'
import { usePlaylistView } from '../context/playlist-view-context'

const YT_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/

function isUserBlocked(
  blockList: Array<ReadBlockList>,
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

export default function WarningModal({ track }: { track: Track }) {
  const { t } = useTranslation()
  const { playlist, slot } = usePlaylistView()

  const [open, setOpen] = React.useState(false)
  const [blockUserToggle, setBlockUserToggle] = React.useState(false)
  const [blockTrackToggle, setBlockTrackToggle] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  const { removeTrack, patchNow } = usePlaylistStore()

  if (!playlist) return null

  const yt_video_id = track.yt_video_id
  const requester_nickname = track.requester_nickname
  const requester_platform = track.source
  const requester_id = undefined
  const resetForm = () => {
    setBlockUserToggle(false)
    setBlockTrackToggle(false)
    setReason('')
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetForm()
  }

  const collectTracksToRemove = (): Array<string> => {
    if (!blockTrackToggle && !blockUserToggle) return []

    const ids = new Set<string>()
    if (blockTrackToggle) {
      for (const tItem of playlist.track_data) {
        if (tItem.yt_video_id === yt_video_id) ids.add(tItem.id)
      }
    }
    if (blockUserToggle) {
      for (const tItem of playlist.track_data) {
        if (
          tItem.requester_nickname === requester_nickname &&
          tItem.source === requester_platform
        ) {
          ids.add(tItem.id)
        }
      }
    }
    return [...ids]
  }

  const handleBlockTrack = async (): Promise<boolean> => {
    if (!YT_VIDEO_ID_REGEX.test(yt_video_id)) {
      toast.error(t('playlist.report.error.invalidYoutubeId'))
      return false
    }
    if (playlist.track_black_list.includes(yt_video_id)) {
      return true
    }
    await patchNow(playlist.id, {
      track_black_list: [...playlist.track_black_list, yt_video_id],
    })
    return true
  }

  const handleBlockUser = async (): Promise<boolean> => {
    const trigger_type = requester_id ? 'USER_ID' : 'USER_NAME'
    const trigger_value = requester_id ?? requester_nickname

    if (
      isUserBlocked(playlist.block_list, requester_platform, requester_nickname)
    ) {
      return true
    }

    const entry = await blockUser(
      playlist.id,
      trigger_type,
      trigger_value,
      requester_platform,
    )

    if (!entry) {
      toast.error(t('playlist.report.error.blockFailed'))
      return false
    }

    await patchNow(playlist.id, {
      block_list: [...playlist.settings.block_list, entry],
    })
    return true
  }

  const handleSubmit = async () => {
    const trimmedReason = reason.trim()
    if (!trimmedReason && !blockUserToggle && !blockTrackToggle) {
      toast.error(t('playlist.report.error.validation'))
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
          trackIdsToRemove.map((id) => removeTrack(slot, id, 'reported')),
        )
      }

      const reportSent = await submitPlaylistReport({
        playlist_id: playlist.id,
        settings_id: playlist.settings.id,
        yt_video_id,
        track_id: track.id,
        requester_nickname,
        requester_id,
        platform: requester_platform,
        reason: trimmedReason,
        block_user: blockUserToggle,
        block_track: blockTrackToggle,
      })

      const parts: Array<string> = []
      if (blockedUser) parts.push(t('playlist.report.success.userBlocked'))
      if (blockedTrack) parts.push(t('playlist.report.success.trackBlocked'))
      if (trackIdsToRemove.length > 0) {
        parts.push(
          t('playlist.report.success.tracksRemoved', {
            count: trackIdsToRemove.length,
          }),
        )
      }
      if (trimmedReason && reportSent) {
        parts.push(t('playlist.report.success.reportSubmitted'))
      }

      toast.success(
        parts.length > 0
          ? `${parts.join(', ')}.`
          : t('playlist.report.success.recorded'),
      )

      handleOpenChange(false)
    } catch {
      toast.error(t('playlist.report.error.processFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Btn className="px-1 bg-level-2 rounded-sm size-7">
          <TriangleAlert className="size-4" />
        </Btn>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25 bg-level-1 border-level-3 text-text-main overflow-scroll">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t('playlist.report.title')}
          </DialogTitle>
          <DialogDescription>
            {t('playlist.report.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="report-reason">{t('playlist.report.reason')}</Label>
          <Textarea
            id="report-reason"
            placeholder={t('playlist.report.reasonPlaceholder')}
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
            {t('playlist.report.blockUserLabel', {
              nickname: requester_nickname,
              platform: requester_platform,
            })}
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
            {t('playlist.report.blockTrackLabel', { id: yt_video_id })}
          </Label>
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Btn
              className="w-full bg-level-2 sm:w-auto px-2"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting
                ? t('playlist.report.submitting')
                : t('playlist.report.submit')}
            </Btn>
            <Btn
              className="bg-level-2 px-2"
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
            >
              {t('playlist.report.cancel')}
            </Btn>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
