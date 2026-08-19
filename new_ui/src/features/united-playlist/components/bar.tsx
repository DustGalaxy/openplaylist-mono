import { useRef, useState } from 'react'
import { Info, ListMusic, Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { usePlaylistView } from '../context/playlist-view-context'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
} from '@/features/landing/styles'
import { cn, parseYouTubeUrl } from '@/lib/utils'
import { usePlaylistStore } from '@/stores/playlistStore'
import UpDownBtn from '@/components/ui/funny-btn'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

type InputMode = 'add' | 'search'

function ModeButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        filterTabBaseClass,
        'px-1 sm:px-2.5 shrink-0',
        active ? filterTabActiveClass : filterTabInactiveClass,
      )}
    >
      {children}
    </button>
  )
}

export function PlaylistQueueInput({
  onSearchQueryChange,
}: {
  onSearchQueryChange?: (query?: string) => void
}) {
  const { t } = useFeatureTranslation()

  const [mode, setMode] = useState<InputMode>('add')
  const [value, setValue] = useState('')
  const [customPriority, setCustomPriority] = useState(0)
  const [startFromTarget, setStartFromTarget] = useState(false)

  const priorityInpuRef = useRef<HTMLInputElement>(null)

  const { addTrack } = usePlaylistStore()
  const { role } = usePlaylistView()

  const parsedYt = mode === 'add' ? parseYouTubeUrl(value) : null

  const switchMode = (next: InputMode) => {
    setMode(next)
    setValue('')
    setStartFromTarget(false)
    if (next === 'search' && onSearchQueryChange) {
      onSearchQueryChange('')
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setValue(next)
    if (mode === 'search' && onSearchQueryChange) {
      onSearchQueryChange(next)
    }
  }

  const handleCustomPriority = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setCustomPriority(next)
  }

  const submitAdd = async () => {
    if (mode !== 'add' || !value.trim()) return
    const loadingToast = toast.loading(t('common.toast.loading'))
    try {
      const result = await addTrack('page', {
        yt_video_url: value.trim(),
        priority: customPriority > 0 ? `custom-${customPriority}` : '',
        start_from_target: startFromTarget,
      })

      toast.dismiss(loadingToast)

      if (result?.success || result === undefined) {
        toast.success(t('playlist.toast.requestAdded'))
      } else {
        toast.error(result?.message || t('playlist.toast.requestAddedFailed'))
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(t('playlist.toast.requestAddedFailed'))
    }
    setValue('')
    setStartFromTarget(false)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void submitAdd()
  }

  const InputIcon = mode === 'add' ? Plus : Search
  const placeholder =
    mode === 'add'
      ? t('playlist.queue.placeholder.add')
      : t('playlist.queue.placeholder.searchRequester')

  return (
    <div className="flex w-full flex-col gap-2">
      <form
        className="flex w-full min-w-0 items-center gap-1 sm:gap-2"
        onSubmit={handleSubmit}
      >
        <div className="flex shrink-0 gap-1">
          <ModeButton
            active={mode === 'add'}
            onClick={() => switchMode('add')}
            label={t('playlist.queue.mode.add')}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </ModeButton>
          <ModeButton
            active={mode === 'search'}
            onClick={() => switchMode('search')}
            label={t('playlist.queue.mode.search')}
          >
            <Search className="h-4 w-4" aria-hidden />
          </ModeButton>
        </div>

        <div className="relative min-w-0 flex-1">
          <InputIcon
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-placeholder"
            aria-hidden
          />
          <Input
            type={mode === 'search' ? 'search' : 'text'}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className="
              h-11 w-full border-2 border-accent/70 rounded-(--rounded-std) bg-level-1
              pr-4 pl-10 text-text-main placeholder:text-text-placeholder
              focus-visible:border-accent focus-visible:ring-accent/30 placeholder:text-xs sm:placeholder:text-sm
            "
          />
        </div>

        {mode === 'add' && (
          <div className="flex gap-2">
            {role !== 'viewer' && (
              <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden text-text-main">
                <Input
                  type="number"
                  ref={priorityInpuRef}
                  value={customPriority}
                  // dir="rtl"
                  className="border-0 bg-level-2 w-14 h-9 focus-visible:ring-0 rounded-r-none [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                  onChange={handleCustomPriority}
                />
                <UpDownBtn inputRef={priorityInpuRef} />
              </div>
            )}

            <Btn
              disabled={!value.trim()}
              type="submit"
              className="h-11 shrink-0 px-2 sm:px-4 bg-level-2 text-xs sm:text-sm font-semibold text-text-main"
            >
              {t('playlist.queue.submit')}
            </Btn>
          </div>
        )}
      </form>

      {parsedYt?.isPlaylist && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-(--rounded-std) border border-accent/40 bg-level-2/80 p-2.5 text-xs text-text-main transition-all duration-200 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <ListMusic className="h-4 w-4 text-accent shrink-0" />
            <span className="font-medium">
              YouTube Playlist detected{' '}
              <span className="text-text-muted font-normal">
                (Max 50 tracks limit per playlist)
              </span>
            </span>
          </div>

          {role !== 'viewer' ? (
            parsedYt.hasTargetVideo && (
              <label className="flex items-center gap-2 cursor-pointer select-none rounded bg-level-1 px-2 py-1 font-medium hover:bg-level-1/80 border border-accent/20">
                <input
                  type="checkbox"
                  checked={startFromTarget}
                  onChange={(e) => setStartFromTarget(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-accent/50 text-accent focus:ring-accent/40"
                />
                <span>Start from target track</span>
              </label>
            )
          ) : (
            <div className="flex items-center gap-1 text-text-muted">
              <Info className="h-3.5 w-3.5" />
              <span>Viewer playlist orders import single target track</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
