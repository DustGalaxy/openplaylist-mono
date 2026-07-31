import { useState } from 'react'
import { MoreVertical } from 'lucide-react'
import type { TrackCardAction } from './types'
import AddToPlaylistSubmenu from './AddToPlaylistSubmenu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import Btn from '@/components/ui/my-btn'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export default function DropDownActions({
  actions,
  track,
}: {
  actions: Array<TrackCardAction>
  track: { yt_video_id: string }
}) {
  const { t } = useFeatureTranslation()
  const [isOpen, setIsOpen] = useState(false)
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Btn
              className="px-1 bg-level-2 rounded-sm size-7"
              isActive={isOpen}
              aria-label={t(
                'playlist.track.actions.moreActions',
                'More actions',
              )}
            >
              <MoreVertical className="size-4" />
            </Btn>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-level-2 text-text-main border-level-3/40 border"
        >
          <p>{t('playlist.track.actions.moreActions', 'More actions')}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="bg-level-2 text-text-main  border-level-3">
        {/* Захардкожено напрямую, не через data-driven actions —
            component-в-actions ломал границу React Refresh и изоляцию хуков */}
        <AddToPlaylistSubmenu track={track} />
        {actions.length > 0 && <DropdownMenuSeparator className="bg-level-3" />}

        {actions.map((a) => {
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
