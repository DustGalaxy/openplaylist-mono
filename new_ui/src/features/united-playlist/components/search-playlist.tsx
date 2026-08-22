import React, { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Hash, Heart, ListMusic, Loader2, SearchX, User, X } from 'lucide-react'

import { fetchPopularTags, getPublicPlaylists } from '@/api/api-playlist'
import { gradientTextClass, panelClass } from '@/features/landing/styles'
import SearchBar from './searchbar'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export type PublicPlaylistResult = {
  id: string
  name: string
  owner_nickname: string
  description?: string | null
  discription?: string
  favorites_count?: number
  tags?: string[]
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
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null)
  const [popularTags, setPopularTags] = React.useState<Array<{ tag: string; count: number }>>([])
  const [playlists, setPlaylists] = React.useState<PublicPlaylistResult[]>([])
  const [notFound, setNotFound] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)

  useEffect(() => {
    fetchPopularTags(15)
      .then((tags) => {
        if (Array.isArray(tags)) setPopularTags(tags)
      })
      .catch(() => {})
  }, [])

  const executeSearch = async (queryStr: string, tagFilter: string | null) => {
    const q = queryStr.trim()
    const tFilter = tagFilter ? tagFilter.trim().replace(/^#/, '') : undefined

    if (!q && !tFilter) {
      setPlaylists([])
      setHasSearched(false)
      setNotFound(false)
      return
    }

    setIsLoading(true)
    setNotFound(false)
    setHasSearched(true)

    try {
      const data = await getPublicPlaylists(q || undefined, tFilter)
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

  const handleSearch = async () => {
    await executeSearch(search, selectedTag)
  }

  const handleSelectTag = (tag: string) => {
    const clean = tag.replace(/^#/, '').toLowerCase()
    if (selectedTag === clean) {
      setSelectedTag(null)
      executeSearch(search, null)
    } else {
      setSelectedTag(clean)
      executeSearch(search, clean)
    }
  }

  const handleClearTag = () => {
    setSelectedTag(null)
    executeSearch(search, null)
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

      {/* Popular Tags / Active Tag Bar */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 justify-center sm:justify-start">
        {selectedTag && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent text-level-1 shadow-xs animate-in fade-in">
            <span>#{selectedTag}</span>
            <button
              type="button"
              onClick={handleClearTag}
              className="hover:opacity-75 focus:outline-none ml-0.5"
              title={t('publicSearch.clearTagFilter', 'Clear tag filter')}
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {popularTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-text-secondary">
            <span className="text-[11px] text-text-placeholder font-medium mr-1 flex items-center gap-1">
              <Hash className="size-3 text-accent" />
              {t('publicSearch.popularTags', 'Popular:')}
            </span>
            {popularTags.map(({ tag, count }) => {
              const isSelected = selectedTag === tag.toLowerCase()
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSelectTag(tag)}
                  className={`
                    px-2 py-0.5 rounded-md text-xs font-medium transition-all cursor-pointer
                    ${
                      isSelected
                        ? 'bg-accent text-level-1 shadow-xs'
                        : 'bg-level-1 hover:bg-level-2 border border-accent/30 text-text-secondary hover:text-accent hover:border-accent'
                    }
                  `}
                >
                  #{tag}
                  {count > 1 && (
                    <span className="ml-1 text-[10px] opacity-70">
                      ({count})
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

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
              to="/playlists/$playlistId"
              params={{ playlistId: playlist.id }}
              className={`
                group text-left flex flex-col justify-between gap-3 p-5 ${panelClass}
                border-accent/50 transition-all duration-200
                hover:border-accent hover:shadow-[0_0_24px_rgba(236,72,153,0.12)]
              `}
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
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

                  <div className="flex items-center gap-1 text-xs text-red-500 font-medium shrink-0 bg-level-1/80 px-2 py-1 rounded border border-accent/20">
                    <Heart className="h-3.5 w-3.5 fill-red-500/20 text-red-500" />
                    <span>{playlist.favorites_count ?? 0}</span>
                  </div>
                </div>

                <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                  {playlist.description || playlist.discription || t('publicSearch.noDescription')}
                </p>

                {/* Tags on Card */}
                {playlist.tags && playlist.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {playlist.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleSelectTag(tag)
                        }}
                        className="
                          px-1.5 py-0.5 rounded text-[11px] font-medium
                          bg-accent/10 border border-accent/30 text-accent
                          hover:bg-accent hover:text-level-1 transition-colors
                        "
                        title={`Filter by #${tag}`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-xs font-medium text-accent group-hover:text-text-main transition-colors mt-2">
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
