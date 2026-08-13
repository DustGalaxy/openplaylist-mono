import React from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Code,
  Info,
  Link as LinkIcon,
  ListMusic,
  Monitor,
  Play,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  SkipForward,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePlaylistView } from '../context/playlist-view-context'
import type { PlaylistLog } from '@/types/playlistLog'
import { getPlsUpdsSocket } from '@/api/io-sockets'

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
import { EventType } from '@/types/playlistLog'

import { fetchPlaylistLogs } from '@/api/api-playlist'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

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
    [EventType.CLAIM_LINK]: { icon: ShieldCheck, color: 'text-emerald-500' },
    [EventType.FAILED_CLAIM_LINK]: { icon: ShieldAlert, color: 'text-red-500' },
    [EventType.MODERATOR_LEAVE]: { icon: UserMinus, color: 'text-amber-500' },
    [EventType.CREATE_MODERATOR_TOKEN]: { icon: LinkIcon, color: 'text-blue-500' },
    [EventType.ADD_MODERATOR_DIRECT]: { icon: UserPlus, color: 'text-purple-500' },
    [EventType.REVOKE_MODERATOR]: { icon: ShieldOff, color: 'text-rose-500' },
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
  const { t, i18n } = useFeatureTranslation()
  const { icon: EventIcon, color: eventColor } = getEventMeta(data.event_type)

  const { playlist } = usePlaylistView()
  if (!playlist) return

  const op = data.event_data.operator || {
    nickname: undefined,
    user_id: undefined,
    access_level: data.event_data.by_owner ? 'owner' : 'none',
  }

  const accessLevelKey = op.access_level || (data.event_data.by_owner ? 'owner' : 'none')

  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-2 w-full text-left cursor-pointer p-1 rounded">
        {children}
      </DialogTrigger>
      <DialogContent className="w-[90%] sm:max-w-[450px] bg-level-1 border-accent text-text-main max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row items-center gap-3 space-y-0 pb-4 border-b border-accent">
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
          <div className="grid grid-cols-3 gap-y-3 gap-x-2 bg-level-2/50 p-3 rounded-lg border border-accent/50">
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
              {t(`playlist.log.types.${data.event_type}`, { defaultValue: data.event_type })}
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
            <span className="col-span-2 text-right flex flex-col items-end gap-0.5">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  accessLevelKey === 'owner'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : accessLevelKey === 'moderator'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                }`}
              >
                {accessLevelKey === 'owner'
                  ? t('playlist.log.modal.owner', { defaultValue: 'Owner' })
                  : accessLevelKey === 'moderator'
                  ? t('playlist.log.modal.moderator', { defaultValue: 'Moderator' })
                  : t('playlist.log.modal.guest', { defaultValue: 'None' })}
              </span>
              {op.nickname && (
                <span className="text-xs text-text-main font-medium">
                  {op.nickname}
                </span>
              )}
              {op.user_id && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  ID: {op.user_id}
                </span>
              )}
            </span>
          </div>

          {(data.event_type === EventType.ADD_TRACK_ERROR ||
            data.event_type === EventType.FAILED_CLAIM_LINK) &&
            data.event_data.errors && (
              <div className="space-y-1.5">
                <div className="text-xs text-red-400 flex items-center gap-1.5 px-1 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('playlist.log.types.error', { defaultValue: 'Errors' })}
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
                      {t('playlist.log.errors.unknown', { defaultValue: 'Unknown error' })}
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
            <pre className="bg-level-2 p-3 rounded-lg border border-accent font-mono text-[11px] overflow-x-auto text-text-muted max-h-[180px] scrollbar-thin">
              {JSON.stringify(data.event_data, null, 2)}
            </pre>
          </div>
        </div>
        <DialogFooter className="pt-2 border-t border-accent" />
      </DialogContent>
    </Dialog>
  )
}

export default function LogPanel() {
  const { t, i18n } = useFeatureTranslation()
  const { playlistId: Pid } = usePlaylistView()
  const queryClient = useQueryClient()
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const playlistId = Pid

  // 1. Загрузка данных (убрали queryKeyHashFn, так как TanStack Query сам следит за изменением playlistId в ключе)
  const { data, isLoading } = useQuery({
    queryKey: ['playlist-logs', playlistId],
    queryFn: () => fetchPlaylistLogs(playlistId),
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
      queryClient.setQueryData<Array<PlaylistLog>>(
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
    const { title, errors, operator } = log.event_data
    const nickname = operator?.nickname || 'User'

    switch (log.event_type) {
      case EventType.ADD_TRACK:
        return t('playlist.log.add_track', { title, defaultValue: `Added track: ${title}` })

      case EventType.ADD_TRACK_ERROR: {
        const translatedErrors = Array.isArray(errors)
          ? errors
              .map((err) =>
                t(`playlist.log.errors.${err}`, { defaultValue: err }),
              )
              .join(', ')
          : t('playlist.log.errors.unknown', { defaultValue: 'Unknown error' })

        return t('playlist.log.add_track_error', {
          title: title || 'Unknown Track',
          error: translatedErrors,
          defaultValue: `Track add error: ${title} (${translatedErrors})`,
        })
      }

      case EventType.PLAY_TRACK:
        return title
          ? t('playlist.log.play_track', { title, defaultValue: `Now playing: ${title}` })
          : t('playlist.log.no_track', { defaultValue: 'Now playing' })

      case EventType.REMOVE_TRACK:
        return t('playlist.log.remove_track', { title, defaultValue: `Removed track: ${title}` })

      case EventType.LISTEN_TRACK:
        return t('playlist.log.listen_track', { title, defaultValue: `Listened track: ${title}` })

      case EventType.SKIP_TRACK:
        return t('playlist.log.skip_track', { title, defaultValue: `Skipped track: ${title}` })

      case EventType.REPORT_TRACK:
        return t('playlist.log.report_track', { title, defaultValue: `Reported track: ${title}` })

      case EventType.CLAIM_LINK:
        return t('playlist.log.claim_link', { nickname, defaultValue: `Moderator claimed invite link (${nickname})` })

      case EventType.FAILED_CLAIM_LINK:
        return t('playlist.log.failed_claim_link', { nickname, defaultValue: `Failed claim link attempt (${nickname})` })

      case EventType.MODERATOR_LEAVE:
        return t('playlist.log.moderator_leave', { nickname, defaultValue: `Moderator left (${nickname})` })

      case EventType.CREATE_MODERATOR_TOKEN:
        return t('playlist.log.create_moderator_token', { nickname, defaultValue: `Created moderator link (${nickname})` })

      case EventType.ADD_MODERATOR_DIRECT:
        return t('playlist.log.add_moderator_direct', { nickname, defaultValue: `Added moderator directly (${nickname})` })

      case EventType.REVOKE_MODERATOR:
        return t('playlist.log.revoke_moderator', { nickname, defaultValue: `Revoked moderator access (${nickname})` })

      case EventType.ERROR:
        return t('playlist.log.types.error', { defaultValue: 'Error' })

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
      <div className="w-full h-87.5 bg-level-1 mt-1 rounded-(--rounded-std) px-2 py-1.5" />
    )

  return (
    <div className="w-full bg-level-1 h-86.25 rounded-(--rounded-std) px-2 py-1.5 font-mono text-xs overflow-x-scroll">
      <div
        ref={scrollContainerRef}
        className="flex flex-col w-fit gap-1 h-82.5 overflow-auto scroll-auto"
      >
        {logs.map((log, i) => (
          <LogModal key={log.id || i} data={log}>
            <div className="flex flex-col items-start w-full truncate">
              <TimeAgo
                timestamp={log.created_at}
                lang={i18n.language}
                className="text-muted-foreground text-[9px] shrink-0 min-w-11.25"
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
