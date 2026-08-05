import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Clock,
  Disc3,
  Globe,
  Lock,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import {
  useGlobalStats,
  useIncomingStats,
  useOutgoingStats,
} from '../hooks/useStats'
import type { StatsPeriod } from '../types'
import { KpiCard, formatSecondsToReadable } from './widgets/KpiCard'
import OwnerVsViewerWidget from './widgets/OwnerVsViewerWidget'
import PeriodSelector from './widgets/PeriodSelector'
import PlatformBreakdownWidget from './widgets/PlatformBreakdownWidget'
import StatusBreakdownWidget from './widgets/StatusBreakdownWidget'
import TopEntitiesWidget from './widgets/TopEntitiesWidget'
import TopTracksWidget from './widgets/TopTracksWidget'
import { useAuthStore } from '@/stores/authStore'
import {
  gradientTextClass,
  pageInnerClass,
  pageWrapClass,
  panelClass,
} from '@/features/landing/styles'

export const StatsPage: React.FC = () => {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuthStore()

  const [period, setPeriod] = useState<StatsPeriod>('30d')
  const [activeTab, setActiveTab] = useState<'my' | 'global'>(
    isAuthenticated ? 'my' : 'global',
  )
  const [mySubTab, setMySubTab] = useState<'incoming' | 'outgoing'>('incoming')

  const { data: outgoingStats, isLoading: isLoadingOutgoing } =
    useOutgoingStats(
      period,
      isAuthenticated && activeTab === 'my' && mySubTab === 'outgoing',
    )

  const { data: incomingStats, isLoading: isLoadingIncoming } =
    useIncomingStats(
      period,
      isAuthenticated && activeTab === 'my' && mySubTab === 'incoming',
    )

  const { data: globalStats, isLoading: isLoadingGlobal } =
    useGlobalStats(period)

  return (
    <div className={pageWrapClass}>
      <div className={pageInnerClass}>
        <div className="flex flex-col gap-6">
          {/* Header section */}
          <header
            className={`p-6 sm:p-8 ${panelClass} flex flex-col md:flex-row md:items-center justify-between gap-4`}
          >
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wider mb-1 ${gradientTextClass}`}
              >
                {t('stats.eyebrow', 'Analytics & Insights')}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main flex items-center gap-2.5">
                <BarChart3 className="size-7 text-accent" />
                {t('stats.title', 'Order Statistics')}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                {t(
                  'stats.subtitle',
                  'Track order counts, listening durations, top requested tracks and audience metrics.',
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <PeriodSelector period={period} onChange={setPeriod} />
            </div>
          </header>

          {/* Tab Selection */}
          <div className="flex items-center justify-between gap-2 border-b border-accent/40 pb-3">
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setActiveTab('my')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'my'
                      ? 'bg-level-1 text-text-main border border-accent/60 shadow-xs'
                      : 'text-text-secondary hover:text-text-main hover:bg-level-1/40'
                  }`}
                >
                  <UserCheck className="size-4" />
                  {t('stats.tabs.myStats', 'My Statistics')}
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('global')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'global'
                    ? 'bg-level-1 text-text-main border border-accent/60 shadow-xs'
                    : 'text-text-secondary hover:text-text-main hover:bg-level-1/40'
                }`}
              >
                <Globe className="size-4" />
                {t('stats.tabs.globalStats', 'Global Statistics')}
              </button>
            </div>

            {/* Sub-tabs for My Stats */}
            {isAuthenticated && activeTab === 'my' && (
              <div className="inline-flex items-center gap-1 bg-level-2 border border-accent/40 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMySubTab('incoming')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    mySubTab === 'incoming'
                      ? 'bg-level-1 text-accent-3 border border-accent/60'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                >
                  <ArrowDownLeft className="size-3.5" />
                  {t('stats.subtabs.incoming', 'Incoming')}
                </button>
                <button
                  type="button"
                  onClick={() => setMySubTab('outgoing')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    mySubTab === 'outgoing'
                      ? 'bg-level-1 text-accent-2 border border-accent/60'
                      : 'text-text-secondary hover:text-text-main'
                  }`}
                >
                  <ArrowUpRight className="size-3.5" />
                  {t('stats.subtabs.outgoing', 'Outgoing')}
                </button>
              </div>
            )}
          </div>

          {/* TAB CONTENT: MY STATS - INCOMING */}
          {isAuthenticated && activeTab === 'my' && mySubTab === 'incoming' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard
                  title={t('stats.kpi.totalOrdersIncoming', 'Incoming Orders')}
                  value={incomingStats?.total_orders ?? 0}
                  subtitle={t(
                    'stats.kpi.incomingSubtitle',
                    'Orders submitted to your playlists',
                  )}
                  icon={Disc3}
                  iconColorClass="text-accent-3"
                  isLoading={isLoadingIncoming}
                />
                <KpiCard
                  title={t('stats.kpi.totalDuration', 'Listening Duration')}
                  value={formatSecondsToReadable(
                    incomingStats?.total_duration_seconds ?? 0,
                  )}
                  subtitle={t(
                    'stats.kpi.durationSubtitle',
                    'Total duration of ordered tracks',
                  )}
                  icon={Clock}
                  iconColorClass="text-accent-2"
                  isLoading={isLoadingIncoming}
                />
                <KpiCard
                  title={t('stats.kpi.autoBlocked', 'Auto-Blocked Orders')}
                  value={incomingStats?.auto_blocked_count ?? 0}
                  subtitle={t(
                    'stats.kpi.blockedSubtitle',
                    'Blocked by blacklists & rules',
                  )}
                  icon={ShieldAlert}
                  iconColorClass="text-rose-400"
                  isLoading={isLoadingIncoming}
                />
              </div>

              {/* Audience breakdown & Platform breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OwnerVsViewerWidget
                  data={incomingStats?.owner_vs_viewer}
                  isLoading={isLoadingIncoming}
                />
                <PlatformBreakdownWidget
                  breakdown={incomingStats?.platform_breakdown ?? []}
                  isLoading={isLoadingIncoming}
                />
              </div>

              {/* Top Tracks & Requesters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TopTracksWidget
                  tracks={incomingStats?.top_tracks ?? []}
                  title={t(
                    'stats.topTracks.incomingTitle',
                    'Top Requested Tracks',
                  )}
                  isLoading={isLoadingIncoming}
                  limit={10}
                />
                <TopEntitiesWidget
                  entities={incomingStats?.top_requesters ?? []}
                  title={t('stats.topRequesters.title', 'Top Requesters')}
                  type="requester"
                  isLoading={isLoadingIncoming}
                  limit={10}
                />
              </div>
            </div>
          )}

          {/* TAB CONTENT: MY STATS - OUTGOING */}
          {isAuthenticated && activeTab === 'my' && mySubTab === 'outgoing' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <KpiCard
                  title={t('stats.kpi.totalOrdersOutgoing', 'Outgoing Orders')}
                  value={outgoingStats?.total_orders ?? 0}
                  subtitle={t(
                    'stats.kpi.outgoingSubtitle',
                    'Orders you sent to streamers',
                  )}
                  icon={Disc3}
                  iconColorClass="text-accent-2"
                  isLoading={isLoadingOutgoing}
                />
                <KpiCard
                  title={t('stats.kpi.totalDuration', 'Listening Duration')}
                  value={formatSecondsToReadable(
                    outgoingStats?.total_duration_seconds ?? 0,
                  )}
                  subtitle={t(
                    'stats.kpi.durationSubtitle',
                    'Total duration of ordered tracks',
                  )}
                  icon={Clock}
                  iconColorClass="text-accent-3"
                  isLoading={isLoadingOutgoing}
                />
              </div>

              {/* Status Breakdown & Platform Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatusBreakdownWidget
                  breakdown={outgoingStats?.status_breakdown ?? []}
                  isLoading={isLoadingOutgoing}
                />
                <PlatformBreakdownWidget
                  breakdown={outgoingStats?.platform_breakdown ?? []}
                  isLoading={isLoadingOutgoing}
                />
              </div>

              {/* Top Tracks & Streamers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TopTracksWidget
                  tracks={outgoingStats?.top_tracks ?? []}
                  title={t(
                    'stats.topTracks.outgoingTitle',
                    'Your Most Ordered Tracks',
                  )}
                  isLoading={isLoadingOutgoing}
                  limit={10}
                />
                <TopEntitiesWidget
                  entities={outgoingStats?.top_streamers ?? []}
                  title={t(
                    'stats.topStreamers.title',
                    'Top Streamers Ordered To',
                  )}
                  type="streamer"
                  isLoading={isLoadingOutgoing}
                  limit={10}
                />
              </div>
            </div>
          )}

          {/* TAB CONTENT: GLOBAL STATS */}
          {activeTab === 'global' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <KpiCard
                  title={t('stats.kpi.globalOrders', 'Platform Total Orders')}
                  value={globalStats?.total_orders ?? 0}
                  subtitle={t(
                    'stats.kpi.globalOrdersSubtitle',
                    'Total orders processed on OpenPlaylist',
                  )}
                  icon={Disc3}
                  iconColorClass="text-accent-3"
                  isLoading={isLoadingGlobal}
                />
                <KpiCard
                  title={t(
                    'stats.kpi.globalDuration',
                    'Platform Listening Time',
                  )}
                  value={formatSecondsToReadable(
                    globalStats?.total_duration_seconds ?? 0,
                  )}
                  subtitle={t(
                    'stats.kpi.globalDurationSubtitle',
                    'Combined duration of played music',
                  )}
                  icon={Clock}
                  iconColorClass="text-accent-2"
                  isLoading={isLoadingGlobal}
                />
              </div>

              {/* Platform breakdown */}
              <PlatformBreakdownWidget
                breakdown={globalStats?.platform_breakdown ?? []}
                isLoading={isLoadingGlobal}
              />

              {/* Top Tracks across platform */}
              <TopTracksWidget
                tracks={globalStats?.top_tracks ?? []}
                title={t(
                  'stats.topTracks.globalTitle',
                  'Most Popular Platform Tracks',
                )}
                isLoading={isLoadingGlobal}
                limit={10}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatsPage
