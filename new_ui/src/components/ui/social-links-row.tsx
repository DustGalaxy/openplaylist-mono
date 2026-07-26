// src/components/ui/social-links-row.tsx
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import socialIcons, { SocialLinkHint } from '@/lib/constants/social_names'
import { cn } from '@/lib/utils'

interface SocialLinksRowProps {
  socialLinks: Record<string, string> | null | undefined
  className?: string
}

export function SocialLinksRow({
  socialLinks,
  className,
}: SocialLinksRowProps) {
  if (!socialLinks) return null

  // порядок фиксирован реестром socialIcons, а не порядком ключей в объекте с бэка
  const keys = (
    Object.keys(socialIcons) as Array<keyof typeof socialIcons>
  ).filter((key) => socialLinks[key])
  if (keys.length === 0) return null

  return (
    <div
      className={cn('flex items-center gap-1.5 text-text-secondary', className)}
    >
      {keys.map((key) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <a
              href={socialLinks[key]}
              target="_blank"
              rel="noreferrer noopener"
              className="p-1.5 hover:text-text-main rounded-md hover:bg-level-2 transition-colors"
            >
              <div className="w-4 h-4">{socialIcons[key].icon}</div>
            </a>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-level-2 text-text-main">
            <SocialLinkHint socialKey={key} />
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
