import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import Btn from '@/components/ui/my-btn'

export interface AuthPageProps {
  defaultMode?: 'login' | 'register'
  onSuccess?: () => void
}

export function AuthPage({ defaultMode = 'login', onSuccess }: AuthPageProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode)

  return (
    <div className="min-h-screen flex items-center justify-center bg-level-2 px-4 py-8">
      <div className="w-full max-w-md">
        {mode === 'login' ? (
          <>
            <LoginForm onSuccess={onSuccess} />
            <div className="mt-6 text-center">
              <p className="text-text-secondary mb-3">
                {t('auth.page.noAccount')}
              </p>
              <Btn
                text={t('auth.page.createAccount')}
                onClick={() => setMode('register')}
                className="w-full"
              />
            </div>
          </>
        ) : (
          <>
            <RegisterForm onSuccess={onSuccess} />
            <div className="mt-6 text-center">
              <p className="text-text-secondary mb-3">
                {t('auth.page.hasAccount')}
              </p>
              <Btn
                text={t('auth.page.loginInstead')}
                onClick={() => setMode('login')}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
