// src/components/layout/Sidebar.tsx
import { Link, useLocation } from '@tanstack/react-router'
import { AudioLines, House, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import useMusicStore from '@/stores/musicStore'
import { useIsPlaybackActive, usePlaybackStore } from '@/stores/playbackStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import AddPlaylistModal from '@/features/playlist/components/newPlaylistModal'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useUserPlaylistRecordsStore } from '@/stores/userPlaylistInfoStore'
import { useEffect } from 'react'

export default function Sidebar() {
  const { t } = useTranslation()
  const playlists = useUserPlaylistRecordsStore((s) => s.playlists) // ponytail: имя поля гадаю, поправь под реальный shape

  const { isAuthenticated } = useAuthStore()

  return (
    <aside className="w-55 shrink-0 border-r border-level-3/40 bg-level-2 flex flex-col overflow-y-auto">
      <Link to={`/playlists/`} className="flex gap-1 p-3 items-center">
        <House className="text-text-main" />
        <span className="text-xs text-text-secondary uppercase tracking-wide">
          {t('sidebar.Home')}
        </span>
      </Link>

      <div className="flex w-full items-center justify-between px-3 py-3  border-t border-level-3/40 mb-1.5">
        <div title={t('dashboard.tooltip.addPlaylist')} className="w-full">
          <AddPlaylistModal className="w-full" />
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-1">
        {playlists?.map((p) => (
          <SidebarItem key={p.id} id={p.id} name={p.name} />
        ))}
      </nav>
    </aside>
  )
}

function SidebarItem({ id, name }: { id: string; name: string }) {
  const location = useLocation()
  const isPlaying = useIsPlaybackActive(id, 'owner')

  const currentHashId = location.pathname.split('/').pop()
  const isOpen = currentHashId === id

  return (
    <Link
      to={`/playlists/${id}`}
      className={cn(
        'flex items-center gap-2 px-2 py-2 rounded-(--rounded-std) text-sm truncate',
        isOpen
          ? 'bg-level-1 text-text-main'
          : 'text-text-secondary hover:bg-level-1/60',
      )}
    >
      {isPlaying && <AudioLines size={14} className="text-level-3 shrink-0" />}
      <span className="truncate">{name}</span>
    </Link>
  )
}
