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
import { Bell } from 'lucide-react'
import React from 'react'

const DDNotificationList = () => {
  const [notifications, setNotifications] = React.useState()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer">
        <Bell />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        No notification | NotImplemented
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DDNotificationList
