import { createLazyFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createLazyFileRoute('/policy')({
  component: RouteComponent,
})

function RouteComponent() {
  const [content, setContent] = useState('')

  useEffect(() => {
    fetch('/policy.html')
      .then((r) => r.text())
      .then(setContent)
  }, [])
  return (
    <div
      className="bg-white"
      style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
