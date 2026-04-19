import React from 'react'
import { TabsContent } from '../ui/tabs'
import { Label } from '../ui/label'
import MyBtn from '../ui/my-btn'
import { DialogDescription } from '../ui/dialog'
import DonationItem from './donationItem'
import type { DonationPlatform, ReadDonationRules } from '@/types/playlist'

interface PlatformDonationProps {
  platform: DonationPlatform
  platformKey: string
  rules: Array<ReadDonationRules> | undefined
  playlist_id: string
  createNewRule: (platform: DonationPlatform) => void
}

const PlatformDonationEditor = React.memo(
  ({
    platform,
    platformKey,
    rules,
    playlist_id,
    createNewRule,
  }: PlatformDonationProps) => {
    return (
      <TabsContent value={platform} className="space-y-6">
        <div>
          <Label className="text-xl">{platformKey} settings</Label>
          <DialogDescription>
            Configure donation settings for {platformKey}
          </DialogDescription>
        </div>

        <div className="space-y-4">
          {rules && rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-md">
                  <DonationItem rule={rule} playlist_id={playlist_id} />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <Label>No rules configured</Label>
              <DialogDescription>
                Create a new rule to get started
              </DialogDescription>
            </div>
          )}

          <MyBtn
            text="+ Add new rule"
            onClick={() => createNewRule(platform)}
            className="px-4 mt-4"
          />
        </div>
      </TabsContent>
    )
  },
)
PlatformDonationEditor.displayName = 'PlatformDonationEditor'
export default PlatformDonationEditor
