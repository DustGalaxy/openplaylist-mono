import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Bug, Users, Heart } from 'lucide-react'
import Disc from '@/components/icons/icon-disc'
import { useAuthStore } from '@/stores/authStore'
import FeedbackModal from '@/features/feedback/FeedbackModal'
import ContributorsModal from '@/features/feedback/ContributorsModal'
import SupportModal from '@/features/feedback/SupportModal'

const productLinkKeys = [
  {
    to: '/view' as const,
    labelKey: 'footer.searchPlaylists',
    fallback: 'Search playlists',
  },
  { to: '/login' as const, labelKey: 'footer.login', fallback: 'Log in' },
  {
    to: '/register' as const,
    labelKey: 'footer.register',
    fallback: 'Sign up',
  },
] as const

export default function Footer() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()

  return (
    <footer className="w-full flex justify-center px-4 pb-6 pt-6 mt-auto">
      <div
        className="
          w-full max-w-5xl rounded-(--rounded-std) border-2 border-accent bg-level-2
          sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.15),-2px_2px_4px_rgba(0,0,0,0.15)]
          overflow-hidden text-text-main
        "
      >
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 shrink-0 group"
          >
            <Disc />
            <span className="text-base font-bold text-transparent bg-linear-to-r from-(--color-accent-2) via-(--color-accent-3) to-(--color-accent-1) bg-clip-text bg-size-[200%_auto] animate-bg-move">
              {t('brand.name', 'OpenPlaylist')}
            </span>
          </Link>

          <nav className="flex items-center gap-4 text-sm text-text-secondary">
            {isAuthenticated && (
              <Link
                to="/playlists"
                className="hover:text-text-main transition-colors"
              >
                {t('nav.myPlaylists', 'My playlists')}
              </Link>
            )}
            {productLinkKeys.map(({ to, labelKey, fallback }) => (
              <Link
                key={to}
                to={to}
                className="hover:text-text-main transition-colors"
              >
                {t(labelKey, fallback)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-accent/40 px-5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-text-secondary">
          <span>
            {t('footer.copyright.start', 'Made in {{year}} by ', {
              year: 2026,
            })}
            <a href="https://github.com/DustGalaxy" className="underline">
              {t('footer.copyright.link', 'DustGalaxy')}
            </a>
            {t('footer.copyright.end', '. All rights reserved.')}
          </span>
          <p>{t('footer.techStack', 'Built with React & TypeScript')}</p>
        </div>
      </div>
    </footer>
  )
}
