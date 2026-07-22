import { useLocation, useNavigate } from '@tanstack/react-router'

import { useTranslation } from 'react-i18next'

import { Tabs, TabsContent } from '@/components/ui/tabs'
import Playlist from '@/features/playlist/components/Playlist'
import { useMusicStore } from '@/stores/musicStore'
import {
  gradientTextClass,
  pageInnerClass,
  pageWrapClass,
} from '@/features/landing/styles'

// ─── Hash helpers ──────────────────────────────────────────────────────────────

const HASH_PREFIX = 'plst-'

function getHashPlstId(hash: string): string {
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash
  return cleanHash.startsWith(HASH_PREFIX)
    ? cleanHash.slice(HASH_PREFIX.length)
    : ''
}

export default function Dashboard() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = getHashPlstId(location.hash)
  const playlistsData = useMusicStore((s) => s.playlists)

  const handleTabChange = (value: string) => {
    navigate({
      hash: value ? `${HASH_PREFIX}${value}` : '',
      replace: true,
    })
  }

  const sortedPlsts = [...playlistsData].sort((a, b) =>
    a.created_at > b.created_at ? 1 : -1,
  )

  return (
    <div className={pageWrapClass}>
      <div className={pageInnerClass}>
        <Tabs
          className="w-full"
          value={activeTab}
          onValueChange={handleTabChange}
        >
          {/* Пустая заглушка — показывается пока не выбран ни один таб */}
          <TabsContent value="">
            <header className="mt-4">
              <p className={`text-sm font-medium ${gradientTextClass}`}>
                {t('dashboard.eyebrow')}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
                {t('dashboard.title')}
              </h1>
              <p className="text-sm sm:text-base text-text-secondary mt-1">
                {t('dashboard.subtitle')}
              </p>
            </header>
          </TabsContent>

          {sortedPlsts.map((plst) => (
            <TabsContent key={plst.id} value={plst.id} className="">
              <Playlist playlist={plst} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
