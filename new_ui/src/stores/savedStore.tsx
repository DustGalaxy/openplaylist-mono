// src/stores/authStore.ts
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface SavedTrack {
  yt_video_id: string
  title: string
  duration: string
}

interface SavedState {
  tracks: Array<SavedTrack>
  addTrack: (track: SavedTrack) => void
  removeTrack: (yt_video_id: string) => void
  isSaved: (yt_video_id: string) => boolean
}

export const useSavedStore = create<SavedState>()(
  persist(
    // Оборачиваем create в persist
    (set, get) => ({
      tracks: [],
      addTrack: (track) =>
        set((state) => ({
          tracks: [...state.tracks, track],
        })),
      removeTrack: (yt_video_id) =>
        set((state) => ({
          tracks: state.tracks.filter(
            (track) => track.yt_video_id !== yt_video_id,
          ),
        })),
      isSaved: (yt_video_id) =>
        get().tracks.some((track) => track.yt_video_id === yt_video_id),
    }),
    {
      name: 'saved-storage', // Уникальное имя для вашего хранилища в localStorage (ключ)
      storage: createJSONStorage(() => localStorage), // Указываем, что используем localStorage
      // Выбираем, какие части состояния сохранять.
      // Обычно user и isAuthenticated достаточно. isLoadingAuth - это временное состояние.
      partialize: (state) => ({
        tracks: state.tracks,
      }),
    },
  ),
)
