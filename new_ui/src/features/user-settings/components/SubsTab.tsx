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
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export const SubsTab: React.FC = () => {
  const { t } = useTranslation('notifications')
  const [subscriptions, setSubscriptions] = useState<Array<SubscriptionItem>>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [activeSub, setActiveSub] = useState<SubscriptionItem | null>(null)

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const data = await getSubscriptions()
        setSubscriptions(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to fetch subscriptions', err)
      } finally {
        setIsLoading(false)
      }
    }
    void fetchSubscriptions()
  }, [])

  const handleUnsubscribe = async (subId: string) => {
    if (
      !confirm(
        t(
          'notifications.manager.confirm_unsubscribe',
          'Are you sure you want to unsubscribe?',
        ),
      )
    )
      return

    try {
      const success = await deleteSubscription(subId)
      if (!success) {
        toast.error(
          t('notifications.manager.error_unsubscribe', 'Failed to unsubscribe'),
        )
        throw new Error('Failed to unsubscribe')
      }
      setSubscriptions((prev) => prev.filter((sub) => sub.id !== subId))
      toast.success(t('notifications.manager.unsubscribed', 'Unsubscribed successfully'))
    } catch (err) {
      console.error('Failed to unsubscribe', err)
    }
  }

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
            'Failed to update subscription settings',
          ),
        )
        throw new Error('Failed to update subscription settings')
      }
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === activeSub.id ? { ...sub, settings: newSettings } : sub,
        ),
      )
      toast.success(t('notifications.manager.settings_saved', 'Settings updated'))
    } catch (err) {
      console.error('Failed to save settings', err)
      throw err
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-text-secondary text-xs">
        <Loader2 className="size-5 animate-spin mr-2 text-level-3" />
        <span>
          {t('notifications.manager.loading', 'Loading subscriptions...')}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-level-3/40 text-level-3 mt-0.5">
          <Bell className="size-5" />
        </div>
        <div>
          <Label className="text-base font-bold text-text-main">
            {t('notifications.manager.title', 'Subscription Manager')}
          </Label>
          <DialogDescription className="text-xs text-text-secondary mt-0.5">
            {t(
              'notifications.manager.description',
              'Configure granular notification triggers for playlists and creators.',
            )}
          </DialogDescription>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="p-3 sm:p-4 border border-level-3/60 rounded-md bg-level-1 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-1 border-b border-level-3/40">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main">
            <Bell className="size-4 text-level-3" />
            <span>{t('notifications.manager.subscriptions', 'Active Subscriptions')}</span>
          </div>
          {subscriptions.length > 0 && (
            <span className="text-[10px] text-text-placeholder font-mono px-2 py-0.5 rounded-full bg-level-2 border border-level-3/40">
              {subscriptions.length}
            </span>
          )}
        </div>

        {subscriptions.length === 0 ? (
          <div className="p-6 border border-dashed border-level-3/60 rounded-md bg-level-1/50 text-center space-y-1">
            <Bell className="size-6 text-text-placeholder mx-auto" />
            <p className="text-xs font-semibold text-text-main">
              {t('notifications.manager.empty', 'No active subscriptions yet')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-level-2/80 border border-level-3/40 hover:border-level-3 transition-colors text-xs"
              >
                {/* Left: Icon & Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-9 shrink-0 flex items-center justify-center rounded-md bg-level-1 border border-level-3/40">
                    {sub.target_type === 'playlist' ? (
                      <ListMusic className="size-4 text-emerald-400" />
                    ) : (
                      <User className="size-4 text-sky-400" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-text-main truncate max-w-40 sm:max-w-60">
                        {sub.target_name}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-level-1 border border-level-3/40 text-text-secondary">
                        {sub.target_type === 'playlist'
                          ? t('notifications.manager.type_playlist', 'Playlist')
                          : t('notifications.manager.type_user', 'User')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-text-secondary mt-0.5">
                      {sub.target_type === 'playlist' && sub.target_owner && (
                        <span>
                          {t('notifications.manager.author', 'Author')}: {sub.target_owner}
                        </span>
                      )}
                      <span>
                        {sub.settings.allowed_event_types.length === 0 ? (
                          <span className="text-amber-400 font-medium">🚫 Muted</span>
                        ) : (
                          <span className="text-emerald-400 font-medium">
                            🔔 {sub.settings.allowed_event_types.length} triggers
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveSub(sub)}
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-level-1 border border-level-3/40 hover:bg-level-3 transition-colors text-xs font-semibold text-text-main cursor-pointer"
                  >
                    <SlidersHorizontal className="size-3 text-level-3" />
                    <span>{t('notifications.manager.btn_configure', 'Configure')}</span>
                  </button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleUnsubscribe(sub.id)}
                        className="p-1.5 rounded-md text-text-placeholder hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-level-2 text-text-main border-level-3/40 border text-xs"
                    >
                      <p>{t('notifications.manager.btn_unsubscribe_title', 'Unsubscribe')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal */}
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
