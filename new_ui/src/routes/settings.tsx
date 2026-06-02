import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getUserIntegrations } from '@/api/api-user'
import { useAuthStore } from '@/stores/authStore'
import { useDaLoginUrl, useTwitchLoginUrl } from '@/hooks/useAuthUrl'
import { UserSettingsPage } from '@/features/user-settings'
import { useTranslation } from 'react-i18next'
import Btn from '@/components/ui/my-btn'
import {
  gradientTextClass,
  pageInnerClass,
  pageWrapClass,
  panelClass,
} from '@/features/landing/styles'
import type { Integration, UserProfile } from '@/types/user'

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
  loader: async () => {
    try {
      const integrations: Array<Integration> = await getUserIntegrations()
      return { integrations }
    } catch {
      return { integrations: [] }
    }
  },
})

function RouteComponent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated, user, expired_at, setUser } = useAuthStore()
  const { integrations } = Route.useLoaderData()

  const handleTwitchLogin = useTwitchLoginUrl()
  const handleDaLogin = useDaLoginUrl()

  const handleUserUpdate = (patch: Partial<UserProfile>) => {
    if (user) {
      const emailChanged =
        patch.email !== undefined && patch.email !== user.email
      setUser(
        {
          ...user,
          ...patch,
          email_confirmed: emailChanged
            ? false
            : (patch.email_confirmed ?? user.email_confirmed),
        },
        expired_at,
      )
    }
  }

  if (!isAuthenticated) {
    return (
      <div className={pageWrapClass}>
        <div className={pageInnerClass}>
          <div
            className={`flex flex-col gap-6 text-text-main p-6 sm:p-8 ${panelClass}`}
          >
            <header>
              <p
                className={`text-sm font-medium mb-2 ${gradientTextClass}`}
              >
                {t('settings.eyebrow')}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {t('settings.unauth.title')}
              </h1>
            </header>
            <p className="text-text-secondary">{t('settings.unauth.message')}</p>
            <Btn
              text={t('settings.unauth.cta')}
              onClick={() => navigate({ to: '/login' })}
              className="px-6 h-12 text-base font-bold bg-level-2 text-text-main w-full sm:w-auto"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <UserSettingsPage
      user={user}
      expired_at={expired_at}
      integrations={integrations}
      onUserUpdate={handleUserUpdate}
      useTwitchLoginUrl={() => handleTwitchLogin}
      useDaLoginUrl={() => handleDaLogin}
    />
  )
}
