import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Integration } from '@/types/user'
import { connectBot, getUserIntegrations, deleteIntegration } from '@/api/api-user'
import DonationAlerts from '@/components/icons/icon-da'
import Twitch from '@/components/icons/icon-twtich'
import { useAuthStore } from '@/stores/authStore'
import { useDaLoginUrl, useTwitchLoginUrl } from '@/hooks/useAuthUrl'
import { getGlobalSocket } from '@/api/io-sockets'
import Btn from '@/components/ui/my-btn'

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
  loader: async () => {
    const integrations: Array<Integration> = await getUserIntegrations()
    return { integrations }
  },
})

function RouteComponent() {
  const { isAuthenticated, user } = useAuthStore()
  const { integrations: initialIntegrations } = Route.useLoaderData()
  const [integrations, setIntegrations] = useState<Array<Integration>>(initialIntegrations)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  // Hook calls must be at component level
  const handleTwitchLogin = useTwitchLoginUrl()
  const handleDaLogin = useDaLoginUrl()

  const platformConfigs = {
    twitch: {
      name: 'Twitch',
      icon: (
        <Twitch
          className="w-full h-full bg-accent-1 rounded-lg"
          fill="#fff"
          stroke="#fff"
          color="#fff"
        />
      ),
      loginHandler: handleTwitchLogin,
    },
    da: {
      name: 'Donation Alerts',
      icon: <DonationAlerts width={45} height={45} />,
      loginHandler: handleDaLogin,
    },
  } as const

  // Listen for bot connection events
  useEffect(() => {
    const global_socket = getGlobalSocket()

    const handleBotConnected = (platform: string) => {
      setIntegrations((prevItems) =>
        prevItems.map((item) =>
          item.platform === platform ? { ...item, bot_connection: true } : item,
        ),
      )
      setLoading((prev) => ({ ...prev, [`${platform}-bot`]: false }))
    }

    Object.keys(platformConfigs).forEach((platform) => {
      global_socket.on(`ack_bot_connected:${platform}`, () =>
        handleBotConnected(platform),
      )
    })

    return () => {
      Object.keys(platformConfigs).forEach((platform) => {
        global_socket.off(`ack_bot_connected:${platform}`)
      })
    }
  }, [])

  const handleConnectBot = async (platform: string, platform_user_id: string) => {
    setLoading((prev) => ({ ...prev, [`${platform}-${platform_user_id}-bot`]: true }))
    try {
      if (await connectBot(platform, platform_user_id)) {
        setIntegrations((prev) =>
          prev.map((item) =>
            item.platform === platform && item.platform_user_id === platform_user_id
              ? { ...item, bot_connection: true }
              : item,
          ),
        )
      }

    } catch (error) {
      console.error(`Failed to connect bot for ${platform}:`, error)
      setLoading((prev) => ({ ...prev, [`${platform}-${platform_user_id}-bot`]: false }))
    }
  }

  const handleDisconnect = async (platform: string, platformUserId: string) => {
    setLoading((prev) => ({ ...prev, [`${platform}-${platformUserId}-delete`]: true }))
    try {
      await deleteIntegration(platform, platformUserId)
      setIntegrations((prev) =>
        prev.filter((i) => !(i.platform === platform && i.platform_user_id === platformUserId)),
      )
    } catch (error) {
      console.error(`Failed to disconnect ${platform}:`, error)
    } finally {
      setLoading((prev) => ({ ...prev, [`${platform}-${platformUserId}-delete`]: false }))
    }
  }

  const handleConnectPlatform = (platform: string) => {
    const config = platformConfigs[platform as keyof typeof platformConfigs]
    if (config) {
      config.loginHandler(true)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex w-full items-center justify-center min-h-screen bg-level-1 p-4">
        <div className="flex flex-col max-w-[800px] w-full gap-6 text-text-main bg-level-2 rounded-2xl p-8 shadow-md border border-level-3">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-lg text-level-4">You need to login first to manage your accounts</p>
          <Btn text="Go to Login" className="px-6 py-3 text-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full items-center justify-center min-h-screen bg-level-1 p-4">
      <div className="flex flex-col max-w-[1000px] w-full gap-8 text-text-main">
        {/* Header */}
        <div className="flex items-center gap-6">
          <div className="rounded-full w-[120px] h-[120px] bg-gradient-to-br from-accent-1 to-accent-2 p-1 flex-shrink-0 shadow-lg">
            <div className="w-full h-full rounded-full bg-level-2 overflow-hidden">
              <img
                src={user?.profile_image_url || ''}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <h1 className="text-4xl font-bold">{user?.username || ''}</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col gap-6">
          {/* Connected Accounts Card */}
          <div className="bg-level-2 rounded-2xl p-8 shadow-md border border-level-3">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-8 bg-accent-1 rounded"></div>
              <h2 className="text-2xl font-bold">Connected Accounts</h2>
            </div>

            {/* Connected Integrations */}
            <div className="flex flex-col gap-4">
              {integrations.length > 0 ? (
                integrations.map((integration) => (
                  <IntegrationCard
                    key={`${integration.platform}-${integration.id}`}
                    integration={integration}
                    config={platformConfigs[integration.platform as keyof typeof platformConfigs]}
                    onConnectBot={() => handleConnectBot(integration.platform, integration.platform_user_id)}
                    onDisconnect={() =>
                      handleDisconnect(integration.platform, integration.platform_user_id)
                    }
                    loading={loading}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-level-4">
                  <div className="text-6xl mb-3 opacity-50">○</div>
                  <p className="text-lg">No connected accounts yet</p>
                  <p className="text-sm mt-1">Connect your first social account below</p>
                </div>
              )}
            </div>
          </div>

          {/* Available Platforms Card */}
          <div className="bg-level-2 rounded-2xl p-8 shadow-md border border-level-3">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-8 bg-accent-3 rounded"></div>
              <h2 className="text-2xl font-bold">Add Accounts</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(platformConfigs).map(([platform, config]) => (
                <div
                  key={platform}
                  className="flex flex-col items-center gap-4 p-6 rounded-xl border-level-3 border border-level-4 hover:border-accent-3 transition-all hover:shadow-md"
                >
                  <div className="w-[60px] h-[60px] flex items-center justify-center bg-level-2 rounded-xl">
                    {config.icon}
                  </div>
                  <div className="text-lg font-semibold text-center">{config.name}</div>
                  <Btn
                    text="+ Connect Account"
                    onClick={() => handleConnectPlatform(platform)}
                    className="w-full px-4 py-3 text-base font-semibold"
                  />
                </div>
              ))}
            </div>
          </div>
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
  return (
    <div className="flex items-center justify-between gap-4 p-5 rounded-xl border-level-3 border border-level-4 hover:border-accent-1 hover:shadow-md transition-all">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-[56px] h-[56px] flex items-center justify-center bg-level-2 rounded-lg flex-shrink-0">
          {config.icon}
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-lg font-semibold">{config.name}</div>
          <div className="text-sm text-level-4">@{integration.platform_username}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {integration.bot_connection ? (
          <div className="px-4 py-2 rounded-lg bg-green-600/20 text-green-400 text-sm font-semibold border border-green-600/50">
            ✓ Bot Connected
          </div>
        ) : (
          <Btn
            text={loading[`${integration.platform}-${integration.platform_user_id}-bot`] ? '⟳ Connecting...' : 'Connect Bot'}
            onClick={onConnectBot}
            disabled={loading[`${integration.platform}-${integration.platform_user_id}-bot`]}
            className="px-4 py-2 text-sm"
          />
        )}

        <Btn
          text={loading[`${integration.platform}-${integration.platform_user_id}-delete`] ? '⟳ Removing...' : '✕ Disconnect'}
          onClick={onDisconnect}
          disabled={loading[`${integration.platform}-${integration.platform_user_id}-delete`]}
          className="px-4 py-2 text-sm"
        />
      </div>
    </div>
  )
}
