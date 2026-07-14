import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ReadNotification } from '../../types'

interface VariantProps {
  eventType: string
  data: ReadNotification['data']
}

export const PlaylistVariant: React.FC<VariantProps> = ({
  eventType,
  data,
}) => {
  const { t } = useTranslation()
  const playlistName = data.playlist_name

  switch (eventType) {
    case 'track.added': {
      const count = data.count || 0

      return (
        <div className="text-sm text-text-placeholder leading-normal">
          <span className="font-semibold text-text-main">
            {data.owner_name || t('notifications.events.someone', 'Кто-то')}
          </span>{' '}
          {t(
            'notifications.events.tracks_added_plural',
            'добавил {{count}} треков',
            { count },
          )}
          {t('notifications.events.in_playlist', 'в плейлист')}{' '}
          <span className="font-semibold text-text-main">{playlistName}</span>
        </div>
      )
    }

    case 'track.removed': {
      const count = data.count || 0
      const tracks = (data.tracks || []) as Array<TrackItem>
      const firstTrackName = tracks[0]?.name || ''

      return (
        <div className="text-sm text-text-placeholder leading-normal">
          {count > 1 ? (
            <span>
              {t(
                'notifications.events.tracks_removed_plural',
                'Из плейлиста {{playlistName}} удалено {{count}} треков',
                { playlistName, count },
              )}
            </span>
          ) : (
            <span>
              {t('notifications.events.track_removed_single', 'Трек')}{' '}
              <span className="font-medium text-text-main italic">
                “{firstTrackName}”
              </span>{' '}
              {t(
                'notifications.events.removed_from',
                'был удален из плейлиста',
              )}{' '}
              <span className="font-semibold text-text-main">
                {playlistName}
              </span>
            </span>
          )}
        </div>
      )
    }

    case 'basic.name':
      return (
        <div className="text-sm text-text-placeholder leading-normal">
          {t('notifications.events.name_changed', 'Плейлист переименован')}:{' '}
          <span className="text-text-placeholder line-through">
            {data.old_name}
          </span>
          {' → '}
          <span className="font-semibold text-text-main">{data.new_name}</span>
        </div>
      )

    case 'basic.visibility':
      return (
        <div className="text-sm text-text-placeholder leading-normal">
          {t('notifications.events.visibility_changed', 'Плейлист')}{' '}
          <span className="font-semibold text-text-main">{playlistName}</span>{' '}
          {data.is_public
            ? t('notifications.events.became_public', 'стал публичным')
            : t('notifications.events.became_private', 'стал приватным')}
        </div>
      )

    case 'realtime.sync':
      return (
        <div className="text-sm text-text-placeholder leading-normal">
          {t('notifications.events.sync_status', 'Синхронизация в плейлисте')}{' '}
          <span className="font-semibold text-text-main">{playlistName}</span>{' '}
          {data.is_sync_on ? (
            <span className="text-emerald-400 font-medium">
              {t('notifications.events.sync_on', 'включена')}
            </span>
          ) : (
            <span className="text-rose-400 font-medium">
              {t('notifications.events.sync_off', 'выключена')}
            </span>
          )}
        </div>
      )

    case 'rules.mode':
      return (
        <div className="text-sm text-text-placeholder leading-normal">
          {t('notifications.events.mode_changed', 'Режим очереди изменен на')}{' '}
          <span className="px-1.5 py-0.5 rounded bg-level-2 border border-level-3 font-mono font-bold text-xs text-text-main">
            {data.mode}
          </span>{' '}
          {t('notifications.events.in_playlist', 'в')}{' '}
          <span className="font-semibold text-text-main">{playlistName}</span>
        </div>
      )

    case 'rules.validation':
    case 'rules.priorities':
      return (
        <div className="text-sm text-text-placeholder leading-normal">
          {t(
            'notifications.events.rules_updated',
            'Обновлены лимиты и правила (изменено параметров: {{count}})',
            { count: data.count },
          )}{' '}
          {t('notifications.events.in_playlist', 'в')}{' '}
          <span className="font-semibold text-text-main">{playlistName}</span>
        </div>
      )

    default:
      return (
        <div className="text-sm text-text-placeholder leading-normal">
          {t('notifications.events.playlist_activity', 'Обновление плейлиста')}{' '}
          <span className="font-semibold text-text-main">{playlistName}</span>
        </div>
      )
  }
}
