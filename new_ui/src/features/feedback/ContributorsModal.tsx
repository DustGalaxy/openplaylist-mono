import { useTranslation } from 'react-i18next'
import {} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Github } from '@thesvg/react'

// ponytail: реальный список пока не собран, заполнить по мере появления контрибьюторов
const CONTRIBUTORS = [
  {
    name: 'DustGalaxy',
    roleKey: 'contributorsModal.roleFounder',
    roleFallback: 'Main Dev | 🍵 Tea Annihilator',
    url: 'https://github.com/DustGalaxy',
  },
] as const

type ContributorsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ContributorsModal({
  open,
  onOpenChange,
}: ContributorsModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-level-2 text-text-main border-2 border-accent sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('contributorsModal.title', 'Contributors')}
          </DialogTitle>
        </DialogHeader>

        <ul className="flex flex-col gap-2 py-2">
          {CONTRIBUTORS.map((c) => (
            <li
              key={c.name}
              className="flex items-center gap-3 rounded-(--rounded-std) bg-level-1 px-3 py-2.5"
            >
              <span
                className="
                  flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                  bg-linear-to-r from-(--color-accent-2) via-(--color-accent-3) to-(--color-accent-1)
                  text-sm font-semibold text-white
                "
                aria-hidden
              >
                {c.name.charAt(0).toUpperCase()}
              </span>

              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-text-main truncate">
                  {c.name}
                </span>
                <span className="text-xs text-text-secondary truncate">
                  {t(c.roleKey, c.roleFallback)}
                </span>
              </div>

              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto shrink-0 text-text-secondary hover:text-text-main transition-colors"
                title={c.name}
              >
                <Github className="size-5" color="#00aa00" fill="#00aa00" />
              </a>
            </li>
          ))}
        </ul>

        <p className="text-xs text-text-secondary">
          {t(
            'contributorsModal.wantToHelp',
            'Want to help? Reach out through the feedback form.',
          )}
        </p>
      </DialogContent>
    </Dialog>
  )
}
