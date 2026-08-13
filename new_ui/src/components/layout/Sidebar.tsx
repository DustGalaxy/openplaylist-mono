// src/components/layout/Sidebar.tsx
import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  AudioLines,
  ChartColumnIncreasing,
  ChevronDown,
  ChevronUp,
  FolderBookmark,
  Heart,
  House,
  ListMusic,
  Shield,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useIsPlaybackActive } from '@/stores/playbackStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import AddPlaylistModal from '@/features/united-playlist/components/newPlaylistModal'
import {
  useUserPlaylistRecordsStore,
  type PlaylistBaseInfo,
} from '@/stores/userPlaylistInfoStore'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useMobileSidebarStore } from '@/stores/mobileSidebarStore'

export default function Sidebar() {
  const { t } = useTranslation()
  const playlists = useUserPlaylistRecordsStore((s) => s.playlists) || []
  const favorites = useUserPlaylistRecordsStore((s) => s.favorites) || []
  const moderated = useUserPlaylistRecordsStore((s) => s.moderated) || []
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
        <CollapsibleSection
          title={t('sidebar.Favorites', 'Любимые плейлисты')}
          icon={<Heart className="size-3.5 text-red-500 fill-red-500/20" />}
          items={favorites}
          renderItem={(p) => (
            <SidebarItem key={p.id} id={p.id} name={p.name} isFavorite />
          )}
        />
      )}

      {/* My Playlists Section */}
      {ownedNonFavorites.length > 0 && (
        <CollapsibleSection
          title={t('sidebar.MyPlaylists', 'Мои плейлисты')}
          icon={<ListMusic className="size-3.5 text-accent" />}
          items={ownedNonFavorites}
          renderItem={(p) => <SidebarItem key={p.id} id={p.id} name={p.name} />}
        />
      )}

      {/* Moderated Playlists Section */}
      {moderated.length > 0 && (
        <CollapsibleSection
          title={t('sidebar.ModeratedPlaylists', 'Модерируемые')}
          icon={<Shield className="size-3.5 text-blue-400" />}
          items={moderated}
          renderItem={(m) => <SidebarItem key={m.id} id={m.id} name={m.name} />}
        />
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

function CollapsibleSection<T extends { id: string }>({
  title,
  icon,
  items,
  renderItem,
  initialCount = 5,
}: {
  title: string
  icon: React.ReactNode
  items: T[]
  renderItem: (item: T) => React.ReactNode
  initialCount?: number
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const visibleItems = expanded ? items : items.slice(0, initialCount)
  const hasMore = items.length > initialCount

  return (
    <div className="mt-2 mb-1 px-2">
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-text-secondary uppercase tracking-wider">
        {icon}
        <span>{title}</span>
      </div>
      <nav className="flex flex-col gap-0.5 mt-1">
        {visibleItems.map(renderItem)}
      </nav>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-text-secondary hover:text-text-main transition-colors mt-0.5"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3" />
              <span>{t('sidebar.collapse', 'Свернуть')}</span>
            </>
          ) : (
            <>
              <ChevronDown className="size-3" />
              <span>
                {t('sidebar.showMore', 'Ещё ({{count}})', {
                  count: items.length - initialCount,
                })}
              </span>
            </>
          )}
        </button>
      )}
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
