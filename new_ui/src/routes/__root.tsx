import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Header from '@/components/layout/Header'

import { useCurrentUserQuery } from '@/hooks/useAuth.tsx'
import { useAuthStore } from '@/stores/authStore.tsx'
import { Toaster } from '@/components/ui/sonner'

interface MyRouterContext {
  queryClient: QueryClient
}

export const queryClient = new QueryClient()

function AppProviders({ children }: { children: React.ReactNode }) {
  const { isLoadingAuth } = useAuthStore()
  useCurrentUserQuery() // Убеждаемся, что хук запущен и управляет isLoadingAuth

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
  component: () => (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <div className="bg-level-1 min-w-[360px] min-h-screen">
          <Toaster richColors />
          <div className=" min-h-screen">
            <Header />

            <Outlet />
          </div>

          {/* <TanStackRouterDevtools />

          <TanStackQueryLayout /> */}
          {/* <div className="bg-level-1 min-w-[360px] flex flex-col items-center w-full mt-10 ">
            <footer className="bg-level-2  w-[90vw] min-h-10 border-2 border-level-3 border-b-0 rounded-t-(--rounded-std)">
              <p className="text-center text-text-main p-2">
                Openplaylist Beta ver. 2026.1
              </p>
            </footer>
          </div> */}
        </div>
      </AppProviders>
    </QueryClientProvider>
  ),
})
