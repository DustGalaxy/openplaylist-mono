import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { RouterProvider, createRouter } from '@tanstack/react-router'
import { registerAuthStrategies } from './lib/authStrategyRegistry'

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './i18n'
import './styles.css'
import reportWebVitals from './reportWebVitals.ts'
import ErrorComponent from './components/layout/RootError.tsx'
import { usePlaylistStore } from './stores/playlistStore/index.tsx'
import { getPlsUpdsSocket } from './api/io-sockets.ts'
import { useAuthStore } from './stores/authStore.tsx'
import { usePlaybackStore } from './stores/playbackStore.tsx'

declare global {
  interface Window {
    appConfig: {
      PROJECT_DOMAIN: string
      BACKEND_DOMAIN: string
      API_URL: string
      WS_API_URL: string
      SOCKET_PATH: string
      PLST_API_URL: string
      AUTH_API_URL: string
      ORDER_API_URL: string

      TWITCH_CLIENT_ID: string
      TWITCH_REDIRECT_URI: string
      TWITCH_SCOPES: Array<string>

      GOOGLE_CLIENT_ID: string
      GOOGLE_REDIRECT_URI: string
      GOOGLE_SCOPES: Array<string>

      DA_CLIENT_ID: string
      DA_REDIRECT_URI: string
      DA_SCOPES: Array<string>

      DONATEX_CLIENT_ID: string
      DONATEX_REDIRECT_URI: string
      DONATEX_SCOPES: Array<string>
      DONATEX_CODE_CHALLENGE_METHOD: string
    }
  }
}

const PROJECT_DOMAIN = window.location.origin
const BACKEND_DOMAIN = import.meta.env.DEV
  ? 'http://localhost:8000'
  : PROJECT_DOMAIN

window.appConfig = {
  PROJECT_DOMAIN: PROJECT_DOMAIN,
  BACKEND_DOMAIN,
  WS_API_URL: `${BACKEND_DOMAIN}`,
  SOCKET_PATH: '/api/socket.io',
  API_URL: `${BACKEND_DOMAIN}/api`,
  BACKEND_API_URL: `${BACKEND_DOMAIN}/api`,
  PLST_API_URL: `${BACKEND_DOMAIN}/api/playlist`,
  AUTH_API_URL: `${BACKEND_DOMAIN}/api`,
  ORDER_API_URL: `${BACKEND_DOMAIN}/api/order`,
  TWITCH_CLIENT_ID: 'vsil95c2am4rgvbgdax1o4a1u003mx',
  TWITCH_SCOPES: [
    'user:read:email',
    'channel:bot',
    'channel:read:redemptions',
    'channel:manage:redemptions',
  ],
  GOOGLE_CLIENT_ID:
    '684341768922-sd9fgqd8l3vhr7e4iep5c3ddqsgboaic.apps.googleusercontent.com',
  GOOGLE_REDIRECT_URI: `${PROJECT_DOMAIN}/oauth-callback`,
  GOOGLE_SCOPES: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    // 'https://www.googleapis.com/auth/youtube.readonly',
    'openid',
  ],

  DONATEX_CLIENT_ID: '2bca17b98ef34185',
  DONATEX_REDIRECT_URI: `${PROJECT_DOMAIN}/oauth-callback`,
  DONATEX_SCOPES: ['user.read', 'offline_access', 'donations.subscribe'],
  DONATEX_CODE_CHALLENGE_METHOD: 'S256',

  DA_CLIENT_ID: import.meta.env.DEV ? '19392' : '18779',
  DA_REDIRECT_URI: `${PROJECT_DOMAIN}/oauth-callback`,
  DA_SCOPES: ['oauth-user-show', 'oauth-donation-subscribe'],
}

registerAuthStrategies()

if (typeof usePlaylistStore !== 'undefined' && usePlaylistStore?.getState) {
  usePlaylistStore.getState().setSocket(getPlsUpdsSocket())
}

useAuthStore.subscribe((state) => {
  if (typeof usePlaylistStore !== 'undefined' && usePlaylistStore?.getState) {
    usePlaylistStore.getState().setUserId(state.user?.id ?? null)
  }
  if (typeof usePlaybackStore !== 'undefined' && usePlaybackStore?.getState) {
    usePlaybackStore.getState().syncUserChannel(state.user)
  }
})

const initialUser = useAuthStore.getState().user
if (initialUser && typeof usePlaybackStore !== 'undefined' && usePlaybackStore?.getState) {
  usePlaybackStore.getState().syncUserChannel(initialUser)
}

// Create a new router instance
export const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProvider.getContext(),
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultErrorComponent: ({ error }) => <ErrorComponent error={error} />,
  defaultNotFoundComponent: () => (
    <ErrorComponent error={new Error('Страница не найдена (404)')} />
  ),
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <TanStackQueryProvider.Provider>
      <RouterProvider router={router} />
    </TanStackQueryProvider.Provider>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
