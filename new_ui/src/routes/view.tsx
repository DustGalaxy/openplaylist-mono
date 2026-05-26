import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ListMusic, Radio } from 'lucide-react'

import type { ClientPlaylist, InputPlaylist, Track } from '@/types/playlist'
import ViewInfoBar from '@/features/public-playlist/components/ViewInfoBar'
import { fetchPlaylistPublic } from '@/api/api-playlist'
import ViewTrackCard from '@/features/public-playlist/components/view-track-card'
import SearchPlaylist from '@/features/public-playlist/components/search-playlist'
import { getPlsUpdsSocket } from '@/api/io-sockets'
import {
  gradientTextClass,
  pageInnerClass,
  pageWrapClass,
  panelClass,
} from '@/features/landing/styles'

export const Route = createFileRoute('/view')({
  validateSearch: (search: Record<string, unknown>) => ({
    p: typeof search.p === 'string' ? search.p : undefined,
  }),
  component: RouteComponent,
  loader: async (ctx) => {
    const searchParams = new URLSearchParams(ctx.location.search)
    const plst_id = searchParams.get('p')
    if (plst_id) {
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

function ViewPageShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className={pageWrapClass}>
      <div className={pageInnerClass}>
        <header className="text-center mb-8 sm:mb-10">
          <p
            className={`inline-flex items-center gap-2 text-sm font-medium mb-3 ${gradientTextClass}`}
          >
            <Radio className="h-4 w-4 text-[var(--color-accent-2)]" />
            Публичные плейлисты
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-main mb-2">
            {title}
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto text-sm sm:text-base">
            {subtitle}
          </p>
        </header>
        {children}
      </div>
    </div>
  )
}

function RouteComponent() {
  const { playlist } = Route.useLoaderData()
  const { p: playlistIdFromUrl } = Route.useSearch()
  const [playlistState, setPlaylistState] = useState<ClientPlaylist | null>(
    playlist,
  )

  useEffect(() => {
    setPlaylistState(playlist)
  }, [playlist])

  useEffect(() => {
    const plst_upds_socket = getPlsUpdsSocket()
    const handleConnect = () => {
      if (playlist?.id) {
        plst_upds_socket.emit('subscribe', { playlist_id: playlist.id })
      }
    }

    plst_upds_socket.on('connect', handleConnect)

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

    plst_upds_socket.on('add_track:' + playlist.id, (payload: unknown) => {
      setPlaylistState((prevState) => {
        if (!prevState) return prevState
        const parsed =
          payload && typeof payload === 'string' ? JSON.parse(payload) : payload
        if (!parsed) return prevState
        return {
          ...prevState,
          track_data: [...prevState.track_data, parsed],
        } as ClientPlaylist
      })
    })

    plst_upds_socket.on('playnow:' + playlist.id, (payload: unknown) => {
      setPlaylistState((prevState) => {
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

    plst_upds_socket.on('settings_changed:' + playlist.id, (payload: unknown) => {
      setPlaylistState((prevState) => {
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
  }, [playlist])

  if (!playlist || playlistState === null) {
    return (
      <ViewPageShell
        title="Поиск и просмотр"
        subtitle="Найдите открытый плейлист стримера и следите за очередью в реальном времени"
      >
        {playlistIdFromUrl && (
          <div
            className={`mb-6 p-4 text-center text-sm ${panelClass} border-dashed border-level-3/60`}
          >
            <p className="text-text-main font-medium mb-1">
              Плейлист не найден или недоступен
            </p>
            <p className="text-text-secondary">
              Проверьте ссылку или найдите другой плейлист ниже.
            </p>
          </div>
        )}
        <div className={`p-6 sm:p-10 ${panelClass}`}>
          <SearchPlaylist showHeader />
        </div>
      </ViewPageShell>
    )
  }

  const trackCount = playlistState.track_data.length

  return (
    <div className={pageWrapClass}>
      <div className={`${pageInnerClass} flex flex-col gap-8`}>
        {/* Search — compact */}
        <section className={`p-5 sm:p-6 ${panelClass}`}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-placeholder mb-1">
                Другой плейлист
              </p>
              <h2 className="text-lg font-semibold text-text-main">
                Поиск публичных плейлистов
              </h2>
            </div>
            <Link
              to="/view"
              search={{ p: undefined }}
              className="text-sm text-level-3 hover:text-text-main transition-colors shrink-0"
            >
              Сбросить и искать заново
            </Link>
          </div>
          <SearchPlaylist />
        </section>

        {/* Playlist detail */}
        <section className={`relative overflow-hidden p-5 sm:p-8 ${panelClass}`}>
          <div
            className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-[var(--color-accent-3)] opacity-[0.07] blur-[80px]"
            aria-hidden
          />
          <header className="relative flex items-start gap-4 mb-8 pb-6 border-b border-white/5">
            <div
              className="
                flex h-12 w-12 shrink-0 items-center justify-center rounded-(--rounded-std)
                bg-gradient-to-br from-[var(--color-accent-2)]/20 via-[var(--color-accent-3)]/20 to-[var(--color-accent-1)]/20
                border border-white/10 text-level-3
              "
            >
              <ListMusic className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${gradientTextClass}`}>
                Плейлист
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-main leading-tight break-words">
                {playlistState.name}
              </h1>
            </div>
          </header>
          <ViewInfoBar playlist={playlistState} />
        </section>

        {/* Track queue */}
        <section className={`p-5 sm:p-8 ${panelClass}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-main">
              Очередь треков
            </h2>
            <span className="text-sm text-text-secondary tabular-nums">
              {trackCount}{' '}
              {trackCount === 1
                ? 'трек'
                : trackCount >= 2 && trackCount <= 4
                  ? 'трека'
                  : 'треков'}
            </span>
          </div>

          {trackCount === 0 ? (
            <div
              className={`text-center py-12 border border-dashed border-level-3/50 rounded-(--rounded-std) bg-level-1/50`}
            >
              <p className="text-text-main font-medium mb-1">
                В плейлисте пока нет треков
              </p>
              <p className="text-sm text-text-secondary">
                Заявки появятся здесь, когда зрители отправят музыку.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 items-stretch">
              {playlistState.track_data.map((track) => (
                <ViewTrackCard
                  key={track.id}
                  track={track}
                  playlist={playlistState}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
