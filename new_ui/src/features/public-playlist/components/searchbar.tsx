import { Search } from 'lucide-react'

import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'

export default function SearchBar({
  value,
  setValue,
  action,
  placeholder = 'Поиск…',
  isLoading = false,
}: {
  value: string
  setValue: (value: string) => void
  action: () => void
  placeholder?: string
  isLoading?: boolean
}) {
  const submit = () => {
    if (!value.trim() || isLoading) return
    action()
  }

  return (
    <form
      className="flex w-full gap-2 sm:gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-placeholder"
          aria-hidden
        />
        <Input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="
            h-12 w-full pl-10 pr-4 border-2 border-level-3/70 rounded-(--rounded-std)
            bg-level-1 text-text-main placeholder:text-text-placeholder
            focus-visible:border-level-3 focus-visible:ring-level-3/30
          "
        />
      </div>
      <Btn
        type="submit"
        text={isLoading ? '…' : 'Найти'}
        disabled={isLoading || !value.trim()}
        className="h-12 min-w-[88px] sm:min-w-[110px] px-4 bg-level-1 text-text-main font-semibold shrink-0"
        onClick={submit}
      />
    </form>
  )
}
