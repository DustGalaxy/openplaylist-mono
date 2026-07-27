import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ListPlus } from 'lucide-react'

import { v4 as uuidv4 } from 'uuid'
import { useNavigate } from '@tanstack/react-router'
import type { Track } from '@/types/playlist'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  addTrackToPlaylist,
  fetchUserPlaylistPreviews,
} from '@/api/api-playlist'
import { useAuthStore } from '@/stores/authStore'
import Btn from '@/components/ui/my-btn'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

// ─── MenuDropdown ─────────────────────────────────────────────────────────────

export default function DDPlaylistPicker({ track }: { track: Track }) {
  const { t } = useFeatureTranslation()
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [playlists, setPlaylists] =
    useState<Array<{ id: string; name: string }>>()
  const [selected, setSelected] = useState<Array<string>>([])

  const navigate = useNavigate()

  const loadPlaylists = async () => {
    const plsts = await fetchUserPlaylistPreviews()
    if (plsts) setPlaylists(plsts)
  }

  useEffect(() => {
    if (user) loadPlaylists()
  }, [])

  useEffect(() => {
    setSelected([])
  }, [isOpen])

  const addTrackToPlaylists = async () => {
    if (!user) return
    selected.map(async (id) => {
      const order = {
        request_id: uuidv4(),
        owner_id: user.id,
        owner_platform_id: user.id,
        requester_id: user.id,
        requester_nickname: user.username,
        playlist_id: id,
        yt_video_url: 'https://www.youtube.com/watch?v=' + track.yt_video_id,
        priority: 'playlist_owner',
        source: 'web',
      }
      await addTrackToPlaylist(order)
    })
  }

  return (
    <DropdownMenu
      onOpenChange={(state) => {
        setIsOpen(state)
      }}
    >
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2">
          <div className=" px-1 text-lg font-medium text-text-main bg-level-2">
            <Btn isActive={isOpen} className="px-1">
              <ListPlus />
            </Btn>
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="bottom"
        sideOffset={5}
        className="bg-level-2 border-level-3 text-text-main max-h-50"
      >
        <DropdownMenuLabel>{t('view.track.dd.label')}</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-level-3" />
        <DropdownMenuGroup>
          {playlists ? (
            playlists.map((playlist) => {
              return (
                <DropdownMenuCheckboxItem
                  key={'DropdownMenuCheckboxItem' + playlist.id}
                  onSelect={(e) => e.preventDefault()}
                  checked={selected.includes(playlist.id) ?? false}
                  onCheckedChange={(check) => {
                    if (check) setSelected([...selected, playlist.id])
                    else
                      setSelected([
                        ...selected.filter((id) => id !== playlist.id),
                      ])
                  }}
                >
                  {playlist.name}
                </DropdownMenuCheckboxItem>
              )
            })
          ) : (
            <DropdownMenuLabel>
              {t('view.track.dd.noplaylists')}
            </DropdownMenuLabel>
          )}
        </DropdownMenuGroup>
        {user ? (
          <DropdownMenuItem
            disabled={selected.length === 0}
            onSelect={addTrackToPlaylists}
          >
            {t('view.track.dd.add')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => navigate({ to: '/login' })}>
            {t('nav.login')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
