import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useUpdateStatsPrivacy } from '@/features/stats/hooks/useStats'
import type { UserStatsVisibilitySettings } from '@/features/stats/types'

interface StatsPrivacySettingsSectionProps {
  initialSettings?: Partial<UserStatsVisibilitySettings>
}

export const StatsPrivacySettingsSection: React.FC<
  StatsPrivacySettingsSectionProps
> = ({ initialSettings }) => {
  const { t } = useTranslation()
  const updatePrivacy = useUpdateStatsPrivacy()

  const [settings, setSettings] = useState<UserStatsVisibilitySettings>({
    show_outgoing_stats: initialSettings?.show_outgoing_stats ?? true,
    show_incoming_stats: initialSettings?.show_incoming_stats ?? true,
    show_top_tracks: initialSettings?.show_top_tracks ?? true,
    show_top_streamers: initialSettings?.show_top_streamers ?? true,
    show_top_requesters: initialSettings?.show_top_requesters ?? true,
    show_donations: initialSettings?.show_donations ?? false,
    show_moderation_stats: initialSettings?.show_moderation_stats ?? false,
  })

  const handleToggle = async (
    key: keyof UserStatsVisibilitySettings,
    checked: boolean,
  ) => {
    const newSettings = { ...settings, [key]: checked }
    setSettings(newSettings)

    try {
      await updatePrivacy.mutateAsync({ [key]: checked })
      toast.success(t('stats.privacy.success', 'Privacy settings updated'))
    } catch {
      // Revert state on error
      setSettings(settings)
      toast.error(t('stats.privacy.error', 'Failed to update privacy settings'))
    }
  }

  const TOGGLES: {
    key: keyof UserStatsVisibilitySettings
    labelKey: string
    fallback: string
    descKey: string
    descFallback: string
  }[] = [
    {
      key: 'show_outgoing_stats',
      labelKey: 'stats.privacy.showOutgoing',
      fallback: 'Show Outgoing Statistics',
      descKey: 'stats.privacy.showOutgoingDesc',
      descFallback: 'Allow others to view orders you send to streamers.',
    },
    {
      key: 'show_incoming_stats',
      labelKey: 'stats.privacy.showIncoming',
      fallback: 'Show Incoming Statistics',
      descKey: 'stats.privacy.showIncomingDesc',
      descFallback: 'Allow others to view orders received by your playlists.',
    },
    {
      key: 'show_top_tracks',
      labelKey: 'stats.privacy.showTopTracks',
      fallback: 'Show Top Tracks',
      descKey: 'stats.privacy.showTopTracksDesc',
      descFallback: 'Display your most ordered and requested tracks.',
    },
    {
      key: 'show_top_streamers',
      labelKey: 'stats.privacy.showTopStreamers',
      fallback: 'Show Top Streamers',
      descKey: 'stats.privacy.showTopStreamersDesc',
      descFallback: 'Display streamers you order to most frequently.',
    },
    {
      key: 'show_top_requesters',
      labelKey: 'stats.privacy.showTopRequesters',
      fallback: 'Show Top Requesters',
      descKey: 'stats.privacy.showTopRequestersDesc',
      descFallback: 'Display top viewers ordering in your playlists.',
    },
    {
      key: 'show_donations',
      labelKey: 'stats.privacy.showDonations',
      fallback: 'Show Donation Summary',
      descKey: 'stats.privacy.showDonationsDesc',
      descFallback: 'Display donation amounts and summary on your profile.',
    },
    {
      key: 'show_moderation_stats',
      labelKey: 'stats.privacy.showModerationStats',
      fallback: 'Show Moderation & Blocked Stats',
      descKey: 'stats.privacy.showModerationStatsDesc',
      descFallback: 'Display auto-blocked order counts and blacklist stats.',
    },
  ]

  return (
    <div className="p-3 sm:p-4 border border-accent/60 rounded-md bg-level-1 space-y-3.5 shadow-xs">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main pb-1 border-b border-accent/40">
        <ShieldCheck className="size-4 text-accent" />
        <span>{t('stats.privacy.title', 'Statistics Privacy Settings')}</span>
      </div>

      <p className="text-xs text-text-secondary">
        {t(
          'stats.privacy.subtitle',
          'Control which statistics are visible on your public user profile.',
        )}
      </p>

      <div className="space-y-2">
        {TOGGLES.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-level-2/60"
          >
            <div className="min-w-0 flex-1">
              <Label className="text-xs font-semibold text-text-main block cursor-pointer">
                {t(item.labelKey, item.fallback)}
              </Label>
              <p className="text-[11px] text-text-secondary mt-0.5">
                {t(item.descKey, item.descFallback)}
              </p>
            </div>
            <Switch
              checked={settings[item.key]}
              onCheckedChange={(checked) => handleToggle(item.key, checked)}
              disabled={updatePrivacy.isPending}
              className="shrink-0"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default StatsPrivacySettingsSection
