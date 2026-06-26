import { Link } from '@tanstack/react-router'
import { useTranslation, Trans } from 'react-i18next'
import Disc from '@/components/icons/icon-disc'
import { useAuthStore } from '@/stores/authStore'
import React from 'react'

const productLinkKeys = [
  { to: '/view' as const, labelKey: 'footer.searchPlaylists' },
  { to: '/login' as const, labelKey: 'footer.login' },
  { to: '/register' as const, labelKey: 'footer.register' },
] as const

const featureHighlightKeys = [
  'footer.highlights.realtimeQueue',
  'footer.highlights.rulesAndBlocks',
  'footer.highlights.donationPriority',
  'footer.highlights.integrations',
] as const

export default function Footer() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const year = new Date().getFullYear()
  const [inFocus, setInFocus] = React.useState(false)
  const windowWidth = window.innerWidth

  return (
    <footer
      className="w-full flex justify-center px-4 pb-6 pt-10 mt-auto"
      onClick={() => setInFocus(!inFocus)}
    >
      <div
        className="
          w-full max-w-5xl rounded-(--rounded-std) border-2 border-level-3 bg-level-2
          sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.15),-2px_2px_4px_rgba(0,0,0,0.15)]
          overflow-hidden text-text-main
        "
      >
        {/* <div
          className=" h-1 w-full bg-linear-to-r from-(--color-accent-2) via-(--color-accent-3) to-(--color-accent-1) bg-size-[200%_auto] animate-bg-move"
          aria-hidden
        /> */}

        <div
          className="px-6 py-8 sm:px-10 sm:py-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]"
          hidden={!inFocus && windowWidth < 600}
        >
          <div className="flex flex-col gap-4 text-left">
            <Link to="/" className="inline-flex items-center gap-2 w-fit group">
              <Disc />
              <span className="text-lg font-bold text-transparent bg-linear-to-r from-(--color-accent-2) via-(--color-accent-3) to-(--color-accent-1) bg-clip-text bg-size-[200%_auto] animate-bg-move">
                {t('brand.name')}
              </span>
            </Link>
            <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
              {t('footer.description')}
            </p>
            <span className="inline-flex w-fit items-center rounded-full border border-level-3/60 bg-level-1 px-3 py-1 text-xs text-text-placeholder">
              {t('brand.version')}
            </span>
          </div>

          <div className="text-left">
            <h3 className="text-sm font-semibold text-text-main uppercase tracking-wide mb-4">
              {t('footer.navigation')}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {isAuthenticated && (
                <li>
                  <Link
                    to="/dashboard"
                    className="text-sm text-text-secondary hover:text-text-main transition-colors"
                  >
                    {t('nav.myPlaylists')}
                  </Link>
                </li>
              )}
              {productLinkKeys.map(({ to, labelKey }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-text-secondary hover:text-text-main transition-colors"
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-left">
            <h3 className="text-sm font-semibold text-text-main uppercase tracking-wide mb-4">
              {t('footer.features')}
            </h3>
            <ul className="flex flex-col gap-2.5">
              {featureHighlightKeys.map((key) => (
                <li
                  key={key}
                  className="text-sm text-text-secondary flex items-start gap-2"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-linear-to-r from-(--color-accent-2) to-(--color-accent-3)"
                    aria-hidden
                  />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-level-3/40 px-6 py-4 sm:px-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-text-secondary">
          <span>
            {t('footer.copyright.start', { year: 2026 })}
            <a href="https://github.com/DustGalaxy" className='underline'>
              {t('footer.copyright.link')}
            </a>
            {t('footer.copyright.end')}
          </span>
          <p className="text-text-secondary">{t('footer.techStack')}</p>
        </div>
      </div>
    </footer>
  )
}
