import { Link } from '@tanstack/react-router'
import Disc from '@/components/icons/icon-disc'
import { useAuthStore } from '@/stores/authStore'
import React from 'react'

const APP_VERSION = '2026.1 beta'

const productLinks = [
  { to: '/view' as const, label: 'Поиск плейлистов' },
  { to: '/login' as const, label: 'Вход' },
  { to: '/register' as const, label: 'Регистрация' },
]

const featureHighlights = [
  'Очередь треков в реальном времени',
  'Правила и блок-листы',
  'Приоритет от донатов',
  'Интеграция Twitch и DonationAlerts',
]

export default function Footer() {
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
          shadow-[-1px_1px_6px_rgba(0,0,0,0.4),-1px_1px_4px_rgba(0,0,0,0.3)]
          sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.45),-2px_2px_4px_rgba(0,0,0,0.35)]
          overflow-hidden
        "
      >
        <div
          className=" h-1 w-full bg-gradient-to-r from-[var(--color-accent-2)] via-[var(--color-accent-3)] to-[var(--color-accent-1)] bg-[length:200%_auto] animate-bg-move"
          aria-hidden
        />

        <div
          className="px-6 py-8 sm:px-10 sm:py-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]"
          hidden={!inFocus && windowWidth < 600}
        >
          <div className="flex flex-col gap-4 text-left">
            <Link to="/" className="inline-flex items-center gap-2 w-fit group">
              <Disc />
              <span className="text-lg font-bold text-transparent bg-gradient-to-r from-[var(--color-accent-2)] via-[var(--color-accent-3)] to-[var(--color-accent-1)] bg-clip-text bg-[length:200%_auto] animate-bg-move">
                OpenPlaylist
              </span>
            </Link>
            <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
              Платформа для стримеров и зрителей: общие плейлисты, заявки на
              треки, гибкие правила и синхронизация очереди без перезагрузки
              страницы.
            </p>
            <span className="inline-flex w-fit items-center rounded-full border border-level-3/60 bg-level-1 px-3 py-1 text-xs text-text-placeholder">
              {APP_VERSION}
            </span>
          </div>

          <div className="text-left">
            <h3 className="text-sm font-semibold text-text-main uppercase tracking-wide mb-4">
              Навигация
            </h3>
            <ul className="flex flex-col gap-2.5">
              {isAuthenticated && (
                <li>
                  <Link
                    to="/dashboard"
                    className="text-sm text-text-secondary hover:text-text-main transition-colors"
                  >
                    Мои плейлисты
                  </Link>
                </li>
              )}
              {productLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-text-secondary hover:text-text-main transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-left">
            <h3 className="text-sm font-semibold text-text-main uppercase tracking-wide mb-4">
              Возможности
            </h3>
            <ul className="flex flex-col gap-2.5">
              {featureHighlights.map((item) => (
                <li
                  key={item}
                  className="text-sm text-text-secondary flex items-start gap-2"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-[var(--color-accent-2)] to-[var(--color-accent-3)]"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-level-3/40 px-6 py-4 sm:px-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-text-placeholder">
          <p>© {year} OpenPlaylist. Сделано для живых эфиров.</p>
          <p className="text-text-secondary">
            REST + WebSocket · React · FastAPI
          </p>
        </div>
      </div>
    </footer>
  )
}
