import { create } from 'zustand'

interface MobileSidebarState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useMobileSidebarStore = create<MobileSidebarState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
