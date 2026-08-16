import React from 'react'
import { Info, Lock, Globe } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'
import type { Track } from '@/types/playlist'
import { cn } from '@/lib/utils'

interface NotePopoverProps {
  track: Track
  isOwner?: boolean
  className?: string
}

export default function NotePopover({
  track,
  isOwner = false,
  className,
}: NotePopoverProps) {
  const { t } = useFeatureTranslation()
  const [open, setOpen] = React.useState(false)

  if (!track.note || !track.note.trim()) {
    return null
  }

  const isPublic = track.is_note_public !== false

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'inline-flex items-center justify-center size-6 rounded-md bg-level-1/60 hover:bg-level-1 border border-accent/20 text-accent transition-colors cursor-pointer shadow-xs focus:outline-hidden',
                open && 'ring-1 ring-accent bg-level-1',
                className,
              )}
              aria-label={t('playlist.track.note.title', 'Order Note')}
            >
              <Info className="size-3.5" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!open && (
          <TooltipContent
            side="top"
            className="bg-level-2 text-text-main border-accent/40 border text-xs"
          >
            <p>{t('playlist.track.note.viewTooltip', 'View note')}</p>
          </TooltipContent>
        )}
      </Tooltip>

      <PopoverContent
        side="top"
        align="center"
        onClick={(e) => e.stopPropagation()}
        className="w-72 bg-level-2 border border-accent/40 text-text-main rounded-lg p-3 shadow-xl backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-accent/15 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-accent">
            <Info className="size-3.5 shrink-0" />
            <span>{t('playlist.track.note.title', 'Order note')}</span>
          </div>
          {isOwner && (
            <div
              className={cn(
                'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                isPublic
                  ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
              )}
            >
              {isPublic ? (
                <>
                  <Globe className="size-2.5" />
                  <span>{t('playlist.track.note.publicBadge', 'Public')}</span>
                </>
              ) : (
                <>
                  <Lock className="size-2.5" />
                  <span>{t('playlist.track.note.privateBadge', 'Private')}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-text-main/90 whitespace-pre-wrap break-words leading-relaxed max-h-48 overflow-y-auto">
          {track.note}
        </div>
      </PopoverContent>
    </Popover>
  )
}
