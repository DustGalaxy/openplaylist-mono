import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import { FeatureI18nProvider, useFeatureTranslation } from '@/lib/i18n/featureTranslation'

import { useAuthStore } from '@/stores/authStore'
import { getConfig } from '@/lib/utils'
import apiClient from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface SearchParams {
  email?: string
  session_id?: string
}

const EmailConfirmPage = () => {
  const { t } = useFeatureTranslation()
  const navigate = useNavigate()
  const search = useSearch({ from: '/email-confirm' }) as SearchParams
  const queryClient = useQueryClient()
  const { setUser, setLoadingAuth, user } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  const email = search.email
  const sessionId = search.session_id

  const confirmEmailMutation = useMutation({
    mutationFn: async () => {
      if (!email || !sessionId) {
        throw new Error(t('auth.emailConfirm.missingParams'))
      }

      try {
        const config = getConfig()
        const response = await apiClient.post(
          `${config.AUTH_API_URL}/login/email_confirmation`,
          {
            email,
            session_id: sessionId,
          },
          {
            withCredentials: true,
          },
        )
        return response.data
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<{ detail?: string }>
          if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
            throw new Error(t('auth.emailConfirm.networkError'))
          }
          if (axiosError.response?.status === 400) {
            throw new Error(
              axiosError.response.data?.detail || t('auth.emailConfirm.invalid'),
            )
          }
          if (axiosError.response?.status === 401) {
            throw new Error(t('auth.emailConfirm.expired'))
          }
        }
        throw error
      }
    },
    onSuccess: () => {
      setLoadingAuth(true)
      queryClient
        .fetchQuery({
          queryKey: ['currentUserProfile'],
          queryFn: async () => {
            try {
              const config = getConfig()
              const response = await apiClient.get(
                `${config.AUTH_API_URL}/user/me`,
                {
                  withCredentials: true,
                },
              )
              return response.data
            } catch {
              return { user: null, expired_at: null }
            }
          },
          staleTime: 0,
          gcTime: 0,
        })
        .then((data) => {
          if (data?.user) {
            setUser(data.user, data.expired_at)
          }
          setLoadingAuth(false)
          navigate({ to: '/dashboard' })
        })
    },
    onError: (error) => {
      setLoadingAuth(false)
      setError(
        error instanceof Error
          ? error.message
          : t('auth.emailConfirm.confirmationFailedFallback'),
      )
    },
  })

  useEffect(() => {
    if (user) {
      navigate({ to: '/dashboard' })
    }
    if (email && sessionId) {
      confirmEmailMutation.mutate()
    }
  }, [email, sessionId])

  if (!email || !sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-level-1 px-4">
        <div className="w-full max-w-md rounded-lg border border-red-500/20 bg-level-2 p-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold text-text-main">
              {t('auth.emailConfirm.invalidLink')}
            </h1>
          </div>
          <p className="text-text-secondary mb-6">
            {t('auth.emailConfirm.missingParamsDetail')}
          </p>
          <Button onClick={() => navigate({ to: '/login' })} className="w-full">
            {t('auth.emailConfirm.backToLogin')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-level-1 px-4">
      <div className="w-full max-w-md rounded-(--rounded-std) border border-accent-muted bg-level-2 backdrop-blur-sm p-8 shadow-xl">
        {confirmEmailMutation.isPending && (
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-accent-muted"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin"></div>
                <Loader2 className="absolute inset-2 h-12 w-12 text-accent animate-spin m-auto" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-text-main text-center mb-2">
              {t('auth.emailConfirm.confirming')}
            </h1>
            <p className="text-text-secondary text-center">
              {t('auth.emailConfirm.verifyingEmail', { email })}
            </p>
            <p className="text-text-placeholder text-sm text-center mt-4">
              {t('auth.emailConfirm.pleaseWait')}
            </p>
          </>
        )}

        {confirmEmailMutation.isSuccess && (
          <>
            <div className="flex items-center justify-center mb-6">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-text-main text-center mb-2">
              {t('auth.emailConfirm.confirmed')}
            </h1>
            <p className="text-text-secondary text-center mb-6">
              {t('auth.emailConfirm.confirmedLoggedIn')}
            </p>
            <p className="text-text-secondary text-sm text-center">
              {t('auth.emailConfirm.redirecting')}
            </p>
          </>
        )}

        {confirmEmailMutation.isError && error && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
              <h1 className="text-2xl font-bold text-text-main">
                {t('auth.emailConfirm.failed')}
              </h1>
            </div>
            <p className="text-text-secondary mb-6">{error}</p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate({ to: '/register' })}
                variant="default"
                className="w-full"
              >
                {t('auth.emailConfirm.tryAgain')}
              </Button>
              <Button
                onClick={() => navigate({ to: '/login' })}
                variant="outline"
                className="w-full"
              >
                {t('auth.emailConfirm.backToLogin')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
export const Route = createFileRoute('/email-confirm')({
  component: () => (
    <FeatureI18nProvider ns="auth">
      <EmailConfirmPage />
    </FeatureI18nProvider>
  ),
})
export default EmailConfirmPage
