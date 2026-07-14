export type TargetType = 'playlist' | 'user'

export type PlaylistEventType =
  | 'track.added'
  | 'track.removed'
  | 'basic.name'
  | 'basic.visibility'
  | 'realtime.sync'
// | 'rules.mode'
// | 'rules.validation'
// | 'rules.priorities'

export type UserEventType = 'playlist.create' | 'playlist.delete'

export interface ReadNotification {
  id: string
  type: PlaylistEventType | UserEventType
  is_read: boolean
  created_at: string
  data: Record<string, any> // Будет типизировано внутри вариантов
}

export type AnyNotificationEventType = PlaylistEventType | UserEventType

export interface SubscriptionSettings {
  allowed_event_types: Array<AnyNotificationEventType>
}

export interface SubscriptionPatchPayload {
  target_type: TargetType
  settings: SubscriptionSettings
}

export interface SubscriptionItem {
  id: string
  target_id: string
  target_type: TargetType
  settings: SubscriptionSettings
  created_at: string
  // Дополнительные поля от бэкенда (JOIN-ы) для отображения инфы в UI
  target_name: string
  target_owner?: string // для плейлистов
  target_avatar?: string // обложка или аватар юзера
}

export interface SwitchConfig {
  id: AnyNotificationEventType
  label: string
  description: string
}
export enum NotificationType {
  SYSTEM = 'SYSTEM',
  PLAYLIST = 'PLAYLIST',
  USER = 'USER',
}

export interface ReadNotification {
  id: string
  type: NotificationType
  data: Record<string, any> // Безопаснее dynamic dict
  is_read: boolean
  created_at: string
}

export const NOTIFICATION_EVENTS_MAP: Record<
  TargetType,
  Array<SwitchConfig>
> = {
  playlist: [
    {
      id: 'track.added',
      label: 'Добавление треков',
      description: 'Когда в плейлист добавляются новые композиции',
    },
    {
      id: 'track.removed',
      label: 'Удаление треков',
      description: 'Когда треки убираются из плейлиста',
    },
    {
      id: 'basic.name',
      label: 'Переименование',
      description: 'Изменение названия или обложки плейлиста',
    },
    {
      id: 'basic.visibility',
      label: 'Приватность',
      description: 'Смена статуса приватности (публичный/приватный)',
    },
    {
      id: 'realtime.sync',
      label: 'Синхронизация',
      description: 'Включение/выключение живой синхронизации',
    },
    // {
    //   id: 'rules.mode',
    //   label: 'Режим фильтрации',
    //   description: 'Изменение глобального режима фильтрации треков',
    // },
    // {
    //   id: 'rules.validation',
    //   label: 'Правила валидации',
    //   description: 'Обновление правил проверки треков',
    // },
    // {
    //   id: 'rules.priorities',
    //   label: 'Приоритеты сортировки',
    //   description: 'Изменение приоритетов триггеров сортировки',
    // },
  ],
  user: [
    {
      id: 'playlist.create',
      label: 'Создание плейлистов',
      description: 'Когда пользователь создает новый публичный плейлист',
    },
    {
      id: 'playlist.delete',
      label: 'Удаление плейлистов',
      description: 'Когда пользователь удаляет свои плейлисты',
    },
  ],
}
