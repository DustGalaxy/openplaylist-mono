import { useState } from 'react'
import { ListPlus } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { v4 as uuidv4 } from 'uuid'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import {
  addTrackToPlaylist,
  fetchUserPlaylistPreviews,
} from '@/api/api-playlist'
import { useAuthStore } from '@/stores/authStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export default function AddToPlaylistSubmenu({
  track,
}: {
  track: { yt_video_id: string }
}) {
  const { t } = useFeatureTranslation()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [playlists, setPlaylists] =
    useState<Array<{ id: string; name: string }>>()
  const [selected, setSelected] = useState<Array<string>>([])

  const loadPlaylists = async () => {
    const plsts = await fetchUserPlaylistPreviews()
    if (plsts) setPlaylists(plsts)
  }

  // Ленивая загрузка при первом открытии саб-меню, сброс выбора при закрытии
  const handleOpenChange = (open: boolean) => {
    if (open && user && !playlists) loadPlaylists()
    if (!open) setSelected([])
  }

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
    <DropdownMenuSub onOpenChange={handleOpenChange}>
      <DropdownMenuSubTrigger className="focus:bg-level-1 data-[state=open]:bg-level-1">
        <ListPlus className="size-4 mr-2" />
        {t('playlist.track.actions.addToPlaylist', 'Add to playlist')}
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent className="bg-level-2 border-level-3 text-text-main max-h-50 overflow-y-auto">
          <DropdownMenuGroup>
            {playlists ? (
              playlists.length > 0 ? (
                playlists.map((playlist) => (
                  <DropdownMenuCheckboxItem
                    key={playlist.id}
                    onSelect={(e) => e.preventDefault()}
                    checked={selected.includes(playlist.id)}
                    onCheckedChange={(check) => {
                      setSelected((prev) =>
                        check
                          ? [...prev, playlist.id]
                          : prev.filter((id) => id !== playlist.id),
                      )
                    }}
                    className="focus:bg-level-1"
                  >
                    {playlist.name}
                  </DropdownMenuCheckboxItem>
                ))
              ) : (
                <DropdownMenuLabel>
                  {t('view.track.dd.noplaylists')}
                </DropdownMenuLabel>
              )
            ) : user ? (
              <DropdownMenuLabel>
                {t('common.loading', 'Loading...')}
              </DropdownMenuLabel>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-level-3" />
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
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
