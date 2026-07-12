import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Bot,
  BotOff,
  Link2,
  Link2Off,
  RefreshCw,
} from 'lucide-react'
import type { Integration } from '@/types/user'
import { connectBot, deleteIntegration, disconnectBot } from '@/api/api-user'
import { getGlobalSocket } from '@/api/io-sockets'
import Btn from '@/components/ui/my-btn'
import {
  innerPanelClass,
  panelClass,
  sectionTitleClass,
  statusOpenClass,
} from '@/features/landing/styles'
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

  const handleDisconnectBot = async (
    platform: string,
    platformUserId: string,
  ) => {
    setLoading((prev) => ({
      ...prev,
      [`${platform}-${platformUserId}-bot-delete`]: true,
    }))
    const loadingToast = toast.loading(t('common.toast.confirming'))

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
      toast.success(t('settings.integrations.botDisconnected'))
    } catch (error) {
      console.error(`Failed to disconnect bot for ${platform}:`, error)
      toast.dismiss(loadingToast)
      toast.error(t('settings.integrations.disconnectFailed'))
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

  const deadCount = integrations.filter((i) => i.is_dead).length
  const connectedPlatforms = new Set(integrations.map((i) => i.platform))

  return (
    <div className="flex flex-col gap-6">
      {/* Dead integrations banner — shown only when relevant */}
      {deadCount > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-(--rounded-std) border border-amber-500/30 bg-amber-500/8 text-amber-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
          <p className="text-sm leading-snug">
            {t('settings.integrations.deadBanner', { count: deadCount })}
          </p>
        </div>
      )}

      {/* Connected Accounts */}
      <div className={`p-2 sm:p-4 ${panelClass}`}>
        <div className="flex items-center justify-between mb-4">
          <h3
            className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main`}
          >
            {t('settings.integrations.connectedAccounts')}
          </h3>
          {integrations.length > 0 && (
            <span className="text-xs text-text-placeholder tabular-nums">
              {integrations.length}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
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
            <div className="text-center py-10 px-4">
              <div className="mx-auto mb-3 h-10 w-10 rounded-(--rounded-std) bg-level-1 border border-level-3/30 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-text-placeholder" />
              </div>
              <p className="text-text-main font-medium text-sm">
                {t('settings.integrations.empty')}
              </p>
              <p className="text-xs text-text-secondary mt-1 max-w-xs mx-auto">
                {t('settings.integrations.emptyHintLong')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Available Platforms */}
      <div className={`p-2 sm:p-4 ${panelClass}`}>
        <h3
          className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main mb-4`}
        >
          {t('settings.integrations.addAccounts')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(platformConfigs).map(([platform, config]) => {
            const isConnected = connectedPlatforms.has(platform)
            return (
              <div
                key={platform}
                className={`flex items-center gap-4 p-4 ${innerPanelClass} transition-all hover:border-level-3/30'`}
              >
                <div className="w-12 h-12 shrink-0 flex p-1 items-center justify-center rounded-(--rounded-std) bg-level-2 ">
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-text-main truncate">
                    {config.name}
                  </p>
                  <p className="text-xs text-text-placeholder mt-0.5">
                    {isConnected
                      ? t('settings.integrations.alreadyConnected')
                      : t('settings.integrations.connectHint')}
                  </p>
                </div>
                <Btn
                  onClick={() => handleConnectPlatform(platform)}
                  className="shrink-0 px-3 py-2 text-xs font-mono"
                >
                  {isConnected
                    ? t('settings.integrations.addAnother')
                    : t('settings.integrations.connectAccount')}
                </Btn>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── IntegrationCard ────────────────────────────────────────────────────────

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
  const { t } = useTranslation()
  const [intgr, setIntgr] = useState(integration)

  // Sync when parent updates the integration object (e.g. bot_connection: true after socket ack)
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
      className={[
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 transition-all',
        innerPanelClass,
        isDead
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'hover:border-level-3/30',
      ].join(' ')}
    >
      {/* Left: icon + info */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className={`w-14 h-14 shrink-0 flex items-center p-1 justify-center rounded-(--rounded-std) border ${
            isDead
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-level-2 border-level-3/20'
          }`}
        >
          {config.icon}
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-main">
              {config.name}
            </span>
            {isDead && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-medium">
                <AlertTriangle className="h-3 w-3" />
                {t('settings.integrations.tokenExpired')}
              </span>
            )}
            {intgr.bot_connection && !isDead && (
              <span
                className={`inline-flex items-center gap-1 font-mono px-2 py-0.5 rounded-full border text-xs font-medium ${statusOpenClass}`}
              >
                <Bot className="h-3 w-3" />
                {t('settings.integrations.botConnected')}
              </span>
            )}
          </div>
          <div className="text-xs text-text-secondary truncate">
            @{intgr.platform_username}
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
        {isDead ? (
          /* Dead state: reconnect CTA is primary, disconnect is secondary */
          <>
            <button
              onClick={onReconnect}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-(--rounded-std) border border-amber-500/50 bg-amber-500/10 text-amber-200 text-xs font-mono hover:bg-amber-500/20 hover:border-amber-500/70 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t('settings.integrations.reconnect')}
            </button>
            <DisconnectButton
              loading={isDeleteLoading}
              onClick={onDisconnect}
              label={
                isDeleteLoading
                  ? t('settings.integrations.removing')
                  : t('settings.integrations.disconnect')
              }
            />
          </>
        ) : (
          /* Healthy state */
          <>
            {intgr.bot_connection ? (
              <>
                <BotSettingsModal
                  integration={intgr}
                  platformName={config.name}
                  platformIcon={config.icon}
                  onSaved={onSettingsUpdated}
                />
                <button
                  onClick={onDisconnectBot}
                  disabled={isBotDeleteLoading}
                  title={t('settings.integrations.disconnectBot')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-(--rounded-std) border border-white/10 bg-level-1/50 text-text-secondary text-sm font-mono hover:border-danger/40 hover:text-danger hover:bg-danger/8 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <BotOff className="h-3.5 w-3.5" />
                  {isBotDeleteLoading
                    ? t('settings.integrations.removing')
                    : t('settings.integrations.disconnectBot')}
                </button>
              </>
            ) : (
              <Btn
                onClick={onConnectBot}
                disabled={isBotLoading}
                className="px-3 py-2 text-xs font-mono"
              >
                {isBotLoading
                  ? t('settings.integrations.connecting')
                  : t('settings.integrations.connectBot')}
              </Btn>
            )}
            <DisconnectButton
              loading={isDeleteLoading}
              onClick={onDisconnect}
              label={
                isDeleteLoading
                  ? t('settings.integrations.removing')
                  : t('settings.integrations.disconnect')
              }
            />
          </>
        )}
      </div>
    </div>
  )
}

// ─── DisconnectButton ────────────────────────────────────────────────────────

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
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-(--rounded-std) border border-danger/30 bg-danger/8 text-danger text-sm font-mono hover:bg-danger/15 hover:border-danger/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
    >
      <Link2Off className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
