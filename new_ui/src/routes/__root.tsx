import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Footer from '@/components/layout/Footer'
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
        <div className="bg-level-1 min-w-[360px] min-h-screen flex flex-col">
          <Toaster richColors />
          <Header />
          <main className="flex-1 w-full">
            <Outlet />
          </main>
          <Footer />
        </div>
      </AppProviders>
    </QueryClientProvider>
  ),
})
