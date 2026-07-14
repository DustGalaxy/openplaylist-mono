import React from 'react'
import { useTranslation } from 'react-i18next'
import type { ReadNotification } from '../../types'

interface VariantProps {
  data: ReadNotification['data']
}

export const FallbackVariant: React.FC<VariantProps> = ({ data }) => {
  const { t } = useTranslation()

  return (
    <div>
      <span className="font-semibold text-text-main">
        {t('notifications.events.unknown', 'Новое уведомление')}
      </span>
      <p className="text-xs text-text-placeholder font-mono mt-0.5">
        {JSON.stringify(data)}
      </p>
    </div>
  )
}
