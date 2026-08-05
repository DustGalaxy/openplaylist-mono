import { createFileRoute } from '@tanstack/react-router'
import { StatsPage } from '@/features/stats'

export const Route = createFileRoute('/statistic')({
  component: StatsPage,
})
