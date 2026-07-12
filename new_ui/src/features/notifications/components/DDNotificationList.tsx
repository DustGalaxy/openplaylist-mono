import { useQuery } from '@tanstack/react-query'
import { Bell, CheckCheck, Settings2 } from 'lucide-react'
import React from 'react'
import {
  fetchFeed,
  markAllAsRead,
  markAsRead,
  unReadCount,
} from '../api/notificattions'
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
  'px-1 py-1 bg-level-1 rounded-md hover:bg-level-2 cursor-pointer active:bg-level-1'

const DDNotificationList = () => {
  const [notifications, setNotifications] = React.useState<Array<any>>([])

  const { data: notificationsCount, isLoading } = useQuery({
    queryKey: ['notificationsCount'],
    queryFn: unReadCount,
    refetchOnWindowFocus: true,
    refetchOnMount: false,
    refetchInterval: 60 * 10 * 1000, // 10 minutes
  })

  if (isLoading) {
    return <div>Loading...</div>
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
        className="w-70 border-level-3 bg-level-1 rounded-md border shadow-md z-99"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="flex justify-between ">
          <button className={buttonStyle} onClick={handleMarkAllAsRead}>
            <CheckCheck className="size-5" />
          </button>

          <div className="w-full place-content-center text-center text-md font-semibold">
            Notifications
          </div>
          <button
            className={buttonStyle}
            onClick={() => console.log('Settings')}
          >
            <Settings2 className="size-5" />
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-level-3" />
        {notifications.length > 0 ? (
          notifications.map((notification: any) => {
            return (
              <DropdownMenuItem key={notification.id}>
                {notification.type}
                {notification.data}
              </DropdownMenuItem>
            )
          })
        ) : (
          <DropdownMenuLabel className="text-text-placeholder text-center">
            No notifications
          </DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DDNotificationList
