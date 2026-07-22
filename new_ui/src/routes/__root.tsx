import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import PlayerBar from '@/features/player/PlayerBar'
import { useCurrentUserQuery } from '@/hooks/useAuth.tsx'
import { useAuthStore } from '@/stores/authStore.tsx'
import { Toaster } from '@/components/ui/sonner'
import { usePlaylistsLifecycle } from '@/hooks/usePlaylistsLifecycle'
import { useLayoutStore } from '@/stores/layoutStore'
import { usePlayerSessionRestore } from '@/features/player/hooks/usePlayerSessionRestore'

interface MyRouterContext {
  queryClient: QueryClient
}

export const queryClient = new QueryClient()

function AppProviders({ children }: { children: React.ReactNode }) {
  const { isLoadingAuth } = useAuthStore()

  useCurrentUserQuery()
  usePlaylistsLifecycle()
  usePlayerSessionRestore()

  if (isLoadingAuth) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '24px',
        }}
      >
        Загрузка приложения...
      </div>
    )
  }

  return <>{children}</>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  loader: async () => {},
  component: () => {
    const setContentAreaEl = useLayoutStore((s) => s.setContentAreaEl)

    return (
      <QueryClientProvider client={queryClient}>
        <AppProviders>
          <div className="bg-level-1 min-w-90 h-screen flex flex-col p-2  ">
            <div className="flex flex-col min-h-full min-w-full rounded-md overflow-clip">
              <Toaster richColors />
              <Header />

              <div className="flex-1 flex min-h-0 ">
                <Sidebar />
                <main
                  ref={setContentAreaEl}
                  className="flex-1 min-w-0 overflow-y-auto relative p-1"
                >
                  <Outlet />
                </main>
              </div>

              <PlayerBar />
            </div>
          </div>
        </AppProviders>
      </QueryClientProvider>
    )
  },
})
