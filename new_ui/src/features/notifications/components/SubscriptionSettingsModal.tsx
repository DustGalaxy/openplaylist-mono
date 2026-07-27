import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, Loader2, Save } from 'lucide-react'
import { NOTIFICATION_EVENTS_MAP } from '../types'
import type {
  AnyNotificationEventType,
  SubscriptionSettings,
  TargetType,
} from '../types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Btn from '@/components/ui/my-btn'

interface SubscriptionSettingsModalProps {
  isOpen: boolean
  targetType: TargetType
  targetName: string
  initialSettings: SubscriptionSettings
  onSave: (settings: SubscriptionSettings) => Promise<void>
  onClose: () => void
}

export const SubscriptionSettingsModal: React.FC<
  SubscriptionSettingsModalProps
> = ({ isOpen, targetType, targetName, initialSettings, onSave, onClose }) => {
  const { t } = useTranslation('notifications')
  const { t: tc } = useTranslation()
  const [allowedEvents, setAllowedEvents] = useState<
    Array<AnyNotificationEventType>
  >(initialSettings.allowed_event_types)
  const [isSaving, setIsSaving] = useState(false)

  const availableSwitches = NOTIFICATION_EVENTS_MAP[targetType]

  const handleToggle = (eventId: AnyNotificationEventType) => {
    setAllowedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId],
    )
  }

  const handleMuteAll = () => setAllowedEvents([])
  const handleUnmuteAll = () =>
    setAllowedEvents(availableSwitches.map((s) => s.id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({ allowed_event_types: allowedEvents })
      onClose()
    } catch (error) {
      console.error('Failed to save subscription settings', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-level-1 border-level-3 text-neutral-200 p-0 overflow-hidden gap-0">
        {/* Шапка модалки */}
        <DialogHeader className="p-6 border-b border-level-3 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-level-4 text-level-3 rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-lg font-semibold text-text-main leading-none">
                {t('notifications.settings.title', 'Настройки уведомлений')}
              </DialogTitle>
              <DialogDescription className="text-xs text-text-placeholder truncate max-w-85">
                {targetType === 'playlist'
                  ? t('notifications.settings.target_playlist', 'Плейлист')
                  : t('notifications.settings.target_user', 'Пользователь')}
                :{' '}
                <span className="text-text-main font-medium">{targetName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Быстрые действия */}
        <div className="px-6 py-2.5 bg-level-2 border-b border-level-3 flex justify-between items-center gap-2">
          <span className="text-xs text-text-placeholder">
            {t('notifications.settings.quick_setup', 'Быстрые настройки:')}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUnmuteAll}
              className="text-xs text-level-3 hover:text-level-3/40 font-medium transition"
            >
              {t('notifications.settings.unmute_all', 'Включить все')}
            </button>
            <span className="text-text-placeholder text-xs">|</span>
            <button
              type="button"
              onClick={handleMuteAll}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition"
            >
              <BellOff className="w-3 h-3" />{' '}
              {t('notifications.settings.mute_all', 'Глушить всё')}
            </button>
          </div>
        </div>

        {/* Форма со свичами */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-87.5 overflow-y-auto space-y-4 divide-y divide-text-secondary/45">
            {availableSwitches.map((item, index) => {
              const isChecked = allowedEvents.includes(item.id)
              return (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-4 ${index > 0 ? 'pt-4' : ''}`}
                >
                  <div className="space-y-0.5">
                    <label
                      htmlFor={item.id}
                      className="text-sm font-medium text-text-main cursor-pointer select-none"
                    >
                      {t(`notifications.events.${item.id}.label`, item.label)}
                    </label>
                    <p className="text-xs text-text-placeholder leading-normal">
                      {t(
                        `notifications.events.${item.id}.description`,
                        item.description,
                      )}
                    </p>
                  </div>

                  {/* Свич переключатель */}
                  <button
                    id={item.id}
                    type="button"
                    role="switch"
                    aria-checked={isChecked}
                    onClick={() => handleToggle(item.id)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-900 ${
                      isChecked ? 'bg-level-3' : 'bg-level-2'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isChecked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Футер */}
          <DialogFooter className="p-6 bg-level-2 border-t border-level-3 sm:justify-end gap-2 sm:gap-2">
            <Btn
              disabled={isSaving}
              onClick={onClose}
              type="button"
              className="px-4 py-2 text-sm font-medium"
            >
              {tc('common.cancel', 'Отмена')}
            </Btn>
            <Btn
              disabled={isSaving}
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {tc('common.save', 'Сохранить')}
            </Btn>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
