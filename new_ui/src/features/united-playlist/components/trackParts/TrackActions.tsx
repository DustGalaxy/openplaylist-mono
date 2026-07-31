import DropDownActions from './DropDownActions'
import type { TrackCardAction } from './types'
import Btn from '@/components/ui/my-btn'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export default function TrackActions({
  primary,
  secondary,
  track,
}: {
  primary: Array<TrackCardAction>
  secondary: Array<TrackCardAction>
  track: { yt_video_id: string }
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {primary.map((a) => {
        const Icon = a.icon!
        return (
          <Tooltip key={a.key}>
            <TooltipTrigger asChild>
              <Btn
                onClick={a.onClick}
                disabled={a.disabled}
                aria-label={a.label}
                className="px-1 bg-level-2 rounded-sm size-7"
              >
                <Icon className="size-4" />
              </Btn>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-level-2 text-text-main border-level-3/40 border"
            >
              <p>{a.label}</p>
            </TooltipContent>
          </Tooltip>
        )
      })}
      <DropDownActions actions={secondary} track={track} />
    </div>
  )
}
