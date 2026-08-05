import React, { useRef, memo } from 'react'
import { Coins, Globe, Tag, Trash2, Zap } from 'lucide-react'
import type { ReadDonationRules } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import UpDownBtn from '@/components/ui/funny-btn'
import { Input } from '@/components/ui/input'
import { CurrencySelect } from '@/components/ui/currency-selector'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'
import Btn from '@/components/ui/my-btn'

interface DonationItemProps {
  rule: ReadDonationRules
  onUpdate: (rule: ReadDonationRules) => void
  onDelete: () => void
}

const DonationItem = ({ rule, onUpdate, onDelete }: DonationItemProps) => {
  const { t } = useFeatureTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const priorityInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (field: keyof ReadDonationRules, val: string) => {
    let value: string | number = val
    if (field === 'amount' || field === 'priority') {
      if (val === '') {
        value = ''
      } else {
        const num = Number(val)
        if (isNaN(num) || num < 0) return
        value = num
      }
    }
    onUpdate({ ...rule, [field]: value })
  }

  const handleDelete = () => {
    if (
      confirm(
        t('playlistSettings.donation.deleteRuleConfirm', 'Delete this rule?'),
      )
    ) {
      onDelete()
    }
  }

  return (
    <div className="border border-accent/60 rounded-md p-2 sm:p-2.5 bg-level-1 hover:border-accent/80 transition-all flex flex-col sm:flex-row sm:items-center gap-2 relative shadow-xs group">
      {/* Rule Name Input + Tooltip */}
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
              value={rule.name || ''}
              placeholder={t('playlistSettings.donation.ruleName', 'Rule name')}
              className="text-xs sm:text-sm bg-level-2 border-0 h-8 px-2.5 focus-visible:ring-1 focus-visible:ring-accent/50"
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-level-2 text-text-main border-accent/40 border text-xs"
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

      {/* Controls Group: Amount, Currency, Priority & Delete */}
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
                  ref={inputRef}
                  value={rule.amount ?? ''}
                  dir="rtl"
                  placeholder="0"
                  className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-xs sm:text-sm h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                />
                <UpDownBtn
                  getInputRef={() => inputRef.current}
                  className="rounded-r-[--rounded-std] rounded-l-none overflow-clip h-8"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-level-2 text-text-main border-accent/40 border text-xs"
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
                  value={rule.currency}
                  onValueChange={(value) =>
                    handleInputChange('currency', value)
                  }
                  variant="small"
                  className="h-8 text-xs bg-level-2 border-0"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-level-2 text-text-main border-accent/40 border text-xs"
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
            <Zap className="size-3 text-text-secondary" />
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
                  ref={priorityInputRef}
                  value={rule.priority ?? ''}
                  placeholder="0"
                  className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-xs sm:text-sm h-8 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                  onChange={(e) =>
                    handleInputChange('priority', e.target.value)
                  }
                />
                <UpDownBtn
                  getInputRef={() => priorityInputRef.current}
                  className="rounded-r-[--rounded-std] rounded-l-none overflow-clip h-8"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-level-2 text-text-main border-accent/40 border text-xs"
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

        {/* Delete Button with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Btn
              onClick={handleDelete}
              type="button"
              aria-label={t(
                'playlistSettings.donation.hints.delete',
                'Delete donation rule',
              )}
              className="p-1.5 text-text-placeholder hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-sm h-8 w-8 flex items-center justify-center shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Trash2 className="size-4" />
            </Btn>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-level-2 text-text-main border-accent/40 border text-xs"
          >
            <p>
              {t(
                'playlistSettings.donation.hints.delete',
                'Delete donation rule',
              )}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

export default memo(DonationItem)
