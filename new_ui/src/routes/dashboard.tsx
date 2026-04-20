/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { createFileRoute, redirect } from '@tanstack/react-router'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ClientPlaylist, Track } from '@/types/playlist'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Playlist from '@/components/Playlist'
import { useAuthStore } from '@/stores/authStore'
import { usePlstUpdates } from '@/hooks/usePlstUpdates'
import { getPlsUpdsSocket } from '@/api/io-sockets'
import {
  addTrackToPlaylist,
  createNewPlaylist,
  fetchUserPlaylistData,
  postPlayNow,
  removeTrackFromPlaylist,
} from '@/api/api-playlist'
import { useMusicStore } from '@/stores/musicStore'
import Btn from '@/components/ui/my-btn'
import Add from '@/components/icons/icon-add'
import AddPlaylistModal from '@/components/newPlaylistModal'

export const Route = createFileRoute('/dashboard')({
  component: RouteComponent,
  loader: ({ context }) => {
    const user = useAuthStore.getState().user
    if (!user) {
      return redirect({ to: '/' })
    }

    //   const queryClient = context.queryClient

    //   // Предварительная загрузка данных с помощью prefetchQuery
    //   // staleTime: Infinity - данные никогда не устаревают
    //   console.log(queryClient.getQueryData(['playlistsData']))

    //   if (!queryClient.getQueryData(['playlistsData'])) {
    //     console.log('prefetchQuery')

    //     queryClient.prefetchQuery({
    //       queryKey: ['playlistsData'],
    //       queryFn: fetchUserPlaylistData,
    //       staleTime: Infinity,
    //     })
    //   }
    //   console.log(queryClient.getQueryData(['playlistsData']))
    //   // Возвращаем данные из кэша
    //   return queryClient.getQueryData(['playlistsData'])
    // },
  },
})

function RouteComponent() {
  usePlstUpdates('connect', () => {
    console.log('connect')
  })
  usePlstUpdates('disconnect', () => {
    console.log('disconnect')
  })

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
  }, [isLoading])

  return (
    <div className="bg-level-1 min-h-[90vh] mb-14 h-full text-text-main w-full">
      {/* <div className="relative flex  overflow-hidden border-2 border-dashed border-level-3 rounded-(--rounded-std) mx-4 my-2">
        <p className=" inline-block whitespace-pre animate-marquee ">{text2}</p>
      </div> */}

      <div className="px-4">
        <Tabs className="w-full ">
          <div
            className="w-full text-center text-text-main  rounded-[var(--rounded-std)] 
           gap-1 group  transition-all
          "
          >
            <TabsList className="w-full flex items-center justify-start bg-transparent">
              {/* generate tabs from account playlists */}

              <div className=" flex md:col-span-4 font-bold text-2xl select-none ">
                <AddPlaylistModal />
                {/* <div
                  className="flex w-fit  py-1 px-4 text-transparent  relative drop-shadow-2xl
                  bg-gradient-to-r from-[var(--color-accent-2)] via-[var(--color-accent-3)] to-[var(--color-accent-1)]  
                  bg-clip-text bg-[length:200%_auto]  leading-normal animate-bg-move transition-all "
                  >
                  Playlists
                </div> */}
              </div>
              <span className="text-3xl pb-1 text-muted">{'{'}</span>
              <div className="flex overflow-x-auto w-full mx-1">
                {plsts?.length > 0 ? (
                  plsts
                    .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
                    .map(
                      (plst) =>
                        plst && (
                          <div className="flex pr-1 py-1 items-center text-2xl group">
                            <TabsTrigger
                              key={plst.id}
                              value={plst.id}
                              className="max-w-fit pb-1 pt-0 data-[state=active]:bg-level-3"
                            >
                              {plst.name}
                            </TabsTrigger>
                          </div>
                        ),
                    )
                ) : (
                  <div> ⬅️ Press + to create you first playlist </div>
                )}
              </div>

              <span className="text-3xl pb-1 text-muted">{'}'}</span>
            </TabsList>
          </div>
          {plsts &&
            plsts.map((plst) => (
              <TabsContent key={plst.id} value={plst.id}>
                <Playlist playlist={plst} />
              </TabsContent>
            ))}
        </Tabs>
      </div>
    </div>
  )
}
