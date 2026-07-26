import { getPlatformCapabilities } from '../lib/platformCapabilities'
import ChatRolesSection from './ChatRolesSection'
import ContentSettingsSection from './ContentSettingsSection'
import DonationRulesSection from './DonationRulesSection'
import type { Platform } from '@/types/playlist'

export default function PlatformSettingsPanel({
  platform,
}: {
  platform: Platform
}) {
  const caps = getPlatformCapabilities(platform)

  return (
    <div className="flex flex-col gap-6">
      <ContentSettingsSection platform={platform} />
      {caps.chatRoles && <ChatRolesSection platform={platform} />}
      {caps.donationRules && <DonationRulesSection platform={platform} />}
    </div>
  )
}
