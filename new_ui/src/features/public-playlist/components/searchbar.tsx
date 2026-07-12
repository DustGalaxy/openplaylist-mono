import { useTranslation } from 'react-i18next'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export default function SearchBar({
  value,
  setValue,
  action,
  isLoading,
  placeholder,
}: {
  value: string
  setValue: (value: string) => void
  action: () => void
  isLoading: boolean
  placeholder?: string
}) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
        <Input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') action()
          }}
          placeholder={placeholder ?? t('publicSearch.searchPlaceholder')}
          className="pl-10 h-11 border-2 border-level-3/70 rounded-(--rounded-std) bg-level-1 text-text-main"
        />
      </div>
      <Btn
        onClick={action}
        disabled={isLoading}
        className="h-11 px-5 bg-level-2 text-text-main font-semibold shrink-0"
      >
        {isLoading ? '…' : t('publicSearch.submit')}
      </Btn>
    </div>
  )
}
