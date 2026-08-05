import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

import { SocialAuthButtons } from './SocialAuthButtons'
import type { BackendUserProfileResponse } from '@/hooks/useAuth'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchCurrentUserProfile } from '@/hooks/useAuth'
import { useOAuthUrl } from '@/hooks/useAuthUrl'
import { REDIRECT_AFTER_LOGIN_KEY, getConfig } from '@/lib/utils'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'

export interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { t, tc } = useFeatureTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const handleOAuthRedirect = useOAuthUrl()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('social')
  const { setUser } = useAuthStore()

  const handleSocialLogin = async (platform: string) => {
    try {
      setIsLoading(true)
      setError(null)
      handleOAuthRedirect(platform, false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('auth.login.error.socialFailed')
      setError(message)
      setIsLoading(false)
    }
  }

  const handleClassicLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError(t('auth.login.error.fillAll'))
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const config = getConfig()
      const response = await apiClient.post(
        `${config.AUTH_API_URL}/login/classic`,
        {
          email,
          password,
        },
        {
          withCredentials: true,
        },
      )

      if (response.status === 200) {
        const userProfileResponse =
          await queryClient.fetchQuery<BackendUserProfileResponse | null>({
            queryKey: ['currentUserProfile'],
            queryFn: fetchCurrentUserProfile,
            staleTime: 0,
            gcTime: 0,
          })

        if (userProfileResponse?.user) {
          setUser(userProfileResponse.user, userProfileResponse.expired_at)
          onSuccess?.()

          const redirectToPath =
            localStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) || '/playlists'
          localStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY)
          navigate({ to: redirectToPath })
        } else {
          setError(t('auth.login.error.profileLoad'))
        }
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.detail || t('auth.login.error.failed')
        setError(message)
      } else {
        setError(t('auth.login.error.unexpected'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl text-text-main font-bold">
          {t('auth.login.title')}
        </h1>
        <p className="text-text-secondary">{t('auth.login.subtitle')}</p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive text-destructive text-sm">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="social">{t('auth.login.tab.social')}</TabsTrigger>
          <TabsTrigger value="classic">
            {t('auth.login.tab.classic')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="space-y-4">
          <p className="text-sm text-text-secondary text-center">
            {t('auth.login.socialHint')}
          </p>

          <SocialAuthButtons
            isLoading={isLoading}
            onPlatformClick={handleSocialLogin}
            mode="login"
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-accent"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-level-1 text-text-main">
                {tc('common.or')}
              </span>
            </div>
          </div>
          <div className="text-text-secondary text-xs text-center">
            {t('auth.login.socialFallbackHint')}
          </div>
        </TabsContent>

        <TabsContent value="classic" className="space-y-4">
          <form onSubmit={handleClassicLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-text-main ">
                {t('auth.login.field.email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.login.placeholder.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="text-text-main "
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-text-main ">
                {t('auth.login.field.password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.login.placeholder.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="text-text-main "
              />
            </div>

            <Btn
              onClick={() => {}}
              disabled={isLoading}
              className="w-full text-text-main bg-level-2"
            >
              {isLoading
                ? t('auth.login.submitLoading')
                : t('auth.login.submit')}
            </Btn>
          </form>

          <button
            type="button"
            className="w-full text-text-main  text-center text-sm hover:underline"
            onClick={() => setActiveTab('social')}
          >
            {t('auth.login.backToSocial')}
          </button>
        </TabsContent>
      </Tabs>

      <div className="space-y-3 text-center">
        <p className="text-xs text-text-secondary">{t('auth.login.legal')}</p>
        <p className="text-sm text-text-main ">
          {t('auth.login.registerPrompt')}{' '}
          <Link to="/register" className="text-text-main  hover:underline">
            {t('auth.login.registerLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
