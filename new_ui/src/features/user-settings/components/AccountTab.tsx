import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { KeyRound, Save, ShieldCheck, User, Image } from 'lucide-react'
import type { UserProfile } from '@/types/user'
import { updateUserPassword, updateUserProfile } from '@/api/api-user'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
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

export function AccountTab({ user, onUserUpdate }: AccountTabProps) {
  const { t } = useFeatureTranslation()
  const { t: tc } = useTranslation()
  const [formState, setFormState] = useState<AccountFormState>(() =>
    getInitialFormState(user),
  )
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    setFormState(getInitialFormState(user))
  }, [user?.email, user?.username, user?.avatar_url])

  const handleValueChange = (name: keyof AccountFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const username = formState.username.trim()
    const email = formState.email.trim()
    const avatarUrl = formState.profile_image_url.trim()

    if (!username) {
      toast.error(t('settings.account.validation.nicknameRequired', 'Nickname is required'))
      return
    }
    if (username.length < 3) {
      toast.error(t('settings.account.validation.nicknameShort', 'Nickname must be at least 3 characters'))
      return
    }
    if (!email) {
      toast.error(t('settings.account.validation.emailRequired', 'Email is required'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t('settings.account.validation.emailInvalid', 'Invalid email address'))
      return
    }

    setProfileSaving(true)
    const loadingToast = toast.loading(tc('common.toast.saving', 'Saving...'))

    try {
      await updateUserProfile({
        username,
        email,
        profile_image_url: avatarUrl || undefined,
      })
      onUserUpdate({ username, email, profile_image_url: avatarUrl })
      toast.dismiss(loadingToast)
      toast.success(t('settings.account.profileUpdated', 'Profile updated successfully'))
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(getApiErrorMessage(error, t('settings.account.updateFailed', 'Failed to update profile')))
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const { currentPassword, newPassword, confirmPassword } = formState

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('settings.account.validation.passwordFillAll', 'Please fill all password fields'))
      return
    }
    if (newPassword.length < 8) {
      toast.error(t('settings.account.validation.passwordShort', 'Password must be at least 8 characters'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.account.validation.passwordMismatch', 'Passwords do not match'))
      return
    }
    if (currentPassword === newPassword) {
      toast.error(t('settings.account.validation.passwordSame', 'New password must be different from current password'))
      return
    }

    setPasswordSaving(true)
    const loadingToast = toast.loading(tc('common.toast.saving', 'Saving...'))

    try {
      await updateUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.dismiss(loadingToast)
      toast.success(t('settings.account.passwordChanged', 'Password changed successfully'))
      setFormState((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(getApiErrorMessage(error, t('settings.account.passwordChangeFailed', 'Failed to change password')))
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-level-3/40 text-level-3 mt-0.5">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <Label className="text-base font-bold text-text-main">
            {t('settings.account.eyebrow', 'Account Settings')}
          </Label>
          <DialogDescription className="text-xs text-text-secondary mt-0.5">
            {t('settings.account.subtitle', 'Manage your credentials, email, nickname, and security settings.')}
          </DialogDescription>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card 1: Account & Profile Data */}
        <form
          onSubmit={handleProfileSubmit}
          className="p-3 sm:p-4 border border-level-3/60 rounded-md bg-level-1 space-y-3.5 shadow-xs flex flex-col justify-between"
        >
          <div className="space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main pb-1 border-b border-level-3/40">
              <User className="size-4 text-level-3" />
              <span>{t('settings.account.profileData', 'Profile Data')}</span>
            </div>

            {/* Nickname */}
            <div className="space-y-1">
              <Label htmlFor="account-username" className="text-xs font-semibold text-text-main">
                {t('settings.account.nickname', 'Nickname')}
              </Label>
              <Input
                id="account-username"
                type="text"
                autoComplete="nickname"
                placeholder={t('settings.account.nicknamePlaceholder', 'Your nickname')}
                value={formState.username}
                disabled={profileSaving}
                onChange={(e) => handleValueChange('username', e.target.value)}
                className="bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-level-3/50"
              />
              <p className="text-[11px] text-text-placeholder">
                {t('settings.account.nicknameHelp', 'Shown on playlists and public activity.')}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="account-email" className="text-xs font-semibold text-text-main">
                {t('settings.account.email', 'Email')}
              </Label>
              <Input
                id="account-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formState.email}
                disabled={profileSaving}
                onChange={(e) => handleValueChange('email', e.target.value)}
                className="bg-text-main text-text-main hover:bg-level-2 hover:text-text-main focus:bg-level-2 focus:text-text-main transition-colors duration-700 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-level-3/50 select-none focus:select-text cursor-pointer focus:cursor-text"
                title="Hover or click to reveal email"
              />
              <p className="text-[11px] text-text-placeholder">
                {t('settings.account.emailHelp', 'Used for login and account notifications.')}
              </p>
            </div>

            {/* Avatar URL */}
            <div className="space-y-1">
              <Label htmlFor="account-avatar" className="text-xs font-semibold text-text-main">
                {t('settings.account.avatarUrl', 'Avatar URL')}
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="account-avatar"
                  type="text"
                  autoComplete="off"
                  placeholder="https://example.com/avatar.jpg"
                  value={formState.profile_image_url}
                  disabled={profileSaving}
                  onChange={(e) => handleValueChange('profile_image_url', e.target.value)}
                  className="bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-level-3/50 flex-1 min-w-0"
                />
                <div className="size-8 rounded-full bg-level-2 shrink-0 overflow-hidden flex items-center justify-center border border-level-3/40">
                  {formState.profile_image_url ? (
                    <img
                      src={formState.profile_image_url}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <Image className="size-4 text-text-placeholder" />
                  )}
                </div>
              </div>
              <p className="text-[11px] text-text-placeholder">
                {t('settings.account.avatarHelp', 'URL to your profile image.')}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Btn
              type="submit"
              disabled={profileSaving}
              className="h-8 px-4 bg-level-2 text-xs font-semibold text-text-main hover:bg-level-3 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="size-3.5" />
              <span>
                {profileSaving
                  ? t('settings.account.saving', 'Saving...')
                  : t('settings.account.saveProfile', 'Save Profile')}
              </span>
            </Btn>
          </div>
        </form>

        {/* Card 2: Security & Password */}
        <form
          onSubmit={handlePasswordSubmit}
          className="p-3 sm:p-4 border border-level-3/60 rounded-md bg-level-1 space-y-3.5 shadow-xs flex flex-col justify-between"
        >
          <div className="space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main pb-1 border-b border-level-3/40">
              <KeyRound className="size-4 text-level-3" />
              <span>{t('settings.account.changePassword', 'Change Password')}</span>
            </div>

            {/* Current Password */}
            <div className="space-y-1">
              <Label htmlFor="account-current-password" className="text-xs font-semibold text-text-main">
                {t('settings.account.currentPassword', 'Current Password')}
              </Label>
              <Input
                id="account-current-password"
                type="password"
                autoComplete="current-password"
                placeholder={t('settings.account.currentPasswordPlaceholder', 'Current password')}
                value={formState.currentPassword}
                disabled={passwordSaving}
                onChange={(e) => handleValueChange('currentPassword', e.target.value)}
                className="bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-level-3/50"
              />
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <Label htmlFor="account-new-password" className="text-xs font-semibold text-text-main">
                {t('settings.account.newPassword', 'New Password')}
              </Label>
              <Input
                id="account-new-password"
                type="password"
                autoComplete="new-password"
                placeholder={t('settings.account.newPasswordPlaceholder', 'New password')}
                value={formState.newPassword}
                disabled={passwordSaving}
                onChange={(e) => handleValueChange('newPassword', e.target.value)}
                className="bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-level-3/50"
              />
              <p className="text-[11px] text-text-placeholder">
                {t('settings.account.passwordHelp', 'Use at least 8 characters.')}
              </p>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <Label htmlFor="account-confirm-password" className="text-xs font-semibold text-text-main">
                {t('settings.account.confirmPassword', 'Confirm New Password')}
              </Label>
              <Input
                id="account-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder={t('settings.account.confirmPasswordPlaceholder', 'Repeat new password')}
                value={formState.confirmPassword}
                disabled={passwordSaving}
                onChange={(e) => handleValueChange('confirmPassword', e.target.value)}
                className="bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-level-3/50"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Btn
              type="submit"
              disabled={passwordSaving}
              className="h-8 px-4 bg-level-2 text-xs font-semibold text-text-main hover:bg-level-3 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <KeyRound className="size-3.5" />
              <span>
                {passwordSaving
                  ? t('settings.account.saving', 'Saving...')
                  : t('settings.account.changePassword', 'Update Password')}
              </span>
            </Btn>
          </div>
        </form>
      </div>
    </div>
  )
}
