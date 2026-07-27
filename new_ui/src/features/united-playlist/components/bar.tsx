import { useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
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
import { cn } from '@/lib/utils'
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

  const priorityInpuRef = useRef<HTMLInputElement>(null)

  const { addTrack } = usePlaylistStore()
  const { role } = usePlaylistView()
  const switchMode = (next: InputMode) => {
    setMode(next)
    setValue('')
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
        priority: `custom-${customPriority}`,
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
            h-11 w-full border-2 border-level-3/70 rounded-(--rounded-std) bg-level-1
            pr-4 pl-10 text-text-main placeholder:text-text-placeholder
            focus-visible:border-level-3 focus-visible:ring-level-3/30 placeholder:text-xs sm:placeholder:text-sm
          "
        />
      </div>

      {mode === 'add' && (
        <div className="flex gap-2 ">
          {role !== 'viewer' && (
            <div className="flex rounded-(--rounded-std) items-center gap-0 overflow-hidden text-text-main">
              <Input
                type="number"
                ref={priorityInpuRef}
                value={customPriority}
                // dir="rtl"
                className="border-0 bg-level-2 w-14 focus-visible:ring-0 rounded-r-none [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                onChange={handleCustomPriority}
              />
              <UpDownBtn inputRef={priorityInpuRef} />
            </div>
          )}

          <Btn
            disabled={!value.trim()}
            type="submit"
            className="h-11 shrink-0 px-2 sm:px-4 bg-level-2 text-xs sm:text-sm font-semibold text-text-main "
          >
            {t('playlist.queue.submit')}
          </Btn>
        </div>
      )}
    </form>
  )
}
