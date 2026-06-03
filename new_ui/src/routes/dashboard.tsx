/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { createFileRoute, redirect } from '@tanstack/react-router'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ListMusic } from 'lucide-react'
import type { ClientPlaylist } from '@/types/playlist'

import { HorizontalScrollStrip } from '@/components/ui/horizontal-scroll-strip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Playlist from '@/features/playlist/components/Playlist'
import { useAuthStore } from '@/stores/authStore'
import { usePlstUpdates } from '@/hooks/usePlstUpdates'
import { getPlsUpdsSocket } from '@/api/io-sockets'
import {
  addTrackToPlaylist,
  fetchUserPlaylistData,
  postPlayNow,
  removeTrackFromPlaylist,
} from '@/api/api-playlist'
import { useMusicStore } from '@/stores/musicStore'
import AddPlaylistModal from '@/features/playlist/components/newPlaylistModal'
import { useTranslation } from 'react-i18next'
import {
  filterTabBaseClass,
  filterTabInactiveClass,
  gradientTextClass,
  pageInnerClass,
  pageWrapClass,
  panelClass,
} from '@/features/landing/styles'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/dashboard')({
  component: RouteComponent,
  loader: () => {
    const user = useAuthStore.getState().user
    if (!user) {
      return redirect({ to: '/login' })
    }
  },
})

function RouteComponent() {
  const { t } = useTranslation()
  const user = useAuthStore.getState().user
  if (!user) {
    return redirect({ to: '/login' })
  }

  usePlstUpdates('connect', () => {})
  usePlstUpdates('disconnect', () => {})

  const { data: playlistsData, isLoading } = useQuery({
    queryKey: ['playlistsData'],
    queryFn: fetchUserPlaylistData,
  })
  const [plsts, setPlsts] = useState<Array<ClientPlaylist>>([])

  useEffect(() => {
    if (playlistsData && !isLoading) {
      useMusicStore.getState().setPlaylistsFromServer(playlistsData)
      useMusicStore.getState().setApi({
        addTrack: addTrackToPlaylist,
        removeTrack: removeTrackFromPlaylist,
        playNow: postPlayNow,
      })

      const plst_upds_socket = getPlsUpdsSocket()
      useMusicStore.getState().setSocket(plst_upds_socket)

      setPlsts(useMusicStore.getState().playlists)

      const unsub = useMusicStore.subscribe(({ playlists }) => {
        setPlsts(playlists)
        console.debug('sub:plsts state upd:', playlists)
      })
      return () => {
        console.debug('unsub:plsts state upd')
        unsub()
      }
    }
  }, [isLoading, playlistsData])

  const sortedPlsts = [...plsts].sort((a, b) =>
    a.created_at > b.created_at ? 1 : -1,
  )

  return (
    <div className={pageWrapClass}>
      <div className={pageInnerClass}>
        <header className="mb-6 sm:mb-8">
          <p className={`text-sm font-medium mb-2 ${gradientTextClass}`}>
            {t('dashboard.eyebrow')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
            {t('dashboard.title')}
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mt-1">
            {t('dashboard.subtitle')}
          </p>
        </header>

        <Tabs className="w-full">
          <TabsList className="w-full flex flex-nowrap items-center justify-start gap-2 overflow-hidden bg-transparent p-0 h-auto">
            <div className="shrink-0">
              <AddPlaylistModal />
            </div>
            <HorizontalScrollStrip>
              {sortedPlsts.length > 0 ? (
                sortedPlsts.map((plst) => (
                  <TabsTrigger
                    key={plst.id}
                    value={plst.id}
                    className={cn(
                      filterTabBaseClass,
                      filterTabInactiveClass,
                      'shrink-0 flex-none min-w-[4rem] font-medium',
                      'data-[state=active]:!border-level-3/60 data-[state=active]:!bg-level-1 data-[state=active]:!text-text-main data-[state=active]:!shadow-[0_0_12px_rgba(245,106,25,0.15)]',
                    )}
                  >
                    {plst.name}
                  </TabsTrigger>
                ))
              ) : (
                <div
                  className={`flex flex-col sm:flex-row items-center gap-3 py-6 px-4 w-full border-dashed ${panelClass}`}
                >
                  <ListMusic className="h-8 w-8 text-text-placeholder shrink-0" />
                  <div className="text-center sm:text-left">
                    <p className="text-text-main font-medium">
                      {t('dashboard.empty.title')}
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      {t('dashboard.empty.hint')}
                    </p>
                  </div>
                </div>
              )}
            </HorizontalScrollStrip>
          </TabsList>

          {sortedPlsts.map((plst) => (
            <TabsContent key={plst.id} value={plst.id} className="mt-4">
              <Playlist playlist={plst} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
