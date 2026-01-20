import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/statistic')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/statistic"!</div>
}
