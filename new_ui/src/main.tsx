import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { RouterProvider, createRouter } from '@tanstack/react-router'

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './styles.css'
import reportWebVitals from './reportWebVitals.ts'

declare global {
  interface Window {
    appConfig: {
      WS_API_URL: string
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

window.appConfig = {
  WS_API_URL: import.meta.env.VITE_WS_API_URL,
  PLST_API_URL: import.meta.env.VITE_PLST_API_URL,
  AUTH_API_URL: import.meta.env.VITE_AUTH_API_URL,
  ORDER_API_URL: import.meta.env.VITE_ORDER_API_URL,
  TWITCH_CLIENT_ID: import.meta.env.VITE_TWITCH_CLIENT_ID,
  TWITCH_REDIRECT_URI: import.meta.env.VITE_TWITCH_REDIRECT_URI,
  TWITCH_SCOPES: import.meta.env.VITE_TWITCH_SCOPES,
  DA_CLIENT_ID: import.meta.env.VITE_DA_CLIENT_ID,
  DA_REDIRECT_URI: import.meta.env.VITE_DA_REDIRECT_URI,
  DA_SCOPES: import.meta.env.VITE_DA_SCOPES,
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
