import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCheck, Settings2 } from 'lucide-react'
import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  fetchFeed,
  markAllAsRead,
  markAsRead,
  unReadCount,
} from '../api/notificattions'
import { NotificationItem } from './NotificattionItem'
import type { ReadNotification } from '../types'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const buttonStyle =
  'px-1 py-1 bg-level-2 rounded-md hover:bg-level-1 cursor-pointer active:bg-level-2'

const DDNotificationList = () => {
  const [notifications, setNotifications] = React.useState<Array<any>>([])
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { data: notificationsCount, isLoading } = useQuery({
    queryKey: ['notificationsCount'],
    queryFn: unReadCount,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchInterval: 60 * 10 * 1000, // 10 minutes
  })

  if (isLoading) {
    return <div>{t('common.loading', 'Loading notifications...')}</div>
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleMarkAsRead = async (notification_id: string) => {
    await markAsRead(notification_id)
  }

  const handleOpen = async () => {
    const data = await fetchFeed()
    const MOCK_NOTIFICATIONS: Array<ReadNotification> = [
      // track.added (Одиночный)
      {
        id: '11111111-1111-1111-1111-111111111111',
        type: 'track.added',
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        data: {
          playlist_name: 'Chill Stream',
          owner_name: 'Midnull',
          count: 1,
          tracks: [
            { name: 'Lo-Fi Beats for Coding', url: 'https://youtube.com/...' },
          ],
        },
      },
      // track.added (Пачка треков)
      {
        id: '22222222-2222-2222-2222-222222222222',
        type: 'track.added',
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        data: {
          playlist_name: 'Rock Party',
          owner_name: 'StrimerBratan',
          count: 5,
          tracks: [
            { name: 'Track 1', url: '...' },
            { name: 'Track 2', url: '...' },
          ],
        },
      },
      // basic.name
      {
        id: '33333333-3333-3333-3333-333333333333',
        type: 'basic.name',
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        data: {
          playlist_name: 'New Cool Name',
          owner_name: 'Midnull',
          old_name: 'Old Boring Name',
          new_name: 'New Cool Name',
        },
      },
      // realtime.sync
      {
        id: '44444444-4444-4444-4444-444444444444',
        type: 'realtime.sync',
        is_read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        data: {
          playlist_name: 'Main Queue',
          owner_name: 'Midnull',
          is_sync_on: false,
        },
      },
      // playlist.create
      {
        id: '55555555-5555-5555-5555-555555555555',
        type: 'playlist.create',
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        data: {
          username: 'Midnull',
          playlist_name: 'Synthwave Nights',
        },
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        type: 'playlist.create',
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        data: {
          username: 'Midnull',
          playlist_name: 'Synthwave Nights',
        },
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        type: 'playlist.create',
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        data: {
          username: 'Midnull',
          playlist_name: 'Synthwave Nights',
        },
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        type: 'playlist.create',
        is_read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        data: {
          username: 'Midnull',
          playlist_name: 'Synthwave Nights',
        },
      },
    ]
    setNotifications(data)
  }

  return (
    <DropdownMenu
      onOpenChange={(isOpen) => {
        if (isOpen) {
          handleOpen()
        }
      }}
    >
      <DropdownMenuTrigger className="cursor-pointer relative">
        {notificationsCount >= 1 && (
          <div className="absolute -top-1 -right-1 text-text-main text-[11px] text-center px-0.5 rounded-full bg-red-400 z-10">
            {notificationsCount}
          </div>
        )}
        <Bell />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-90 max-h-120 border-level-3 bg-level-2 rounded-md border text-text-main shadow-md p-0 z-99 overflow-y-scroll"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="flex justify-between ">
          <button className={buttonStyle} onClick={handleMarkAllAsRead}>
            <CheckCheck className="size-5" />
          </button>

          <div className="w-full place-content-center text-center text-md text-text-main font-semibold">
            {t('notifications.feed.title', 'Notifications')}
          </div>
          <button
            className={buttonStyle}
            onClick={() =>
              navigate({ to: '/settings', hash: 'tab-subscriptions' })
            }
          >
            <Settings2 className="size-5" />
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-level-3 m-0 p-0" />
        {notifications.length > 0 ? (
          notifications.map((notification: ReadNotification) => {
            return (
              <NotificationItem
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={() => console.log('')}
              />
            )
          })
        ) : (
          <DropdownMenuLabel className="text-text-placeholder text-center">
            {t('notifications.feed.empty', 'No notifications yet')}
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DDNotificationList
