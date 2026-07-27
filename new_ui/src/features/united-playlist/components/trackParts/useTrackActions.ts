import { useState } from 'react'
import { Ban, Flag, Link, Play, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { usePlaylistView } from '../../context/playlist-view-context'
import type { Track } from '@/types/playlist'
import type { TrackCardAction } from './types'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useTranslation } from 'react-i18next'

type OpenModal = 'block' | 'report' | null

export function useTrackActions(
  track: Track,
  group: 'vip' | 'regular' | 'background',
) {
  const { t } = useTranslation()
  const { slot, playlistId, role } = usePlaylistView()
  const { startTrack, removeTrack, reorderStepTrack } = usePlaylistStore()
  const [openModal, setOpenModal] = useState<OpenModal>(null)
  const closeModal = () => setOpenModal(null)

  const play = () => {
    if (playlistId) startTrack(playlistId, track.id)
  }
  const copyLink = () => {
    navigator.clipboard.writeText(
      `https://www.youtube.com/watch?v=${track.yt_video_id}`,
    )
    toast.success('Link copied')
  }
  const remove = () => removeTrack(slot, track.id, 'removed')

  const canManage = role === 'owner' || role === 'operator'

  const primary: Array<TrackCardAction> = [
    {
      key: 'play',
      icon: Play,
      label: t('playlist.track.actions.play', 'Play'),
      onClick: play,
    },
    {
      key: 'copyLink',
      icon: Link,
      label: t('playlist.track.actions.copyLink', 'Copy link'),
      onClick: copyLink,
    },
    ...(canManage
      ? [
          {
            key: 'remove',
            icon: Trash,
            label: t('playlist.track.actions.remove', 'Remove'),
            onClick: remove,
          },
        ]
      : []),
  ]
  const secondary: Array<TrackCardAction> = [
    ...(canManage
      ? [
          {
            key: 'block',
            icon: Ban,
            label: t(
              'playlist.track.actions.blockRequester',
              'Block requester',
            ),
            onClick: () => setOpenModal('block'),
          },
        ]
      : []),
    {
      key: 'report',
      icon: Flag,
      label: t('playlist.track.actions.report', 'Report'),
      onClick: () => setOpenModal('report'),
    },
  ]

  return { primary, secondary, play, openModal, closeModal }
}
