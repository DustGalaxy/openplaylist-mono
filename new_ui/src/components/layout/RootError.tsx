import { AlertCircle, RotateCcw, HomeIcon } from 'lucide-react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  pageWrapClass,
  pageInnerClass,
  panelClass,
  gradientTextClass,
} from '@/features/landing/styles'
import Btn from '@/components/ui/my-btn'

interface ErrorComponentProps {
  error: Error
}

export default function ErrorComponent({ error }: ErrorComponentProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div
      className={`${pageWrapClass} flex min-h-[70vh] items-center justify-center relative overflow-hidden`}
    >
      {/* Эмбиент-свечение */}
      <div
        className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[var(--color-accent-2)] opacity-[0.06] blur-[100px]"
        aria-hidden
      />

      <div className={`${pageInnerClass} w-full`}>
        <div
          className={`${panelClass} max-w-xl mx-auto p-8 sm:p-12 text-center relative z-10`}
        >
          {/* Контейнер для иконки */}
          <div className="h-16 w-16 rounded-(--rounded-std) bg-level-1 border border-level-3/40 text-level-3 mx-auto flex items-center justify-center mb-6 shadow-[0_0_24px_rgba(245,106,25,0.1)]">
            <AlertCircle className="h-8 w-8" />
          </div>

          {/* Eyebrow / Надзаголовок */}
          <p
            className={`text-xs font-medium uppercase tracking-wider mb-2 ${gradientTextClass}`}
          >
            {t('errorPage.eyebrow')}
          </p>

          {/* Заголовок */}
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-4">
            {t('errorPage.title')}
          </h1>

          {/* Описание и текст ошибки в инсет-панели */}
          <div className="rounded-(--rounded-std) border border-white/5 bg-level-1/40 backdrop-blur-sm p-4 mb-8 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-placeholder mb-1">
              {t('errorPage.logLabel')}
            </p>
            <p className="text-sm text-danger font-mono break-words leading-relaxed">
              {error?.message || t('errorPage.unknownError')}
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Главное действие (3D CTA кнопка) */}
            <Btn
              className="px-6 h-12 text-base font-bold bg-level-2 text-text-main w-full sm:w-auto"
              onClick={() => router.invalidate()}
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" /> {t('errorPage.retryBtn')}
              </div>
            </Btn>

            <Btn
              className="px-6 h-12 text-base font-bold bg-level-2 text-text-main w-full sm:w-auto"
              onClick={() => navigate({ to: '/' })}
            >
              <div className="flex items-center gap-2">
                <HomeIcon className="h-4 w-4" />
                {t('errorPage.homeBtn')}
              </div>
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}
