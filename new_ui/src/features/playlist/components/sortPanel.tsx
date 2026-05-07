import React from 'react'
import Priority from '@/components/icons/icon-priority'
import DateOutline from '@/components/icons/icon-date'
import Arrow from '@/components/icons/icon-arrow'
import Shuffle from '@/components/icons/icon-shuffle'
import type { ClientPlaylist, SortSettings } from '@/types/playlist'
import Btn from '@/components/ui/my-btn'
import useMusicStore from '@/stores/musicStore'
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'
import { cn } from '@/lib/utils'

const activeStateClass = ` 

translate-y-[3px] sm:translate-y-[5px] shadow-[0_0px_0_0_theme(colors.level-3),0_0px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.05)]`
const notActiveStateClass = `


        box-border
                shadow-[0_3px_0_0_theme(colors.level-3),_0_0px_10px_rgba(0,0,0,0.4),_0_2px_4px_rgba(0,0,0,0.3)] 
        sm:shadow-[0_5px_0_0_theme(colors.level-3),_0_0px_15px_rgba(0,0,0,0.55),_0_4px_8px_rgba(0,0,0,0.45)] 
        
        
        hover:shadow-[0_6px_0_0_theme(colors.level-3),0_0px_15px_rgba(255,255,255,0.25),0_4px_8px_rgba(255,255,255,0.15)]
        hover:text-shadow-[0_0_4px_rgba(255,255,255,0.8),_0_0_25px_rgba(255,255,255,0.4)]
        hover:[&_svg]:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]
        disabled:cursor-not-allowed
        disabled:opacity-50
        disabled:shadow-none
        disabled:hover:shadow-none
        disabled:hover:text-shadow-none
        disabled:[&_svg]:drop-shadow-none
        disabled:active:shadow-none
        disabled:active:translate-y-0
        transform translate-y-0


        `
const SortButton = ({
  icon: Icon,
  isActive,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  isActive: boolean
  onClick: () => void
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        `px-5 pt-0.5 pb-[3px]            
        sm:pt-1 sm:pb-[5px] 
        cursor-pointer 
        transition-all 
        duration-100 
        ease-out border-level-2 bg-level-2          
        rounded-[var(--rounded-std)] 
        flex items-center justify-center 
`,
        isActive ? activeStateClass : notActiveStateClass,
      )}
    >
      <Icon className="size-6 sm:size-8" />
    </button>
  )
}

const DirectionButton = ({
  direction,
  isActive,
  onClick,
  disabled = false,
}: {
  direction: 'up' | 'down'
  isActive: boolean
  onClick: () => void
  disabled?: boolean
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        `px-5 pt-0.25 pb-[1px]            
        sm:pt-0.5 sm:pb-[3px] 
        cursor-pointer 
        transition-all 
        duration-100 
        ease-out border-level-2 bg-level-2          
        rounded-[var(--rounded-std)] 
        flex items-center justify-center `,
        isActive ? activeStateClass : notActiveStateClass,
      )}
    >
      <Arrow
        className={cn('size-2 sm:size-3', direction === 'up' && 'rotate-180')}
      />
    </button>
  )
}

export default function SortPanel({ playlist }: { playlist: ClientPlaylist }) {
  const { requestPlSettings } = useMusicStore()
  const setPlaylist = useMusicStore((s) => s.setPlaylist)
  const [sortSettings, setSortSettings] = React.useState<SortSettings>(
    playlist.settings.sort_settings,
  )
  const canRequest = React.useRef(false)

  useDebouncedEffect(
    sortSettings,
    async () => {
      if (!canRequest.current) return
      canRequest.current = false
      await requestPlSettings(playlist.id, { sort_settings: sortSettings })
    },
    2000,
  )

  const updateSettings = (newSettings: SortSettings) => {
    setSortSettings(newSettings)
    setPlaylist({
      ...playlist,
      settings: { ...playlist.settings, sort_settings: newSettings },
    })
    canRequest.current = true
  }

  return (
    <div className="flex gap-2 sm:gap-3 justify-center items-end ">
      {/* Shuffle */}
      <SortButton
        icon={Shuffle}
        isActive={sortSettings.shuffle !== 'none'}
        onClick={() =>
          updateSettings({
            ...sortSettings,
            shuffle: sortSettings.shuffle === 'none' ? 'desc' : 'none',
          })
        }
      />

      {/* Priority */}
      <SortButton
        icon={Priority}
        isActive={sortSettings.priority !== 'none'}
        onClick={() =>
          updateSettings({
            ...sortSettings,
            priority: sortSettings.priority === 'none' ? 'desc' : 'none',
          })
        }
      />

      {/* Priority Direction */}
      <div className="flex flex-col gap-1">
        <DirectionButton
          direction="up"
          isActive={sortSettings.priority === 'asc'}
          disabled={sortSettings.priority === 'none'}
          onClick={() => updateSettings({ ...sortSettings, priority: 'asc' })}
        />
        <DirectionButton
          direction="down"
          isActive={sortSettings.priority === 'desc'}
          disabled={sortSettings.priority === 'none'}
          onClick={() => updateSettings({ ...sortSettings, priority: 'desc' })}
        />
      </div>

      {/* Date */}
      <SortButton
        icon={DateOutline}
        isActive={sortSettings.date !== 'none'}
        onClick={() =>
          updateSettings({
            ...sortSettings,
            date: sortSettings.date === 'none' ? 'desc' : 'none',
          })
        }
      />

      {/* Date Direction */}
      <div className="flex flex-col gap-1">
        <DirectionButton
          direction="up"
          isActive={sortSettings.date === 'asc'}
          disabled={sortSettings.date === 'none'}
          onClick={() => updateSettings({ ...sortSettings, date: 'asc' })}
        />
        <DirectionButton
          direction="down"
          isActive={sortSettings.date === 'desc'}
          disabled={sortSettings.date === 'none'}
          onClick={() => updateSettings({ ...sortSettings, date: 'desc' })}
        />
      </div>
    </div>
  )
}
