import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import useMusicStore from '@/stores/musicStore'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
} from '@/features/landing/styles'
import { cn } from '@/lib/utils'

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
        'px-2.5 shrink-0',
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
  onSearchQueryChange: (query: string) => void
}) {
  const { t } = useTranslation()
  const playlist = usePlaylist()
  const [mode, setMode] = useState<InputMode>('add')
  const [value, setValue] = useState('')
  const { requestAddTrack } = useMusicStore()

  const switchMode = (next: InputMode) => {
    setMode(next)
    setValue('')
    if (next === 'search') {
      onSearchQueryChange('')
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    setValue(next)
    if (mode === 'search') {
      onSearchQueryChange(next)
    }
  }

  const submitAdd = async () => {
    if (mode !== 'add' || !value.trim()) return
    const loadingToast = toast.loading(t('common.toast.loading'))
    try {
      const result = await requestAddTrack(playlist.id, value.trim())

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
      className="flex w-full min-w-0 items-center gap-2"
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
        <Btn
          text={t('playlist.queue.submit')}
          disabled={!value.trim()}
          type="submit"
          className="h-11 shrink-0 px-4 bg-level-2 text-sm font-semibold text-text-main"
        />
      )}
    </form>
  )
}
