/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { PlaylistMode, type OrderMode, type Track } from '@/types/playlist'
import { postPauseState, postPlayNow, postPositionState, postSeekState } from '@/api/api-playlist'
import { isBackgroundTrack, isLastInGroup, pickNextFromGroup, getActiveModeSettings, isVipTrack, splitQueue } from './helpers'
import type { GetFn, SetFn, StoreState } from './types'

export function createPlaybackSlice(
  set: SetFn,
  get: GetFn,
): Pick<
  StoreState,
  | 'pendingPlays'
  | 'getPlayerPosition'
  | 'setGetPlayerPosition'
  | 'requestPlayNow'
  | 'syncPlayNow'
  | 'playNext'
  | 'playPrev'
  | 'clearPausedBackground'
  | 'requestPlaybackState'
  | 'requestSeekState'
  | 'requestPositionState'
> {
  return {
    pendingPlays: {},
    getPlayerPosition: null,

    setGetPlayerPosition(getter) {
      set(() => ({ getPlayerPosition: getter }))
    },

    async requestPlaybackState(playlistId, is_paused, position, track_id) {
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId ? { ...p, is_paused } : p,
        ),
      }))
      postPauseState(playlistId, is_paused, position, track_id).catch(() => {
        // ponytail: команда важнее подтверждения, ответ не смотрим
      })
    },

    async requestSeekState(playlistId, position, track_id) {
      postSeekState(playlistId, position, track_id).catch(() => {
        // ponytail: команда важнее подтверждения, ответ не смотрим
      })
    },

    async requestPositionState(playlistId, position) {
      // Fire-and-forget, как requestPlaybackState — тайминг не критичен
      // для локального состояния, поэтому нет optimistic-поля и rollback.
      try {
        await postPositionState(playlistId, position)
      } catch {
        // Бэкенд ещё может быть не готов — не роняем воспроизведение из-за этого.
      }
    },

    async requestPlayNow(playlistId, track_id) {
      set((state) => {
        const pending = { ...state.pendingPlays }
        if (!pending[playlistId]) pending[playlistId] = new Set()
        const newSet = new Set(pending[playlistId])
        if (track_id) newSet.add(track_id)
        return { pendingPlays: pending }
      })

      const originalPlaylists = get().playlists

      set((state) => ({
        playlists: state.playlists.map((p) => {
          if (p.id === playlistId) {
            const track = p.track_data.find((t) => t.id === track_id)
            const prevNowPlaying = p.settings.mode === 'flow' ? p.now_playing : undefined
            return {
              ...p,
              track_data: prevNowPlaying
                ? [prevNowPlaying, ...p.track_data.filter((t) => t.id !== prevNowPlaying.id)]
                : p.track_data,
              now_playing: track,
            }
          }
          return p
        }),
      }))

      try {
        const playNowFn = get().api.playNow || postPlayNow
        await playNowFn(playlistId, track_id)
      } catch (error) {
        console.error('Failed to request play now, reverting:', error)
        set((state) => {
          const pending = { ...state.pendingPlays }
          if (pending[playlistId] && track_id) {
            const newSet = new Set(pending[playlistId])
            newSet.delete(track_id)
            pending[playlistId] = newSet
          }
          return {
            pendingPlays: pending,
            playlists: originalPlaylists,
          }
        })
        throw error
      }
    },

    syncPlayNow(playlistId, track) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      const pending = get().pendingPlays[playlistId]
      const wasPending = track && pending && pending.has(track.id)

      if (wasPending) {
        set((state) => {
          const pendingPlays = { ...state.pendingPlays }
          if (pendingPlays[playlistId] && track) {
            const newSet = new Set(pendingPlays[playlistId])
            newSet.delete(track.id)
            pendingPlays[playlistId] = newSet
          }
          return { pendingPlays }
        })
      } else {
        const prevNowPlaying = pl.settings.mode === 'flow' ? pl.now_playing : undefined
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                ...p,
                track_data: prevNowPlaying
                  ? [prevNowPlaying, ...p.track_data.filter((t) => t.id !== prevNowPlaying.id)]
                  : p.track_data,
                now_playing: track,
              }
              : p,
          ),
        }))
      }
    },

    playNext(pl, reason, forceNextTrack) {
      const fresh = get().playlists.find((p) => p.id === pl.id) ?? pl
      pl = fresh
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === pl.id
            ? {
              ...p,
              history: pl.now_playing ? [...p.history, pl.now_playing].slice(-99) : p.history,
            }
            : p,
        ),
      }))

      if (forceNextTrack) {
        get().requestPlayNow(pl.id, forceNextTrack.id)
        return
      }

      const modeSettings = getActiveModeSettings(pl)
      const { vip, regular, background } = splitQueue(pl)

      const currentWasVip = pl.now_playing !== undefined && isVipTrack(pl.now_playing, modeSettings)
      const remainingVip = pl.now_playing
        ? vip.filter((t) => t.id !== pl.now_playing?.id)
        : vip

      const vipOrderMode: OrderMode = pl.settings.shuffle ? 'random' : modeSettings.sort_settings_vip.order_mode
      const regularOrderMode: OrderMode = pl.settings.shuffle
        ? 'random'
        : modeSettings.sort_settings_regular.order_mode
      const repeatAll = pl.settings.repeat_mode === 'all'

      // Static ничего не удаляет — vip/regular всегда полные группы, и
      // "remainingVip.length > 0" после первого же сыгранного vip-трека будет
      // true навсегда (сам трек остаётся в списке). Поэтому static идёт по
      // позиции внутри своей текущей группы, а не по факту "существует ли vip".
      if (pl.settings.mode === PlaylistMode.Static) {
        const currentGroup = currentWasVip ? vip : regular

        let nextTrack: Track | undefined
        if (pl.now_playing === undefined) {
          nextTrack = vip[0] ?? regular[0] ?? undefined
        } else if (!isLastInGroup(currentGroup, pl.now_playing?.id)) {
          // в текущей группе (vip или regular) есть ещё непроигранные —
          // остаёмся внутри неё, paused_background не трогаем
          nextTrack = pickNextFromGroup(
            currentGroup,
            pl.now_playing.id,
            currentWasVip ? vipOrderMode : regularOrderMode,
            false,
          )
        } else if (currentWasVip && pl.paused_background) {
          // vip-группа отыграна ПОЛНОСТЬЮ — только теперь возвращаемся в фон
          get().requestPlayNow(pl.id, pl.paused_background.track_id)
          return
        } else if (currentWasVip) {
          nextTrack = regular[0] ?? (repeatAll ? vip[0] : undefined)
        } else {
          nextTrack = vip[0] ?? (repeatAll ? regular[0] : undefined)
        }

        get().requestPlayNow(pl.id, nextTrack?.id || undefined)
        return
      }

      // flow/stream — vip реально удаляется после отыгрыша (см. ветки ниже),
      // remainingVip тут корректно отражает то, что ещё не сыграно.
      if (remainingVip.length > 0) {
        const next = pickNextFromGroup(remainingVip, undefined, vipOrderMode, false)
        get().requestPlayNow(pl.id, next?.id)
        return
      }

      if (currentWasVip && pl.paused_background) {
        get().requestPlayNow(pl.id, pl.paused_background.track_id)
        return
      }

      const wasBackgroundTrack =
        pl.now_playing !== undefined && isBackgroundTrack(pl.settings.mode, modeSettings, pl.now_playing.id)

      let nextTrack: Track | undefined

      if (pl.now_playing === undefined) {
        nextTrack = regular[0] ?? background[0] ?? undefined
      } else if (pl.settings.mode === 'flow') {
        nextTrack = pickNextFromGroup(regular, pl.now_playing.id, regularOrderMode, false)
        get().requestRemoveTrack(pl.id, pl.now_playing.id, reason)
      } else if (pl.settings.mode === 'stream' && wasBackgroundTrack) {
        const bgOrderMode: OrderMode = pl.settings.shuffle ? 'random' : 'auto'
        nextTrack = pickNextFromGroup(background, pl.now_playing.id, bgOrderMode, true)
      } else {
        // stream: доиграла обычная заявка
        get().requestRemoveTrack(pl.id, pl.now_playing.id, reason)
        nextTrack = pickNextFromGroup(regular, pl.now_playing.id, regularOrderMode, false) ?? background[0]
      }

      get().requestPlayNow(pl.id, nextTrack?.id || undefined)
    },

    playPrev(playlistId) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl || pl.history.length === 0) return

      const prevTrack = pl.history[pl.history.length - 1]

      // Снимаем трек с вершины истории ДО requestPlayNow — иначе повторный
      // клик "назад" во время pending-запроса схватит тот же самый трек.
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId ? { ...p, history: p.history.slice(0, -1) } : p,
        ),
      }))

      get().requestPlayNow(playlistId, prevTrack.id)
    },

    clearPausedBackground(playlistId) {
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId ? { ...p, paused_background: null } : p
        ),
      }))
    },
  }
}