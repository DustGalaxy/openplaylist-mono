import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  ListMusic,
  Loader2,
  SlidersHorizontal,
  Trash2,
  User,
} from 'lucide-react'

import { toast } from 'sonner'
import type {
  SubscriptionItem,
  SubscriptionPatchPayload,
  SubscriptionSettings,
} from '@/features/notifications/types'
import { SubscriptionSettingsModal } from '@/features/notifications/components/SubscriptionSettingsModal'
import {
  deleteSubscription,
  getSubscriptions,
  patchSubscriptionSettings,
} from '@/api/api-user'

export const SubsTab: React.FC = () => {
  const { t } = useTranslation()
  const [subscriptions, setSubscriptions] = useState<Array<SubscriptionItem>>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)

  // Состояние для управления модалкой настроек конкретной подписки
  const [activeSub, setActiveSub] = useState<SubscriptionItem | null>(null)

  // Имитация загрузки данных с бэкенда (FastAPI)
  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const data = await getSubscriptions()
        setSubscriptions(data)
      } catch (err) {
        console.error('Ошибка загрузки подписок', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscriptions()
  }, [])

  // Удаление подписки (отписка)
  const handleUnsubscribe = async (subId: string) => {
    if (
      !confirm(
        t(
          'notifications.manager.confirm_unsubscribe',
          'Вы уверены, что хотите отписаться?',
        ),
      )
    )
      return

    try {
      const success = await deleteSubscription(subId)
      if (!success) {
        toast.error(
          t('notifications.manager.error_unsubscribe', 'Ошибка при отписке'),
        )
        throw new Error('Ошибка при отписке')
      }
      setSubscriptions((prev) => prev.filter((sub) => sub.id !== subId))
    } catch (err) {
      console.error('Не удалось отписаться', err)
    }
  }

  // Сохранение настроек из модалки
  const handleSaveSettings = async (newSettings: SubscriptionSettings) => {
    if (!activeSub) return

    try {
      const data: SubscriptionPatchPayload = {
        target_type: activeSub.target_type,
        settings: {
          allowed_event_types: newSettings.allowed_event_types,
        },
      }
      const newSub = await patchSubscriptionSettings(activeSub.id, data)
      if (!newSub) {
        toast.error(
          t(
            'notifications.manager.error_save_settings',
            'Ошибка при обновлении настроек',
          ),
        )
        throw new Error('Ошибка при обновлении настроек')
      }
      // Обновляем локальный стейт
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === activeSub.id ? { ...sub, settings: newSettings } : sub,
        ),
      )
    } catch (err) {
      console.error('Не удалось сохранить настройки', err)
      throw err // Прокидываем в модалку, чтобы она не закрылась при ошибке
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-text-placeholder">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>
          {t('notifications.manager.loading', 'Загрузка подписок...')}
        </span>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6 text-text-main">
      <div>
        <h2 className="text-xl font-bold  flex items-center gap-2">
          <div className="text-level-3 bg-level-4 rounded-lg p-2">
            <Bell className="w-5 h-5 " />
          </div>
          {t('notifications.manager.title', 'Управление подписками')}
        </h2>
        <p className="text-sm text-text-placeholder mt-1">
          {t(
            'notifications.manager.description',
            'Настройте гранулярные уведомления для каждого контента или отпишитесь от обновлений.',
          )}
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="p-8 border border-dashed border-neutral-800 rounded-xl text-center text-neutral-500">
          {t(
            'notifications.manager.empty',
            'У вас пока нет активных подписок.',
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-level-1 border border-level-2 rounded-xl gap-4 transition hover:border-level-3"
            >
              {/* Левая часть: Инфо об объекте подписки */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-3 bg-level-2 rounded-lg shrink-0">
                  {sub.target_type === 'playlist' ? (
                    <ListMusic className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <User className="w-5 h-5 text-sky-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-main text-sm sm:text-base truncate max-w-50 sm:max-w-75">
                      {sub.target_name}
                    </span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-level-2 text-text-placeholder">
                      {sub.target_type === 'playlist'
                        ? t('notifications.manager.type_playlist', 'Плейлист')
                        : t('notifications.manager.type_user', 'Юзер')}
                    </span>
                  </div>
                  {sub.target_type === 'playlist' && sub.target_owner && (
                    <p className="text-xs text-text-placeholder mt-0.5">
                      {t('notifications.manager.author', 'Автор')}:{' '}
                      {sub.target_owner}
                    </p>
                  )}
                  <p className="text-[11px] text-text-placeholder mt-1">
                    {t('notifications.manager.status', 'Активно')}{' '}
                    {sub.settings.allowed_event_types.length === 0 ? (
                      <>
                        <span className="text-text-main">🚫</span>{' '}
                        {t(
                          'notifications.manager.mute_all_status',
                          'Мут всего',
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-text-main">🔔</span>{' '}
                        {t(
                          'notifications.manager.triggers_count',
                          'триггеров: {{count}}',
                          {
                            count: sub.settings.allowed_event_types.length,
                          },
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Правая часть: Кнопки управления действиями */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-800">
                {/* Кнопка открытия шестеренки/настроек */}
                <button
                  type="button"
                  onClick={() => setActiveSub(sub)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-main bg-level-2 ring-1 ring-level-2 hover:ring-level-3 rounded-lg transition"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>
                    {t('notifications.manager.btn_configure', 'Настроить')}
                  </span>
                </button>

                {/* Кнопка отписки */}
                <button
                  type="button"
                  onClick={() => handleUnsubscribe(sub.id)}
                  className="p-1.5 text-text-placeholder hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title={t(
                    'notifications.manager.btn_unsubscribe_title',
                    'Отписаться',
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка настроек, которая рендерится только при выборе айтема */}
      {activeSub && (
        <SubscriptionSettingsModal
          isOpen={!!activeSub}
          targetType={activeSub.target_type}
          targetName={activeSub.target_name}
          initialSettings={activeSub.settings}
          onSave={handleSaveSettings}
          onClose={() => setActiveSub(null)}
        />
      )}
    </div>
  )
}
