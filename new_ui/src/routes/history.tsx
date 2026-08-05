import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '@/features/placeholder'
import { History } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/history')({
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useTranslation('placeholder')
  const { t: tc } = useTranslation('common')
  return (
    <PlaceholderPage
      featureName={t('historyTitle', 'Історія замовлень')}
      icon={History}
      highlights={[
        t('historyH1', 'Перегляд усіх раніше відтворених та замовлених треків'),
        t(
          'historyH2',
          'Детальна фільтрація за датою, замовником та платформами',
        ),
      ]}
      actionLink="/"
      actionText={tc('back', 'На головну')}
    />
  )
}
