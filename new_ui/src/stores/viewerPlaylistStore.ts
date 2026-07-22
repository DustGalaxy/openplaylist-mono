import { create } from 'zustand'
import type { ClientPlaylist } from '@/types/playlist'
import { fetchPublicPlaylist } from '@/api/api-playlist'

type ViewerPlaylistStore = {
  playlist: ClientPlaylist | null
  loading: boolean

  load: (playlistId: string) => Promise<void>
  set: (playlist: ClientPlaylist) => void
  clear: () => void
}

// ponytail: минимум — держит ровно один чужой плейлист, который сейчас
// слушают. Несколько параллельных viewer-стримов — не сегодняшняя задача.
export const useViewerPlaylistStore = create<ViewerPlaylistStore>((set) => ({
  playlist: null,
  loading: false,

  async load(playlistId) {
    set({ loading: true })
    try {
      const pl = await fetchPublicPlaylist(playlistId) // TODO: сверить с реальным api-playlist
      set({ playlist: pl, loading: false })
    } catch (e) {
      console.debug('[viewerPlaylistStore] load failed', e)
      set({ loading: false })
    }
  },

  set: (playlist) => set({ playlist }),
  clear: () => set({ playlist: null, loading: false }),
}))
