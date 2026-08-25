import React, { useState } from 'react'
import { Hash, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from './input'
import { Label } from './label'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import Button from './button'

export interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  maxTagLength?: number
  placeholder?: string
  disabled?: boolean
  className?: string
  label?: string
  hint?: string
}

export function TagInput({
  tags = [],
  onChange,
  maxTags = 10,
  maxTagLength = 30,
  placeholder,
  disabled = false,
  className = '',
  label,
  hint,
}: TagInputProps) {
  const { t } = useTranslation('playlist')
  const [inputValue, setInputValue] = useState('')

  const defaultPlaceholder =
    placeholder ?? t('playlistSettings.tags.placeholder', 'Add tag...')

  const handleAddTag = (rawTag: string) => {
    const cleaned = rawTag.trim().replace(/^#+/, '').trim().toLowerCase()
    if (!cleaned) return

    if (cleaned.length > maxTagLength) {
      toast.error(
        t('playlistSettings.tags.tagTooLong', {
          max: maxTagLength,
          defaultValue: `Tag cannot exceed ${maxTagLength} characters`,
        }),
      )
      return
    }

    if (tags.includes(cleaned)) {
      toast.error(
        t('playlistSettings.tags.duplicateTag', {
          defaultValue: 'This tag is already added',
        }),
      )
      return
    }

    if (tags.length >= maxTags) {
      toast.error(
        t('playlistSettings.tags.maxTagsReached', {
          max: maxTags,
          defaultValue: `Maximum ${maxTags} tags allowed`,
        }),
      )
      return
    }

    onChange([...tags, cleaned])
    setInputValue('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    if (disabled) return
    onChange(tags.filter((t) => t !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1])
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-text-main flex items-center gap-1.5">
            <Hash className="size-3.5 text-accent" />
            <span>{label}</span>
          </Label>
          <span className="text-[10px] text-text-placeholder">
            {tags.length}/{maxTags}
          </span>
        </div>
      )}

      {/* Tags Chips Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 py-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="
                inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                text-xs font-medium bg-accent/15 border border-accent/40
                text-accent shadow-2xs transition-all animate-in fade-in zoom-in-95
              "
            >
              <span>#{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="rounded-full p-0.5 hover:bg-accent/30 text-accent/80 hover:text-accent transition-colors focus:outline-none"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      {!disabled && tags.length < maxTags && (
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-placeholder text-xs font-bold pointer-events-none select-none">
              #
            </span>
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (inputValue.trim()) {
                  handleAddTag(inputValue)
                }
              }}
              placeholder={defaultPlaceholder}
              disabled={disabled}
              maxLength={maxTagLength}
              className="bg-level-2 border-0 h-8 pl-6 pr-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-accent/50"
            />
          </div>
          <Button
            type="button"
            onClick={() => handleAddTag(inputValue)}
            disabled={!inputValue.trim() || disabled}
            className="rounded-sm px-1 bg-level-2"
            title={t('playlistSettings.tags.addTag', 'Add Tag')}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      )}

      {hint && (
        <p className="text-[11px] text-text-secondary leading-tight mt-1">
          {hint}
        </p>
      )}
    </div>
  )
}

export default TagInput
