import React, { useEffect } from 'react'
import Priority from './icons/icon-priority'
import DateOutline from './icons/icon-date'
import Arrow from './icons/icon-arrow'
import Shuffle from './icons/icon-shuffle'
import type { ClientPlaylist, SortSettings } from '@/types/playlist'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import useMusicStore from '@/stores/musicStore'
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'

export default function SortPanel({ playlist }: { playlist: ClientPlaylist }) {
  const { sortPlaylist, requestPlSettings } = useMusicStore()
  const playlists = useMusicStore((s) => s.playlists)
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

  // useEffect(() => {
  //   setPlaylist({
  //     ...playlist,
  //     settings: { ...playlist.settings, sort_settings: sortSettings },
  //   })
  // }, [sortSettings])

  return (
    <ToggleGroup
      type="multiple"
      onValueChange={(value) => {
        let newSettings: SortSettings = { ...sortSettings }

        if (value.includes('shuffle')) {
          newSettings = { ...newSettings, shuffle: 'desc' }
        } else if (newSettings.shuffle !== 'none') {
          newSettings = { ...newSettings, shuffle: 'none' }
        }

        if (value.includes('priority')) {
          if (value.includes('dir:priority')) {
            newSettings = { ...newSettings, priority: 'asc' }
          } else {
            newSettings = { ...newSettings, priority: 'desc' }
          }
        } else if (newSettings.priority !== 'none') {
          newSettings = { ...newSettings, priority: 'none' }
        }
        if (value.includes('date')) {
          if (value.includes('dir:date')) {
            newSettings = { ...newSettings, date: 'asc' }
          } else {
            newSettings = { ...newSettings, date: 'desc' }
          }
        } else if (newSettings.date !== 'none') {
          newSettings = { ...newSettings, date: 'none' }
        }
        console.log('new sort settings', newSettings)

        setSortSettings(newSettings)
        setPlaylist({
          ...playlist,
          settings: { ...playlist.settings, sort_settings: newSettings },
        })

        canRequest.current = true
      }}
      defaultValue={[
        sortSettings.shuffle !== 'none' ? 'shuffle' : '',
        sortSettings.priority !== 'none' ? 'priority' : '',
        sortSettings.priority === 'asc' ? 'dir:priority' : '',
        sortSettings.date !== 'none' ? 'date' : '',
        sortSettings.date === 'asc' ? 'dir:date' : '',
      ]}
      className="border-2 border-level-3 rounded-(--rounded-std) p-[1px]"
    >
      <ToggleGroupItem
        value="shuffle"
        className="data-[state=on]:bg-accent-3 hover:bg-level-3"
      >
        <Shuffle className="size-[33px]" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="priority"
        className="data-[state=on]:bg-accent-3 hover:bg-level-3"
      >
        <Priority className="size-[33px]" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dir:priority"
        className="data-[state=on]:bg-level-1 hover:bg-level-3 data-[state=on]:text-white hover:text-white data-[state=on]:rotate-x-180"
      >
        <Arrow className="size-[33px]  " />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="date"
        className="data-[state=on]:bg-accent-3 hover:bg-level-3"
      >
        <DateOutline className="size-[33px]" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dir:date"
        className="data-[state=on]:bg-level-1 hover:bg-level-3 data-[state=on]:text-white hover:text-white data-[state=on]:rotate-x-180"
      >
        <Arrow className="size-[33px]  " />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
