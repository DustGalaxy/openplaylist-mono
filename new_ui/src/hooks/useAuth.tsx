// src/hooks/useAuth.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import axios from 'axios'
import type { UseNavigateResult } from '@tanstack/react-router'
import type { AxiosError } from 'axios'

import apiClient from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import {
  OAUTH_STATE_KEY,
  REDIRECT_AFTER_LOGIN_KEY,
  getConfig,
} from '@/lib/utils'

interface UserProfile {
  id: string
  username: string
  curr_platform: string
  profile_image_url: string
  // ... другие данные
}

interface BackendUserProfileResponse {
  user: UserProfile | null
  expired_at: number | null
}

// --- 1. Запрос текущего пользователя с вашего бэкенда ---
export async function fetchCurrentUserProfile(): Promise<BackendUserProfileResponse | null> {
  try {
    const config = getConfig()
    const response = await apiClient.get<BackendUserProfileResponse>(
      `${config.AUTH_API_URL}/user/me`,
      {
        withCredentials: true,
      },
    )
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      if (
        axiosError.code === 'ERR_NETWORK' ||
        !axiosError.response ||
        axiosError.response.status === 401 ||
        axiosError.response.status === 403 ||
        axiosError.response.status === 404
      ) {
        console.warn(
          'Backend connection/authentication issue. Treating as unauthenticated:',
          axiosError.message,
        )
        return { user: null, expired_at: null }
      }
    }
    throw error
  }
}

export const useCurrentUserQuery = () => {
  const { setUser, setLoadingAuth, clearAuth, isAuthenticated, user } =
    useAuthStore()
  const shouldFetchRef = useRef(true)

  useEffect(() => {
    // При старте приложения, если Zustand уже говорит, что мы не авторизованы,
    // то и не нужно пытаться фетчить /me
    if (!isAuthenticated && !user) {
      shouldFetchRef.current = false
    } else {
      shouldFetchRef.current = true // Если есть данные, пытаемся их валидировать
    }
    // Этот эффект запускается только один раз при монтировании, чтобы задать начальное значение
  }, [])

  const queryResult = useQuery<
    BackendUserProfileResponse | null,
    Error,
    BackendUserProfileResponse | null,
    ['currentUserProfile']
  >({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      const {
        isAuthenticated: storedIsAuthenticated,
        user: storedUser,
        expired_at: exp,
      } = useAuthStore.getState()

      if (!exp || exp * 1000 < Date.now()) {
        console.log('Session expired. Logoutting...')
        clearAuth()
        return { user: null, expired_at: null }
      } else if (storedIsAuthenticated && storedUser) {
        console.log(
          'User already authenticated from localStorage. Skipping /api/me fetch.',
        )
        setLoadingAuth(false)
        return { user: storedUser, expired_at: exp }
      } else {
        console.log(
          'No authentication data in localStorage or invalid. Fetching /api/me...',
        )
        setLoadingAuth(true)
        // eslint-disable-next-line no-useless-catch
        try {
          const data = await fetchCurrentUserProfile()
          return data
        } catch (e) {
          throw e
        }
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (queryResult.isSuccess) {
      if (queryResult.data && queryResult.data.user) {
        setUser(queryResult.data.user, queryResult.data.expired_at)
      } else {
        clearAuth()
      }
      shouldFetchRef.current = false
      setLoadingAuth(false)
    } else if (queryResult.isError) {
      console.error(
        'Error fetching current user profile (after trying backend):',
        queryResult.error,
      )
      clearAuth()
      setLoadingAuth(false)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (queryResult.isPending && !isAuthenticated && !user) {
      setLoadingAuth(true)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (!queryResult.isPending && (isAuthenticated || user)) {
      setLoadingAuth(false)
    }
  }, [
    queryResult.isSuccess,
    queryResult.isError,
    queryResult.isPending,
    queryResult.data,
    queryResult.error,
    setUser,
    setLoadingAuth,
    clearAuth,
    isAuthenticated,
    user,
  ])

  return queryResult
}

export const useDaIntegration = ({
  navigate,
}: {
  navigate: UseNavigateResult<string>
}) => {
  return useMutation({
    mutationFn: async (payload: { code: string }) => {
      try {
        const config = getConfig()
        await apiClient.post(
          `${config.AUTH_API_URL}/user/integration`,
          {
            code: { code: payload.code },
            type: { type: 'da' },
          },
          {
            withCredentials: true,
          },
        )
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError
          if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
            console.error(
              'Network Error: Could not connect to backend for DA auth code exchange.',
              axiosError.message,
            )
            throw new Error(
              'Server is unreachable. Cannot complete DA authentication.',
            )
          }
          if (
            axiosError.response.status === 400 ||
            axiosError.response.status === 401
          ) {
            throw new Error(
              'DA authentication failed on backend (invalid code or internal error).',
            )
          }
        }
        throw error
      }
    },
    onSuccess: () => {
      const redirectToPath =
        localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) || '/dashboard'

      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)

      navigate({ to: redirectToPath })
    },
    onError: (error) => {
      console.error('DA authentication error:', error)
    },
  })
}

export const useDAAuthMutation = ({
  navigate,
}: {
  navigate: UseNavigateResult<string>
}) => {
  return useMutation({
    mutationFn: async (payload: { code: string }) => {
      try {
        const config = getConfig()
        await apiClient.post(
          `${config.AUTH_API_URL}/login/social/da`,
          payload,
          {
            withCredentials: true,
          },
        )
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError
          if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
            console.error(
              'Network Error: Could not connect to backend for DA auth code exchange.',
              axiosError.message,
            )
            throw new Error(
              'Server is unreachable. Cannot complete DA authentication.',
            )
          }
          if (
            axiosError.response.status === 400 ||
            axiosError.response.status === 401
          ) {
            throw new Error(
              'DA authentication failed on backend (invalid code or internal error).',
            )
          }
        }
        throw error
      }
    },
    onSuccess: () => {
      const redirectToPath =
        localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) || '/dashboard'

      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)

      navigate({ to: redirectToPath })
    },
    onError: (error) => {
      console.error('DA authentication error:', error)
    },
  })
}

export const useTwitchIntegration = ({
  navigate,
}: {
  navigate: UseNavigateResult<string>
}) => {
  return useMutation({
    mutationFn: async (payload: { code: string }) => {
      try {
        const config = getConfig()
        await apiClient.post(
          `${config.AUTH_API_URL}/user/integration`,
          {
            code: { code: payload.code },
            type: { type: 'twitch' },
          },
          {
            withCredentials: true,
          },
        )
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError
          if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
            console.error(
              'Network Error: Could not connect to backend for Twitch auth code exchange.',
              axiosError.message,
            )
            throw new Error(
              'Server is unreachable. Cannot complete Twitch authentication.',
            )
          }
          if (
            axiosError.response.status === 400 ||
            axiosError.response.status === 401
          ) {
            throw new Error(
              'Twitch authentication failed on backend (invalid code or internal error).',
            )
          }
        }
        throw error
      }
    },
    onSuccess: () => {
      const redirectToPath =
        localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) || '/dashboard'

      localStorage.removeItem(OAUTH_STATE_KEY)
      localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)

      navigate({ to: redirectToPath })
    },
    onError: (error) => {
      console.error('DA authentication error:', error)
    },
  })
}

export const useTwitchAuthMutation = ({
  navigate,
}: {
  navigate: UseNavigateResult<string>
}) => {
  const queryClient = useQueryClient()
  const { clearAuth, setUser } = useAuthStore()

  const mutationResult = useMutation({
    mutationFn: async (payload: { code: string }) => {
      try {
        const config = getConfig()
        await apiClient.post(
          `${config.AUTH_API_URL}/login/social/twitch`,
          payload,
          {
            withCredentials: true,
          },
        )
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError
          if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
            console.error(
              'Network Error: Could not connect to backend for Twitch auth code exchange.',
              axiosError.message,
            )
            throw new Error(
              'Server is unreachable. Cannot complete Twitch authentication.',
            )
          }
          if (
            axiosError.response.status === 400 ||
            axiosError.response.status === 401
          ) {
            throw new Error(
              'Twitch authentication failed on backend (invalid code or internal error).',
            )
          }
        }
        throw error
      }
    },
    onSuccess: async () => {
      console.log(
        'Twitch code exchange successful. Now manually re-fetching user profile to update.',
      )
      // После успешного обмена кода, НЕМЕДЛЕННО ЗАПРОСИТЬ профиль пользователя.
      // Этот запрос должен быть успешным, так как кука уже установлена.
      try {
        const userProfileResponse = await queryClient.fetchQuery({
          queryKey: ['currentUserProfile'],
          queryFn: fetchCurrentUserProfile,
          staleTime: 0,
          gcTime: 0,
        })

        if (userProfileResponse && userProfileResponse.user) {
          setUser(userProfileResponse.user, userProfileResponse.expired_at)
          const redirectToPath =
            localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) || '/dashboard'

          localStorage.removeItem(OAUTH_STATE_KEY)
          localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)

          navigate({ to: redirectToPath })
        } else {
          console.error(
            'Backend exchange successful, but /api/me returned no user data.',
          )
          clearAuth()
          throw new Error(
            'User profile not retrieved after successful code exchange.',
          )
        }
      } catch (profileError) {
        console.error(
          'Failed to fetch user profile after successful code exchange:',
          profileError,
        )
        clearAuth() // При любой ошибке профиля, сбрасываем авторизацию
        throw profileError // Пробрасываем дальше, чтобы mutationResult.isError сработал
      }
    },
    onError: (error) => {
      console.error('Twitch authentication error:', error)
      clearAuth() // Всегда очищаем, если мутация провалилась
    },
  })
  return mutationResult
}

// --- 3. Мутация для выхода из системы ---
async function logoutBackend(): Promise<void> {
  try {
    const config = getConfig()
    await apiClient.post(
      `${config.AUTH_API_URL}/logout`,
      {},
      {
        withCredentials: true,
      },
    )
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
        console.warn(
          'Network Error during logout. Treating as successful logout.',
          axiosError.message,
        )
        return // Игнорируем ошибку сети для logout
      }
    }
    throw error
  }
}

export const useLogoutMutation = () => {
  const queryClient = useQueryClient()
  const { clearAuth } = useAuthStore()

  const mutationResult = useMutation({
    mutationFn: logoutBackend,
  })

  useEffect(() => {
    if (mutationResult.isSuccess) {
      clearAuth()
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] })
      redirect({ to: '/' })
    } else if (mutationResult.isError) {
      console.error('Logout error:', mutationResult.error)
      // alert(mutationResult.error.message || 'An unexpected error occurred during logout.');
    }
  }, [
    mutationResult.isSuccess,
    mutationResult.isError,
    mutationResult.error,
    queryClient,
    clearAuth,
  ])

  return mutationResult
}
