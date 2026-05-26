import { Link, useNavigate } from '@tanstack/react-router'
import {
  ListMusic,
  Radio,
  Search,
  Shield,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'

import Btn from '@/components/ui/my-btn'
import SearchPlaylist from '@/features/public-playlist/components/search-playlist'
import { gradientTextClass, panelClass } from '@/features/landing/styles'
import { useAuthStore } from '@/stores/authStore'

const features = [
  {
    icon: Radio,
    title: 'Живая очередь',
    description:
      'Заявки от зрителей сразу попадают в плейлист. Все подключённые клиенты видят изменения через WebSocket.',
  },
  {
    icon: Shield,
    title: 'Умные правила',
    description:
      'Лимиты по длительности, просмотрам, кулдаунам и блок-листам — вы сами решаете, что допустить в эфир.',
  },
  {
    icon: Zap,
    title: 'Донаты и приоритет',
    description:
      'Настройте бусты от DonationAlerts и роли из чата Twitch — очередь учитывает вклад аудитории.',
  },
  {
    icon: Users,
    title: 'Публичный доступ',
    description:
      'Открытые плейлисты можно найти по имени или автору. Зрители отправляют треки без лишних шагов.',
  },
]

const steps = [
  {
    step: '01',
    title: 'Создайте плейлист',
    text: 'Войдите через Twitch или email, настройте режим flow/static и правила контента.',
  },
  {
    step: '02',
    title: 'Поделитесь ссылкой',
    text: 'Дайте зрителям публичную страницу — они ищут трек и отправляют заявку в очередь.',
  },
  {
    step: '03',
    title: 'Ведите эфир',
    text: 'Управляйте воспроизведением с дашборда: play now, пропуск, сортировка и история.',
  },
]

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
      <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    </article>
  )
}

export default function HomePage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="w-full text-text-main">
      {/* Hero */}
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
                Плейлисты для стримов и сообществ
              </p>

              <h1
                className="
                  text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] mb-6
                  text-transparent bg-gradient-to-r from-[var(--color-accent-2)] via-[var(--color-accent-3)] to-[var(--color-accent-1)]
                  bg-clip-text bg-[length:200%_auto] animate-bg-move-w-shadow
                "
              >
                OPEN PLAYLIST
              </h1>

              <p className="text-lg sm:text-xl text-text-secondary leading-relaxed max-w-xl mb-8">
                <span className={`font-semibold ${gradientTextClass}`}>
                  OpenPlaylist
                </span>{' '}
                — место, где плейлист общий, а не личный список треков.
                Зрители предлагают музыку, правила фильтруют заявки, а вы
                управляете эфиром в один клик.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                {isAuthenticated ? (
                  <Btn
                    text="Перейти к плейлистам"
                    className="px-6 h-14 text-lg font-bold bg-level-2 text-text-main min-w-[220px]"
                    onClick={() => navigate({ to: '/dashboard' })}
                  />
                ) : (
                  <Btn
                    text="Войти и начать"
                    className="px-6 h-14 text-lg font-bold bg-level-2 text-text-main min-w-[200px]"
                    onClick={() => navigate({ to: '/login' })}
                  />
                )}
                <Link
                  to="/view"
                  className="
                    inline-flex items-center justify-center gap-2 h-14 px-6 rounded-(--rounded-std)
                    border-2 border-level-3/70 bg-level-2/80 text-text-main text-lg font-medium
                    hover:border-level-3 hover:bg-level-2 transition-colors
                  "
                >
                  <Search className="h-5 w-5" />
                  Найти плейлист
                </Link>
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
                  <p className="font-semibold text-text-main">Для кого</p>
                  <p className="text-sm text-text-secondary">
                    Стримеры · модераторы · зрители
                  </p>
                </div>
              </div>
              <ul className="space-y-4 text-sm sm:text-base">
                {[
                  'Совместная очередь с приоритетами и донатами',
                  'Валидация YouTube-треков по вашим лимитам',
                  'Публичные и приватные плейлисты',
                  'Синхронизация дашборда и зрительской страницы',
                ].map((line) => (
                  <li key={line} className="flex gap-3 text-text-secondary">
                    <span
                      className={`shrink-0 font-bold ${gradientTextClass}`}
                    >
                      →
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:py-20 bg-level-2/40 border-y border-level-3/30">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-text-main mb-3">
              Что умеет платформа
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              От заявки зрителя до воспроизведения в эфире — всё связано
              настройками, realtime-обновлениями и понятным дашбордом.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
            Как это работает
          </h2>
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map(({ step, title, text }) => (
              <li
                key={step}
                className="relative rounded-(--rounded-std) border border-level-3/40 bg-level-2 p-6 text-left"
              >
                <span
                  className={`text-4xl font-black opacity-40 ${gradientTextClass}`}
                >
                  {step}
                </span>
                <h3 className="text-xl font-semibold mt-2 mb-2">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Discover */}
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
