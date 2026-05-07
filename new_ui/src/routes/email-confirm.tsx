import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'

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
  const navigate = useNavigate()
  const search = useSearch({ from: '/email-confirm' }) as SearchParams
  const queryClient = useQueryClient()
  const { setUser, clearAuth, setLoadingAuth, user } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  const email = search.email
  const sessionId = search.session_id

  const confirmEmailMutation = useMutation({
    mutationFn: async () => {
      if (!email || !sessionId) {
        throw new Error('Missing email or session_id parameters')
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
            throw new Error('Network error. Please check your connection.')
          }
          if (axiosError.response?.status === 400) {
            throw new Error(
              axiosError.response.data?.detail || 'Invalid confirmation link',
            )
          }
          if (axiosError.response?.status === 401) {
            throw new Error('Confirmation link expired. Please register again.')
          }
        }
        throw error
      }
    },
    onSuccess: () => {
      setLoadingAuth(true)
      // Fetch updated user profile after successful confirmation
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
          : 'Confirmation failed. Please try again.',
      )
    },
  })

  // Auto-confirm on mount if parameters are present
  useEffect(() => {
    if (user) {
      navigate({ to: '/dashboard' })
    }
    if (email && sessionId) {
      confirmEmailMutation.mutate()
    }
  }, [email, sessionId])

  // Validate parameters
  if (!email || !sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
        <div className="w-full max-w-md rounded-lg border border-red-500/20 bg-red-500/5 p-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold text-white">Invalid Link</h1>
          </div>
          <p className="text-slate-300 mb-6">
            This confirmation link is missing required parameters. Please check
            your email and try again.
          </p>
          <Button onClick={() => navigate({ to: '/login' })} className="w-full">
            Back to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900/50 backdrop-blur-sm p-8">
        {confirmEmailMutation.isPending && (
          <>
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-slate-700"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin"></div>
                <Loader2 className="absolute inset-2 h-12 w-12 text-blue-500 animate-spin m-auto" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              Confirming Email
            </h1>
            <p className="text-slate-400 text-center">
              We're verifying your email address:{' '}
              <span className="text-slate-200 font-medium">{email}</span>
            </p>
            <p className="text-slate-500 text-sm text-center mt-4">
              Please don't close this page...
            </p>
          </>
        )}

        {confirmEmailMutation.isSuccess && (
          <>
            <div className="flex items-center justify-center mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-500 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              Email Confirmed!
            </h1>
            <p className="text-slate-300 text-center mb-6">
              Your email has been successfully verified. You're now logged in.
            </p>
            <p className="text-slate-400 text-sm text-center">
              Redirecting to dashboard...
            </p>
          </>
        )}

        {confirmEmailMutation.isError && error && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
              <h1 className="text-2xl font-bold text-white">
                Confirmation Failed
              </h1>
            </div>
            <p className="text-slate-300 mb-6">{error}</p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate({ to: '/register' })}
                variant="default"
                className="w-full"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate({ to: '/login' })}
                variant="outline"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
export const Route = createFileRoute('/email-confirm')({
  component: EmailConfirmPage,
})
export default EmailConfirmPage
