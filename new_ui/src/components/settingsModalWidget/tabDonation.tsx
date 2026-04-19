import React from 'react'
import { toast } from 'sonner'
import { Label } from '../ui/label'
import { DialogDescription } from '../ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs'
import PlatformDonationEditor from './platformDonationTab'
import type {
  ClientPlaylist,
  PlaylistSettings,
  ReadDonationRules,
} from '@/types/playlist'
import { DonationPlatform } from '@/types/playlist'
import {
  createDonationRule,
  initPlatformDonation,
  deleteDonationRule,
} from '@/api/settings/donation'

const TabDonation = ({
  playlist,
  settings,
  setSettings,
}: {
  playlist: ClientPlaylist
  settings: PlaylistSettings
  setSettings: React.Dispatch<React.SetStateAction<PlaylistSettings>>
}) => {
  const [activeTab, setActiveTab] = React.useState<DonationPlatform>(
    DonationPlatform.General,
  )
  const [rules, setRules] = React.useState<
    Record<DonationPlatform, Array<ReadDonationRules>>
  >(() => {
    const initial = {} as Record<DonationPlatform, Array<ReadDonationRules>>

    Object.values(DonationPlatform).forEach((p) => {
      initial[p] = settings.donation_rules.filter((r) => r.platform === p)
    })

    return initial
  })

  const createNewRule = React.useCallback(
    (
      platform: DonationPlatform,
      name: string,
      slug: string,
      priority: number,
      amount: number,
      currency: string,
    ) => {
      if (!name || !slug || !currency) {
        toast.error('Please fill in all fields')
        return
      }
      const newRuleData = {
        data: {
          platform: platform,
          settings_id: settings.id,
          name: name,
          slug: slug,
          priority: priority,
          amount: amount,
          currency: currency,
        },
        playlist_id: playlist.id,
      }

      createDonationRule(newRuleData)
        .then((res) => {
          if (res) {
            setRules((prev) => ({
              ...prev,
              [platform]: [...prev[platform], res],
            }))
            setSettings((prev) => ({
              ...prev,
              donation_rules: [...prev.donation_rules, res],
            }))
            toast.success('New rule created successfully')
          } else {
            toast.error('Failed to create rule. Please try again later.')
          }
        })
        .catch((error) => {
          console.error('Error creating rule:', error)
          toast.error('Error creating rule')
        })
    },
    [settings.id, playlist.id, setSettings],
  )

  const handleDeleteRule = React.useCallback(
    async (
      platform: DonationPlatform,
      playlist_id: string,
      rule_id: string,
    ) => {
      try {
        await deleteDonationRule({
          playlist_id: playlist_id,
          donation_id: rule_id,
        }).then(() => {
          setRules((prev) => ({
            ...prev,
            [platform]: prev[platform].filter((r) => r.id !== rule_id),
          }))
          setSettings((prev) => ({
            ...prev,
            donation_rules: prev.donation_rules.filter((r) => r.id !== rule_id),
          }))
          toast.success('Rule deleted successfully')
        })
      } catch (error) {
        console.error('Error deleting rule:', error)
        toast.error('Error deleting rule')
      }
    },
    [setSettings],
  )

  return (
    <div>
      <div className="gap-1 flex flex-col">
        <Label className="text-xl">Donation Receiving</Label>
        <DialogDescription>
          Configure how you receive donations on different platforms.
        </DialogDescription>
        <div className="mt-6">
          <Tabs
            orientation="vertical"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full flex flex-row gap-6"
          >
            <TabsList className="flex flex-col h-full items-start gap-1">
              {Object.entries(DonationPlatform).map(([key, val]) => (
                <TabsTrigger key={key} value={val} className="w-full">
                  <Label className="w-full text-base text-left cursor-pointer">
                    {key}
                  </Label>
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1">
              {Object.entries(DonationPlatform).map(([key, val]) => {
                if (val !== activeTab) return null
                return (
                  <PlatformDonationEditor
                    key={val}
                    platform={val}
                    platformKey={key}
                    rules={rules[val]}
                    playlist_id={playlist.id}
                    createNewRule={createNewRule}
                    handleDeleteRule={handleDeleteRule}
                  />
                )
              })}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default TabDonation
