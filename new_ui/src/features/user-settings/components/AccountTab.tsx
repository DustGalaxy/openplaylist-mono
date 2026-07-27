import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { TFunction } from 'i18next'
import type { UserProfile } from '@/types/user'
import { updateUserProfile, updateUserPassword } from '@/api/api-user'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  feedbackErrorClass,
  feedbackSuccessClass,
  panelClass,
  sectionTitleClass,
} from '@/features/landing/styles'
import { cn } from '@/lib/utils'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

interface AccountTabProps {
  user: UserProfile | null
  expired_at: number | null
  onUserUpdate: (patch: {
    username?: string
    email?: string
    email_confirmed?: boolean
    profile_image_url?: string
  }) => void
}

type AccountFormState = {
  username: string
  email: string
  profile_image_url: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type SettingsSection = {
  id: string
  title: string
  accentClassName: string
  submitText: string
  successText: string
  fields: Array<SettingsField>
  validate: (values: AccountFormState) => string | null
  submit: (values: AccountFormState) => Promise<unknown>
  afterSubmit?: (values: AccountFormState) => void
}

type SettingsField = {
  name: keyof AccountFormState
  label: string
  type: 'text' | 'email' | 'password'
  autoComplete: string
  placeholder: string
  helpText?: string
  className?: string
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data = error.response.data
    if (typeof data === 'object' && data !== null && 'detail' in data) {
      return String(data.detail)
    }
  }

  return error instanceof Error ? error.message : fallback
}

const getInitialFormState = (user: UserProfile | null): AccountFormState => ({
  username: user?.username ?? '',
  email: user?.email ?? '',
  profile_image_url: user?.avatar_url ?? '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const createSettingsSections = (
  t: TFunction,
  onUserUpdate: (patch: {
    username?: string
    email?: string
    email_confirmed?: boolean
    profile_image_url?: string
  }) => void,
): Array<SettingsSection> => [
  {
    id: 'profile',
    title: t('settings.account.profileData'),
    accentClassName: 'bg-accent-2',
    submitText: t('settings.account.saveProfile'),
    successText: t('settings.account.profileUpdated'),
    fields: [
      {
        name: 'username',
        label: t('settings.account.nickname'),
        type: 'text',
        autoComplete: 'nickname',
        placeholder: t('settings.account.nicknamePlaceholder'),
        helpText: t('settings.account.nicknameHelp'),
      },
      {
        name: 'email',
        label: t('settings.account.email'),
        type: 'email',
        autoComplete: 'email',
        placeholder: 'you@example.com',
        helpText: t('settings.account.emailHelp'),
        className: 'text-black bg-black hover:bg-level-2 hover:text-text-main',
      },
    ],
    validate: ({ username, email }) => {
      if (!username.trim())
        return t('settings.account.validation.nicknameRequired')
      if (username.trim().length < 3) {
        return t('settings.account.validation.nicknameShort')
      }
      if (!email.trim()) return t('settings.account.validation.emailRequired')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return t('settings.account.validation.emailInvalid')
      }
      return null
    },
    submit: ({ username, email }) =>
      updateUserProfile({
        username: username.trim(),
        email: email.trim(),
      }),
    afterSubmit: ({ username, email }) => {
      onUserUpdate({
        username: username.trim(),
        email: email.trim(),
      })
    },
  },
  {
    id: 'avatar',
    title: t('settings.account.avatar'),
    accentClassName: 'bg-accent-1',
    submitText: t('settings.account.saveAvatar'),
    successText: t('settings.account.avatarUpdated'),
    fields: [
      {
        name: 'profile_image_url',
        label: t('settings.account.avatarUrl'),
        type: 'text',
        autoComplete: 'off',
        placeholder: 'https://example.com/avatar.jpg',
        helpText: t('settings.account.avatarHelp'),
      },
    ],
    validate: ({ profile_image_url }) => {
      if (!profile_image_url.trim())
        return t('settings.account.validation.avatarRequired')
      try {
        new URL(profile_image_url.trim())
      } catch {
        return t('settings.account.validation.urlInvalid')
      }
      return null
    },
    submit: ({ profile_image_url }) =>
      updateUserProfile({
        profile_image_url: profile_image_url.trim(),
      }),
    afterSubmit: () => {
      onUserUpdate({})
    },
  },
  {
    id: 'password',
    title: t('settings.account.password'),
    accentClassName: 'bg-accent-3',
    submitText: t('settings.account.changePassword'),
    successText: t('settings.account.passwordChanged'),
    fields: [
      {
        name: 'currentPassword',
        label: t('settings.account.currentPassword'),
        type: 'password',
        autoComplete: 'current-password',
        placeholder: t('settings.account.currentPasswordPlaceholder'),
      },
      {
        name: 'newPassword',
        label: t('settings.account.newPassword'),
        type: 'password',
        autoComplete: 'new-password',
        placeholder: t('settings.account.newPasswordPlaceholder'),
        helpText: t('settings.account.passwordHelp'),
      },
      {
        name: 'confirmPassword',
        label: t('settings.account.confirmPassword'),
        type: 'password',
        autoComplete: 'new-password',
        placeholder: t('settings.account.confirmPasswordPlaceholder'),
      },
    ],
    validate: ({ currentPassword, newPassword, confirmPassword }) => {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return t('settings.account.validation.passwordFillAll')
      }
      if (newPassword.length < 8) {
        return t('settings.account.validation.passwordShort')
      }
      if (newPassword !== confirmPassword) {
        return t('settings.account.validation.passwordMismatch')
      }
      if (currentPassword === newPassword) {
        return t('settings.account.validation.passwordSame')
      }
      return null
    },
    submit: ({ currentPassword, newPassword }) =>
      updateUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    afterSubmit: () => {
      // Password reset doesn't require user update
    },
  },
]

export function AccountTab({ user, onUserUpdate }: AccountTabProps) {
  const { t } = useFeatureTranslation()
  const [formState, setFormState] = useState<AccountFormState>(() =>
    getInitialFormState(user),
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState<
    Record<string, { type: 'success' | 'error'; message: string }>
  >({})

  const sections = useMemo(
    () => createSettingsSections(t, onUserUpdate),
    [t, onUserUpdate],
  )

  useEffect(() => {
    setFormState(getInitialFormState(user))
  }, [user?.email, user?.username, user?.avatar_url])

  const handleValueChange = (name: keyof AccountFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [name]: value }))
    setFeedback({})
  }

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
    section: SettingsSection,
  ) => {
    event.preventDefault()

    const validationError = section.validate(formState)
    if (validationError) {
      setFeedback((prev) => ({
        ...prev,
        [section.id]: { type: 'error', message: validationError },
      }))
      toast.error(validationError)
      return
    }

    setSaving((prev) => ({ ...prev, [section.id]: true }))
    setFeedback((prev) => {
      const next = { ...prev }
      delete next[section.id]
      return next
    })

    const loadingToast = toast.loading(t('common.toast.saving'))

    try {
      await section.submit(formState)
      section.afterSubmit?.(formState)

      toast.dismiss(loadingToast)

      if (section.id === 'profile') {
        toast.success(t('settings.account.profileUpdated'))
      } else if (section.id === 'avatar') {
        toast.success(t('settings.account.avatarUpdated'))
      } else if (section.id === 'password') {
        toast.success(t('settings.account.passwordChanged'))
      }

      setFeedback((prev) => ({
        ...prev,
        [section.id]: { type: 'success', message: section.successText },
      }))

      if (section.id === 'password') {
        setFormState((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }))
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      const errorMessage = getApiErrorMessage(
        error,
        t('settings.account.updateFailed'),
      )
      toast.error(errorMessage)
      setFeedback((prev) => ({
        ...prev,
        [section.id]: {
          type: 'error',
          message: errorMessage,
        },
      }))
    } finally {
      setSaving((prev) => ({ ...prev, [section.id]: false }))
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {sections.map((section) => (
        <SettingsSection
          key={section.id}
          section={section}
          values={formState}
          feedback={feedback[section.id]}
          isSaving={Boolean(saving[section.id])}
          onChange={handleValueChange}
          onSubmit={handleSubmit}
        />
      ))}
    </div>
  )
}

interface SettingsSectionProps {
  section: SettingsSection
  values: AccountFormState
  feedback?: { type: 'success' | 'error'; message: string }
  isSaving: boolean
  onChange: (name: keyof AccountFormState, value: string) => void
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
    section: SettingsSection,
  ) => void
}

function SettingsSection({
  section,
  values,
  feedback,
  isSaving,
  onChange,
  onSubmit,
}: SettingsSectionProps) {
  const { t } = useTranslation()
  return (
    <form
      onSubmit={(event) => onSubmit(event, section)}
      className={`p-4 sm:p-6 ${panelClass}`}
    >
      <h2
        className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main mb-4`}
      >
        {section.title}
      </h2>

      <div className="flex flex-col gap-4">
        {section.fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={`account-${field.name}`} className="text-text-main">
              {field.label}
            </Label>
            <Input
              id={`account-${field.name}`}
              type={field.type}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              value={values[field.name]}
              disabled={isSaving}
              onChange={(event) => onChange(field.name, event.target.value)}
              className={cn(
                'h-11 border-level-4 text-text-main bg-level-1',
                field.className,
              )}
            />
            {field.helpText ? (
              <p className="text-xs text-text-secondary">{field.helpText}</p>
            ) : null}
          </div>
        ))}
      </div>

      {feedback ? (
        <div
          className={`mt-5 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? feedbackSuccessClass
              : feedbackErrorClass
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <Btn
        disabled={isSaving}
        className="mt-6 w-full px-4 py-3 text-base font-semibold bg-level-1 text-text-main"
      >
        {isSaving ? t('settings.account.saving') : section.submitText}
      </Btn>
    </form>
  )
}
