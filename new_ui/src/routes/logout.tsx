import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLogoutMutation } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/logout')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation()
  const {
    mutate: logout,
    isSuccess,
    isPending,
    isError,
    error,
  } = useLogoutMutation()
  const { clearAuth } = useAuthStore()

  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && !isSuccess && !isError) {
      logout()
    }
  }, [logout, isPending, isSuccess, isError])

  useEffect(() => {
    if (isSuccess) {
      console.log('Successfully logged out!')
      navigate({ to: '/' })
    } else if (isError) {
      console.error('Logout failed:', error)
      clearAuth()
    }
  }, [isSuccess, isError, error, clearAuth, navigate])

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
      }}
    >
      <h1>{t('auth.logout.title')}</h1>
      {isPending && <p>{t('auth.logout.pleaseWait')}</p>}
      {isError && (
        <p style={{ color: 'red' }}>
          {t('auth.logout.errorDetail', {
            message: error?.message || t('auth.oauthCallback.unknownError'),
          })}
          <br />
          {t('auth.logout.errorLocalClear')}
        </p>
      )}
      {isSuccess && <p>{t('auth.logout.redirecting')}</p>}
    </div>
  )
}
