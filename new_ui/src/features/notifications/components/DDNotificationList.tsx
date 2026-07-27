import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCheck, Eye, EyeOff, Settings2 } from 'lucide-react'
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

  const { t } = useTranslation('notifications')
  const { t: tc } = useTranslation()

  const { data: notificationsCount, isLoading } = useQuery({
    queryKey: ['notificationsCount'],
    queryFn: unReadCount,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchInterval: 60 * 10 * 1000, // 10 minutes
  })

  const [hideRead, setHideRead] = React.useState(false)

  if (isLoading) {
    return <div>{tc('common.loading', 'Loading notifications...')}</div>
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const handleMarkAsRead = async (notification_id: string) => {
    await markAsRead(notification_id)
  }

  const handleOpen = async () => {
    const data = await fetchFeed()
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
          <button
            className={buttonStyle}
            onClick={() => setHideRead(!hideRead)}
          >
            {hideRead ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
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
            if (hideRead && notification.is_read) {
              return null
            }
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
