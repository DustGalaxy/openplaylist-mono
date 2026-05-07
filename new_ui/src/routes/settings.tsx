import { createFileRoute } from '@tanstack/react-router'
import { getUserIntegrations } from '@/api/api-user'
import { useAuthStore } from '@/stores/authStore'
import { useDaLoginUrl, useTwitchLoginUrl } from '@/hooks/useAuthUrl'
import { UserSettingsPage } from '@/features/user-settings'
import Btn from '@/components/ui/my-btn'
import type { Integration } from '@/types/user'


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
  const { isAuthenticated, user, expired_at, setUser } = useAuthStore()
  const { integrations } = Route.useLoaderData()

  const handleTwitchLogin = useTwitchLoginUrl()
  const handleDaLogin = useDaLoginUrl()

  const handleUserUpdate = (patch: any) => {
    if (user) {
      setUser(
        {
          ...user,
          ...patch,
          email_confirmed:
            patch.email && patch.email !== user.email
              ? false
              : (patch.email_confirmed ?? user.email_confirmed),
        },
        expired_at,
      )
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex w-full items-center justify-center min-h-screen bg-level-1 p-4">
        <div className="flex flex-col max-w-[800px] w-full gap-6 text-text-main bg-level-2 rounded-2xl p-8 shadow-md border border-level-3">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-lg text-level-4">
            You need to login first to manage your accounts
          </p>
          <Btn
            text="Go to Login"
            onClick={() => (window.location.href = '/login')}
            className="px-6 py-3 text-lg"
          />
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
