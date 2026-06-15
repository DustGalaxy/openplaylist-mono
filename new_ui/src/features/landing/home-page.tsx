import { Link, useNavigate } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import {
  ListMusic,
  Radio,
  Search,
  Shield,
  Sparkles,
  Turntable,
  Users,
  Zap,
} from 'lucide-react'
import Dashboard from '@/components/icons/icon-dashboard'
import Btn from '@/components/ui/my-btn'
import SearchPlaylist from '@/features/public-playlist/components/search-playlist'
import { gradientTextClass, panelClass } from '@/features/landing/styles'
import { useAuthStore } from '@/stores/authStore'

const featureKeys = [
  { icon: Radio, key: 'liveQueue' },
  { icon: Shield, key: 'smartRules' },
  { icon: Zap, key: 'donations' },
  { icon: Users, key: 'publicAccess' },
] as const

const stepKeys = ['create', 'share', 'stream'] as const
const audienceBulletKeys = [
  'sharedQueue',
  'validation',
  'publicPrivate',
  'sync',
] as const

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Radio
  title: string
  description: string
}) {
  return (
    <article
      className="
        group text-left rounded-(--rounded-std) border-2 border-level-3/50 bg-level-2 p-5
        transition-all duration-200 hover:border-level-3 hover:shadow-[0_0_24px_rgba(236,72,153,0.12)]
      "
    >
      <div
        className="
          mb-4 inline-flex h-11 w-11 items-center justify-center rounded-(--rounded-std)
          bg-level-1 border border-level-3/40 text-level-3
          group-hover:text-transparent group-hover:bg-gradient-to-br group-hover:from-[var(--color-accent-2)] group-hover:via-[var(--color-accent-3)] group-hover:to-[var(--color-accent-1)]
          transition-colors
        "
      >
        <Icon className="h-5 w-5 group-hover:text-level-1" strokeWidth={2} />
      </div>
      <h3 className="text-lg font-semibold text-text-main mb-2">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">
        {description}
      </p>
    </article>
  )
}

export default function HomePage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="w-full text-text-main">
      <section className="relative px-4 pt-8 pb-16 sm:pt-12 sm:pb-24 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
        >
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[var(--color-accent-3)] blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-[var(--color-accent-2)] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12 items-center">
            <div className="text-left">
              <p
                className={`inline-flex items-center gap-2 text-sm font-medium mb-4 ${gradientTextClass}`}
              >
                <Sparkles className="h-4 w-4 text-[var(--color-accent-2)]" />
                {t('landing.eyebrow')}
              </p>

              <h1
                className="
                  text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] mb-6
                  text-transparent bg-gradient-to-r from-[var(--color-accent-2)] via-[var(--color-accent-3)] to-[var(--color-accent-1)]
                  bg-clip-text bg-[length:200%_auto] animate-bg-move-w-shadow
                "
              >
                {t('landing.title')}
              </h1>

              <p className="text-lg sm:text-xl text-text-secondary leading-relaxed max-w-xl mb-8">
                <Trans
                  i18nKey="landing.heroBody"
                  components={[
                    <span
                      key="0"
                      className={`font-semibold ${gradientTextClass}`}
                    />,
                  ]}
                />
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <Btn
                    text={
                      <div className="flex items-center gap-2">
                        <Turntable />
                        {t('landing.goToPlaylists')}
                      </div>
                    }
                    className="px-6 h-14 text-lg font-bold bg-level-2 text-text-main min-w-[220px]"
                    onClick={() => navigate({ to: '/dashboard' })}
                  />
                ) : (
                  <Btn
                    text={t('landing.loginAndStart')}
                    className="px-6 h-14 text-lg font-bold bg-level-2 text-text-main min-w-[200px]"
                    onClick={() => navigate({ to: '/login' })}
                  />
                )}
                <Btn
                  text={
                    <div className="flex items-center gap-2">
                      <Search className="size-8" />
                      {t('landing.findPlaylist')}
                    </div>
                  }
                  className="px-6 h-14 text-lg font-bold bg-level-2 text-text-main min-w-[200px]"
                  onClick={() => navigate({ to: '/view' })}
                />
              </div>
            </div>

            <div
              className="
                rounded-(--rounded-std) border-2 border-level-3 bg-level-2/90 p-6 sm:p-8
                shadow-[-2px_2px_16px_rgba(0,0,0,0.35)]
              "
            >
              <div className="flex items-center gap-3 mb-6">
                <ListMusic className="h-8 w-8 text-level-3" />
                <div>
                  <p className="font-semibold text-text-main">
                    {t('landing.audienceTitle')}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {t('landing.audienceSubtitle')}
                  </p>
                </div>
              </div>
              <ul className="space-y-4 text-sm sm:text-base">
                {audienceBulletKeys.map((key) => (
                  <li key={key} className="flex gap-3 text-text-secondary">
                    <span className={`shrink-0 font-bold ${gradientTextClass}`}>
                      →
                    </span>
                    <span>{t(`landing.audienceBullets.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20 bg-level-2/40 border-y border-level-3/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-main mb-3">
              {t('landing.featuresTitle')}
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              {t('landing.featuresSubtitle')}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {featureKeys.map(({ icon, key }) => (
              <FeatureCard
                key={key}
                icon={icon}
                title={t(`landing.features.${key}.title`)}
                description={t(`landing.features.${key}.description`)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            {t('landing.howItWorksTitle')}
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {stepKeys.map((key, index) => (
              <li
                key={key}
                className="relative rounded-(--rounded-std) border border-level-3/40 bg-level-2 p-6 text-left"
              >
                <span
                  className={`text-4xl font-black opacity-40 ${gradientTextClass}`}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-xl font-semibold mt-2 mb-2">
                  {t(`landing.steps.${key}.title`)}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {t(`landing.steps.${key}.text`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 pb-20 sm:pb-28">
        <div className="mx-auto max-w-5xl">
          <div className={`p-6 sm:p-10 ${panelClass}`}>
            <SearchPlaylist showHeader />
          </div>
        </div>
      </section>
    </div>
  )
}
