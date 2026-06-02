import { useState } from 'react'
import type { Integration, UserProfile } from '@/types/user'
import DonationAlerts from '@/components/icons/icon-da'
import Twitch from '@/components/icons/icon-twtich'
import { Google } from '@thesvg/react'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
  gradientTextClass,
  pageInnerClass,
  pageWrapClass,
  panelClass,
} from '@/features/landing/styles'
import { settingsCopy } from '@/features/user-settings/copy'
import { ProfileTab } from './ProfileTab'
import { AccountTab } from './AccountTab'
import { IntegrationsTab } from './IntegrationsTab'
import { useOAuthUrl } from '@/hooks/useAuthUrl'

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
  { id: 'profile', label: settingsCopy.tabs.profile, icon: '👤' },
  { id: 'account', label: settingsCopy.tabs.account, icon: '⚙️' },
  {
    id: 'integrations',
    label: settingsCopy.tabs.integrations,
    icon: '🔗',
  },
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
  const handleOAuthRedirect = useOAuthUrl()

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
    google: {
      name: 'Google',
      icon: <Google width={45} height={45} />,
      loginHandler: () => {
        handleOAuthRedirect('google')
      },
    },
  } as const

  return (
    <div className={pageWrapClass}>
      <div className={`${pageInnerClass} flex flex-col gap-6 sm:gap-8`}>
        <header className="text-center sm:text-left">
          <p className={`text-sm font-medium mb-2 ${gradientTextClass}`}>
            {settingsCopy.eyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
            {settingsCopy.title}
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mt-1">
            {settingsCopy.subtitle}
          </p>
        </header>

        <div className={`flex flex-col gap-4 p-4 sm:p-6 ${panelClass}`}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="rounded-full w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-accent-1 to-accent-2 p-1 shrink-0 shadow-lg">
              <div className="w-full h-full rounded-full bg-level-2 overflow-hidden">
                <img
                  src={user?.avatar_url || ''}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-main">
                {user?.username || settingsCopy.title}
              </p>
              <p className="text-sm text-text-secondary">
                {user?.email ?? 'No email set'}
              </p>
            </div>
          </div>

          {!user?.email_confirmed ? (
            <EmailNotConfirmedAlert email={user?.email} />
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 ${filterTabBaseClass} ${
                activeTab === tab.id
                  ? filterTabActiveClass
                  : filterTabInactiveClass
              }`}
            >
              <span aria-hidden>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="min-h-[320px]">
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
    <div className="rounded-(--rounded-std) border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-yellow-100">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold">
          {settingsCopy.emailNotConfirmedTitle}
        </div>
        <p className="text-sm text-yellow-100/80">
          {settingsCopy.emailNotConfirmedBody(email)}
        </p>
      </div>
    </div>
  )
}
