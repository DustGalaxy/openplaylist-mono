import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  Bug,
  Disc3,
  Heart,
  Menu,
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
import { useMobileSidebarStore } from '@/stores/mobileSidebarStore'
import Btn from '../ui/my-btn'

export default function Header() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const toggleMobileSidebar = useMobileSidebarStore((s) => s.toggle)
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
        className="pr-2 py-2 flex 
      w-full bg-level-2 
      text-text-main text-2xl justify-between
      border-b-1 border-level-3/40
      "
      >
        <nav className="flex flex-row justify-between w-full @container pl-1  gap-2  items-center">
          <div className="flex gap-1 items-center">
            {isAuthenticated && (
              <Btn
                onClick={toggleMobileSidebar}
                className="sm:hidden px-1 bg-level-2 rounded-sm size-8"
              >
                <Menu className="size-5" />
              </Btn>
            )}
            <div className="px-2 h-full">
              <Link to="/" className="flex gap-2 items-center">
                <Disc3 className="size-6" />
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

            <div className="px-2 flex place-content-center">
              <Link
                to="/playlists"
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
                  <option value="ua">Українська</option>
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
    </div>
  )
}
