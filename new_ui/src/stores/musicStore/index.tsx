/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { create } from 'zustand'
import { createLifecycleSlice } from './lifecycleSlice'
import { createSocketSlice } from './socketSlice'
import { createTrackSlice } from './trackSlice'
import { createPlaybackSlice } from './playbackSlice'
import { createSettingsSlice } from './settingsSlice'
import type { StoreState } from './types'

/**
 * Сборка стора из слайсов. Порядок вызова не важен: все слайсы делят один
 * set/get, поэтому кросс-слайсовые вызовы (напр. syncAddTrack → requestPlayNow,
 * lifecycleSlice.addPlaylist → socketSlice.subscribePlaylist) резолвятся
 * нормально через get() в момент реального вызова, а не в момент сборки.
 *
 * Файлы слайсов:
 *  - lifecycleSlice — playlists CRUD, api, sortPlaylist
 *  - socketSlice     — socket, подписки, регистрация обработчиков событий
 *  - trackSlice      — добавление/удаление заявок
 *  - playbackSlice   — play/pause/next/prev, VIP-прерывания, тайминг-синк
 *  - settingsSlice   — patch плейлиста, mode-settings, reorder
 */
export const useMusicStore = create<StoreState>((set, get) => ({
  ...createLifecycleSlice(set, get),
  ...createSocketSlice(set, get),
  ...createTrackSlice(set, get),
  ...createPlaybackSlice(set, get),
  ...createSettingsSlice(set, get),
}))

export default useMusicStore