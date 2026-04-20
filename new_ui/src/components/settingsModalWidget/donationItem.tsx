import React from 'react'

import { Label } from '../ui/label'
import UpDownBtn from '../ui/funny-btn'
import { Input } from '../ui/input'
import { CurrencySelect } from '../ui/currency-selector'
import MyBtn from '../ui/my-btn'
import type { DonationPlatform, ReadDonationRules } from '@/types/playlist'
import { updateDonation } from '@/api/settings/donation'
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'

interface DonationItemProps {
  rule: ReadDonationRules
  playlist_id: string
  handleDeleteRule: (
    platform: DonationPlatform,
    playlist_id: string,
    rule_id: string,
  ) => void
}

const DonationItem = ({
  rule,
  playlist_id,
  handleDeleteRule,
}: DonationItemProps) => {
  const [localRule, setLocalRule] = React.useState(rule)
  const [isDirty, setIsDirty] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const priorityInputRef = React.useRef<HTMLInputElement>(null)

  // Синхронизируем локальное состояние с пропсом при изменении rule
  React.useEffect(() => {
    setLocalRule(rule)
    setIsDirty(false)
  }, [rule])

  // Дебаунс для сохранения - сохраняет всё правило целиком
  useDebouncedEffect(
    localRule,
    () => {
      if (!isSaving && isDirty && localRule.id === rule.id) {
        setIsSaving(true)
        updateDonation({
          playlist_id,
          data: localRule,
        })
          .then(() => {
            setIsDirty(false)
          })
          .catch((error) => {
            console.error(`Error saving donation rule ${localRule.id}:`, error)
            // Откатываем к исходному состоянию при ошибке
            setLocalRule(rule)
          })
          .finally(() => {
            setIsSaving(false)
          })
      }
    },
    2000,
  )

  const handleInputChange = (field: keyof ReadDonationRules, val: string) => {
    let value: any = val

    if (field === 'amount' || field === 'priority') {
      const num = parseInt(val)
      if (isNaN(num) || num < 0) return
      value = num
    }

    setLocalRule((prev) => ({
      ...prev,
      [field]: value,
    }))
    setIsDirty(true)
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this donation rule?')) {
      handleDeleteRule(localRule.platform, playlist_id, localRule.id)
    }
  }

  return (
    <div
      className="border border-level-3 rounded-lg p-3 sm:p-4 bg-level-1 space-y-0 sm:space-y-1 opacity-opacity transition-opacity relative"
      style={{
        opacity: isSaving ? 0.7 : 1,
      }}
    >
      {/* Первый ряд: Name и Slug */}
      <div className="grid grid-cols-2 gap-1 sm:gap-2">
        {/* Name */}
        <div className="col-span-1 flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Name</Label>
          <Input
            value={localRule.name || ''}
            placeholder="Rule name"
            className="text-sm sm:text-base bg-level-2 border-0"
            onChange={(e) => handleInputChange('name', e.target.value)}
          />
        </div>

        {/* Slug */}
        <div className="col-span-1 flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Slug</Label>
          <Input
            value={localRule.slug || ''}
            placeholder="rule-slug"
            className="text-sm text-text-main sm:text-base bg-level-2 border-0"
            onChange={(e) => handleInputChange('slug', e.target.value)}
          />
        </div>
      </div>

      {/* Второй ряд: Amount, Currency, Priority */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Amount */}
        <div className="col-span-1 flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Amount</Label>
          <div className="flex rounded-[--rounded-std] items-center gap-0 overflow-hidden">
            <Input
              type="number"
              ref={inputRef}
              value={localRule.amount || ''}
              dir="rtl"
              className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-sm
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none"
              onChange={(e) => handleInputChange('amount', e.target.value)}
            />
            <UpDownBtn
              getInputRef={() => inputRef.current}
              className="rounded-r-(--rounded-std) rounded-l-none overflow-clip"
            />
          </div>
        </div>

        {/* Currency */}
        <div className="col-span-1 flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Currency</Label>
          <CurrencySelect
            name="currency"
            value={localRule.currency}
            onValueChange={(value) => handleInputChange('currency', value)}
            variant="default"
            className="hidden sm:flex"
          />
          <CurrencySelect
            name="currency"
            value={localRule.currency}
            onValueChange={(value) => handleInputChange('currency', value)}
            variant="small"
            className="sm:hidden"
          />
        </div>

        {/* Priority */}
        <div className="col-span-1 flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Priority</Label>
          <div className="flex rounded-[--rounded-std] items-center gap-0 overflow-hidden">
            <Input
              type="number"
              dir="rtl"
              ref={priorityInputRef}
              value={localRule.priority || 0}
              className="border-0 bg-level-2 focus-visible:ring-0 rounded-r-none px-1.5 text-sm
                [appearance:textfield] 
                [&::-webkit-inner-spin-button]:m-0 
                [&::-webkit-inner-spin-button]:appearance-none 
                [&::-webkit-outer-spin-button]:m-0 
                [&::-webkit-outer-spin-button]:appearance-none"
              onChange={(e) => handleInputChange('priority', e.target.value)}
            />
            <UpDownBtn
              getInputRef={() => priorityInputRef.current}
              className="rounded-r-(--rounded-std) rounded-l-none overflow-clip"
            />
          </div>
        </div>
      </div>

      <div className=" absolute top-0 right-0.5">
        <button
          onClick={() => {
            handleDelete()
          }}
          className="px-2 h-6 text-xs 
                text-text-main/70 cursor-pointer opacity-80 hover:opacity-100 transition-opacity
               "
          onPointerDown={(e) => e.stopPropagation()}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default React.memo(DonationItem)
