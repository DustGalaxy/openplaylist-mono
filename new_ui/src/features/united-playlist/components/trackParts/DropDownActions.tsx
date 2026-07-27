import { MoreVertical } from 'lucide-react'
import type { TrackCardAction } from './types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Btn from '@/components/ui/my-btn'
import { useState } from 'react'

export default function DropDownActions({
  actions,
}: {
  actions: Array<TrackCardAction>
}) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Btn className="px-1 bg-level-2 rounded-sm size-7" isActive={isOpen}>
          <MoreVertical className="size-4" />
        </Btn>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-level-2 text-text-main">
        {actions.map((a) => {
          if (a.component) return <div key={a.key}>{a.component()}</div>
          const Icon = a.icon
          return (
            <DropdownMenuItem
              key={a.key}
              onClick={a.onClick}
              disabled={a.disabled}
              className="focus:bg-level-1"
            >
              {Icon && <Icon className="size-4 mr-2" />}
              {a.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
