import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { ClientPlaylist, InputPlaylist, Track } from '@/types/playlist'
import ViewInfoBar from '@/components/ViewInfoBar'
import { fetchPlaylistPublic } from '@/api/api-playlist'

import ViewTrackCard from '@/components/view-track-card'
import SearchPlaylist from '@/components/search-playlist'
import { getPlsUpdsSocket } from '@/api/io-sockets'

export const Route = createFileRoute('/view')({
  component: RouteComponent,
  loader: async (ctx) => {
    const searchParams = new URLSearchParams(ctx.location.search)
    console.log('Search Params:', searchParams.toString())
    const plst_id = searchParams.get('p')
    if (plst_id) {
      console.log('Playlist ID:', plst_id)

      const plst: InputPlaylist | null = await fetchPlaylistPublic(plst_id)

      if (!plst) {
        return { playlist: null }
      }
      const playlist: ClientPlaylist = {
        ...plst,
        isSub: false,
        history: [],
      } as ClientPlaylist

      if (plst.now_playing) {
        playlist.now_playing = plst.track_data.find(
          (t) => t.id === plst.now_playing,
        )
      } else if (!plst.now_playing) {
        plst.now_playing = undefined
      }

      return { playlist }
    }
    return { playlist: null }
  },
})

function RouteComponent() {
  const { playlist } = Route.useLoaderData()
  const [playlistState, setPlaylistState] = useState<ClientPlaylist | null>(
    playlist,
  )

  useEffect(() => {
    const plst_upds_socket = getPlsUpdsSocket()
    const handleConnect = () => {
      if (playlist?.id) {
        console.log('Восстановление подписки для комнаты:', playlist.id)
        plst_upds_socket.emit('subscribe', { playlist_id: playlist.id })
      }
    }

    plst_upds_socket.on('connect', handleConnect)

    // Если сокет уже подключен в момент монтирования, вызываем вручную
    if (plst_upds_socket.connected) {
      handleConnect()
    }

    return () => {
      plst_upds_socket.off('connect', handleConnect)
    }
  }, [playlist?.id])

  useEffect(() => {
    if (!playlist) return
    const plst_upds_socket = getPlsUpdsSocket()

    plst_upds_socket.on('add_track:' + playlist.id, (payload: any) => {
      setPlaylistState((prevState) => {
        if (!prevState) return prevState
        const parsed =
          payload && typeof payload === 'string' ? JSON.parse(payload) : payload
        if (!parsed) return prevState
        console.log('add track', parsed)
        return {
          ...prevState,
          track_data: [...prevState.track_data, parsed],
        } as ClientPlaylist
      })
    })

    plst_upds_socket.on('playnow:' + playlist.id, (payload: any) => {
      setPlaylistState((prevState) => {
        console.log('play now', payload)
        if (!prevState) return prevState
        const parsed =
          payload && typeof payload === 'string' ? JSON.parse(payload) : payload
        if (!parsed) return prevState
        const tr: Track | null =
          prevState.track_data.find((t) => t.id === parsed.track_id) || null

        return {
          ...prevState,
          now_playing: tr,
        } as ClientPlaylist
      })
    })

    plst_upds_socket.on(
      'delete_track:' + playlist.id,
      (payload: { track_id: string }) => {
        setPlaylistState((prevState) => {
          if (!prevState) return prevState
          return {
            ...prevState,
            track_data: prevState.track_data.filter(
              (t) => t.id !== payload.track_id,
            ),
          } as ClientPlaylist
        })
      },
    )

    plst_upds_socket.on('settings_changed:' + playlist.id, (payload: any) => {
      setPlaylistState((prevState) => {
        console.log('settings changed', payload)
        if (!prevState) return prevState
        const parsed =
          payload && typeof payload === 'string' ? JSON.parse(payload) : payload
        if (!parsed) return prevState
        return {
          ...prevState,
          settings: parsed,
        }
      })
    })

    plst_upds_socket.on('kicked_from_playlist', () => {
      window.location.href = '/view'
    })

    return () => {
      plst_upds_socket.emit('unsubscribe', { playlist_id: playlist.id })
      plst_upds_socket.off('add_track:' + playlist.id)
      plst_upds_socket.off('playnow:' + playlist.id)
      plst_upds_socket.off('delete_track:' + playlist.id)
      plst_upds_socket.off('settings_changed:' + playlist.id)
      plst_upds_socket.off('kicked_from_playlist')
    }
  }, [])

  if (!playlist || playlistState === null) {
    return (
      <div className="px-6 pt-6">
        <SearchPlaylist />
        <div className="text-text-main justify-self-center mt-10 ">
          Start searching for a playlist
        </div>
      </div>
    )
  }

  return (
    <div className="text-text-main px-6 pt-6 w-full gap-y-6 flex flex-col">
      <SearchPlaylist />
      <ViewInfoBar playlist={playlistState} />
      {/* Track list header */}
      <div className="border-t border-gray-700 pt-4 w-full">
        <h3 className="text-sm uppercase tracking-wide text-gray-400">
          Track list
        </h3>
        {playlistState.track_data.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">
            No tracks in this playlist.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-4 items-center">
            {playlistState.track_data.map((track) => (
              <ViewTrackCard track={track} playlist={playlistState} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
