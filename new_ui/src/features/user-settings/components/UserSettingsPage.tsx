import { useEffect, useState } from 'react'
import { Google } from '@thesvg/react'
import { useTranslation } from 'react-i18next'
import { ProfileTab } from './ProfileTab'
import { AccountTab } from './AccountTab'
import { IntegrationsTab } from './IntegrationsTab'
import WidgetTab from './WidgetTab'
import { SubsTab } from './SubsTab'
import type { Integration, UserProfile } from '@/types/user'
import { useOAuthUrl } from '@/hooks/useAuthUrl'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
  gradientTextClass,
  pageInnerClass,
  pageWrapClass,
} from '@/features/landing/styles'
import Twitch from '@/components/icons/icon-twtich'
import DonationAlerts from '@/components/icons/icon-da'

// ─── Hash helpers ──────────────────────────────────────────────────────────────

const HASH_PREFIX = 'tab-'
const VALID_TABS = [
  'profile',
  'account',
  'integrations',
  'subscriptions',
  'widget',
] as const
type TabId = (typeof VALID_TABS)[number]

function getHashTabId(): TabId {
  const hash = window.location.hash.slice(1)
  if (hash.startsWith(HASH_PREFIX)) {
    const id = hash.slice(HASH_PREFIX.length)
    if ((VALID_TABS as ReadonlyArray<string>).includes(id)) {
      return id as TabId
    }
  }
  return 'profile'
}

function setHashTabId(id: TabId) {
  history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}#${HASH_PREFIX}${id}`,
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface UserSettingsPageProps {
  user: UserProfile | null
  expired_at: number | null
  integrations: Array<Integration>
  onUserUpdate: (patch: Partial<UserProfile>) => void
}

interface Tab {
  id: TabId
  label: string
  icon: string
}

export function UserSettingsPage({
  user,
  expired_at,
  integrations,
  onUserUpdate,
}: UserSettingsPageProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>(() => getHashTabId())

  // Синхронизация с браузерными кнопками назад/вперёд
  useEffect(() => {
    const onHashChange = () => setActiveTab(getHashTabId())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleTabChange = (id: TabId) => {
    setActiveTab(id)
    setHashTabId(id)
  }

  const TABS: Array<Tab> = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: '👤' },
    { id: 'account', label: t('settings.tabs.account'), icon: '⚙️' },
    { id: 'integrations', label: t('settings.tabs.integrations'), icon: '🔗' },
    {
      id: 'subscriptions',
      label: t('settings.tabs.subscriptions'),
      icon: '🔔',
    },
    { id: 'widget', label: t('settings.tabs.widget'), icon: '🖼️' },
  ]

  const handleOAuthRedirect = useOAuthUrl()

  const platformConfigs = {
    twitch: {
      name: t('platform.twitch'),
      icon: (
        <Twitch
          className="w-full h-full bg-accent-1 rounded-lg"
          fill="#fff"
          stroke="#fff"
          color="#fff"
        />
      ),
      loginHandler: async () => {
        await handleOAuthRedirect('twitch', true)
      },
    },
    donationalerts: {
      name: t('platform.donationalerts'),
      icon: <DonationAlerts width={45} height={45} />,
      loginHandler: async () => {
        await handleOAuthRedirect('donationalerts', true)
      },
    },
    google: {
      name: t('platform.google'),
      icon: <Google width={45} height={45} />,
      loginHandler: async () => {
        await handleOAuthRedirect('google', true)
      },
    },
    donatex: {
      name: t('platform.donatex'),
      icon: <img src="/donatex-icon.png" width={45} height={45} />,
      loginHandler: async () => {
        await handleOAuthRedirect('donatex', true)
      },
    },
  } as const

  return (
    <div className={pageWrapClass}>
      <div className={`${pageInnerClass} flex flex-col gap-6 sm:gap-8`}>
        <header className="text-center sm:text-left">
          <p className={`text-sm font-medium mb-2 ${gradientTextClass}`}>
            {t('settings.eyebrow')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
            {t('settings.title')}
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mt-1">
            {t('settings.subtitle')}
          </p>
        </header>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
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

        <div className="min-h-80">
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
          {activeTab === 'subscriptions' && <SubsTab />}
          {activeTab === 'widget' && <WidgetTab />}
        </div>
      </div>
    </div>
  )
}

function EmailNotConfirmedAlert({ email }: { email?: string }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-(--rounded-std) border border-yellow-500/50 bg-yellow-500/10 px-4 py-3 text-yellow-100">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold">
          {t('settings.emailNotConfirmed.title')}
        </div>
        <p className="text-sm text-yellow-100/80">
          {t('settings.emailNotConfirmed.body', {
            email: email ?? t('settings.emailNotConfirmed.defaultEmail'),
          })}
        </p>
      </div>
    </div>
  )
}
