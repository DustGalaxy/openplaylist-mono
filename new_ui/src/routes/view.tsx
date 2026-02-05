import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { ClientPlaylist, Track } from '@/types/playlist'
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

      const plst: ClientPlaylist | null = await fetchPlaylistPublic(plst_id)
      if (!plst) {
        return { plst: null }
      }

      if (plst.now_playing) {
        plst.now_playing = plst.track_data.find(
          (t) => t.id === plst.now_playing,
        )
        if (!plst.now_playing) {
          plst.now_playing = undefined
        }
      }

      return { plst }
    }
    return { plst: null }
  },
})

function RouteComponent() {
  const { plst } = Route.useLoaderData()
  const [playlistState, setPlaylistState] = useState<ClientPlaylist | null>(
    plst,
  )

  useEffect(() => {
    const plst_upds_socket = getPlsUpdsSocket()
    const handleConnect = () => {
      if (plst?.id) {
        console.log('Восстановление подписки для комнаты:', plst.id)
        plst_upds_socket.emit('subscribe', { playlist_id: plst.id })
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
  }, [plst?.id])

  useEffect(() => {
    if (!plst) return
    const plst_upds_socket = getPlsUpdsSocket()

    plst_upds_socket.on('add_track:' + plst.id, (payload) => {
      setPlaylistState((prevState) => {
        if (!prevState) return prevState
        const parsed =
          payload && typeof payload === 'string' ? JSON.parse(payload) : payload
        if (!parsed) return
        console.log('add track', parsed)
        return {
          ...prevState,
          track_data: [...prevState.track_data, parsed],
        }
      })
    })
    plst_upds_socket.on('playnow:' + plst.id, (payload) => {
      setPlaylistState((prevState) => {
        console.log('play now', payload)
        if (!prevState) return prevState
        const parsed =
          payload && typeof payload === 'string' ? JSON.parse(payload) : payload
        if (!parsed) return
        const tr: Track | null =
          prevState.track_data.find((t) => t.id === parsed.track_id) || null

        return {
          ...prevState,
          now_playing: tr,
        }
      })
    })

    plst_upds_socket.on('delete_track:' + plst.id, (payload) => {
      setPlaylistState((prevState) => {
        return {
          ...prevState,
          track_data: prevState.track_data.filter(
            (t) => t.id !== payload.track_id,
          ),
        }
      })
    })

    plst_upds_socket.on('settings_changed:' + plst.id, (payload) => {
      setPlaylistState((prevState) => {
        console.log('settings changed', payload)
        if (!prevState) return prevState
        const parsed =
          payload && typeof payload === 'string' ? JSON.parse(payload) : payload
        if (!parsed) return
        return {
          ...prevState,
          settings: parsed,
        }
      })
    })

    plst_upds_socket.on('kicked_from_playlist', (payload) => {
      alert('You have been kicked from the playlist.')
      window.location.href = '/view'
    })

    return () => {
      plst_upds_socket.emit('unsubscribe', { playlist_id: plst.id })
      plst_upds_socket.off('add_track:' + plst.id)
      plst_upds_socket.off('playnow:' + plst.id)
      plst_upds_socket.off('delete_track:' + plst.id)
      plst_upds_socket.off('settings_changed:' + plst.id)
      plst_upds_socket.off('kicked_from_playlist')
    }
  }, [])

  if (!plst) {
    return (
      <div className="px-6 pt-6">
        <SearchPlaylist />
        <div className="text-white justify-self-center mt-10 ">
          Start searching for a playlist
        </div>
      </div>
    )
  }

  return (
    <div className="text-white px-6 pt-6 w-full gap-y-6 flex flex-col">
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
              <ViewTrackCard track={track} settings={plst.settings} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
