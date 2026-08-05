import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ListMusic, Loader2, SearchX, User } from 'lucide-react'

import { getPublicPlaylists } from '@/api/api-playlist'
import { gradientTextClass, panelClass } from '@/features/landing/styles'
import SearchBar from './searchbar'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

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
  const { t } = useFeatureTranslation()
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
            {t('publicSearch.title')}
          </h2>
          <p className="text-text-secondary text-sm sm:text-base">
            {t('publicSearch.subtitle')}
          </p>
        </div>
      )}

      <SearchBar
        value={search}
        setValue={setSearch}
        action={handleSearch}
        isLoading={isLoading}
        placeholder={t('publicSearch.placeholder')}
      />

      {isLoading && (
        <div className="mt-8 flex items-center justify-center gap-2 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span className="text-sm">{t('publicSearch.searching')}</span>
        </div>
      )}

      {!isLoading && notFound && (
        <div
          className={`mt-8 flex flex-col items-center gap-3 text-center py-10 ${panelClass} border-dashed`}
        >
          <SearchX
            className="h-10 w-10 text-text-placeholder"
            strokeWidth={1.5}
          />
          <p className="text-text-main font-medium">
            {t('publicSearch.notFound')}
          </p>
          <p className="text-sm text-text-secondary max-w-sm">
            {t('publicSearch.notFoundHintFull')}
          </p>
        </div>
      )}

      {!isLoading && !notFound && playlists.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <Link
              key={playlist.id}
              to={`/playlists/${playlist.id}`}
              className={`
                group text-left flex flex-col gap-3 p-5 ${panelClass}
                border-accent/50 transition-all duration-200
                hover:border-accent hover:shadow-[0_0_24px_rgba(236,72,153,0.12)]
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex h-10 w-10 shrink-0 items-center justify-center rounded-(--rounded-std)
                    bg-level-1 border border-accent/40 text-accent
                    group-hover:text-transparent group-hover:bg-gradient-to-br
                    group-hover:from-[var(--color-accent-2)] group-hover:via-[var(--color-accent-3)]
                    group-hover:to-[var(--color-accent-1)] transition-colors
                  "
                >
                  <ListMusic className="h-5 w-5 group-hover:text-level-1" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className={`font-bold text-lg truncate group-hover:underline decoration-accent/60 ${gradientTextClass}`}
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
                {playlist.discription || t('publicSearch.noDescription')}
              </p>
              <span className="text-xs font-medium text-accent group-hover:text-text-main transition-colors">
                {t('publicSearch.openPlaylist')} →
              </span>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && !hasSearched && playlists.length === 0 && !notFound && (
        <p className="mt-6 text-center text-sm text-text-placeholder">
          {t('publicSearch.initialHintFull')}
        </p>
      )}
    </div>
  )
}

export default SearchPlaylist
