import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Bot,
  BotOff,
  Link2,
  Link2Off,
  Plus,
  RefreshCw,
} from 'lucide-react'
import type { Integration } from '@/types/user'
import { connectBot, deleteIntegration, disconnectBot } from '@/api/api-user'
import { getGlobalSocket } from '@/api/io-sockets'
import Btn from '@/components/ui/my-btn'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { BotSettingsModal } from './BotSettingsModal'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

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
  const { t } = useFeatureTranslation()
  const { t: tc } = useTranslation()
  const [integrations, setIntegrations] =
    useState<Array<Integration>>(initialIntegrations)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const global_socket = getGlobalSocket()

    const handleBotConnected = (platform: string, platform_user_id: string) => {
      setIntegrations((prevItems) =>
        prevItems.map((item) =>
          item.platform === platform &&
          item.platform_user_id === platform_user_id
            ? { ...item, bot_connection: true }
            : item,
        ),
      )
      setLoading((prev) => ({
        ...prev,
        [`${platform}-${platform_user_id}-bot`]: false,
      }))
      toast.success(t('settings.integrations.botConnected', 'Bot connected'))
    }

    Object.keys(platformConfigs).forEach((platform) => {
      global_socket.on(
        `ack_bot_connected:${platform}`,
        (platform_user_id: string) =>
          handleBotConnected(platform, platform_user_id),
      )
    })

    return () => {
      Object.keys(platformConfigs).forEach((platform) => {
        global_socket.off(`ack_bot_connected:${platform}`)
      })
    }
  }, [platformConfigs, t])

  const handleConnectBot = async (
    platform: string,
    platform_user_id: string,
  ) => {
    setLoading((prev) => ({
      ...prev,
      [`${platform}-${platform_user_id}-bot`]: true,
    }))
    const loadingToast = toast.loading(
      t('settings.integrations.connecting', 'Connecting bot...'),
    )

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
      }
    } catch (error) {
      console.error(`Failed to connect bot for ${platform}:`, error)
      toast.dismiss(loadingToast)
      toast.error(
        t('settings.integrations.connectFailed', 'Failed to connect bot'),
      )
      setLoading((prev) => ({
        ...prev,
        [`${platform}-${platform_user_id}-bot`]: false,
      }))
    }
  }

  const handleDisconnectBot = async (
    platform: string,
    platformUserId: string,
  ) => {
    setLoading((prev) => ({
      ...prev,
      [`${platform}-${platformUserId}-bot-delete`]: true,
    }))
    const loadingToast = toast.loading(
      tc('common.toast.confirming', 'Confirming...'),
    )

    try {
      await disconnectBot(platform, platformUserId)
      setIntegrations((prev) =>
        prev.map((i) =>
          i.platform === platform && i.platform_user_id === platformUserId
            ? { ...i, bot_connection: false }
            : i,
        ),
      )
      toast.dismiss(loadingToast)
      toast.success(
        t('settings.integrations.botDisconnected', 'Bot disconnected'),
      )
    } catch (error) {
      console.error(`Failed to disconnect bot for ${platform}:`, error)
      toast.dismiss(loadingToast)
      toast.error(
        t('settings.integrations.disconnectFailed', 'Failed to disconnect bot'),
      )
    } finally {
      setLoading((prev) => ({
        ...prev,
        [`${platform}-${platformUserId}-bot-delete`]: false,
      }))
    }
  }

  const handleDisconnect = async (platform: string, platformUserId: string) => {
    setLoading((prev) => ({
      ...prev,
      [`${platform}-${platformUserId}-delete`]: true,
    }))
    const loadingToast = toast.loading(
      tc('common.toast.confirming', 'Confirming...'),
    )

    try {
      await deleteIntegration(platform, platformUserId)
      setIntegrations((prev) =>
        prev.filter(
          (i) =>
            !(i.platform === platform && i.platform_user_id === platformUserId),
        ),
      )
      toast.dismiss(loadingToast)
      toast.success(
        t('settings.integrations.disconnected', 'Account disconnected'),
      )
    } catch (error) {
      console.error(`Failed to disconnect ${platform}:`, error)
      toast.dismiss(loadingToast)
      toast.error(
        t(
          'settings.integrations.disconnectFailed',
          'Failed to disconnect account',
        ),
      )
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

  const deadCount = integrations.filter((i) => i.is_dead).length
  const connectedPlatforms = new Set(integrations.map((i) => i.platform))

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-accent/40 text-accent mt-0.5">
          <Link2 className="size-5" />
        </div>
        <div>
          <Label className="text-base font-bold text-text-main">
            {t('settings.integrations.title', 'Integrations & Bots')}
          </Label>
          <DialogDescription className="text-xs text-text-secondary mt-0.5">
            {t(
              'settings.integrations.subtitle',
              'Connect streaming platforms, chat bots, and external accounts.',
            )}
          </DialogDescription>
        </div>
      </div>

      {/* Dead integrations banner */}
      {deadCount > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-md border border-amber-500/60 bg-amber-500/15 text-amber-900 dark:text-amber-200 text-xs font-medium shadow-xs">
          <AlertTriangle className="size-4 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
          <p className="leading-snug">
            {t('settings.integrations.deadBanner', {
              count: deadCount,
              defaultValue:
                'Some account tokens have expired. Please reconnect them.',
            })}
          </p>
        </div>
      )}

      {/* Card 1: Connected Accounts */}
      <div className="p-3 sm:p-4 border border-accent/60 rounded-md bg-level-1 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-1 border-b border-accent/40">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main">
            <Link2 className="size-4 text-accent" />
            <span>
              {t(
                'settings.integrations.connectedAccounts',
                'Connected Accounts',
              )}
            </span>
          </div>
          {integrations.length > 0 && (
            <span className="text-[10px] text-text-placeholder font-mono px-2 py-0.5 rounded-full bg-level-2 border border-accent/40">
              {integrations.length}
            </span>
          )}
        </div>

        <div className="space-y-2">
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
                onReconnect={() => handleConnectPlatform(integration.platform)}
                onDisconnectBot={() =>
                  handleDisconnectBot(
                    integration.platform,
                    integration.platform_user_id,
                  )
                }
                loading={loading}
              />
            ))
          ) : (
            <div className="p-6 border border-dashed border-accent/60 rounded-md bg-level-1/50 text-center space-y-1">
              <Link2 className="size-6 text-text-placeholder mx-auto" />
              <p className="text-xs font-semibold text-text-main">
                {t('settings.integrations.empty', 'No connected accounts yet')}
              </p>
              <p className="text-[11px] text-text-secondary max-w-xs mx-auto">
                {t(
                  'settings.integrations.emptyHintLong',
                  'Connect your streaming and donation platforms below.',
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card 2: Available Platforms */}
      <div className="p-3 sm:p-4 border border-accent/60 rounded-md bg-level-1 space-y-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main pb-1 border-b border-accent/40">
          <Plus className="size-4 text-accent" />
          <span>
            {t('settings.integrations.addAccounts', 'Available Platforms')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(platformConfigs).map(([platform, config]) => {
            const isConnected = connectedPlatforms.has(platform)
            return (
              <div
                key={platform}
                className="flex items-center gap-3 p-2.5 rounded-md bg-level-2/70 border border-accent/40 hover:border-accent transition-colors"
              >
                <div className="size-9 shrink-0 flex items-center justify-center rounded-md bg-level-1 border border-accent/40">
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-text-main truncate">
                    {config.name}
                  </p>
                  <p className="text-[10px] text-text-secondary truncate mt-0.5">
                    {isConnected
                      ? t('settings.integrations.alreadyConnected', 'Connected')
                      : t(
                          'settings.integrations.connectHint',
                          'Click to connect',
                        )}
                  </p>
                </div>
                <Btn
                  onClick={() => handleConnectPlatform(platform)}
                  className="h-7 px-2.5 bg-level-1 text-xs font-semibold text-text-main shrink-0 hover:bg-accent transition-colors"
                >
                  {isConnected
                    ? t('settings.integrations.addAnother', '+ Add another')
                    : t('settings.integrations.connectAccount', 'Connect')}
                </Btn>
              </div>
            )
          })}
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
  onDisconnectBot: () => void
  onReconnect: () => void
  loading: Record<string, boolean>
}

function IntegrationCard({
  integration,
  config,
  onConnectBot,
  onDisconnect,
  onDisconnectBot,
  onReconnect,
  loading,
}: IntegrationCardProps) {
  const { t } = useFeatureTranslation()
  const [intgr, setIntgr] = useState(integration)

  useEffect(() => {
    setIntgr(integration)
  }, [integration])

  async function onSettingsUpdated(updated: Integration) {
    setIntgr(updated)
  }

  const isDead = intgr.is_dead
  const isBotLoading =
    loading[`${intgr.platform}-${intgr.platform_user_id}-bot`]
  const isDeleteLoading =
    loading[`${intgr.platform}-${intgr.platform_user_id}-delete`]
  const isBotDeleteLoading =
    loading[`${intgr.platform}-${intgr.platform_user_id}-bot-delete`]

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md border text-xs transition-colors ${
        isDead
          ? 'border-amber-500/60 bg-amber-500/15 dark:bg-amber-500/20 shadow-xs'
          : 'border-accent/40 bg-level-2/80 hover:border-accent'
      }`}
    >
      {/* Left: Icon & Details */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`size-10 shrink-0 flex items-center justify-center rounded-md border ${
            isDead
              ? 'bg-amber-500/25 border-amber-500/60 text-amber-500 dark:text-amber-300'
              : 'bg-level-1 border-accent/40'
          }`}
        >
          {config?.icon}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-text-main truncate">
              {config?.name || intgr.platform}
            </span>
            {isDead && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/70 bg-amber-500/25 text-amber-900 dark:text-amber-200 text-[10px] font-bold shadow-xs">
                <AlertTriangle className="size-3 text-amber-500 dark:text-amber-400" />
                {t('settings.integrations.tokenExpired', 'Expired')}
              </span>
            )}
            {intgr.bot_connection && !isDead && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                <Bot className="size-3" />
                {t('settings.integrations.botConnected', 'Bot Active')}
              </span>
            )}
          </div>
          <span className="text-[11px] text-text-secondary truncate mt-0.5">
            @{intgr.platform_username}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
        {isDead ? (
          <>
            <button
              type="button"
              onClick={onReconnect}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-amber-500/60 bg-amber-500/20 dark:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-semibold hover:bg-amber-500/35 transition-colors cursor-pointer text-xs shadow-xs"
            >
              <RefreshCw className="size-3.5 text-amber-500 dark:text-amber-300" />
              <span>{t('settings.integrations.reconnect', 'Reconnect')}</span>
            </button>
            <DisconnectButton
              loading={isDeleteLoading}
              onClick={onDisconnect}
              label={
                isDeleteLoading
                  ? t('settings.integrations.removing', 'Removing...')
                  : t('settings.integrations.disconnect', 'Disconnect')
              }
            />
          </>
        ) : (
          <>
            {intgr.bot_connection ? (
              <>
                <BotSettingsModal
                  integration={intgr}
                  platformName={config?.name || intgr.platform}
                  platformIcon={config?.icon}
                  onSaved={onSettingsUpdated}
                />
                <button
                  type="button"
                  onClick={onDisconnectBot}
                  disabled={isBotDeleteLoading}
                  title={t(
                    'settings.integrations.disconnectBot',
                    'Disconnect bot',
                  )}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-accent/40 bg-level-1 hover:border-red-500/40 hover:text-red-400 transition-colors text-xs text-text-secondary disabled:opacity-50 cursor-pointer"
                >
                  <BotOff className="size-3" />
                  <span>
                    {isBotDeleteLoading
                      ? t('settings.integrations.removing', 'Removing...')
                      : t('settings.integrations.disconnectBot', 'Disable Bot')}
                  </span>
                </button>
              </>
            ) : (
              <Btn
                onClick={onConnectBot}
                disabled={isBotLoading}
                className="h-7 px-2.5 bg-level-1 text-xs font-semibold text-text-main hover:bg-accent transition-colors"
              >
                <span>
                  {isBotLoading
                    ? t('settings.integrations.connecting', 'Connecting...')
                    : t('settings.integrations.connectBot', 'Connect Bot')}
                </span>
              </Btn>
            )}
            <DisconnectButton
              loading={isDeleteLoading}
              onClick={onDisconnect}
              label={
                isDeleteLoading
                  ? t('settings.integrations.removing', 'Removing...')
                  : t('settings.integrations.disconnect', 'Disconnect')
              }
            />
          </>
        )}
      </div>
    </div>
  )
}

function DisconnectButton({
  loading,
  onClick,
  label,
}: {
  loading: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
    >
      <Link2Off className="size-3" />
      <span>{label}</span>
    </button>
  )
}
