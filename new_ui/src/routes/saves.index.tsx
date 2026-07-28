import { createFileRoute } from '@tanstack/react-router'
import SavesPage from '@/features/saves/components/SavesPage'

export const Route = createFileRoute('/saves/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="text-text-main">
      <SavesPage />
    </div>
  )
}
