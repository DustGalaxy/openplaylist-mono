import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Integration } from '@/types/user'
import { connectBot, getUserIntegrations } from '@/api/api-user'
import DonationAlerts from '@/components/icons/icon-da'
import Twitch from '@/components/icons/icon-twtich'
import { useAuthStore } from '@/stores/authStore'
import { useDaLoginUrl, useTwitchLoginUrl } from '@/hooks/useAuthUrl'
import { global_socket } from '@/api/io-sockets'

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
  loader: async () => {
    const integrations: Array<Integration> = await getUserIntegrations()
    return { integrations }
  },
})

function RouteComponent() {
  const { isAuthenticated, user } = useAuthStore()
  const { integrations } = Route.useLoaderData()
  const [integrationsState, setIntegrationsState] =
    useState<Array<Integration>>(integrations)
  const handleTwitchLogin = useTwitchLoginUrl()
  const handleDaLogin = useDaLoginUrl()

  useEffect(() => {
    global_socket.on('ack_bot_connected:twitch', () => {
      setIntegrationsState((prevItems) =>
        prevItems.map((item) =>
          item.platform === 'twitch' ? { ...item, bot_connection: true } : item,
        ),
      )
    })

    global_socket.on('ack_bot_connected:da', () => {
      setIntegrationsState((prevItems) =>
        prevItems.map((item) =>
          item.platform === 'da' ? { ...item, bot_connection: true } : item,
        ),
      )
    })

    return () => {
      global_socket.off('ack_bot_connected:da')
      global_socket.off('ack_bot_connected:twitch')
    }
  }, [])

  if (!isAuthenticated) {
    return (
      <div className="flex  w-full items-center justify-center">
        <div className="flex flex-col max-w-[800px] w-full mt-10 p-4 rounded-(--rounded-std) gap-5 text-white bg-level-2  ">
          <div className="text-2xl font-bold">Settings</div>
          <div className="text-lg text-level-4">You need to login first</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex  w-full items-center justify-center">
      <div className="flex flex-col max-w-[800px] w-full mt-10 p-4 rounded-(--rounded-std) gap-5 text-white bg-level-2  ">
        {/* basic user info */}
        <div className="flex items-center justify-start gap-5 ">
          <div className=" rounded-full w-[150px] bg-level-3">
            <img
              src={user ? user.profile_image_url : ''}
              className=" rounded-full"
            />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {user ? user.username : ''}
            </div>
            <div className="text-lg text-level-4">
              Now login with -{' '}
              <span className="font-bold text-accent-2">
                {user ? user.curr_platform : ''}
              </span>
            </div>
          </div>
        </div>

        {/* settings */}
        <div className="flex flex-col gap-3 w-full ">
          <div className="text-2xl font-bold">Settings</div>
          <div className="flex flex-col gap-2">
            <div className="text-xl font-bold">Integrations</div>
            {/* twitch */}
            <div className="flex items-center gap-3">
              <div className="w-[45px] h-[45px] ">
                <Twitch
                  className="w-full h-full bg-accent-1 rounded-lg"
                  fill="#fff"
                  stroke="#fff"
                  color="#fff"
                />
              </div>

              <div className="text-lg font-bold">Twitch</div>

              {integrationsState.some(
                (i: Integration) => i.platform === 'twitch',
              ) ? (
                <>
                  <div className="ml-auto px-3 py-1 rounded-full bg-green-600 text-sm">
                    Connected
                  </div>
                  {integrationsState.find(
                    (i: Integration) => i.platform === 'twitch',
                  )?.bot_connection ? (
                    <div className="ml-2 px-3 py-1 rounded-full bg-green-600 text-sm">
                      Bot connected
                    </div>
                  ) : (
                    <button
                      className="ml-2 px-3 py-1 rounded-full bg-yellow-600 text-sm"
                      onClick={async () => await connectBot('twitch')}
                    >
                      Connect the bot
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="ml-auto px-3 py-1 rounded-full bg-gray-600 text-sm">
                    Not connected
                  </div>
                  <button
                    onClick={() => handleTwitchLogin(true)}
                    className="cursor-pointer  px-3 py-1 rounded-full bg-accent-3 text-sm"
                  >
                    Connect
                  </button>
                </>
              )}
            </div>

            {/* donation alerts */}

            <div className="flex items-center gap-3">
              <div className="w-[45px] h-[45px] ">
                <DonationAlerts width={45} height={45} />
              </div>

              <div className="text-lg font-bold">Donation Alerts</div>

              {integrationsState.some(
                (i: Integration) => i.platform === 'da',
              ) ? (
                <>
                  <div className="ml-auto px-3 py-1 rounded-full bg-green-600 text-sm">
                    Connected
                  </div>
                  <div>
                    {integrationsState.find(
                      (i: Integration) => i.platform === 'da',
                    )?.bot_connection ? (
                      <div className="ml-2 px-3 py-1 rounded-full bg-green-600 text-sm">
                        Bot connected
                      </div>
                    ) : (
                      <button
                        className="ml-2 px-3 py-1 rounded-full bg-yellow-600 text-sm"
                        onClick={async () => await connectBot('da')}
                      >
                        Connect the bot
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="ml-auto px-3 py-1 rounded-full bg-gray-600 text-sm">
                    Not connected
                  </div>

                  <button
                    onClick={() => handleDaLogin(true)}
                    className="cursor-pointer  px-3 py-1 rounded-full bg-accent-3 text-sm"
                  >
                    Connect
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
