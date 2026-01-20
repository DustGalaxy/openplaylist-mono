// src/stores/authStore.ts
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface UserProfile {
  id: string
  curr_platform: string
  username: string
  profile_image_url: string
  // ... любые другие данные, которые ваш бэкенд помещает в JWT и возвращает
}

interface AuthState {
  user: UserProfile | null
  expired_at: number | null
  isAuthenticated: boolean
  isLoadingAuth: boolean // Для отслеживания состояния загрузки начальной авторизации
  setUser: (user: UserProfile | null, expired_at: number | null) => void
  setLoadingAuth: (loading: boolean) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    // Оборачиваем create в persist
    (set) => ({
      user: null,
      expired_at: null,
      isAuthenticated: false,
      isLoadingAuth: true, // Изначально true. Будет false после восстановления или проверки.

      setUser: (user, expired_at) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoadingAuth: false,
          expired_at: expired_at,
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
      name: 'auth-storage', // Уникальное имя для вашего хранилища в localStorage (ключ)
      storage: createJSONStorage(() => localStorage), // Указываем, что используем localStorage
      // Выбираем, какие части состояния сохранять.
      // Обычно user и isAuthenticated достаточно. isLoadingAuth - это временное состояние.
      partialize: (state) => ({
        user: state.user,
        expired_at: state.expired_at,
        isAuthenticated: state.isAuthenticated,
      }),
      // Опции для миграции (если структура состояния меняется), можно оставить по умолчанию
      // version: 0,
      // migrate: (persistedState, version) => { ... },
      // onRehydrateStorage: (state) => { ... }, // Можно использовать для выполнения действий при восстановлении
    },
  ),
)
