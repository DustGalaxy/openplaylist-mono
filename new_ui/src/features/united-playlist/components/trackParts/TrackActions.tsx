import DropDownActions from './DropDownActions'
import type { TrackCardAction } from './types'
import Btn from '@/components/ui/my-btn'

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
          <Btn
            key={a.key}
            onClick={a.onClick}
            disabled={a.disabled}
            className="px-1 bg-level-2 rounded-sm size-7"
          >
            <Icon className="size-4" />
          </Btn>
        )
      })}
      <DropDownActions actions={secondary} track={track} />
    </div>
  )
}
