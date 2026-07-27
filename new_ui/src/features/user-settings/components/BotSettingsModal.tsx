// src/features/integrations/bot-settings/BotSettingsModal.tsx

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'
import type { Integration } from '@/types/user'
import type { FieldDef } from '@/features/user-settings/botSettings/types'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import Btn from '@/components/ui/my-btn'
import { updateBotSettings } from '@/api/api-user'
import { getBotSettingsConfig } from '@/features/user-settings/botSettings/registry'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

interface BotSettingsModalProps {
  integration: Integration
  platformName: string
  platformIcon: React.ReactNode
  onSaved: (updated: Integration) => void
}

export function BotSettingsModal({
  integration,
  platformName,
  platformIcon,
  onSaved,
}: BotSettingsModalProps) {
  const { t } = useFeatureTranslation()
  const config = getBotSettingsConfig(integration.platform)
  const [values, setValues] = useState<Record<string, unknown>>(
    integration.bot_settings ?? {},
  )
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  if (!config || config.fields.length === 0) return null

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateBotSettings(
        integration.platform,
        integration.platform_user_id,
        values,
      )
      onSaved({ ...integration, bot_settings: updated })
      toast.success(t('botSettings.saved'))
      setOpen(false)
    } catch {
      toast.error(t('botSettings.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="w-9 h-9 flex items-center justify-center rounded-(--rounded-std) border border-white/10 bg-level-1/50 text-text-secondary hover:text-text-main hover:border-level-3/30 transition-all"
          aria-label={t('botSettings.title')}
        >
          <Settings size={16} />
        </button>
      </DialogTrigger>

      <DialogContent className="bg-level-2 border border-level-3/35 rounded-[11px] p-0 gap-0 max-w-[480px]">
        <DialogHeader className="flex flex-row items-center gap-3 px-6 pt-5 pb-4 border-b border-white/5">
          <div className="w-10 h-10 flex items-center justify-center bg-level-1 border border-level-3/30 rounded-[9px] shrink-0">
            {platformIcon}
          </div>
          <div>
            <DialogTitle className="text-[15px] font-medium text-text-main leading-none">
              {t('botSettings.title')} — {platformName}
            </DialogTitle>
            <p className="text-xs text-text-placeholder mt-1">
              @{integration.platform_username}
            </p>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-4">
          {config.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) => handleChange(field.key, v)}
            />
          ))}
        </div>

        <DialogFooter className="px-6 pb-5 pt-4 border-t w-full border-white/5 flex flex-row justify-between gap-2">
          <Btn
            onClick={handleSave}
            disabled={saving}
            className="bg-level-2 font-mono text-base px-2"
          >
            {saving ? '...' : t('botSettings.save')}
          </Btn>
          <Btn
            onClick={() => setOpen(false)}
            disabled={saving}
            className="bg-level-2 font-mono text-base px-2"
          >
            {t('botSettings.cancel')}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface FieldRendererProps {
  field: FieldDef
  value: unknown
  onChange: (v: unknown) => void
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const { t } = useTranslation()

  if (field.type === 'text') {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-placeholder">
          {t(field.labelKey)}
        </span>
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          className="bg-level-1 border border-white/8 rounded-[9px] px-3.5 py-2.5 text-sm text-text-main outline-none focus:border-level-3/50 transition-colors"
        />
        {field.hintKey && (
          <p className="text-[11px] text-text-placeholder">
            {t(field.hintKey)}
          </p>
        )}
      </div>
    )
  }

  if (field.type === 'toggle') {
    const checked = (value as boolean) ?? false
    return (
      <div
        className="flex items-center justify-between bg-level-1 border border-white/8 rounded-[9px] px-3.5 py-3 cursor-pointer select-none"
        onClick={() => onChange(!checked)}
      >
        <div>
          <div className="text-sm text-text-main">{t(field.labelKey)}</div>
          {field.descKey && (
            <div className="text-[11px] text-text-placeholder mt-0.5">
              {t(field.descKey)}
            </div>
          )}
        </div>
        <div
          className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
            checked ? 'bg-level-3/80' : 'bg-white/15'
          }`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${
              checked ? 'right-0.5' : 'left-0.5'
            }`}
          />
        </div>
      </div>
    )
  }

  return null
}
