import React from 'react'
import { Link } from '@tanstack/react-router'
import { ListMusic, Loader2, SearchX, User } from 'lucide-react'

import { getPublicPlaylists } from '@/api/api-playlist'
import {
  gradientTextClass,
  panelClass,
} from '@/features/landing/styles'
import SearchBar from './searchbar'

export type PublicPlaylistResult = {
  id: string
  name: string
  owner_nickname: string
  discription?: string
}

type SearchPlaylistProps = {
  /** Show title and intro text above the search field */
  showHeader?: boolean
  className?: string
}

const SearchPlaylist = ({
  showHeader = false,
  className = '',
}: SearchPlaylistProps) => {
  const [search, setSearch] = React.useState('')
  const [playlists, setPlaylists] = React.useState<PublicPlaylistResult[]>([])
  const [notFound, setNotFound] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)

  const handleSearch = async () => {
    const query = search.trim()
    if (!query) return

    setIsLoading(true)
    setNotFound(false)
    setHasSearched(true)

    try {
      const data = await getPublicPlaylists(query)
      if (data && data.length > 0) {
        setPlaylists(data)
        setNotFound(false)
      } else {
        setPlaylists([])
        setNotFound(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`w-full ${className}`}>
      {showHeader && (
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">
            Найти публичный плейлист
          </h2>
          <p className="text-text-secondary text-sm sm:text-base">
            По имени плейлиста, нику автора или фрагменту описания
          </p>
        </div>
      )}

      <SearchBar
        value={search}
        setValue={setSearch}
        action={handleSearch}
        isLoading={isLoading}
        placeholder="Имя плейлиста, ник автора или текст в описании…"
      />

      {isLoading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin text-level-3" />
          <span className="text-sm">Ищем плейлисты…</span>
        </div>
      )}

      {!isLoading && notFound && (
        <div
          className={`mt-8 flex flex-col items-center gap-3 text-center py-10 ${panelClass} border-dashed`}
        >
          <SearchX className="h-10 w-10 text-text-placeholder" strokeWidth={1.5} />
          <p className="text-text-main font-medium">Плейлисты не найдены</p>
          <p className="text-sm text-text-secondary max-w-sm">
            Попробуйте другое слово или проверьте, что плейлист открыт для
            публичного просмотра.
          </p>
        </div>
      )}

      {!isLoading && !notFound && playlists.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <Link
              key={playlist.id}
              to="/view"
              search={{ p: playlist.id }}
              className={`
                group text-left flex flex-col gap-3 p-5 ${panelClass}
                border-level-3/50 transition-all duration-200
                hover:border-level-3 hover:shadow-[0_0_24px_rgba(236,72,153,0.12)]
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-(--rounded-std)
                    bg-level-1 border border-level-3/40 text-level-3
                    group-hover:text-transparent group-hover:bg-gradient-to-br
                    group-hover:from-[var(--color-accent-2)] group-hover:via-[var(--color-accent-3)]
                    group-hover:to-[var(--color-accent-1)] transition-colors
                  "
                >
                  <ListMusic className="h-5 w-5 group-hover:text-level-1" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className={`font-bold text-lg truncate group-hover:underline decoration-level-3/60 ${gradientTextClass}`}
                  >
                    {playlist.name}
                  </h3>
                  <p className="flex items-center gap-1.5 text-sm text-text-secondary mt-1">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{playlist.owner_nickname}</span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                {playlist.discription || 'Нет описания'}
              </p>
              <span className="text-xs font-medium text-level-3 group-hover:text-text-main transition-colors">
                Открыть плейлист →
              </span>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && !hasSearched && playlists.length === 0 && !notFound && (
        <p className="mt-6 text-center text-sm text-text-placeholder">
          Введите запрос и нажмите «Найти», чтобы увидеть публичные плейлисты.
        </p>
      )}
    </div>
  )
}

export default SearchPlaylist
