import React from 'react'
import { useTranslation } from 'react-i18next'

import { getPlsUpdsSocket } from '@/api/io-sockets'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import { TimeAgo } from '@/components/ui/TimeAgo'
import Warning from '@/components/icons/icon-warning'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EventType, type PlaylistLog } from '@/types/playlistLog'

import {
  Info,
  Calendar,
  Monitor,
  User,
  Code,
  CheckCircle2,
  XCircle,
  Play,
  Trash2,
  ListMusic,
  SkipForward,
  AlertTriangle,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPlaylistLogs } from '@/api/api-playlist'

// Функция для получения иконки и цвета в зависимости от типа события
function getEventMeta(type: EventType) {
  const map: Record<string, { icon: any; color: string }> = {
    [EventType.ADD_TRACK]: { icon: CheckCircle2, color: 'text-green-500' },
    [EventType.ADD_TRACK_ERROR]: { icon: XCircle, color: 'text-red-500' },
    [EventType.PLAY_TRACK]: { icon: Play, color: 'text-blue-500' },
    [EventType.REMOVE_TRACK]: { icon: Trash2, color: 'text-muted-foreground' },
    [EventType.LISTEN_TRACK]: { icon: ListMusic, color: 'text-indigo-500' },
    [EventType.SKIP_TRACK]: { icon: SkipForward, color: 'text-amber-500' },
    [EventType.REPORT_TRACK]: { icon: AlertTriangle, color: 'text-orange-500' },
    [EventType.ERROR]: { icon: XCircle, color: 'text-red-600' },
  }
  return map[type] || { icon: Info, color: 'text-primary' }
}

function LogModal({
  data,
  children,
}: {
  data: PlaylistLog
  children: React.ReactNode
}) {
  const { t, i18n } = useTranslation()
  const { icon: EventIcon, color: eventColor } = getEventMeta(data.event_type)

  const playlist = usePlaylist()

  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-2 w-full text-left cursor-pointer p-1 rounded">
        {children}
      </DialogTrigger>
      <DialogContent className="w-[90%] sm:max-w-[450px] bg-level-1 border-level-3 text-text-main max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-level-3">
          <div className={`p-2 rounded-lg bg-level-2 ${eventColor}`}>
            <EventIcon className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-lg font-semibold leading-none">
              {t('playlist.log.modal.title', { name: playlist.name })}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              ID: {data.id}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 font-sans text-sm">
          {/* Сетка параметров */}
          <div className="grid grid-cols-3 gap-y-3 gap-x-2 bg-level-2/50 p-3 rounded-lg border border-level-3/50">
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5" />{' '}
              {t('playlist.log.modal.created_at')}
            </span>
            <span className="col-span-2 font-mono text-xs text-right">
              {new Date(data.created_at).toLocaleString(i18n.language)}
            </span>

            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5" />{' '}
              {t('playlist.log.modal.event_type')}
            </span>
            <span className="col-span-2 text-right font-medium">
              {t(`playlist.log.types.${data.event_type}`)}
            </span>

            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Monitor className="h-3.5 w-3.5" />{' '}
              {t('playlist.log.modal.platform')}
            </span>
            <span className="col-span-2 text-right font-mono text-xs">
              {data.event_data.platform || '—'}
            </span>

            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" />{' '}
              {t('playlist.log.modal.initiated_by')}
            </span>
            <span className="col-span-2 text-right">
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  data.event_data.by_owner
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                }`}
              >
                {data.event_data.by_owner
                  ? t('playlist.log.modal.owner')
                  : t('playlist.log.modal.guest')}
              </span>
            </span>
          </div>

          {data.event_type === EventType.ADD_TRACK_ERROR &&
            data.event_data.errors && (
              <div className="space-y-1.5">
                <div className="text-xs text-red-400 flex items-center gap-1.5 px-1 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('playlist.log.types.add_track_error')}
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-1">
                  {Array.isArray(data.event_data.errors) ? (
                    data.event_data.errors.map((err: string, idx: number) => (
                      <div
                        key={idx}
                        className="text-xs text-red-200/90 flex items-start gap-2"
                      >
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>
                          {t(`playlist.log.errors.${err}`, {
                            defaultValue: err,
                          })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-red-200/90">
                      {t('playlist.log.errors.unknown')}
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Сырые данные / Payload */}
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
              <Code className="h-3.5 w-3.5" /> {t('playlist.log.modal.payload')}
            </div>
            <pre className="bg-level-2 p-3 rounded-lg border border-level-3 font-mono text-[11px] overflow-x-auto text-text-muted max-h-[180px] scrollbar-thin">
              {JSON.stringify(data.event_data, null, 2)}
            </pre>
          </div>
        </div>
        <DialogFooter className="pt-2 border-t border-level-3" />
      </DialogContent>
    </Dialog>
  )
}

export default function LogPanel() {
  const { t, i18n } = useTranslation()
  const playlist = usePlaylist()
  const queryClient = useQueryClient()
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const playlistId = playlist?.id

  // 1. Загрузка данных (убрали queryKeyHashFn, так как TanStack Query сам следит за изменением playlistId в ключе)
  const { data, isLoading } = useQuery({
    queryKey: ['playlist-logs', playlistId],
    queryFn: () => fetchPlaylistLogs(playlistId!),
    enabled: !!playlistId,
    staleTime: Infinity,
  })

  // Гарантируем, что у нас всегда есть массив для рендера
  const logs = data ?? []

  // 2. Автоскролл
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight
    }
  }, [logs.length]) // Следим конкретно за длиной массива

  // 3. Подписка на сокет (перезапускается ТОЛЬКО при смене плейлиста)
  React.useEffect(() => {
    if (!playlistId) return

    const socket = getPlsUpdsSocket()
    const channel = `log:${playlistId}`

    const handleNewLog = (payload: any) => {
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
      if (!parsed) return

      // Прямое обновление кэша по строгому соответствию ключа
      queryClient.setQueryData<PlaylistLog[]>(
        ['playlist-logs', playlistId],
        (oldLogs) => {
          const currentLogs = oldLogs ? [...oldLogs] : []

          // Проверяем на дубликаты
          if (currentLogs.some((log) => log.id === parsed.id)) {
            return oldLogs
          }

          // Возвращаем НОВЫЙ массив (меняем ссылку, чтобы React затриггерил рендер)
          return [...currentLogs, parsed]
        },
      )
    }

    socket.on(channel, handleNewLog)

    return () => {
      socket.off(channel, handleNewLog)
    }
  }, [playlistId, queryClient])

  function getLogBody(log: PlaylistLog) {
    const { title, errors } = log.event_data

    switch (log.event_type) {
      case EventType.ADD_TRACK:
        return t('playlist.log.add_track', { title })

      case EventType.ADD_TRACK_ERROR: {
        const translatedErrors = Array.isArray(errors)
          ? errors
              .map((err) =>
                t(`playlist.log.errors.${err}`, { defaultValue: err }),
              )
              .join(', ')
          : t('playlist.log.errors.unknown')

        return t('playlist.log.add_track_error', {
          title: title || 'Unknown Track',
          error: translatedErrors,
        })
      }

      case EventType.PLAY_TRACK:
        return title
          ? t('playlist.log.play_track', { title })
          : t('playlist.log.no_track')

      case EventType.REMOVE_TRACK:
        return t('playlist.log.remove_track', { title })

      case EventType.LISTEN_TRACK:
        return t('playlist.log.listen_track', { title })

      case EventType.SKIP_TRACK:
        return t('playlist.log.skip_track', { title })

      case EventType.REPORT_TRACK:
        return t('playlist.log.report_track', { title })

      case EventType.ERROR:
        return t('playlist.log.types.error')

      default:
        return log.event_type
    }
  }

  if (isLoading) {
    return (
      <div className="text-xs font-mono p-2 text-muted-foreground">
        Loading logs...
      </div>
    )
  }

  if (logs.length === 0)
    return (
      <div className="w-full h-[350px] bg-level-1 mt-1 rounded-[var(--rounded-std)] px-2 py-1.5" />
    )

  return (
    <div className="w-full bg-level-1 mt-1 h-[350px] rounded-[var(--rounded-std)] px-2 py-1.5 font-mono text-xs overflow-x-hidden">
      <div
        ref={scrollContainerRef}
        className="flex flex-col w-full gap-1 scroll-auto"
      >
        {logs.map((log, i) => (
          <LogModal key={log.id || i} data={log}>
            <div className="flex flex-col items-start w-full truncate">
              <TimeAgo
                timestamp={log.created_at}
                lang={i18n.language}
                className="text-muted-foreground text-[9px] shrink-0 min-w-[45px]"
              />
              <span className="truncate text-text-main/90">
                {getLogBody(log)}
              </span>
            </div>
          </LogModal>
        ))}
      </div>
    </div>
  )
}
