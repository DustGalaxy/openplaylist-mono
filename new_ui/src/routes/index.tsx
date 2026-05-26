import { createFileRoute } from '@tanstack/react-router'

import HomePage from '@/features/landing/home-page'

export const Route = createFileRoute('/')({
  component: HomePage,
})
