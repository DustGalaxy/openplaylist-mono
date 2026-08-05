import { useNavigate } from '@tanstack/react-router'
import {
  FeatureI18nProvider,
  useFeatureTranslation,
} from '@/lib/i18n/featureTranslation'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ListMusic,
  Radio,
  Search,
  Shield,
  Sparkles,
  Turntable,
  Users,
  Zap,
} from 'lucide-react'
import Btn from '@/components/ui/my-btn'
import SearchPlaylist from '@/features/united-playlist/components/search-playlist'
import { gradientTextClass, panelClass } from '@/features/landing/styles'
import { useAuthStore } from '@/stores/authStore'
import { GlobalStatsBannerWidget } from '@/features/stats'

const featureKeys = [
  {
    icon: Radio,
    key: 'liveQueue',
    color: 'from-pink-500/20 to-purple-500/20',
    text: 'text-pink-400',
  },
  {
    icon: Shield,
    key: 'smartRules',
    color: 'from-blue-500/20 to-cyan-500/20',
    text: 'text-cyan-400',
  },
  {
    icon: Zap,
    key: 'donations',
    color: 'from-amber-500/20 to-orange-500/20',
    text: 'text-amber-400',
  },
  {
    icon: Users,
    key: 'publicAccess',
    color: 'from-emerald-500/20 to-teal-500/20',
    text: 'text-emerald-400',
  },
] as const

const stepKeys = ['create', 'share', 'stream'] as const
const audienceBulletKeys = [
  'sharedQueue',
  'validation',
  'publicPrivate',
  'sync',
] as const
const highlightKeys = [
  { icon: Zap, key: 'instantSync' },
  { icon: Shield, key: 'antiSpam' },
  { icon: Radio, key: 'wideIntegration' },
  { icon: Users, key: 'openAccess' },
] as const

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  text,
}: {
  icon: typeof Radio
  title: string
  description: string
  color: string
  text: string
}) {
  return (
    <article className="group text-left rounded-xl border border-accent/40 bg-level-2/90 p-6 transition-all duration-300 hover:border-accent/80 hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 flex flex-col justify-between relative overflow-hidden">
      <div
        className={`absolute top-0 right-0 size-32 bg-linear-to-br ${color} rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      />

      <div className="relative z-10">
        <div
          className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-level-1 border border-accent/40 ${text} group-hover:scale-110 transition-transform duration-300 shadow-xs`}
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
        </div>
        <h3 className="text-lg font-bold text-text-main mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:from-(--color-accent-2) group-hover:to-(--color-accent-3) transition-all">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
          {description}
        </p>
      </div>
    </article>
  )
}

export default function HomePage() {
  const { t } = useFeatureTranslation()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="w-full text-text-main space-y-8 pb-8">
      {/* HERO SECTION */}
      <section className="relative px-4 pt-6 pb-8 sm:pt-12 sm:pb-16 overflow-hidden">
        {/* Layered ambient glows */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          aria-hidden
        >
          <div className="absolute top-10 left-1/4 h-80 w-80 rounded-full bg-(--color-accent-3) blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-(--color-accent-2) blur-[130px]" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12 items-center">
            {/* Left Hero Text */}
            <div className="text-left space-y-6">
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-level-2/90 border border-accent/50 shadow-xs backdrop-blur-md">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span
                  className={`text-xs font-bold tracking-wide ${gradientTextClass}`}
                >
                  {t('landing.eyebrow')}
                </span>
                <Sparkles className="size-3.5 text-(--color-accent-2)" />
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.06] tracking-tight text-transparent bg-linear-to-r from-(--color-accent-2) via-(--color-accent-3) to-(--color-accent-1) bg-clip-text">
                {t('landing.title')}
              </h1>

              <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl">
                {t('landing.heroBody')}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {isAuthenticated ? (
                  <Btn
                    className="px-6 h-13 text-base font-bold bg-linear-to-r from-level-2 to-level-1 text-text-main border border-accent/60 hover:border-accent transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => navigate({ to: '/playlists' })}
                  >
                    <div className="flex items-center gap-2.5">
                      <Turntable className="size-5 text-accent animate-spin-slow" />
                      <span>{t('landing.goToPlaylists')}</span>
                      <ArrowRight className="size-4 text-text-secondary" />
                    </div>
                  </Btn>
                ) : (
                  <Btn
                    className="px-6 h-13 text-base font-bold bg-linear-to-r from-level-2 to-level-1 text-text-main border border-accent/60 hover:border-accent transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => navigate({ to: '/login' })}
                  >
                    <div className="flex items-center gap-2">
                      <span>{t('landing.loginAndStart')}</span>
                      <ArrowRight className="size-4 text-accent" />
                    </div>
                  </Btn>
                )}

                <Btn
                  className="px-6 h-13 text-base font-bold bg-level-2/80 text-text-main border border-accent/40 hover:bg-level-1 hover:border-accent/70 transition-all shadow-xs"
                  onClick={() => navigate({ to: '/playlists' })}
                >
                  <div className="flex items-center gap-2.5">
                    <Search className="size-5 text-accent" />
                    <span>{t('landing.findPlaylist')}</span>
                  </div>
                </Btn>
              </div>
            </div>

            {/* Right Hero Preview Card */}
            <div className="rounded-2xl border border-accent/50 bg-level-2/95 p-6 sm:p-7 shadow-xl backdrop-blur-md relative group overflow-hidden">
              <div className="absolute top-0 right-0 size-40 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-accent/40 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-level-1 border border-accent/40 text-accent">
                    <ListMusic className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-text-main text-base sm:text-lg">
                      {t('landing.audienceTitle')}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {t('landing.audienceSubtitle')}
                    </p>
                  </div>
                </div>
                <Activity className="size-5 text-emerald-400 animate-pulse" />
              </div>

              <ul className="space-y-3.5 text-xs sm:text-sm">
                {audienceBulletKeys.map((key) => (
                  <li
                    key={key}
                    className="flex gap-3 text-text-secondary items-start group/item"
                  >
                    <CheckCircle2 className="size-4 shrink-0 text-accent mt-0.5 group-hover/item:text-emerald-400 transition-colors" />
                    <span className="leading-snug font-medium text-text-main/90">
                      {t(`landing.audienceBullets.${key}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK HIGHLIGHTS TICKER */}
      <section className="px-4">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3">
          {highlightKeys.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="p-3.5 rounded-xl bg-level-2/80 border border-accent/40 flex items-center gap-3 shadow-xs hover:border-accent/60 transition-all"
            >
              <div className="p-2 rounded-lg bg-level-1 text-accent border border-accent/30 shrink-0">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-text-main truncate">
                  {t(`landing.highlights.${key}.label`)}
                </div>
                <div className="text-[10px] text-text-secondary truncate">
                  {t(`landing.highlights.${key}.sub`)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PREVIEW & FEATURES SECTION */}
      <section className="px-4 py-12 sm:py-16 bg-level-2/30 border-y border-accent/30">
        <div className="mx-auto max-w-5xl space-y-14">
          {/* App Window Preview Frame */}
          <div className="w-full flex flex-col justify-center space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-main">
                {t('landing.preview', 'Preview')}
              </h2>
            </div>

            {/* Styled Window Wrapper */}
            <div className="rounded-2xl border border-accent/50 bg-level-1/90 shadow-xl overflow-hidden backdrop-blur-md">
              {/* Window Header Bar */}
              <div className="px-4 py-2.5 bg-level-2 border-b border-accent/40 flex items-center">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-rose-500/80" />
                  <div className="size-3 rounded-full bg-amber-500/80" />
                  <div className="size-3 rounded-full bg-emerald-500/80" />
                </div>
              </div>

              {/* Media Container */}
              <div className="p-2 sm:p-3 bg-level-1">
                <img
                  src="preview-guide.gif"
                  alt="OpenPlaylist interface preview"
                  className="w-full rounded-lg object-cover border border-accent/30"
                />
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-text-main">
                {t('landing.featuresTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary">
                {t('landing.featuresSubtitle')}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {featureKeys.map(({ icon, key, color, text }) => (
                <FeatureCard
                  key={key}
                  icon={icon}
                  title={t(`landing.features.${key}.title`)}
                  description={t(`landing.features.${key}.description`)}
                  color={color}
                  text={text}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-main">
              {t('landing.howItWorksTitle')}
            </h2>
          </div>

          <ol className="grid gap-4 md:grid-cols-3">
            {stepKeys.map((key, index) => (
              <li
                key={key}
                className="group relative rounded-xl border border-accent/40 bg-level-2/90 p-6 text-left space-y-3 hover:border-accent/80 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black font-mono text-accent/70">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="size-2 rounded-full bg-accent opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-base font-bold text-text-main group-hover:text-accent transition-colors">
                  {t(`landing.steps.${key}.title`)}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t(`landing.steps.${key}.text`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* GLOBAL STATISTICS BANNER */}
      <section className="px-4 py-4 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <GlobalStatsBannerWidget />
        </div>
      </section>

      {/* SEARCH PLAYLIST / CTA SECTION */}
      <section className="px-4 pb-12 sm:pb-16">
        <div className="mx-auto max-w-5xl">
          <div className={`p-6 sm:p-8 ${panelClass} relative overflow-hidden`}>
            <FeatureI18nProvider ns={'playlist'}>
              <SearchPlaylist showHeader />
            </FeatureI18nProvider>
          </div>
        </div>
      </section>
    </div>
  )
}
