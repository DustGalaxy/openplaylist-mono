import {
  ArrowUpRight,
  Clock,
  Eye,
  List,
  RefreshCcw,
  Settings,
  ThumbsUp,
  User,
} from 'lucide-react'
import InfoCard from './info-card'
import useTranslation from 'i18next'
import { cn } from '@/lib/utils'

interface ContentSettings {
  mode: string

  min_views: number
  min_likes: number
  max_duration: number

  track_cooldown: number
  user_cooldown: number

  max_playlist_size: number
  priorityMode: string

  className?: string
}

export const InfoCardGroup = ({
  mode,
  min_views,
  min_likes,
  max_duration,
  track_cooldown,
  user_cooldown,
  max_playlist_size,
  priorityMode,
  className,
}: ContentSettings) => {
  const { t } = useTranslation
  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3',
        className,
      )}
    >
      <InfoCard
        icon={<Settings size={14} />}
        label={t('playlist.stats.mode')}
        value={mode}
      />
      <InfoCard
        icon={<Eye size={14} />}
        label={t('playlist.stats.minViews')}
        value={min_views}
      />
      <InfoCard
        icon={<ThumbsUp size={14} />}
        label={t('playlist.stats.minLikes')}
        value={min_likes}
      />
      <InfoCard
        icon={<Clock size={14} />}
        label={t('playlist.stats.maxDuration')}
        value={t('playlist.stats.durationSec', {
          count: max_duration,
        })}
      />
      <InfoCard
        icon={<RefreshCcw size={14} />}
        label={t('playlist.stats.trackCd')}
        value={t('playlist.stats.cooldownMin', {
          count: track_cooldown,
        })}
      />
      <InfoCard
        icon={<User size={14} />}
        label={t('playlist.stats.userCd')}
        value={t('playlist.stats.cooldownMin', {
          count: user_cooldown,
        })}
      />
      <InfoCard
        icon={<List size={14} />}
        label={t('playlist.stats.maxSize')}
        value={max_playlist_size || t('playlist.stats.maxSizeUnlimited')}
      />
      <InfoCard
        icon={<ArrowUpRight size={14} />}
        label={t('playlist.stats.priorityMode')}
        value={priorityMode}
      />
    </div>
  )
}
