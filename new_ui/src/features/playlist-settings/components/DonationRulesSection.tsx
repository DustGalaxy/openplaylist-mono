// src/features/playlist-settings/components/playlist-settings/DonationRulesSection.tsx
import React, { useRef, useState } from 'react'
import {
  ArrowUpRight,
  Coins,
  Globe,
  HeartHandshake,
  Plus,
  Tag,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import DonationItem from './donationItem'
import type { DonationPlatform } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import UpDownBtn from '@/components/ui/funny-btn'
import Btn from '@/components/ui/my-btn'
import { CurrencySelect } from '@/components/ui/currency-selector'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { usePlaylistViewLoaded } from '@/features/united-playlist/context/playlist-view-context'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export default function DonationRulesSection({
  platform,
}: {
  platform: DonationPlatform
}) {
  const { t } = useFeatureTranslation()
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
      {/* Header Title & Subtitle */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-level-3/40 text-level-3 mt-0.5">
          <HeartHandshake className="size-5" />
        </div>
        <div>
          <Label className="text-base font-bold text-text-main">
            {t('playlistSettings.donation.title')}
          </Label>
          <DialogDescription className="text-xs text-text-secondary mt-0.5">
            {t('playlistSettings.donation.subtitle')}
          </DialogDescription>
        </div>
      </div>

      {/* New Rule Creation Card */}
      <div className="p-2.5 sm:p-3 border border-level-3/60 rounded-md bg-level-1 space-y-2.5 shadow-xs">
        <div className="text-xs font-semibold text-text-main flex items-center gap-1.5">
          <Plus className="size-3.5 text-level-3" />
          <span>
            {t(
              'playlistSettings.donation.addRuleTitle',
              'Create new donation rule',
            )}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Rule Name Input */}
          <div className="flex-1 flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1 sm:hidden">
              <Tag className="size-3 text-text-secondary" />
              <Label className="text-[11px] text-text-secondary">
                {t('playlistSettings.donation.name')}
              </Label>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  value={newRule.name}
                  placeholder={t(
                    'playlistSettings.donation.ruleName',
                    'Rule name',
                  )}
                  className="text-xs sm:text-sm bg-level-2 border-0 h-8 px-2.5 focus-visible:ring-1 focus-visible:ring-level-3/50"
                  onChange={(e) =>
                    setNewRule((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-level-2 text-text-main border-level-3/40 border text-xs"
              >
                <p>
                  {t(
                    'playlistSettings.donation.hints.name',
                    'Rule name (e.g. Tier $100+)',
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Amount, Currency, Priority & Add Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Amount */}
            <div className="flex flex-col gap-0.5 w-24 sm:w-28">
              <div className="flex items-center gap-1 sm:hidden">
                <Coins className="size-3 text-text-secondary" />
                <Label className="text-[10px] text-text-secondary">
                  {t('playlistSettings.donation.amount')}
                </Label>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex rounded-[--rounded-std] items-center overflow-hidden h-8">
                    <Input
                      type="number"
                      ref={amountRef}
                      value={newRule.amount}
                      dir="rtl"
                      placeholder="0"
                      className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-xs sm:text-sm h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                      onChange={(e) =>
                        setNewRule((p) => ({
                          ...p,
                          amount: Number(e.target.value),
                        }))
                      }
                    />
                    <UpDownBtn
                      getInputRef={() => amountRef.current}
                      className="rounded-r-[--rounded-std] rounded-l-none overflow-clip h-8"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-level-2 text-text-main border-level-3/40 border text-xs"
                >
                  <p>
                    {t(
                      'playlistSettings.donation.hints.amount',
                      'Minimum donation amount required',
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Currency */}
            <div className="flex flex-col gap-0.5 w-20 sm:w-24">
              <div className="flex items-center gap-1 sm:hidden">
                <Globe className="size-3 text-text-secondary" />
                <Label className="text-[10px] text-text-secondary">
                  {t('playlistSettings.donation.currency')}
                </Label>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <CurrencySelect
                      name="currency"
                      value={newRule.currency}
                      onValueChange={(v) =>
                        setNewRule((p) => ({ ...p, currency: v }))
                      }
                      variant="small"
                      className="h-8 text-xs bg-level-2 border-0"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-level-2 text-text-main border-level-3/40 border text-xs"
                >
                  <p>
                    {t(
                      'playlistSettings.donation.hints.currency',
                      'Donation currency',
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-0.5 w-20 sm:w-24">
              <div className="flex items-center gap-1 sm:hidden">
                <ArrowUpRight className="size-3 text-text-secondary" />
                <Label className="text-[10px] text-text-secondary">
                  {t('playlistSettings.donation.priority')}
                </Label>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex rounded-[--rounded-std] items-center overflow-hidden h-8">
                    <Input
                      type="number"
                      dir="rtl"
                      ref={priorityRef}
                      value={newRule.priority}
                      placeholder="0"
                      className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-xs sm:text-sm h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                      onChange={(e) =>
                        setNewRule((p) => ({
                          ...p,
                          priority: Number(e.target.value),
                        }))
                      }
                    />
                    <UpDownBtn
                      getInputRef={() => priorityRef.current}
                      className="rounded-r-[--rounded-std] rounded-l-none overflow-clip h-8"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-level-2 text-text-main border-level-3/40 border text-xs"
                >
                  <p>
                    {t(
                      'playlistSettings.donation.hints.priority',
                      'Priority points added to queue (+10, +50)',
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Add Button */}
            <Btn
              onClick={handleAdd}
              className="h-8 px-3 bg-level-2 text-xs font-semibold text-text-main shrink-0 flex items-center gap-1 transition-colors"
            >
              <Plus className="size-3.5" />
              <span>{t('playlistSettings.donation.add', 'Add')}</span>
            </Btn>
          </div>
        </div>
      </div>

      {/* Rules List Section */}
      {rules.length > 0 ? (
        <div className="space-y-2 pt-1">
          <div className="hidden sm:flex items-center gap-2 px-2 text-[11px] font-semibold text-text-secondary">
            <div className="flex-1">
              {t('playlistSettings.donation.name', 'Rule Name')}
            </div>
            <div className="w-28 text-right">
              {t('playlistSettings.donation.amount', 'Min Amount')}
            </div>
            <div className="w-24 text-center">
              {t('playlistSettings.donation.currency', 'Currency')}
            </div>
            <div className="w-24 text-right">
              {t(
                'playlistSettings.donation.hints.priorityHeader',
                'Priority (+)',
              )}
            </div>
            <div className="w-8"></div>
          </div>
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
        <div className="p-4 border border-dashed border-level-3/60 rounded-md bg-level-1/50 text-center">
          <p className="text-xs text-text-secondary">
            {t(
              'playlistSettings.donation.noRules',
              'No donation rules configured yet.',
            )}
          </p>
        </div>
      )}
    </div>
  )
}
