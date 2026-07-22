import { deletePlaylist } from '@/api/api-playlist'
import { create } from 'zustand'

type PlaylistBaseInfo = {
  id: string
  name: string
}

type userPlaylistRecordsStore = {
  playlists: Array<PlaylistBaseInfo>
  loading: boolean

  set: (playlists: Array<PlaylistBaseInfo>) => void
  add: (playlist: PlaylistBaseInfo) => void
  remove: (id: string) => void
  clear: () => void
}

export const useUserPlaylistRecordsStore = create<userPlaylistRecordsStore>(
  (set) => ({
    playlists: [],
    loading: false,

    set: (playlists) => set({ playlists }),
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
        }
      })
      await deletePlaylist(id)
    },
    clear: () => set({ playlists: undefined, loading: false }),
  }),
)
