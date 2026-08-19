import React, { useState } from 'react'
import {
  Cast,
  Headphones,
  ListMusic,
  RefreshCw,
  Settings2,
  Shield,
  SlidersHorizontal,
  Square,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Btn from '@/components/ui/my-btn'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn, formatTime } from '@/lib/utils'
import { usePlaybackStore } from '@/stores/playbackStore'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useAuthStore } from '@/stores/authStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { useUpNextFeed } from '@/hooks/useUpNextFeed'
import { setPlayerBroadcastToWidget } from '@/api/api-player'
import { CLIENT_ID } from '@/lib/clientId'
import type { PlaybackFeed } from '../types'

const RATES = [1, 1.5, 2] as const

interface PlayerOptionsPopoverProps {
  feed: PlaybackFeed
  playlistId?: string | null
  currentTrackId?: string | null
  className?: string
}

export function PlayerOptionsPopover({
  feed,
  playlistId,
  currentTrackId,
  className,
}: PlayerOptionsPopoverProps) {
  const { t } = useTranslation('player')
  const [isOpen, setIsOpen] = useState(false)
  const [deletingTrackId, setDeletingTrackId] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)

  const {
    playerMode,
    setPlayerMode,
    activeChannel,
    setActiveChannel,
    moderatedChannels,
    broadcastToWidget,
    setBroadcastToWidget,
  } = usePlaybackStore()

  const { playerPlaybackRate: playbackRate } = useAppSettingsStore(
    (s) => s.settings,
  )
  const setSetting = useAppSettingsStore((s) => s.setSetting)
  const setPlaybackRate = (v: number) => setSetting('playerPlaybackRate', v)

  const playTrack = usePlaylistStore((s) => s.playTrack)
  const removeTrack = usePlaylistStore((s) => s.removeTrack)
  const canRemove = usePlaylistStore((s) => s.canActInSlot('player', 'remove'))

  const upNextTracks = useUpNextFeed(playlistId, currentTrackId, 5)

  const isOwnChannelSelected = Boolean(
    activeChannel?.is_owner ||
      (!activeChannel && user) ||
      (user && activeChannel?.owner_id === user.id),
  )

  const toggleBroadcastWidget = async () => {
    const nextVal = !broadcastToWidget
    setBroadcastToWidget(nextVal)
    const targetOwnerId =
      activeChannel?.owner_id || user?.id || usePlaylistStore.getState().userId
    if (targetOwnerId) {
      try {
        await setPlayerBroadcastToWidget(targetOwnerId, {
          enabled: nextVal,
          client_id: CLIENT_ID,
        })
      } catch (err) {
        console.error('Failed to toggle widget broadcast:', err)
      }
    }
  }

  const handleRemoveTrack = async (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deletingTrackId) return
    setDeletingTrackId(trackId)
    try {
      await removeTrack('player', trackId, 'removed')
    } catch (err) {
      console.error('Failed to remove track:', err)
    } finally {
      setDeletingTrackId(null)
    }
  }

  const handleSelectTrack = (trackId: string) => {
    playTrack(trackId)
  }

  const isControlMode = playerMode === 'control'

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Btn
          isActive={isOpen || isControlMode}
          aria-label="Опции и очередь воспроизведения"
          title="Опции и очередь воспроизведения"
          className={cn(
            'p-1 rounded-sm size-8 sm:size-9 bg-level-2 relative',
            className,
          )}
        >
          <SlidersHorizontal className="size-4" />
          {isControlMode && (
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-accent animate-pulse ring-2 ring-level-2" />
          )}
        </Btn>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="top"
        sideOffset={12}
        className="w-[330px] sm:w-[380px] p-3.5 bg-level-2 border border-accent/40 rounded-xl shadow-2xl space-y-3.5 text-xs text-text-main backdrop-blur-xl max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-accent/20 pb-2">
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-accent" />
            <span className="font-semibold text-sm text-text-main">
              Опции воспроизведения
            </span>
          </div>
          <span
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border',
              isControlMode
                ? 'bg-accent/20 text-accent border-accent/40'
                : 'bg-level-1 text-text-secondary border-accent/20',
            )}
          >
            {isControlMode ? 'Управление' : 'Слушаю'}
          </span>
        </div>

        {/* Section 1: Player Mode Switcher */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Режим плеера
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-level-1 p-1 rounded-lg border border-accent/20">
            <button
              type="button"
              onClick={() => setPlayerMode('listen')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer',
                playerMode === 'listen'
                  ? 'bg-accent text-white shadow-md'
                  : 'text-text-secondary hover:text-text-main',
              )}
            >
              <Headphones className="size-3.5" />
              <span>Слушаю</span>
            </button>
            <button
              type="button"
              onClick={() => setPlayerMode('control')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium text-xs transition-all cursor-pointer',
                playerMode === 'control'
                  ? 'bg-accent text-white shadow-md'
                  : 'text-text-secondary hover:text-text-main',
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Управление</span>
            </button>
          </div>
          <p className="text-[10px] text-text-secondary leading-tight px-0.5">
            {playerMode === 'listen'
              ? 'Локальный звук включен. Действия применяются только для вас.'
              : 'Локальный звук заглушен. Команды транслируются стримеру в OBS.'}
          </p>
        </div>

        {/* Section 2: Channel Selector (Moderation) - Only in Control Mode */}
        {isControlMode && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Канал стрима (Контекст)
            </label>
            <div className="space-y-1 bg-level-1 p-1 rounded-lg border border-accent/20">
              <button
                type="button"
                onClick={() => setActiveChannel(null)}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between text-xs transition-colors cursor-pointer',
                  isOwnChannelSelected
                    ? 'bg-accent/20 text-accent font-semibold border border-accent/30'
                    : 'text-text-main hover:bg-level-2',
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Shield className="size-3.5 text-accent shrink-0" />
                  <span className="truncate">Мой канал (Собственный)</span>
                </div>
                {isOwnChannelSelected && (
                  <span className="size-2 rounded-full bg-accent shrink-0" />
                )}
              </button>

              {moderatedChannels.map((c) => {
                const isSelected =
                  activeChannel?.owner_id === c.owner_id &&
                  !activeChannel?.is_owner
                return (
                  <button
                    key={c.moderator_id}
                    type="button"
                    onClick={() =>
                      setActiveChannel({
                        owner_id: c.owner_id,
                        name: c.owner_name,
                        is_owner: false,
                        can_control_player: c.can_control_player,
                        can_manage_all_playlists: c.can_manage_all_playlists,
                      })
                    }
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between text-xs transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-accent/20 text-accent font-semibold border border-accent/30'
                        : 'text-text-main hover:bg-level-2',
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Shield className="size-3.5 text-accent shrink-0" />
                      <span className="truncate">{c.owner_name}</span>
                    </div>
                    {isSelected && (
                      <span className="size-2 rounded-full bg-accent shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Section 3: OBS Stream Widget Toggle */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-level-1 border border-accent/20">
          <div className="flex items-center gap-2">
            <Cast
              className={cn(
                'size-4',
                broadcastToWidget ? 'text-accent' : 'text-text-secondary',
              )}
            />
            <div className="flex flex-col">
              <span className="font-medium text-xs">
                Трансляция в виджет OBS
              </span>
              <span className="text-[10px] text-text-secondary">
                {broadcastToWidget
                  ? 'Включена (стрим слышит музыку)'
                  : 'Выключена'}
              </span>
            </div>
          </div>
          <Btn
            isActive={broadcastToWidget}
            onClick={toggleBroadcastWidget}
            aria-label="Переключить трансляцию в виджет"
            className="p-1 rounded-sm size-8 bg-level-2 shrink-0"
          >
            <span
              className={cn(
                'size-2.5 rounded-full',
                broadcastToWidget
                  ? 'bg-accent animate-pulse'
                  : 'bg-text-secondary/40',
              )}
            />
          </Btn>
        </div>

        {/* Section 4: Playback Speed & Aux Actions */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-level-1 border border-accent/20">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mr-1">
              Скорость:
            </span>
            {RATES.map((rate) => (
              <Btn
                key={rate}
                isActive={playbackRate === rate}
                onClick={() => setPlaybackRate(rate)}
                className="p-1 rounded-sm h-7 min-w-7 text-[11px] font-mono bg-level-2"
              >
                {rate}x
              </Btn>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {feed.capabilities.canStop && feed.stop && (
              <Btn
                onClick={feed.stop}
                aria-label={t('controls.stop', 'Остановить воспроизведение')}
                title="Остановить воспроизведение"
                className="p-1 rounded-sm size-7 bg-level-2 text-danger"
              >
                <Square className="size-3" />
              </Btn>
            )}

            {feed.capabilities.canRequestSync && feed.requestSync && (
              <Btn
                onClick={feed.requestSync}
                aria-label={t('controls.sync', 'Синхронизировать')}
                title="Синхронизировать со стримом"
                className="p-1 rounded-sm size-7 bg-level-2"
              >
                <RefreshCw className="size-3" />
              </Btn>
            )}
          </div>
        </div>

        {/* Section 5: Up Next Queue with Deletion */}
        <div className="space-y-2 pt-1 border-t border-accent/20">
          <div className="flex items-center justify-between px-0.5">
            <span className="font-bold text-text-main flex items-center gap-1.5 text-xs">
              <ListMusic className="size-3.5 text-accent" />
              Далее в очереди
            </span>
            <span className="text-[10px] text-text-secondary font-mono px-1.5 py-0.5 rounded bg-level-1 border border-accent/20">
              {upNextTracks.length} трек(-ов)
            </span>
          </div>

          {upNextTracks.length === 0 ? (
            <div className="p-3 text-center text-text-secondary italic text-xs bg-level-1/40 rounded-lg border border-dashed border-accent/20">
              Нет следующих треков в очереди
            </div>
          ) : (
            <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
              {upNextTracks.map((nt, idx) => (
                <div
                  key={nt.id}
                  onClick={() => handleSelectTrack(nt.id)}
                  className="group p-1.5 rounded-lg bg-level-1/70 hover:bg-level-1 border border-transparent hover:border-accent/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span className="text-[10px] font-mono text-accent font-bold w-3.5 shrink-0 text-center">
                    {idx + 1}
                  </span>

                  <img
                    src={`https://img.youtube.com/vi/${nt.yt_video_id}/default.jpg`}
                    alt=""
                    className="size-8 rounded-xs object-cover shrink-0 border border-accent/20"
                  />

                  <div className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text-main text-[11px] group-hover:text-accent transition-colors">
                      {nt.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-text-secondary truncate">
                      <span className="truncate">
                        {nt.requester_nickname
                          ? `Заказ: ${nt.requester_nickname}`
                          : nt.author || 'OpenPlaylist'}
                      </span>
                      {nt.duration > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-mono tabular-nums">
                            {formatTime(nt.duration)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {canRemove && (
                    <button
                      type="button"
                      disabled={deletingTrackId === nt.id}
                      onClick={(e) => handleRemoveTrack(nt.id, e)}
                      aria-label="Удалить из очереди"
                      title="Удалить из очереди"
                      className="p-1 rounded-sm text-text-secondary hover:text-danger transition-colors opacity-70 group-hover:opacity-100 shrink-0 cursor-pointer disabled:opacity-30"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default PlayerOptionsPopover
