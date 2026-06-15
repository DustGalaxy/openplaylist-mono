import { createFileRoute, redirect } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/authStore'

export const Route = createFileRoute('/dashboard')({
  loader: () => {
    const user = useAuthStore.getState().user
    if (!user) {
      return redirect({ to: '/login' })
    }
  },
})
