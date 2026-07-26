import React, { useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReadDonationRules } from '@/types/playlist'
import { Label } from '@/components/ui/label'
import UpDownBtn from '@/components/ui/funny-btn'
import { Input } from '@/components/ui/input'
import { CurrencySelect } from '@/components/ui/currency-selector'

interface DonationItemProps {
  rule: ReadDonationRules
  onUpdate: (rule: ReadDonationRules) => void
  onDelete: () => void
}

const DonationItem = ({ rule, onUpdate, onDelete }: DonationItemProps) => {
  const { t } = useTranslation()
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
    if (confirm(t('playlistSettings.donation.deleteRuleConfirm'))) onDelete()
  }

  return (
    <div className="border border-level-3 rounded-lg p-3 sm:p-4 bg-level-1 space-y-3 relative">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">
            {t('playlistSettings.donation.name')}
          </Label>
          <Input
            value={rule.name || ''}
            placeholder={t('playlistSettings.donation.ruleName')}
            className="text-sm sm:text-base bg-level-2 border-0"
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>
        <button
          onClick={handleDelete}
          type="button"
          aria-label={t('common.delete')}
          className="p-1 text-xs text-text-main/70 hover:text-text-main opacity-80 hover:opacity-100 transition-opacity rounded"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">
            {t('playlistSettings.donation.amount')}
          </Label>
          <div className="flex rounded-[--rounded-std] items-center overflow-hidden">
            <Input
              type="number"
              ref={inputRef}
              value={rule.amount ?? ''}
              dir="rtl"
              className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
              onChange={(e) => handleInputChange('amount', e.target.value)}
            />
            <UpDownBtn
              getInputRef={() => inputRef.current}
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
            value={rule.currency}
            onValueChange={(value) => handleInputChange('currency', value)}
            variant="default"
            className="hidden sm:flex"
          />
          <CurrencySelect
            name="currency"
            value={rule.currency}
            onValueChange={(value) => handleInputChange('currency', value)}
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
              ref={priorityInputRef}
              value={rule.priority ?? ''}
              className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
              onChange={(e) => handleInputChange('priority', e.target.value)}
            />
            <UpDownBtn
              getInputRef={() => priorityInputRef.current}
              className="rounded-r-[--rounded-std] rounded-l-none overflow-clip"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(DonationItem)
