import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { UserProfile } from '@/types/user'

interface AuthState {
  user: UserProfile | null
  expired_at: number | null
  isAuthenticated: boolean
  isLoadingAuth: boolean
  setUser: (user: UserProfile | null, expired_at: number | null) => void
  setLoadingAuth: (loading: boolean) => void
  clearAuth: () => void
}

const getSafeStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      return localStorage
    }
  } catch {}
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      expired_at: null,
      isAuthenticated: false,
      isLoadingAuth: true,

      setUser: (user, expired_at) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoadingAuth: false,
          expired_at,
        }),
      clearAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoadingAuth: false,
          expired_at: null,
        }),
      setLoadingAuth: (loading) => set({ isLoadingAuth: loading }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => getSafeStorage()),
      // Оптимизация: сохраняем только user и expired_at. 
      // isAuthenticated вычисляется автоматически при инициализации, предотвращая десинхронизацию.
      partialize: (state) => ({
        user: state.user,
        expired_at: state.expired_at,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.user
          state.isLoadingAuth = false
        }
      },
    },
  ),
)