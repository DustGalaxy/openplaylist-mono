import { Link } from '@tanstack/react-router'
import History from '@/components/icons/icon-history'
import Logout from '@/components/icons/icon-logout'
import Menu from '@/components/icons/icon-menu'
import Settings from '@/components/icons/icon-settings'
import Statistic from '@/components/icons/icon-statistic'
import { type UserProfile } from '@/types/user'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function MenuDropdown(user: UserProfile) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-lg">
            {user ? user.username : ''}
          </div>

          <div className=" rounded-full w-[33px] bg-level-3">
            <img src={user ? user.avatar_url : ''} className=" rounded-full" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-level-2 border-level-3 text-text-main scale-125">
        <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-level-3" />
        <DropdownMenuItem disabled>
          <Link to="/statistic" className="flex gap-2 items-center">
            <Statistic strokeWidth={3.5} /> Statistic
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Link to="/history" className="flex gap-2 items-center">
            <History strokeWidth={3.5} /> History
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Link to="/settings" className="flex gap-2 items-center">
            <Settings strokeWidth={3.5} /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-level-3" />
        <DropdownMenuItem variant="destructive">
          <Link to="/logout" className="flex gap-2 items-center">
            <Logout strokeWidth={3.5} />
            Logout
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
