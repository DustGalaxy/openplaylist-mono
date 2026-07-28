import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import axios from 'axios'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useOAuthUrl } from '@/hooks/useAuthUrl'
import { getConfig } from '@/lib/utils'
import apiClient from '@/lib/axios'
import { SocialAuthButtons } from './SocialAuthButtons'

export interface RegisterFormProps {
  onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const { t, tc } = useFeatureTranslation()
  const navigate = useNavigate()
  const handleOAuthRedirect = useOAuthUrl()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('social')

  const handleSocialRegister = async (platform: string) => {
    try {
      setIsLoading(true)
      setError(null)
      handleOAuthRedirect(platform, false)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('auth.register.error.socialFailed')
      setError(message)
      setIsLoading(false)
    }
  }

  const handleClassicRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !email || !password || !confirmPassword) {
      setError(t('auth.register.error.fillAll'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.register.error.passwordMismatch'))
      return
    }

    if (password.length < 8) {
      setError(t('auth.register.error.passwordShort'))
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const config = getConfig()
      const response = await apiClient.post(
        `${config.AUTH_API_URL}/login/register`,
        {
          username,
          email,
          password,
        },
        {
          withCredentials: true,
        },
      )

      if (response.status === 201) {
        onSuccess?.()
        navigate({ to: '/playlists' })
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.detail || t('auth.register.error.failed')
        setError(message)
      } else {
        setError(t('auth.register.error.unexpected'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl text-text-main  font-bold">
          {t('auth.register.title')}
        </h1>
        <p className="text-text-secondary">{t('auth.register.subtitle')}</p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive text-destructive text-sm">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="social">
            {t('auth.register.tab.social')}
          </TabsTrigger>
          <TabsTrigger value="classic">
            {t('auth.register.tab.classic')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="space-y-4 ">
          <p className="text-sm text-text-secondary text-center">
            {t('auth.register.socialHint')}
          </p>

          <SocialAuthButtons
            isLoading={isLoading}
            onPlatformClick={handleSocialRegister}
            mode="register"
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-level-3"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-level-1 text-text-secondary">
                {tc('common.or')}
              </span>
            </div>
          </div>

          <p className="text-sm text-text-secondary text-center">
            {t('auth.register.emailHint')}
          </p>
        </TabsContent>

        <TabsContent value="classic" className="space-y-4">
          <form onSubmit={handleClassicRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-text-main ">
                {t('auth.register.field.username')}
              </Label>
              <Input
                id="username"
                type="text"
                placeholder={t('auth.register.placeholder.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="text-text-main "
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-text-main ">
                {t('auth.register.field.email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.register.placeholder.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="text-text-main "
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-text-main ">
                {t('auth.register.field.password')}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.register.placeholder.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="text-text-main "
              />
              <p className="text-xs text-text-secondary">
                {t('auth.register.passwordHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-text-main ">
                {t('auth.register.field.confirmPassword')}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('auth.register.placeholder.password')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                ? t('auth.register.submitLoading')
                : t('auth.register.submit')}
            </Btn>
          </form>

          <button
            type="button"
            className="w-full text-center text-sm text-text-main  hover:underline"
            onClick={() => setActiveTab('social')}
          >
            {t('auth.register.backToSocial')}
          </button>
        </TabsContent>
      </Tabs>

      <div className="space-y-3 text-center">
        <p className="text-xs text-text-secondary">
          {t('auth.register.legal')}
        </p>
        <p className="text-sm text-text-main ">
          {t('auth.register.loginPrompt')}{' '}
          <Link to="/login" className="text-text-main  hover:underline">
            {t('auth.register.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
