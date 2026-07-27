import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import SearchPlaylist from '@/features/united-playlist/components/search-playlist'

export const Route = createFileRoute('/playlists/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState('')

  return <SearchPlaylist showHeader />
}
