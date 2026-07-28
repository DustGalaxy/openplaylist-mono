import { createFileRoute } from '@tanstack/react-router'

import HomePage from '@/features/landing/home-page'
import { FeatureI18nProvider } from '@/lib/i18n/featureTranslation'

export const Route = createFileRoute('/')({
  component: () => (
    <FeatureI18nProvider ns="landing">
      <HomePage />
    </FeatureI18nProvider>
  ),
})

