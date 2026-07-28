import { useState } from 'react'
import { Ban, Bookmark, BookmarkCheck, Flag, Link, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { usePlaylistView } from '../../context/playlist-view-context'
import type { Track } from '@/types/playlist'
import type { TrackCardAction } from './types'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useSavedStore } from '@/stores/savedStore'

type OpenModal = 'block' | 'report' | null

export function useTrackActions(
  track: Track,
  group: 'vip' | 'regular' | 'background',
) {
  const { t } = useTranslation()
  const { slot, playlistId, role } = usePlaylistView()
  const { startTrack, removeTrack, reorderStepTrack } = usePlaylistStore()
  const {
    isSaved,
    addTrack: addSavedTrack,
    removeTrack: removeSavedTrack,
  } = useSavedStore()
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

  const trackIsSaved = isSaved(track.yt_video_id)
  const toggleSave = () => {
    if (trackIsSaved) {
      removeSavedTrack(track.yt_video_id)
    } else {
      addSavedTrack({
        yt_video_id: track.yt_video_id,
        title: track.title,
        duration: track.duration,
      })
    }
  }

  const canManage = role === 'owner' || role === 'operator'

  const primary: Array<TrackCardAction> = [
    {
      key: 'save',
      icon: trackIsSaved ? BookmarkCheck : Bookmark,
      label: trackIsSaved
        ? t('playlist.track.actions.unsave', 'Remove from saved')
        : t('playlist.track.actions.save', 'Save'),
      onClick: toggleSave,
    },
    // {
    //   key: 'play',
    //   icon: Play,
    //   label: t('playlist.track.actions.play', 'Play'),
    //   onClick: play,
    // },
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
  // addToPlaylist больше не тут — рендерится напрямую в DropDownActions
  // (component-в-actions ломал границу React Refresh / изоляцию хуков)
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
