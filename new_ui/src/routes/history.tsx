import React, { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  History as HistoryIcon,
  Search,
  Trash2,
  ExternalLink,
  BarChart2,
  Music,
  User,
  Clock,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { HistoryStatsWidget } from '@/features/history/components/HistoryStatsWidget'
import {
  fetchPlaybackHistory,
  deleteHistoryItem,
  clearPlaybackHistory,
  type PlaybackHistoryItem,
} from '@/api/api-history'
import {
  gradientTextClass,
  pageInnerClass,
  pageWrapClass,
  panelClass,
} from '@/features/landing/styles'
import { toast } from 'sonner'

export const Route = createFileRoute('/history')({
  component: HistoryRouteComponent,
})

function HistoryRouteComponent() {
  const { t } = useTranslation('common')
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [showStats, setShowStats] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Fetch History Query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['playbackHistory', searchQuery],
    queryFn: () => fetchPlaybackHistory({ search: searchQuery, limit: 100 }),
  })

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: (historyId: string) => deleteHistoryItem(historyId),
    onSuccess: () => {
      toast.success('Запис видалено з історії')
      queryClient.invalidateQueries({ queryKey: ['playbackHistory'] })
    },
    onError: () => {
      toast.error('Помилка при видаленні запису')
    },
  })

  // Clear history mutation
  const clearMutation = useMutation({
    mutationFn: () => clearPlaybackHistory(),
    onSuccess: (data) => {
      toast.success(`Історію очищено (${data.count} записів)`)
      queryClient.invalidateQueries({ queryKey: ['playbackHistory'] })
    },
    onError: () => {
      toast.error('Помилка при очищенні історії')
    },
  })

  const rawItems = data?.items || []

  // Filter items by platform source if filter active
  const items = rawItems.filter((item) => {
    if (selectedSource === 'all') return true
    return item.source?.toLowerCase() === selectedSource.toLowerCase()
  })

  const handleCopyLink = (ytVideoId: string, id: string) => {
    const url = `https://www.youtube.com/watch?v=${ytVideoId}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success('Посилання скопійовано')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className={pageWrapClass}>
      <div className={pageInnerClass}>
        <div className="flex flex-col gap-6">
          {/* Header Banner */}
          <header className={`p-6 sm:p-8 ${panelClass} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${gradientTextClass}`}>
                History & Logs
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main flex items-center gap-2.5">
                <HistoryIcon className="size-7 text-accent" />
                Історія прослуховувань
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Перегляд усіх раніше відтворених та замовлених треків
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Btn
                variant={showStats ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowStats(!showStats)}
                className="gap-2"
              >
                <BarChart2 className="w-4 h-4" />
                {showStats ? 'Сховати статистику' : 'Статистика'}
              </Btn>

              {items.length > 0 && (
                <Btn
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Ви впевнені, що хочете очистити всю історію?')) {
                      clearMutation.mutate()
                    }
                  }}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Очистити
                </Btn>
              )}
            </div>
          </header>

          {/* Optional Stats Widget */}
          {showStats && (
            <HistoryStatsWidget items={rawItems} totalCount={data?.total || rawItems.length} />
          )}

          {/* Filters & Search Toolbar */}
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${panelClass} p-3.5`}>
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-placeholder" />
              <Input
                placeholder="Пошук треку, замовника чи плейлиста..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-level-1 border border-accent/20 text-text-main placeholder:text-text-placeholder focus-visible:ring-1 focus-visible:ring-accent/50"
              />
            </div>

            {/* Platform Source Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'Усі' },
                { id: 'youtube', label: 'YouTube' },
                { id: 'twitch', label: 'Twitch' },
                { id: 'web', label: 'Web' },
                { id: 'donationalerts', label: 'DA' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSource(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    selectedSource === tab.id
                      ? 'bg-level-1 text-text-main border border-accent/60 shadow-xs'
                      : 'bg-level-1/40 text-text-secondary hover:text-text-main hover:bg-level-1/80 border border-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main List Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="h-20 rounded-(--rounded-std) bg-level-2/60 border border-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : isError ? (
            <div className={`text-center py-12 ${panelClass} p-6 space-y-3`}>
              <p className="text-danger font-medium">Не вдалося завантажити історію</p>
              <Btn size="sm" onClick={() => refetch()} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Спробувати знову
              </Btn>
            </div>
          ) : items.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 px-4 ${panelClass} border-dashed border-accent/30 text-center space-y-3`}>
              <div className="p-4 rounded-full bg-level-1 text-text-placeholder">
                <Music className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-semibold text-text-main">Історія порожня</h3>
              <p className="text-sm text-text-secondary max-w-md">
                Записів про відтворені треки ще немає або они не відповідають вибраним фільтрам.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-(--rounded-std) bg-level-2/90 border border-white/5 hover:border-accent/40 shadow-xs transition-all"
                >
                  {/* Left Track Info */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-level-1 flex-shrink-0 border border-white/10">
                      {item.yt_video_id ? (
                        <img
                          src={`https://img.youtube.com/vi/${item.yt_video_id}/hqdefault.jpg`}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-placeholder">
                          <Music className="w-5 h-5" />
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-level-1/90 text-[10px] font-medium text-text-main rounded">
                        {formatDuration(item.duration)}
                      </span>
                    </div>

                    {/* Title & Playlist */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-sm leading-snug truncate text-text-main group-hover:text-accent transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                        <span className="truncate max-w-[160px] font-medium text-text-main/90">
                          {item.playlist_name}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-accent" />
                          {item.requester_nickname || 'Анонім'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Meta Info & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-white/5 text-xs">
                    {/* Source Badge */}
                    <span className="px-2.5 py-1 rounded-full bg-level-1/80 text-text-secondary font-medium uppercase text-[10px] tracking-wide border border-accent/20">
                      {item.source}
                    </span>

                    {/* Played At */}
                    <div className="flex items-center gap-1.5 text-text-secondary whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-text-placeholder" />
                      <span>{formatDate(item.played_at)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {item.yt_video_id && (
                        <>
                          <Btn
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCopyLink(item.yt_video_id, item.id)}
                            title="Скопіювати посилання"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Btn>

                          <a
                            href={`https://www.youtube.com/watch?v=${item.yt_video_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-text-secondary hover:text-text-main hover:bg-level-1/60 transition-colors"
                            title="Відкрити на YouTube"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}

                      <Btn
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        title="Видалити з історії"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-text-placeholder hover:text-danger transition-colors" />
                      </Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
