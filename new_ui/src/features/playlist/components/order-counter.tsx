import { cn } from '@/lib/utils'
import { List } from 'lucide-react'
import { useTranslation } from 'react-i18next'


export default function Counter({ number, className }: { number: number, className?: string }) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(`w-max bg-level-2 mt-1 flex items-center gap-2 rounded-(--rounded-std) px-2`, className)}
    >
      <List className="size-3.5" />
      <span className=" text-base text-text-secondary mb-0.5 tabular-nums">
        {t('playlist.trackCount', { count: number })}
      </span>
    </div>
  )
}
