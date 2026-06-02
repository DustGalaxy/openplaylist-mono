import { useTranslation } from 'react-i18next'
import Trash from '@/components/icons/icon-trash'
import Btn from '@/components/ui/my-btn'
import type { ClientPlaylist } from '@/types/playlist'
import { useMusicStore } from '@/stores/musicStore'
import type { ReadBlockList } from '@/types/playlist'

import socialIcons from '@/lib/constants/social_names'
import { unBlockUser } from '@/api/api-playlist'
import { toast } from 'sonner'

const BLOCK_ITEM_ROW =
  'flex items-center gap-2 justify-between border-1 rounded-(--rounded-std) border-level-3 bg-level-1/40 px-2 h-14 min-h-14'
const BLOCK_ITEM_BADGE =
  'text-xs px-2 h-7 rounded-(--rounded-std) whitespace-nowrap flex items-center gap-1 shrink-0'
const BLOCK_ITEM_CONTENT = 'min-w-0 flex flex-col justify-center leading-tight'
const BLOCK_ITEM_UNBLOCK_BTN = 'px-2 bg-level-2 min-w-[44px] shrink-0 self-center'

const UserBlockItem = ({
  item,
  unBlockCallback,
}: {
  item: ReadBlockList
  unBlockCallback: (item: ReadBlockList) => Promise<void>
}) => {
  const { t } = useTranslation()
  const socialMeta =
    item.platform && item.platform in socialIcons
      ? socialIcons[item.platform as keyof typeof socialIcons]
      : undefined
  const platformName: string =
    item.platform && socialMeta
      ? t(socialMeta.key)
      : item.platform || t('common.web')
  const icon =
    platformName === t('common.web') ? (
      <div>🌐</div>
    ) : (
      <div className="ml-1 w-5 h-5">{socialMeta?.icon}</div>
    )

  const triggerTypeLabel =
    item.trigger_type === 'USER_ID'
      ? t('playlistSettings.block.userId')
      : t('playlistSettings.block.userName')

  return (
    <div className={BLOCK_ITEM_ROW}>
      <div className="min-w-0 flex items-center gap-2">
        <span className={`${BLOCK_ITEM_BADGE} bg-blue-500/20 text-blue-300`}>
          {icon}
          {platformName}
        </span>

        <div className={BLOCK_ITEM_CONTENT}>
          <p className="text-xs text-text-secondary">{triggerTypeLabel}</p>
          <p className="text-sm text-text-main break-all font-mono">
            {item.trigger_value}
          </p>
        </div>
      </div>

      <Btn
        onClick={async () => {
          await unBlockCallback(item)
        }}
        className={BLOCK_ITEM_UNBLOCK_BTN}
        text={<Trash width={20} height={20} />}
        props={{
          title: t('playlistSettings.block.unblockUser'),
          'aria-label': t('playlistSettings.block.unblockUserAria', {
            type: triggerTypeLabel,
            value: item.trigger_value,
          }),
        }}
      />
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
  const { t } = useTranslation()
  const ytUrl = `https://www.youtube.com/watch?v=${item}`

  return (
    <div className={BLOCK_ITEM_ROW}>
      <div className="min-w-0 flex items-center gap-2">
        <span className={`${BLOCK_ITEM_BADGE} bg-red-500/20 text-red-300`}>
          {t('platform.youtube')}
        </span>
        <div className={BLOCK_ITEM_CONTENT}>
          <p className="text-xs text-text-secondary">
            {t('playlistSettings.block.blockedVideoId')}
          </p>
          <a
            href={ytUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-text-main underline-offset-2 hover:underline break-all"
            title={t('playlistSettings.block.openOnYoutube')}
          >
            {item}
          </a>
        </div>
      </div>
      <Btn
        onClick={async () => {
          await unBlockCallback(item)
        }}
        className={BLOCK_ITEM_UNBLOCK_BTN}
        text={<Trash width={20} height={20} />}
        props={{
          title: t('playlistSettings.block.unblockTrack'),
          'aria-label': t('playlistSettings.block.unblockTrackAria', { id: item }),
        }}
      />
    </div>
  )
}

export default function BlockList({
  list,
  type,
  playlist,
}: {
  list: Array<ReadBlockList | string>
  type: 'user' | 'track'
  playlist: ClientPlaylist
}) {
  const { t } = useTranslation()
  const { requestPlSettings, syncPlSettings } = useMusicStore()

  const handleUnblock = async (item: ReadBlockList | string) => {
    if (type === 'user' && typeof item !== 'string') {
      const success = await unBlockUser(playlist.id, item.id)
      if (success) {
        const settings = playlist.settings
        settings.block_list = settings.block_list.filter(
          (block) => block.id.toString() !== item.id.toString(),
        )
        syncPlSettings(playlist.id, settings)
        toast.success(t('playlistSettings.block.userUnblocked'))
      } else {
        toast.error(t('playlistSettings.block.userUnblockFailed'))
      }
    } else {
      await requestPlSettings(playlist.id, {
        track_black_list: playlist.settings.track_black_list.filter(
          (track) => track.toString() !== item.toString(),
        ),
      })
      toast.success(t('playlistSettings.block.trackUnblocked'))
    }
  }

  return (
    <div className="flex flex-col gap-2 ">
      {list.map((item, index) => {
        return type === 'user' ? (
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
        )
      })}
    </div>
  )
}
