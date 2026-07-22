import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  Bug,
  Heart,
  MessageSquare,
  Search,
  Turntable,
  Users,
} from 'lucide-react'
import MenuDropdown from './menu-dropdown'
import Disc from '@/components/icons/icon-disc'

import { useAuthStore } from '@/stores/authStore'
import DDNotificationList from '@/features/notifications/components/DDNotificationList'
import FeedbackModal from '@/features/feedback/FeedbackModal'
import ContributorsModal from '@/features/feedback/ContributorsModal'
import SupportModal from '@/features/feedback/SupportModal'

type ActiveModal = 'feedback' | 'bug' | 'contributors' | 'support' | null

const actionButtons = [
  {
    modal: 'feedback' as const,
    icon: MessageSquare,
    color: 'blue-500',
    labelKey: 'footer.feedback',
    fallback: 'Feedback',
  },
  {
    modal: 'bug' as const,
    icon: Bug,
    color: 'rose-500',
    labelKey: 'footer.bugReport',
    fallback: 'Bug report',
  },
  {
    modal: 'contributors' as const,
    icon: Users,
    color: 'green-500',
    labelKey: 'footer.contributors',
    fallback: 'Contributors',
  },
  {
    modal: 'support' as const,
    icon: Heart,
    color: 'red-500',
    labelKey: 'footer.support',
    fallback: 'Support',
  },
] as const

export default function Header() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  const windowWidth = window.innerWidth
  useState(() => {
    const storedLanguage = window.localStorage.getItem('Lng')
    if (storedLanguage && storedLanguage !== i18n.language) {
      i18n.changeLanguage(storedLanguage)
    }
  })
  return (
    <div className="w-full flex sticky top-0 z-50 justify-center">
      <header
        className="px-1 py-2 flex 
      w-full bg-level-2 
      text-text-main text-2xl justify-between
      border-b-1 border-level-3/40
      "
      >
        <nav className="flex flex-row justify-between w-full @container  gap-2  items-center">
          <div className="flex gap-2">
            <div className="px-2 ">
              <Link to="/" className="flex gap-2 items-center">
                <Disc />
                <h1
                  className="hidden @[400px]:block text-lg sm:text-xl font-bold text-center h-full text-transparent  relative drop-shadow-2xl
                  bg-linear-to-r from-(--color-accent-2) via-(--color-accent-3) to-(--color-accent-1)  
                  bg-clip-text bg-size-[200%_auto]  leading-normal animate-bg-move transition-all"
                >
                  {windowWidth > 400 && t('brand.name')}
                  {windowWidth > 600 && t('brand.version')}
                </h1>
              </Link>
            </div>
            <div className="flex items-center gap-1">
              {actionButtons.map(
                ({ modal, icon: Icon, color, labelKey, fallback }) => (
                  <button
                    key={modal}
                    type="button"
                    onClick={() => setActiveModal(modal)}
                    title={t(labelKey, fallback)}
                    className="
                  inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5
                  text-xs text-text-secondary hover:text-text-main hover:bg-level-1
                  transition-colors 
                "
                  >
                    <Icon size={14} className={` text-${color} `} />
                    <span className="hidden sm:inline">
                      {t(labelKey, fallback)}
                    </span>
                  </button>
                ),
              )}
            </div>
            <div className="px-2 flex place-content-center ">
              <Link
                to="/view"
                className="flex items-center"
                search={{ p: undefined }}
              >
                <Search className="size-3.5 " />
              </Link>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            {!isAuthenticated ? (
              <div className="flex items-center gap-4 pr-4">
                <select
                  value={i18n.language}
                  onChange={(e) => {
                    i18n.changeLanguage(e.target.value)
                    window.localStorage.setItem('Lng', e.target.value)
                  }}
                  className="bg-level-2 text-text-main text-base rounded-md p-1 border border-level-3/40 cursor-pointer outline-none"
                >
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                </select>

                <button
                  className="cursor-pointer text-base sm:text-lg"
                  onClick={() => navigate({ to: '/login' })}
                >
                  {t('nav.login')}
                </button>
              </div>
            ) : (
              <div className="flex gap-2 h-8.25 items-center">
                <div className="px-2 gap-4  flex items-center">
                  <DDNotificationList />
                  <MenuDropdown />
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      <FeedbackModal
        open={activeModal === 'feedback' || activeModal === 'bug'}
        onOpenChange={(open) => setActiveModal(open ? activeModal : null)}
        type={activeModal === 'bug' ? 'bug' : 'feedback'}
      />

      <ContributorsModal
        open={activeModal === 'contributors'}
        onOpenChange={(open) => setActiveModal(open ? 'contributors' : null)}
      />

      <SupportModal
        open={activeModal === 'support'}
        onOpenChange={(open) => setActiveModal(open ? 'support' : null)}
        onFeedbackClick={() => setActiveModal('feedback')}
      />
    </div>
  )
}
