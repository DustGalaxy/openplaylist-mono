import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ReadNotification } from '../../types'

interface VariantProps {
  eventType: string
  data: ReadNotification['data']
}

export const UserVariant: React.FC<VariantProps> = ({ eventType, data }) => {
  const { t } = useTranslation()

  switch (eventType) {
    case 'playlist.create':
      return (
        <div className="text-sm text-text-placeholder leading-normal">
          {t(
            'notifications.events.playlist_created',
            'Пользователь {{username}} создал новый плейлист',
            {
              username: data.username,
            },
          )}
          :{' '}
          <span className="font-semibold text-text-main">
            {data.playlist_name}
          </span>
        </div>
      )

    case 'playlist.delete':
      return (
        <div className="text-sm text-text-placeholder leading-normal">
          {t(
            'notifications.events.playlist_deleted',
            'Пользователь {{username}} удалил плейлист',
            {
              username: data.username,
            },
          )}
          :{' '}
          <span className="font-semibold text-rose-400 line-through">
            {data.playlist_name}
          </span>
        </div>
      )

    default:
      return (
        <div className="text-sm text-text-placeholder leading-normal">
          {t('notifications.events.user_activity', 'Активность аккаунта')}
        </div>
      )
  }
}
