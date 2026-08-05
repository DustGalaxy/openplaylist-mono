import { innerPanelClass } from '@/features/landing/styles'

export default function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div
      className={`
        ${innerPanelClass} p-3 sm:p-4 flex flex-col gap-2
        transition-colors hover:border-accent/30
      `}
    >
      <div className="flex items-center gap-2 text-text-placeholder">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-level-2/80 text-accent">
          {icon}
        </span>
        <span className="text-[11px] uppercase tracking-wide leading-tight">
          {label}
        </span>
      </div>
      <p className="text-base font-semibold text-text-main pl-9 sm:pl-0 sm:text-center sm:-mt-1">
        {value}
      </p>
    </div>
  )
}
