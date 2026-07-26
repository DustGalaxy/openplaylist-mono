// src/features/playlist-settings/components/playlist-settings/DonationRulesSection.tsx
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import DonationItem from './donationItem'
import type { DonationPlatform } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import UpDownBtn from '@/components/ui/funny-btn'
import Btn from '@/components/ui/my-btn'
import { CurrencySelect } from '@/components/ui/currency-selector'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { usePlaylistStore } from '@/stores/playlistStore'

export default function DonationRulesSection({
  platform,
}: {
  platform: DonationPlatform
}) {
  const { t } = useTranslation()
  const { playlist } = usePlaylistViewLoaded()
  const { addDonationRule, updateDonationRule, removeDonationRule } =
    usePlaylistStore()

  const [newRule, setNewRule] = useState({
    name: '',
    slug: '',
    currency: '',
    amount: 0,
    priority: 0,
  })
  const amountRef = useRef<HTMLInputElement>(null)
  const priorityRef = useRef<HTMLInputElement>(null)

  const rules = playlist.donation_rules.filter((r) => r.platform === platform)

  const handleAdd = async () => {
    if (!newRule.name || !newRule.currency) {
      toast.error(t('playlistSettings.donation.fillAll'))
      return
    }
    const rule = await addDonationRule(playlist.id, { platform, ...newRule })
    if (rule) {
      setNewRule({ name: '', slug: '', currency: '', amount: 0, priority: 0 })
      toast.success(t('playlistSettings.donation.createSuccess'))
    } else {
      toast.error(t('playlistSettings.donation.createFailed'))
    }
  }

  const handleDelete = async (ruleId: string) => {
    const success = await removeDonationRule(playlist.id, ruleId)
    if (success) toast.success(t('playlistSettings.donation.deleteSuccess'))
    else toast.error(t('playlistSettings.donation.deleteFailed'))
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-lg">
          {t('playlistSettings.donation.title')}
        </Label>
        <DialogDescription>
          {t('playlistSettings.donation.subtitle')}
        </DialogDescription>
      </div>

      <div className="p-3 sm:p-4 border border-level-3 rounded-lg bg-level-1 space-y-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">
            {t('playlistSettings.donation.name')}
          </Label>
          <Input
            value={newRule.name}
            placeholder={t('playlistSettings.donation.ruleName')}
            className="text-sm bg-level-2 border-0"
            onChange={(e) =>
              setNewRule((p) => ({ ...p, name: e.target.value }))
            }
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-secondary">
              {t('playlistSettings.donation.amount')}
            </Label>
            <div className="flex rounded-[--rounded-std] items-center overflow-hidden">
              <Input
                type="number"
                ref={amountRef}
                value={newRule.amount}
                dir="rtl"
                className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-sm"
                onChange={(e) =>
                  setNewRule((p) => ({ ...p, amount: Number(e.target.value) }))
                }
              />
              <UpDownBtn
                getInputRef={() => amountRef.current}
                className="rounded-r-[--rounded-std] rounded-l-none overflow-clip"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-secondary">
              {t('playlistSettings.donation.currency')}
            </Label>
            <CurrencySelect
              name="currency"
              value={newRule.currency}
              onValueChange={(v) => setNewRule((p) => ({ ...p, currency: v }))}
              variant="default"
              className="hidden sm:flex"
            />
            <CurrencySelect
              name="currency"
              value={newRule.currency}
              onValueChange={(v) => setNewRule((p) => ({ ...p, currency: v }))}
              variant="small"
              className="sm:hidden"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-xs text-text-secondary">
              {t('playlistSettings.donation.priority')}
            </Label>
            <div className="flex rounded-[--rounded-std] items-center overflow-hidden">
              <Input
                type="number"
                dir="rtl"
                ref={priorityRef}
                value={newRule.priority}
                className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-sm"
                onChange={(e) =>
                  setNewRule((p) => ({
                    ...p,
                    priority: Number(e.target.value),
                  }))
                }
              />
              <UpDownBtn
                getInputRef={() => priorityRef.current}
                className="rounded-r-[--rounded-std] rounded-l-none overflow-clip"
              />
            </div>
          </div>
        </div>

        <Btn
          onClick={handleAdd}
          className="w-full sm:w-auto px-4 text-sm h-9 bg-level-2"
        >
          {t('playlistSettings.donation.add')}
        </Btn>
      </div>

      {rules.length > 0 ? (
        <div className="space-y-3">
          {rules.map((rule) => (
            <DonationItem
              key={rule.id}
              rule={rule}
              onUpdate={(updated) => updateDonationRule(playlist.id, updated)}
              onDelete={() => handleDelete(rule.id)}
            />
          ))}
        </div>
      ) : (
        <Label className="block text-sm text-text-secondary">
          {t('playlistSettings.donation.noRules')}
        </Label>
      )}
    </div>
  )
}
