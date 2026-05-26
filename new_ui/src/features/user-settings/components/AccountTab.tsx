import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
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

interface AccountTabProps {
  user: UserProfile | null
  expired_at: number | null
  onUserUpdate: (patch: { username?: string; email?: string; email_confirmed?: boolean; profile_image_url?: string }) => void
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

const getInitialFormState = (
  user: UserProfile | null,
): AccountFormState => ({
  username: user?.username ?? '',
  email: user?.email ?? '',
  profile_image_url: user?.avatar_url ?? '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const createSettingsSections = (
  onUserUpdate: (patch: {
    username?: string
    email?: string
    email_confirmed?: boolean
    profile_image_url?: string
  }) => void,
): Array<SettingsSection> => [
  {
    id: 'profile',
    title: 'Profile Data',
    accentClassName: 'bg-accent-2',
    submitText: 'Save Profile',
    successText: 'Profile updated',
    fields: [
      {
        name: 'username',
        label: 'Nickname',
        type: 'text',
        autoComplete: 'nickname',
        placeholder: 'Your nickname',
        helpText: 'Shown on playlists and public activity.',
      },
      {
        name: 'email',
        label: 'Email',
        type: 'email',
        autoComplete: 'email',
        placeholder: 'you@example.com',
        helpText: 'Used for classic login and account notices.',
      },
    ],
    validate: ({ username, email }) => {
      if (!username.trim()) return 'Nickname is required'
      if (username.trim().length < 3) {
        return 'Nickname must be at least 3 characters'
      }
      if (!email.trim()) return 'Email is required'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'Enter a valid email address'
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
    title: 'Avatar',
    accentClassName: 'bg-accent-1',
    submitText: 'Save Avatar',
    successText: 'Avatar updated',
    fields: [
      {
        name: 'profile_image_url',
        label: 'Avatar URL',
        type: 'text',
        autoComplete: 'off',
        placeholder: 'https://example.com/avatar.jpg',
        helpText: 'URL to your profile image.',
      },
    ],
    validate: ({ profile_image_url }) => {
      if (!profile_image_url.trim()) return 'Avatar URL is required'
      try {
        new URL(profile_image_url.trim())
      } catch {
        return 'Enter a valid URL'
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
    title: 'Password',
    accentClassName: 'bg-accent-3',
    submitText: 'Change Password',
    successText: 'Password changed',
    fields: [
      {
        name: 'currentPassword',
        label: 'Current Password',
        type: 'password',
        autoComplete: 'current-password',
        placeholder: 'Current password',
      },
      {
        name: 'newPassword',
        label: 'New Password',
        type: 'password',
        autoComplete: 'new-password',
        placeholder: 'New password',
        helpText: 'Use at least 8 characters.',
      },
      {
        name: 'confirmPassword',
        label: 'Confirm New Password',
        type: 'password',
        autoComplete: 'new-password',
        placeholder: 'Repeat new password',
      },
    ],
    validate: ({ currentPassword, newPassword, confirmPassword }) => {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return 'Fill all password fields'
      }
      if (newPassword.length < 8) {
        return 'New password must be at least 8 characters'
      }
      if (newPassword !== confirmPassword) return 'Passwords do not match'
      if (currentPassword === newPassword) {
        return 'New password must be different from current password'
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
  const [formState, setFormState] = useState<AccountFormState>(() =>
    getInitialFormState(user),
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState<
    Record<string, { type: 'success' | 'error'; message: string }>
  >({})

  const sections = createSettingsSections(onUserUpdate)

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
      return
    }

    setSaving((prev) => ({ ...prev, [section.id]: true }))
    setFeedback((prev) => {
      const next = { ...prev }
      delete next[section.id]
      return next
    })

    try {
      await section.submit(formState)
      section.afterSubmit?.(formState)

      if (section.id !== 'password') {
        setFeedback((prev) => ({
          ...prev,
          [section.id]: { type: 'success', message: section.successText },
        }))
      } else {
        setFormState((prev) => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }))
        setFeedback((prev) => ({
          ...prev,
          [section.id]: { type: 'success', message: section.successText },
        }))
      }
    } catch (error) {
      setFeedback((prev) => ({
        ...prev,
        [section.id]: {
          type: 'error',
          message: getApiErrorMessage(error, 'Settings update failed'),
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
  return (
    <form
      onSubmit={(event) => onSubmit(event, section)}
      className={`p-4 sm:p-6 ${panelClass}`}
    >
      <h2 className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main mb-4`}>
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
              className="h-11 border-level-4 text-text-main bg-level-1"
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
        text={isSaving ? 'Saving...' : section.submitText}
        disabled={isSaving}
        className="mt-6 w-full px-4 py-3 text-base font-semibold bg-level-1 text-text-main"
      />
    </form>
  )
}
