import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { Integration } from '@/types/user'
import {
  connectBot,
  deleteIntegration,
  updateBotSettings,
} from '@/api/api-user'
import { getGlobalSocket } from '@/api/io-sockets'
import Btn from '@/components/ui/my-btn'
import {
  innerPanelClass,
  panelClass,
  sectionTitleClass,
  statusOpenClass,
} from '@/features/landing/styles'
import { D } from '@thesvg/react'
import { BotSettingsModal } from './BotSettingsModal'

interface IntegrationsTabProps {
  initialIntegrations: Array<Integration>
  platformConfigs: {
    [key: string]: {
      name: string
      icon: React.ReactNode
      loginHandler: (value: boolean) => void
    }
  }
}

export function IntegrationsTab({
  initialIntegrations,
  platformConfigs,
}: IntegrationsTabProps) {
  const { t } = useTranslation()
  const [integrations, setIntegrations] =
    useState<Array<Integration>>(initialIntegrations)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const global_socket = getGlobalSocket()

    const handleBotConnected = (platform: string, platform_user_id: string) => {
      console.log(`ack_bot_connected:${platform} !!!!!!!`)

      setIntegrations((prevItems) =>
        prevItems.map((item) =>
          item.platform === platform &&
          item.platform_user_id == platform_user_id
            ? { ...item, bot_connection: true }
            : item,
        ),
      )
      setLoading((prev) => ({
        ...prev,
        [`${platform}-${platform_user_id}-bot`]: false,
      }))
      toast.success(t('settings.integrations.botConnected'))
    }

    Object.keys(platformConfigs).forEach((platform) => {
      console.log('register ', `ack_bot_connected:${platform}`)

      global_socket.on(`ack_bot_connected:${platform}`, (platform_user_id: string) =>
        handleBotConnected(platform, platform_user_id),
      )
    })

    return () => {
      Object.keys(platformConfigs).forEach((platform) => {
        global_socket.off(`ack_bot_connected:${platform}`)
      })
    }
  }, [])

  const handleConnectBot = async (
    platform: string,
    platform_user_id: string,
  ) => {
    setLoading((prev) => ({
      ...prev,
      [`${platform}-${platform_user_id}-bot`]: true,
    }))
    const loadingToast = toast.loading(t('settings.integrations.connecting'))

    try {
      if (await connectBot(platform, platform_user_id)) {
        setIntegrations((prev) =>
          prev.map((item) =>
            item.platform === platform &&
            item.platform_user_id === platform_user_id
              ? { ...item, bot_connection: true }
              : item,
          ),
        )
        toast.dismiss(loadingToast)
        toast.success(t('settings.integrations.botConnected'))
      }
    } catch (error) {
      console.error(`Failed to connect bot for ${platform}:`, error)
      toast.dismiss(loadingToast)
      toast.error(t('settings.integrations.connectFailed'))
      setLoading((prev) => ({
        ...prev,
        [`${platform}-${platform_user_id}-bot`]: false,
      }))
    }
  }

  const handleDisconnect = async (platform: string, platformUserId: string) => {
    setLoading((prev) => ({
      ...prev,
      [`${platform}-${platformUserId}-delete`]: true,
    }))
    const loadingToast = toast.loading(t('common.toast.confirming'))

    try {
      await deleteIntegration(platform, platformUserId)
      setIntegrations((prev) =>
        prev.filter(
          (i) =>
            !(i.platform === platform && i.platform_user_id === platformUserId),
        ),
      )
      toast.dismiss(loadingToast)
      toast.success(t('settings.integrations.disconnected'))
    } catch (error) {
      console.error(`Failed to disconnect ${platform}:`, error)
      toast.dismiss(loadingToast)
      toast.error(t('settings.integrations.disconnectFailed'))
    } finally {
      setLoading((prev) => ({
        ...prev,
        [`${platform}-${platformUserId}-delete`]: false,
      }))
    }
  }

  const handleConnectPlatform = (platform: string) => {
    const config = platformConfigs[platform as keyof typeof platformConfigs]
    config.loginHandler(true)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Connected Accounts Card */}
      <div className={`p-4 sm:p-6 ${panelClass}`}>
        <h3
          className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main mb-4`}
        >
          {t('settings.integrations.connected')}
        </h3>

        <div className="flex flex-col gap-4">
          {integrations.length > 0 ? (
            integrations.map((integration) => (
              <IntegrationCard
                key={`${integration.platform}-${integration.id}`}
                integration={integration}
                config={
                  platformConfigs[
                    integration.platform as keyof typeof platformConfigs
                  ]
                }
                onConnectBot={() =>
                  handleConnectBot(
                    integration.platform,
                    integration.platform_user_id,
                  )
                }
                onDisconnect={() =>
                  handleDisconnect(
                    integration.platform,
                    integration.platform_user_id,
                  )
                }
                loading={loading}
              />
            ))
          ) : (
            <div className="text-center py-12 text-text-secondary">
              <p className="mb-4">{t('settings.integrations.empty')}</p>
              <p className="text-sm">
                {t('settings.integrations.emptyHintLong')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Available Platforms Card */}
      <div className={`p-4 sm:p-6 ${panelClass}`}>
        <h3
          className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main mb-4`}
        >
          {t('settings.integrations.addAccounts')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(platformConfigs).map(([platform, config]) => (
            <div
              key={platform}
              className={`flex flex-col items-center gap-4 p-4 sm:p-6 ${innerPanelClass} hover:border-level-3/30 transition-all`}
            >
              <div className="w-14 h-14 flex items-center justify-center rounded-lg">
                {config.icon}
              </div>
              <div className="text-center">
                <p className="font-semibold">{config.name}</p>
                <p className="text-xs text-text-placeholder mt-1">
                  {t('settings.integrations.connectHint')}
                </p>
              </div>
              <Btn
                text={t('settings.integrations.connectAccount')}
                onClick={() => handleConnectPlatform(platform)}
                className="w-full px-4 py-3 text-base font-semibold"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface IntegrationCardProps {
  integration: Integration
  config: {
    name: string
    icon: React.ReactNode
  }
  onConnectBot: () => void
  onDisconnect: () => void
  loading: Record<string, boolean>
}

function IntegrationCard({
  integration,
  config,
  onConnectBot,
  onDisconnect,
  loading,
}: IntegrationCardProps) {
  const { t } = useTranslation()
  const [intgr, setIntgr] = useState(integration)

  async function onSettingsUpdated(updated: Integration) {
    setIntgr(updated)
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 ${innerPanelClass} hover:border-level-3/30 transition-all`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-14 h-14 flex items-center justify-center bg-level-2 rounded-lg shrink-0">
          {config.icon}
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-lg font-semibold">{config.name}</div>
          <div className="text-sm text-text-secondary">
            @{intgr.platform_username}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
        {intgr.bot_connection ? (
          <div>
            <div
              className={`px-4 py-2 rounded-(--rounded-std) text-sm font-semibold border ${statusOpenClass}`}
            >
              {t('settings.integrations.botConnected')}
            </div>
            {intgr.bot_connection && (
              <BotSettingsModal
                integration={intgr}
                platformName={config.name}
                platformIcon={config.icon}
                onSaved={onSettingsUpdated}
              />
            )}
          </div>
        ) : (
          <Btn
            text={
              loading[`${intgr.platform}-${intgr.platform_user_id}-bot`]
                ? t('settings.integrations.connecting')
                : t('settings.integrations.connectBot')
            }
            onClick={onConnectBot}
            disabled={
              loading[`${intgr.platform}-${intgr.platform_user_id}-bot`]
            }
            className="px-4 py-2 text-sm w-full sm:w-auto"
          />
        )}

        <Btn
          text={
            loading[`${intgr.platform}-${intgr.platform_user_id}-delete`]
              ? t('settings.integrations.removing')
              : t('settings.integrations.disconnect')
          }
          onClick={onDisconnect}
          disabled={
            loading[`${intgr.platform}-${intgr.platform_user_id}-delete`]
          }
          className="px-4 py-2 text-sm w-full sm:w-auto"
        />
      </div>
    </div>
  )
}
