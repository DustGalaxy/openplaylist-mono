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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        expired_at: state.expired_at,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
