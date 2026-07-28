import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import SearchPlaylist from '@/features/united-playlist/components/search-playlist'
import { FeatureI18nProvider } from '@/lib/i18n/featureTranslation'

export const Route = createFileRoute('/playlists/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <FeatureI18nProvider ns={'playlist'}>
      <SearchPlaylist showHeader />
    </FeatureI18nProvider>
  )
}
