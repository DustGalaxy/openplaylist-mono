import { useTranslation } from 'react-i18next'
import List from '@/components/icons/icon-list'

export default function Counter({ number }: { number: number }) {
  const { t } = useTranslation()

  return (
    <div
      className="
    w-max bg-level-2 
    mt-1 flex items-center gap-2 
    rounded-[var(--rounded-std)] 
    px-2 
    "
    >
      <List className="size-3.5" />
      <span className=" text-base text-text-secondary mb-0.5 tabular-nums">
        {t('playlist.trackCount', { count: number })}
      </span>
    </div>
  )
}
