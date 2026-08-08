import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Heart, ListMusic, Loader2, Search, SearchX, User, X } from 'lucide-react'
import { getPublicPlaylists } from '@/api/api-playlist'
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'
import { useTranslation } from 'react-i18next'
import { gradientTextClass } from '@/features/landing/styles'
import type { PublicPlaylistResult } from '@/features/united-playlist/components/search-playlist'

export default function HeaderSearch() {
  const { t } = useTranslation('playlist')
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [playlists, setPlaylists] = useState<Array<PublicPlaylistResult>>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Triggered only when `query` string value changes after 300ms delay
  useDebouncedEffect(
    query,
    () => {
      const trimmed = query.trim()
      if (!trimmed) {
        setPlaylists([])
        setIsLoading(false)
        setHasSearched(false)
        return
      }

      setIsLoading(true)
      setHasSearched(true)

      getPublicPlaylists(trimmed)
        .then((data) => {
          setPlaylists(data || [])
        })
        .catch(() => {
          setPlaylists([])
        })
        .finally(() => {
          setIsLoading(false)
        })
    },
    300,
  )

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSelectPlaylist = (id: string) => {
    handleClear()
    setIsOpen(false)
    void navigate({ to: `/playlists/${id}` })
  }

  const handleClear = () => {
    setQuery('')
    setPlaylists([])
    setHasSearched(false)
    setIsLoading(false)
  }

  return (
    <div ref={containerRef} className="relative flex items-center">
      {/* Search Input Container */}
      <div
        className="
          relative flex items-center transition-all duration-200
          w-28 focus-within:w-40 sm:w-56 sm:focus-within:w-72 lg:w-64 lg:focus-within:w-80
        "
      >
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-text-placeholder pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          placeholder={t('publicSearch.searchPlaceholder', 'Search...')}
          className="
            w-full h-7 sm:h-8 pl-7 sm:pl-8 pr-6 sm:pr-7 text-xs sm:text-sm
            bg-level-1 border border-accent/40 rounded-full
            text-text-main placeholder:text-text-placeholder
            focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50
            transition-all duration-200
          "
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-placeholder hover:text-text-main rounded-full cursor-pointer"
          >
            <X className="size-3 sm:size-3.5" />
          </button>
        )}
      </div>

      {/* Expandable Dropdown Popover */}
      {isOpen && (
        <div
          className="
            fixed sm:absolute top-11 sm:top-full left-2 right-2 sm:left-0 sm:right-auto mt-1
            sm:w-80 md:w-96 max-h-96
            bg-level-2 border border-accent/50 rounded-md
            shadow-2xl z-50 overflow-hidden flex flex-col
          "
        >
          {/* Header Bar inside Dropdown */}
          <div className="px-3 py-2 border-b border-accent/40 flex items-center justify-between text-xs text-text-secondary">
            <span>{t('publicSearch.title', 'Public Playlists')}</span>
            {query.trim() && (
              <Link
                to="/playlists"
                onClick={handleClear}
                className="text-accent hover:underline font-medium"
              >
                {t('publicSearch.viewAll', 'View all')}
              </Link>
            )}
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto p-2 flex-1 max-h-80">
            {isLoading && (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-text-secondary">
                <Loader2 className="size-5 animate-spin text-accent" />
                <span className="text-xs">
                  {t('publicSearch.searching', 'Searching...')}
                </span>
              </div>
            )}

            {!isLoading && hasSearched && playlists.length === 0 && (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-center text-text-secondary">
                <SearchX
                  className="size-8 text-text-placeholder"
                  strokeWidth={1.5}
                />
                <p className="text-xs font-medium text-text-main">
                  {t('publicSearch.notFound', 'No playlists found')}
                </p>
                <p className="text-[11px] text-text-placeholder max-w-xs">
                  {t('publicSearch.notFoundHint', 'Try another search term')}
                </p>
              </div>
            )}

            {!isLoading && playlists.length > 0 && (
              <div className="flex flex-col gap-1">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    type="button"
                    onClick={() => handleSelectPlaylist(playlist.id)}
                    className="
                      w-full text-left flex items-start gap-2.5 p-2 rounded-md
                      hover:bg-level-1/80 transition-colors group cursor-pointer
                    "
                  >
                    <div
                      className="
                        flex size-8 shrink-0 items-center justify-center rounded-md
                        bg-level-1 border border-accent/40 text-accent
                        group-hover:bg-accent group-hover:text-level-1 transition-colors
                      "
                    >
                      <ListMusic className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={`text-xs font-bold truncate group-hover:underline ${gradientTextClass}`}
                        >
                          {playlist.name}
                        </h4>
                        <div className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium shrink-0">
                          <Heart className="size-3 fill-red-500/20 text-red-500" />
                          <span>{playlist.favorites_count ?? 0}</span>
                        </div>
                      </div>
                      <p className="flex items-center gap-1 text-[11px] text-text-secondary mt-0.5">
                        <User className="size-3 shrink-0" />
                        <span className="truncate">
                          {playlist.owner_nickname}
                        </span>
                      </p>
                      {playlist.discription && (
                        <p className="text-[10px] text-text-placeholder line-clamp-1 mt-0.5">
                          {playlist.discription}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!isLoading && !hasSearched && (
              <div className="py-6 px-2 text-center text-xs text-text-placeholder">
                <p>
                  {t(
                    'publicSearch.initialHint',
                    'Enter a search term to find playlists',
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
