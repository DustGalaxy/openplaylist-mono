import React from 'react'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'
import { Circle, Trash2 } from 'lucide-react'
import { TimeAgo } from '@/components/ui/TimeAgo'

interface NotificationCardProps {
  isRead: boolean
  createdAt: string
  icon: React.ReactNode
  badge?: React.ReactNode
  onMarkAsRead?: () => void
  onDelete?: () => void
  children: React.ReactNode
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  isRead,
  createdAt,
  icon,
  badge,
  onMarkAsRead,
  onDelete,
  children,
}) => {
  const { t } = useFeatureTranslation()

  return (
    <div
      className={`group relative flex flex-col items-start justify-between gap-1 p-2 bg-level-1 hover:bg-level-2/20 border-b border-level-2 transition-all duration-200 `}
    >
      <div className="relative w-full flex justify-between items-center gap-1 shrink-0 ">
        {/* Точка непрочитанного */}
        {!isRead && (
          <span className="absolute left-1.5 top-2/5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-level-3 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-level-3"></span>
          </span>
        )}
        <span
          className={`text-[11px] text-text-placeholder whitespace-nowrap shrink-0 ${!isRead ? 'ml-5' : 'ml-1'}`}
        >
          <TimeAgo timestamp={createdAt} />
        </span>
        {/* Экшены при наведении */}
        <div className="flex  items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
          {!isRead && onMarkAsRead && (
            <button
              type="button"
              onClick={onMarkAsRead}
              className="p-1.5 text-text-placeholder hover:text-level-3 hover:bg-level-4 rounded-lg transition"
              title={t(
                'notifications.actions.mark_read',
                'Отметить прочитанным',
              )}
            >
              <Circle className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 text-text-placeholder hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title={t('notifications.actions.delete', 'Удалить')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-start gap-3.5 w-full">
        {/* Аватарка типа + мелкий бэйдж источника */}
        <div className="relative shrink-0">
          <div className="p-2.5 bg-level-2 rounded-xl text-text-main transition-colors">
            {icon}
          </div>
          {badge && (
            <div className="absolute -bottom-1 -right-1 rounded-md p-0.5 bg-level-1 border border-level-2">
              {badge}
            </div>
          )}
        </div>

        {/* Тело карточки */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-col items-start justify-between gap-2">
            <div className="flex-1 min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
