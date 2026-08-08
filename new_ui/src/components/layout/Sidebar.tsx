// src/components/layout/Sidebar.tsx
import { Link, useLocation } from '@tanstack/react-router'
import {
  AudioLines,
  ChartColumnIncreasing,
  FolderBookmark,
  Heart,
  House,
  ListMusic,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useIsPlaybackActive } from '@/stores/playbackStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import AddPlaylistModal from '@/features/united-playlist/components/newPlaylistModal'
import { useUserPlaylistRecordsStore } from '@/stores/userPlaylistInfoStore'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useMobileSidebarStore } from '@/stores/mobileSidebarStore'

export default function Sidebar() {
  const { t } = useTranslation()
  const playlists = useUserPlaylistRecordsStore((s) => s.playlists) || []
  const favorites = useUserPlaylistRecordsStore((s) => s.favorites) || []
  const { isAuthenticated } = useAuthStore()
  const open = useMobileSidebarStore((s) => s.open)
  const setOpen = useMobileSidebarStore((s) => s.setOpen)
  const location = useLocation()

  // Deduplicate playlists so owned playlists already in favorites do not repeat
  const favoritedIds = new Set(favorites.map((f) => f.id))
  const ownedNonFavorites = playlists.filter((p) => !favoritedIds.has(p.id))

  const navContent = (
    <>
      <Link
        to="/playlists"
        className={`flex gap-3 ${location.pathname === '/playlists' && 'bg-level-1'} m-1 p-2 items-center hover:bg-level-1 rounded-sm`}
      >
        <House className="text-text-main" />
        <span className="text-sm text-text-secondary uppercase tracking-wide ">
          {t('sidebar.Home', 'Home')}
        </span>
      </Link>
      <Link
        to="/saves"
        className={`flex gap-3 ${location.pathname === '/saves' && 'bg-level-1'} m-1 p-2 items-center  hover:bg-level-1 rounded-sm`}
      >
        <FolderBookmark className="text-text-main" />
        <span className="text-sm text-text-secondary uppercase tracking-wide">
          {t('sidebar.Saves', 'Saves')}
        </span>
      </Link>
      <Link
        to={`/statistic`}
        className={`flex gap-3 ${location.pathname === '/statistic' && 'bg-level-1'} m-1 p-2 items-center hover:bg-level-1 rounded-sm`}
      >
        <ChartColumnIncreasing className="text-text-main" />
        <span className="text-sm text-text-secondary uppercase tracking-wide">
          {t('sidebar.Statistics', 'Statistics')}
        </span>
      </Link>

      {isAuthenticated && (
        <div className="flex w-full items-center justify-between px-3 py-3 mb-1.5">
          <div title={t('dashboard.tooltip.addPlaylist')} className="w-full">
            <AddPlaylistModal className="w-full" />
          </div>
        </div>
      )}

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="mt-2 mb-1 px-2">
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-text-secondary uppercase tracking-wider">
            <Heart className="size-3.5 text-red-500 fill-red-500/20" />
            <span>{t('sidebar.Favorites', 'Любимые плейлисты')}</span>
          </div>
          <nav className="flex flex-col gap-0.5 mt-1">
            {favorites.map((p) => (
              <SidebarItem key={p.id} id={p.id} name={p.name} isFavorite />
            ))}
          </nav>
        </div>
      )}

      {/* My Playlists Section */}
      {ownedNonFavorites.length > 0 && (
        <div className="mt-2 mb-1 px-2">
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-text-secondary uppercase tracking-wider">
            <ListMusic className="size-3.5 text-accent" />
            <span>{t('sidebar.MyPlaylists', 'Мои плейлисты')}</span>
          </div>
          <nav className="flex flex-col gap-0.5 mt-1">
            {ownedNonFavorites.map((p) => (
              <SidebarItem key={p.id} id={p.id} name={p.name} />
            ))}
          </nav>
        </div>
      )}
    </>
  )

  return (
    <div>
      <div className="sm:hidden">
        <Drawer direction="left" open={open} onOpenChange={setOpen}>
          <DrawerContent className="bg-level-2 text-text-main border-accent">
            <div
              className=" text-text-secondary px-3 py-2 cursor-pointer"
              onClick={() => setOpen(!open)}
            >
              <X />
            </div>

            <div className="flex-1 overflow-y-auto">{navContent}</div>
          </DrawerContent>
        </Drawer>
      </div>

      <aside className="hidden sm:flex w-55 h-full shrink-0 border-r border-accent/40 bg-level-2 flex-col overflow-y-auto">
        {navContent}
      </aside>
    </div>
  )
}

function SidebarItem({
  id,
  name,
  isFavorite = false,
}: {
  id: string
  name: string
  isFavorite?: boolean
}) {
  const location = useLocation()
  const isPlaying = useIsPlaybackActive(id, 'owner')

  const currentHashId = location.pathname.split('/').pop()
  const isOpen = currentHashId === id

  return (
    <Link
      to="/playlists/$playlistId"
      params={{ playlistId: id }}
      className={cn(
        'flex items-center gap-2 px-2 py-2 rounded-(--rounded-std) text-sm truncate group',
        isOpen
          ? 'bg-level-1 text-text-main'
          : 'text-text-secondary hover:bg-level-1/60',
      )}
    >
      {isPlaying ? (
        <AudioLines size={14} className="text-accent shrink-0" />
      ) : null}
      <span className="truncate">{name}</span>
    </Link>
  )
}
