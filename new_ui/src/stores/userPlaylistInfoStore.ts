import { create } from 'zustand'
import { deletePlaylist } from '@/api/api-playlist'

export type PlaylistBaseInfo = {
  id: string
  name: string
  owner_nickname?: string
}

export type UserModeratedPlaylistInfo = {
  moderator_id: string
  id: string
  name: string
  owner_nickname?: string
}

type userPlaylistRecordsStore = {
  playlists: Array<PlaylistBaseInfo>
  favorites: Array<PlaylistBaseInfo>
  moderated: Array<UserModeratedPlaylistInfo>
  loading: boolean

  set: (playlists: Array<PlaylistBaseInfo>) => void
  setFavorites: (favorites: Array<PlaylistBaseInfo>) => void
  setModerated: (moderated: Array<UserModeratedPlaylistInfo>) => void
  addFavorite: (playlist: PlaylistBaseInfo) => void
  removeFavorite: (id: string) => void
  removeModerated: (playlistId: string) => void
  add: (playlist: PlaylistBaseInfo) => void
  remove: (id: string) => void
  clear: () => void
}

export const useUserPlaylistRecordsStore = create<userPlaylistRecordsStore>(
  (set) => ({
    playlists: [],
    favorites: [],
    moderated: [],
    loading: false,

    set: (playlists) => set({ playlists }),
    setFavorites: (favorites) => set({ favorites }),
    setModerated: (moderated) => set({ moderated }),
    addFavorite: (playlist) =>
      set((state) => {
        if (state.favorites.some((f) => f.id === playlist.id)) return state
        return {
          ...state,
          favorites: [...state.favorites, playlist],
        }
      }),
    removeFavorite: (id) =>
      set((state) => ({
        ...state,
        favorites: state.favorites.filter((f) => f.id !== id),
      })),
    removeModerated: (playlistId) =>
      set((state) => ({
        ...state,
        moderated: state.moderated.filter((m) => m.id !== playlistId),
      })),
    add: (playlist) =>
      set((state) => {
        return {
          ...state,
          playlists: [...state.playlists, playlist],
        }
      }),
    remove: async (id) => {
      set((state) => {
        return {
          ...state,
          playlists: state.playlists.filter((p) => p.id !== id),
          favorites: state.favorites.filter((f) => f.id !== id),
          moderated: state.moderated.filter((m) => m.id !== id),
        }
      })
      await deletePlaylist(id)
    },
    clear: () => set({ playlists: [], favorites: [], moderated: [], loading: false }),
  }),
)
