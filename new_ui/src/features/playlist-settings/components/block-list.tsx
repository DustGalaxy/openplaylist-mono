// src/features/playlist-settings/components/playlist-settings/block-list.tsx
import React from 'react'
import { ExternalLink, Globe, Trash2, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { ReadBlockList } from '@/types/playlist'
import Btn from '@/components/ui/my-btn'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import socialIcons from '@/lib/constants/social_names'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

const UserBlockItem = ({
  item,
  unBlockCallback,
}: {
  item: ReadBlockList
  unBlockCallback: (item: ReadBlockList) => Promise<void>
}) => {
  const { t, tc } = useFeatureTranslation()
  const socialMeta =
    item.platform && item.platform in socialIcons
      ? socialIcons[item.platform as keyof typeof socialIcons]
      : undefined
  const platformName: string =
    item.platform && socialMeta
      ? tc(socialMeta.key)
      : item.platform || tc('common.web')
  const icon =
    platformName === tc('common.web') ? (
      <Globe className="size-3.5" />
    ) : (
      <div className="w-3.5 h-3.5 flex items-center justify-center">
        {socialMeta?.icon}
      </div>
    )
  const triggerTypeLabel =
    item.trigger_type === 'USER_ID'
      ? t('playlistSettings.block.userId', 'User ID')
      : t('playlistSettings.block.userName', 'Username')

  return (
    <div className="border border-level-3/60 rounded-md p-2 sm:p-2.5 bg-level-1 hover:border-level-3/80 transition-all flex items-center justify-between gap-3 shadow-xs">
      <div className="min-w-0 flex items-center gap-2.5 flex-1">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap flex items-center gap-1.5 shrink-0">
          {icon}
          {platformName}
        </span>
        <div className="min-w-0 flex flex-col justify-center leading-tight">
          <p className="text-[10px] text-text-secondary">{triggerTypeLabel}</p>
          <p className="text-xs sm:text-sm text-text-main break-all font-mono font-medium">
            {item.trigger_value}
          </p>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Btn
            onClick={async () => {
              await unBlockCallback(item)
            }}
            type="button"
            aria-label={t('playlistSettings.block.unblockUser', 'Unblock user')}
            className="p-1.5 text-text-placeholder hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-sm h-8 w-8 flex items-center justify-center shrink-0"
          >
            <Trash2 className="size-4" />
          </Btn>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-level-2 text-text-main border-level-3/40 border text-xs"
        >
          <p>{t('playlistSettings.block.unblockUser', 'Unblock user')}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

const TrackBlockItem = ({
  item,
  unBlockCallback,
}: {
  item: string
  unBlockCallback: (item: string) => Promise<void>
}) => {
  const { t } = useFeatureTranslation()
  const ytUrl = `https://www.youtube.com/watch?v=${item}`

  return (
    <div className="border border-level-3/60 rounded-md p-2 sm:p-2.5 bg-level-1 hover:border-level-3/80 transition-all flex items-center justify-between gap-3 shadow-xs">
      <div className="min-w-0 flex items-center gap-2.5 flex-1">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 whitespace-nowrap flex items-center gap-1.5 shrink-0">
          <Video className="size-3.5" />
          {t('platform.youtube', 'YouTube')}
        </span>
        <div className="min-w-0 flex flex-col justify-center leading-tight">
          <p className="text-[10px] text-text-secondary">
            {t('playlistSettings.block.blockedVideoId', 'YouTube Video ID')}
          </p>
          <a
            href={ytUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs sm:text-sm text-text-main underline-offset-2 hover:underline break-all flex items-center gap-1 group font-medium"
            title={t('playlistSettings.block.openOnYoutube', 'Open on YouTube')}
          >
            <span>{item}</span>
            <ExternalLink className="size-3 text-text-placeholder group-hover:text-text-main transition-colors" />
          </a>
        </div>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Btn
            onClick={async () => {
              await unBlockCallback(item)
            }}
            type="button"
            aria-label={t(
              'playlistSettings.block.unblockTrack',
              'Unblock track',
            )}
            className="p-1.5 text-text-placeholder hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-sm h-8 w-8 flex items-center justify-center shrink-0"
          >
            <Trash2 className="size-4" />
          </Btn>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-level-2 text-text-main border-level-3/40 border text-xs"
        >
          <p>{t('playlistSettings.block.unblockTrack', 'Unblock track')}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

export default function BlockList({
  list,
  type,
}: {
  list: Array<ReadBlockList | string>
  type: 'user' | 'track'
}) {
  const { t } = useFeatureTranslation()
  const { playlist } = usePlaylistViewLoaded()
  const { unblockUserRule, patchNow } = usePlaylistStore()

  const handleUnblock = async (item: ReadBlockList | string) => {
    if (type === 'user' && typeof item !== 'string') {
      const success = await unblockUserRule(playlist.id, item.id)
      if (success) toast.success(t('playlistSettings.block.userUnblocked'))
      else toast.error(t('playlistSettings.block.userUnblockFailed'))
      return
    }

    try {
      await patchNow(playlist.id, {
        track_black_list: playlist.track_black_list.filter(
          (track) => track.toString() !== item.toString(),
        ),
      })
      toast.success(t('playlistSettings.block.trackUnblocked'))
    } catch {
      toast.error(t('playlistSettings.block.trackUnblockFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {list.map((item, index) =>
        type === 'user' ? (
          <UserBlockItem
            key={index}
            item={item as ReadBlockList}
            unBlockCallback={handleUnblock}
          />
        ) : (
          <TrackBlockItem
            key={index}
            item={item as string}
            unBlockCallback={handleUnblock}
          />
        ),
      )}
    </div>
  )
}
