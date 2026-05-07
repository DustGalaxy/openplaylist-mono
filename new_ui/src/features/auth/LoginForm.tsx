import { useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import axios from 'axios'

import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useOAuthUrl } from '@/hooks/useAuthUrl'
import { getConfig } from '@/lib/utils'
import apiClient from '@/lib/axios'
import { SocialAuthButtons } from './SocialAuthButtons'

export interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const navigate = useNavigate()
  const handleOAuthRedirect = useOAuthUrl()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('social')

  const handleSocialLogin = async (platform: string) => {
    try {
      setIsLoading(true)
      setError(null)
      handleOAuthRedirect(platform, false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Social login failed'
      setError(message)
      setIsLoading(false)
    }
  }

  const handleClassicLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Please fill in all fields')
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
        onSuccess?.()
        navigate({ to: '/dashboard' })
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.detail || 'Login failed. Please try again.'
        setError(message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl text-text-main font-bold">Login</h1>
        <p className="text-text-secondary">Connect with your account</p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive text-destructive text-sm">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="social">Social Login</TabsTrigger>
          <TabsTrigger value="classic">Email & Password</TabsTrigger>
        </TabsList>

        {/* Social Login Tab */}
        <TabsContent value="social" className="space-y-4">
          <p className="text-sm text-text-secondary text-center">
            Sign in with your favorite platform
          </p>

          <SocialAuthButtons
            isLoading={isLoading}
            onPlatformClick={handleSocialLogin}
            mode="login"
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-level-3"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-level-1 text-text-main">or</span>
            </div>
          </div>
          <div className="text-text-secondary text-xs text-center">
            Don't have an social account link to yours? Login via email →
          </div>
        </TabsContent>

        {/* Classic Login Tab */}
        <TabsContent value="classic" className="space-y-4">
          <form onSubmit={handleClassicLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-text-main ">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="text-text-main "
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-text-main ">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="text-text-main "
              />
            </div>

            <Btn
              text={isLoading ? 'Logging in...' : 'Login'}
              onClick={() => {}}
              disabled={isLoading}
              className="w-full text-text-main bg-level-2"
            />
          </form>

          <button
            type="button"
            className="w-full text-text-main  text-center text-sm hover:underline"
            onClick={() => setActiveTab('social')}
          >
            Back to social login
          </button>
        </TabsContent>
      </Tabs>

      <div className="space-y-3 text-center">
        <p className="text-xs text-text-secondary">
          By logging in, you agree to our Terms of Service and Privacy Policy
        </p>
        <p className="text-sm text-text-main ">
          Don't have an account?{' '}
          <Link to="/register" className="text-text-main  hover:underline">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  )
}
