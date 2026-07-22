// src/stores/layoutStore.ts
import { create } from 'zustand'

type LayoutState = {
  contentAreaEl: HTMLDivElement | null
  setContentAreaEl: (el: HTMLDivElement | null) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  contentAreaEl: null,
  setContentAreaEl: (el) => set({ contentAreaEl: el }),
}))
