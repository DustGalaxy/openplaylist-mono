import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { RouterProvider, createRouter } from '@tanstack/react-router'
import { registerAuthStrategies } from './lib/authStrategyRegistry'

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'
import reportWebVitals from './reportWebVitals.ts'

declare global {
  interface Window {
    appConfig: {
      PROJECT_DOMAIN: string
      WS_API_URL: string
      SOCKET_PATH: string
      PLST_API_URL: string
      AUTH_API_URL: string
      ORDER_API_URL: string
      TWITCH_CLIENT_ID: string
      TWITCH_REDIRECT_URI: string
      TWITCH_SCOPES: string
      DA_CLIENT_ID: string
      DA_REDIRECT_URI: string
      DA_SCOPES: string
    }
  }
}

const PROJECT_DOMAIN = 'openplaylist.midnull.space'

// # API URLы (Если бэкенд в том же докере, можно слать через прокси)
// WS_URL='https://openplaylist.localhost'
// SOCKET_PATH='/api/socket.io'
// PLST_URL='https://openplaylist.localhost/api/playlist'
// SETTINGS_URL='https://openplaylist.localhost/api/settings'
// AUTH_URL='https://openplaylist.localhost/api'
// ORDER_URL='https://openplaylist.localhost/api/order'

// # Twitch Settings
// TWITCH_ID='vsil95c2am4rgvbgdax1o4a1u003mx'
// TWITCH_REDIRECT='https://openplaylist.localhost/oauth-callback'
// TWITCH_SCOPES='user:read:email'

// # DonationAlerts Settings
// DA_CLIENT_ID="18779"
// DA_REDIRECT_URI="http://openplaylist.localhost/oauth-callback"
// DA_SCOPES="oauth-user-show oauth-donation-subscribe"

window.appConfig ??= {
  PROJECT_DOMAIN: PROJECT_DOMAIN,
  WS_API_URL: `https://${PROJECT_DOMAIN}`,
  SOCKET_PATH: '/api/socket.io',
  PLST_API_URL: `https://${PROJECT_DOMAIN}/api/playlist`,
  AUTH_API_URL: `https://${PROJECT_DOMAIN}/api`,
  ORDER_API_URL: `https://${PROJECT_DOMAIN}/api/order`,
  TWITCH_CLIENT_ID: 'vsil95c2am4rgvbgdax1o4a1u003mx',
  TWITCH_REDIRECT_URI: `https://${PROJECT_DOMAIN}/oauth-callback`,
  TWITCH_SCOPES: 'user:read:email',
  DA_CLIENT_ID: '18779',
  DA_REDIRECT_URI: `http://${PROJECT_DOMAIN}/oauth-callback`,
  DA_SCOPES: 'oauth-user-show oauth-donation-subscribe',
}
registerAuthStrategies()
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
