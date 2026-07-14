import React from 'react'
import { Bell, Music, Settings2, User } from 'lucide-react'
import { NotificationCard } from './NotificationCard'
import { PlaylistVariant } from './item-variants/PlaylistVariant'
import { UserVariant } from './item-variants/UserVariant'
import type { ReadNotification } from '../types'
import IconTwitch from '@/components/icons/icon-twtich'

interface NotificationItemProps {
  notification: ReadNotification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
}) => {
  const { type, data, is_read, created_at, id } = notification

  // 1. Маппинг метаданных и вариантов компонентов на основе строкового литерала type
  const getVariantConfig = () => {
    // Группа ивентов плейлиста
    if (
      [
        'track.added',
        'track.removed',
        'basic.name',
        'basic.visibility',
        'realtime.sync',
        'rules.mode',
        'rules.validation',
        'rules.priorities',
      ].includes(type)
    ) {
      const isTrack = type.startsWith('track.')
      return {
        icon: isTrack ? (
          <Music className="w-5 h-5 text-emerald-400" />
        ) : (
          <Settings2 className="w-5 h-5 text-indigo-400" />
        ),
        badge:
          data.source === 'twitch' ? (
            <IconTwitch className="w-3 h-3 text-purple-400" />
          ) : null,
        Component: PlaylistVariant,
      }
    }

    // Группа ивентов пользователя
    if (['playlist.create', 'playlist.delete'].includes(type)) {
      return {
        icon: <User className="w-5 h-5 text-sky-400" />,
        badge: null,
        Component: UserVariant,
      }
    }

    // Фоллбек для непредусмотренных типов
    return {
      icon: <Bell className="w-5 h-5 text-amber-400" />,
      badge: null,
      Component: PlaylistVariant, // Используем как дефолтный обработчик текста
    }
  }

  const { icon, badge, Component } = getVariantConfig()

  return (
    <NotificationCard
      isRead={is_read}
      createdAt={created_at}
      icon={icon}
      badge={badge}
      onMarkAsRead={() => onMarkAsRead(id)}
      onDelete={() => onDelete(id)}
    >
      <Component eventType={type} data={data} />
    </NotificationCard>
  )
}
