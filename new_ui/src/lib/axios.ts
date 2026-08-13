import axios from 'axios'
import type { AxiosError, AxiosInstance } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { queryClient } from '@/routes/__root'
import { router } from '@/main'
import { getModeratorToken } from '@/lib/moderatorTokenStorage'

let isClearingAuth = false

const apiClient: AxiosInstance = axios.create({
  timeout: 10000, // Таймаут запроса
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    if (config.url) {
      const match = config.url.match(/\/(?:playlist|playback)\/([a-f0-9-]{36})/i)
      let playlistId = match ? match[1] : null

      if (
        !playlistId &&
        config.data &&
        typeof config.data === 'object' &&
        'playlist_id' in config.data &&
        config.data.playlist_id
      ) {
        playlistId = String(config.data.playlist_id)
      }

      if (playlistId) {
        const modToken = getModeratorToken(playlistId)
        if (modToken) {
          config.headers = config.headers || {}
          config.headers['X-Moderator-Token'] = modToken
        }
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Добавляем интерцептор для ответов
apiClient.interceptors.response.use(
  (response) => response, // Если ответ успешный, просто пробрасываем его дальше
  async (error: AxiosError) => {
    // Логирование ошибки
    console.error(
      'Axios Response Error:',
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      error.toJSON ? error.toJSON() : error.message,
    )

    // Проверяем, что это ошибка ответа сервера, а не сетевая ошибка без ответа
    if (error.response) {
      const { status } = error.response
      const originalRequest = error.config

      // Получаем состояние аутентификации
      const { clearAuth, isAuthenticated } = useAuthStore.getState()

      // Условие для 401/403 (Unauthorized/Forbidden)
      // Игнорируем эндпоинты авторизации (например, /login/twitch),
      // так как 401/403 от них должны обрабатываться вызывающим кодом.
      const isAuthEndpoint = originalRequest?.url?.includes('/login') // /login/twitch или другие /login/*

      if (status === 401 && !isAuthEndpoint) {
        // Проверяем флаг, чтобы избежать множественных вызовов
        if (!isClearingAuth) {
          isClearingAuth = true // Устанавливаем флаг
          console.warn(
            'Unauthorized/Forbidden response. Clearing authentication and redirecting.',
          )

          if (isAuthenticated) {
            clearAuth() // Очищаем состояние аутентификации
            queryClient.clear() // Очищаем кэш React Query

            // *** Используем router.navigate() из TanStack Router ***
            // Проверяем, существует ли router (на случай, если он еще не инициализирован)
            // и не находимся ли мы уже на целевой странице
            if (router && router.state.location.pathname !== '/') {
              await router.navigate({ to: '/' }) // Перенаправляем на главную
            }
          }
          // Сбросить флаг после того, как логика очистки выполнена
          // Небольшая задержка, чтобы дать системе обработать навигацию
          setTimeout(() => {
            isClearingAuth = false
          }, 500)
        }
      }
      // Здесь можно добавить логику обновления токена, если она нужна
      // if (status === 401 && !originalRequest._retry) { ... }
    } else {
      // Это сетевая ошибка или ошибка, не связанная с ответом сервера (например, "Network Error")
      console.error(
        'Network or Request Error (no response from server):',
        error.message,
      )
    }

    // Всегда пробрасываем ошибку дальше, чтобы ее могли обработать
    // компоненты через .catch() или onError в React Query.
    return Promise.reject(error)
  },
)

export default apiClient
