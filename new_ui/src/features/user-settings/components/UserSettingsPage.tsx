import { useState } from 'react'
import type { Integration, UserProfile } from '@/types/user'
import DonationAlerts from '@/components/icons/icon-da'
import Twitch from '@/components/icons/icon-twtich'
import { ProfileTab } from './ProfileTab'
import { AccountTab } from './AccountTab'
import { IntegrationsTab } from './IntegrationsTab'

interface UserSettingsPageProps {
  user: UserProfile | null
  expired_at: number | null
  integrations: Array<Integration>
  onUserUpdate: (patch: Partial<UserProfile>) => void
  useTwitchLoginUrl: () => (value: boolean) => void
  useDaLoginUrl: () => (value: boolean) => void
}

type TabId = 'profile' | 'account' | 'integrations'

interface Tab {
  id: TabId
  label: string
  icon: string
}

const TABS: Array<Tab> = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'account', label: 'Account', icon: '⚙️' },
  { id: 'integrations', label: 'Integrations', icon: '🔗' },
]

export function UserSettingsPage({
  user,
  expired_at,
  integrations,
  onUserUpdate,
  useTwitchLoginUrl,
  useDaLoginUrl,
}: UserSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profile')

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

  return (
    <div className="flex w-full items-center justify-center min-h-screen bg-level-1 p-4">
      <div className="flex flex-col max-w-[1200px] w-full gap-8 text-text-main">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full w-[80px] h-[80px] bg-gradient-to-br from-accent-1 to-accent-2 p-1 flex-shrink-0 shadow-lg">
              <div className="w-full h-full rounded-full bg-level-2 overflow-hidden">
                <img
                  src={user?.avatar_url || ''}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{user?.username || 'Settings'}</h1>
              <p className="text-level-4">Manage your account and integrations</p>
            </div>
          </div>

          {!user?.email_confirmed ? (
            <EmailNotConfirmedAlert email={user?.email} />
          ) : null}
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row gap-2 bg-level-2 rounded-2xl p-1 shadow-md border border-level-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-accent-1 text-white shadow-md'
                  : 'text-level-4 hover:text-text-main'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'profile' && <ProfileTab user={user} />}
          {activeTab === 'account' && (
            <AccountTab
              user={user}
              expired_at={expired_at}
              onUserUpdate={onUserUpdate}
            />
          )}
          {activeTab === 'integrations' && (
            <IntegrationsTab
              initialIntegrations={integrations}
              platformConfigs={platformConfigs}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function EmailNotConfirmedAlert({ email }: { email?: string }) {
  return (
    <div className="rounded-2xl border border-yellow-500/50 bg-yellow-500/10 px-5 py-4 text-yellow-100 shadow-md">
      <div className="flex flex-col gap-1">
        <div className="text-base font-semibold">Email is not confirmed</div>
        <p className="text-sm text-yellow-100/80">
          Confirm {email ? email : 'your email'} to keep classic login and
          account recovery fully available.
        </p>
      </div>
    </div>
  )
}
