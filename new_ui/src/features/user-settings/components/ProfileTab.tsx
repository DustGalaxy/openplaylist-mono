import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  Mail,
  Plus,
  Save,
  Share2,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import type { UserProfile } from '@/types/user'
import { deleteUser, patchSocialLink, updateUserProfile } from '@/api/api-user'
import { SocialLinkHint } from '@/lib/constants/social_names'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { DialogDescription } from '@/components/ui/dialog'
import { StatsPrivacySettingsSection } from './StatsPrivacySettingsSection'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

interface ProfileTabProps {
  user: UserProfile | null
}

interface SocialLinkData {
  platform: string
  url: string
}

interface UIState {
  socialLoading: Record<string, boolean>
  deleteConfirmation: string | null
}

const KNOWN_PLATFORMS = [
  'twitch',
  'discord',
  'youtube',
  'X',
  'github',
  'spotify',
]
const PLATFORM_SUGGESTIONS = KNOWN_PLATFORMS
const URL_REGEX = /^https?:\/\/.+/
const MIN_PLATFORM_LENGTH = 2
const MAX_PLATFORM_LENGTH = 50
const MIN_URL_LENGTH = 10

const getApiErrorMessage = (error: unknown, fallback: string): string => {
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

const validatePlatform = (
  platform: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null => {
  const trimmed = platform.trim()
  if (!trimmed)
    return t(
      'settings.profile.validation.platformRequired',
      'Platform name required',
    )
  if (trimmed.length < MIN_PLATFORM_LENGTH) {
    return t('settings.profile.validation.platformMin', {
      min: MIN_PLATFORM_LENGTH,
      defaultValue: `Min ${MIN_PLATFORM_LENGTH} chars`,
    })
  }
  if (trimmed.length > MAX_PLATFORM_LENGTH) {
    return t('settings.profile.validation.platformMax', {
      max: MAX_PLATFORM_LENGTH,
      defaultValue: `Max ${MAX_PLATFORM_LENGTH} chars`,
    })
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    return t(
      'settings.profile.validation.platformChars',
      'Invalid characters in platform name',
    )
  }
  return null
}

const validateUrl = (
  url: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null => {
  const trimmed = url.trim()
  if (!trimmed)
    return t('settings.profile.validation.urlRequired', 'URL required')
  if (trimmed.length < MIN_URL_LENGTH) {
    return t('settings.profile.validation.urlMin', {
      min: MIN_URL_LENGTH,
      defaultValue: `Min ${MIN_URL_LENGTH} chars`,
    })
  }
  if (!URL_REGEX.test(trimmed)) {
    return t(
      'settings.profile.validation.urlProtocol',
      'URL must start with http:// or https://',
    )
  }
  try {
    new URL(trimmed)
    return null
  } catch {
    return t('settings.profile.validation.urlInvalid', 'Invalid URL format')
  }
}

export function ProfileTab({ user }: ProfileTabProps) {
  const { t } = useFeatureTranslation()
  const navigate = useNavigate()
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(
    user?.social_links ?? {},
  )
  const [newSocialLink, setNewSocialLink] = useState<SocialLinkData>({
    platform: '',
    url: '',
  })
  const [uiState, setUIState] = useState<UIState>({
    socialLoading: {},
    deleteConfirmation: null,
  })

  const platformSuggestions = useMemo(
    () =>
      PLATFORM_SUGGESTIONS.filter(
        (p) =>
          p.toLowerCase().includes(newSocialLink.platform.toLowerCase()) &&
          !Object.keys(socialLinks).some(
            (key) => key.toLowerCase() === p.toLowerCase(),
          ),
      ).slice(0, 5),
    [newSocialLink.platform, socialLinks],
  )

  const [bio, setBio] = useState(user?.bio ?? '')
  const [isPublic, setIsPublic] = useState(user?.is_public ?? false)
  const [profileSaving, setProfileSaving] = useState(false)

  const bioDirty = bio !== (user?.bio ?? '')
  const isPublicDirty = isPublic !== (user?.is_public ?? false)
  const profileDirty = bioDirty || isPublicDirty

  const handleSaveProfile = useCallback(async () => {
    setProfileSaving(true)
    const loadingToast = toast.loading(
      t('settings.profile.saving', 'Saving...'),
    )
    try {
      await updateUserProfile({ bio, is_public: isPublic })
      toast.dismiss(loadingToast)
      toast.success(t('settings.profile.saved', 'Profile saved successfully'))
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(
        getApiErrorMessage(
          error,
          t('settings.profile.saveFailed', 'Failed to save profile'),
        ),
      )
    } finally {
      setProfileSaving(false)
    }
  }, [bio, isPublic, t])

  const handlePlatformChange = useCallback((value: string) => {
    setNewSocialLink((prev) => ({ ...prev, platform: value }))
  }, [])

  const handleUrlChange = useCallback((value: string) => {
    setNewSocialLink((prev) => ({ ...prev, url: value }))
  }, [])

  const handleAddSocialLink = useCallback(async () => {
    const platformError = validatePlatform(newSocialLink.platform, t)
    if (platformError) {
      toast.error(platformError)
      return
    }

    const urlError = validateUrl(newSocialLink.url, t)
    if (urlError) {
      toast.error(urlError)
      return
    }

    const isDuplicate = Object.keys(socialLinks).some(
      (key) => key.toLowerCase() === newSocialLink.platform.toLowerCase(),
    )
    if (isDuplicate) {
      const message = t('settings.profile.duplicatePlatform', {
        platform: newSocialLink.platform,
        defaultValue: `Platform ${newSocialLink.platform} already exists`,
      })
      toast.error(message)
      return
    }

    setUIState((prev) => ({ ...prev, socialLoading: { add: true } }))
    const loadingToast = toast.loading(
      t('settings.profile.adding', 'Adding link...'),
    )

    try {
      const updatedSocials = {
        ...socialLinks,
        [newSocialLink.platform.trim()]: newSocialLink.url.trim(),
      }
      await patchSocialLink(updatedSocials)
      setSocialLinks(updatedSocials)
      setNewSocialLink({ platform: '', url: '' })

      toast.dismiss(loadingToast)
      toast.success(t('settings.profile.linkAddedSuccess', 'Social link added'))
    } catch (error) {
      const errorMsg = getApiErrorMessage(
        error,
        t('settings.profile.linkAddFailed', 'Failed to add link'),
      )
      toast.dismiss(loadingToast)
      toast.error(errorMsg)
    } finally {
      setUIState((prev) => ({
        ...prev,
        socialLoading: { add: false },
      }))
    }
  }, [newSocialLink, socialLinks, t])

  const handleDeleteSocialLink = useCallback(
    async (platform: string) => {
      setUIState((prev) => ({
        ...prev,
        deleteConfirmation: null,
        socialLoading: { [`delete-${platform}`]: true },
      }))

      const loadingToast = toast.loading(
        t('settings.profile.deleting', 'Deleting...'),
      )

      try {
        const { [platform]: deleted, ...otherSocials } = socialLinks
        await patchSocialLink(otherSocials)
        setSocialLinks(otherSocials)

        toast.dismiss(loadingToast)
        toast.success(t('settings.profile.linkDeleted', 'Social link deleted'))
      } catch (error) {
        const errorMsg = getApiErrorMessage(
          error,
          t('settings.profile.linkDeleteFailed', 'Failed to delete link'),
        )
        toast.dismiss(loadingToast)
        toast.error(errorMsg)
      } finally {
        setUIState((prev) => ({
          ...prev,
          socialLoading: { [`delete-${platform}`]: false },
        }))
      }
    },
    [socialLinks, t],
  )

  const handleKillProfile = async () => {
    if (
      !confirm(
        t(
          'settings.profile.killUserProfile.confirmation',
          'Are you sure you want to delete your account? This action cannot be undone.',
        ),
      )
    ) {
      return
    }
    toast.loading(
      t('settings.profile.killUserProfile.deleting', 'Deleting account...'),
    )
    const res = await deleteUser()

    if (res) {
      toast.success(
        t('settings.profile.killUserProfile.deleted', 'Account deleted'),
      )
      void navigate({ to: '/logout' })
    } else {
      toast.error(
        t(
          'settings.profile.killUserProfile.deleteFailed',
          'Failed to delete account',
        ),
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-accent/40 text-accent mt-0.5">
          <User className="size-5" />
        </div>
        <div>
          <Label className="text-base font-bold text-text-main">
            {t('settings.profile.overview', 'User Profile')}
          </Label>
          <DialogDescription className="text-xs text-text-secondary mt-0.5">
            {t(
              'settings.profile.subtitle',
              'Manage your profile details, bio, and connected social links.',
            )}
          </DialogDescription>
        </div>
      </div>

      {/* Card 1: User Info & Bio */}
      <div className="p-3 sm:p-4 border border-accent/60 rounded-md bg-level-1 space-y-4 shadow-xs">
        {/* User Overview Bar */}
        <div className="flex items-center gap-3.5 pb-3 border-b border-accent/40">
          <div className="rounded-full size-14 bg-gradient-to-br from-[var(--color-accent-1)] to-[var(--color-accent-2)] p-0.5 shrink-0 shadow-md">
            <div className="w-full h-full rounded-full bg-level-2 overflow-hidden flex items-center justify-center">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={`${user.username || 'User'} avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="size-6 text-text-secondary" />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-text-main truncate">
              {user?.username || t('settings.profile.user', 'User')}
            </h2>
            {user?.email && (
              <p className="flex items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                <Mail className="size-3 shrink-0 text-text-secondary" />
                <span
                  title="Hover to reveal email"
                  className="cursor-pointer bg-text-main text-text-main hover:bg-transparent hover:text-text-secondary transition-colors duration-700 rounded px-1.5 py-0.5 text-xs select-none"
                >
                  {user.email}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Bio Input */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="profile-bio"
              className="text-xs font-semibold text-text-main"
            >
              {t('settings.profile.bio', 'Bio')}
            </Label>
            <span className="text-[10px] text-text-placeholder">
              {bio.length}/500
            </span>
          </div>
          <Textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t(
              'settings.profile.bioPlaceholder',
              'Tell users about yourself...',
            )}
            className="bg-level-2 border-0 p-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-accent/50 resize-none min-h-[70px]"
          />
        </div>

        {/* Public Profile Switch */}
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-level-2/60">
          <div className="min-w-0 flex-1">
            <Label className="text-xs font-semibold text-text-main block">
              {t('settings.profile.isPublic', 'Public Profile')}
            </Label>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {t(
                'settings.profile.isPublicHint',
                'Allow other users to view your public profile page.',
              )}
            </p>
          </div>
          <Switch
            checked={isPublic}
            onCheckedChange={setIsPublic}
            className="shrink-0"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-1">
          <Btn
            onClick={handleSaveProfile}
            disabled={!profileDirty || profileSaving}
            className="h-8 px-4 bg-level-2 text-xs font-semibold text-text-main hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="size-3.5" />
            <span>
              {profileSaving
                ? t('settings.profile.saving', 'Saving...')
                : t('settings.profile.save', 'Save Changes')}
            </span>
          </Btn>
        </div>
      </div>

      {/* Card 2: Social Links */}
      <div className="p-3 sm:p-4 border border-accent/60 rounded-md bg-level-1 space-y-3.5 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main pb-1 border-b border-accent/40">
          <Share2 className="size-4 text-accent" />
          <span>
            {t('settings.profile.addSocialLinks', 'Social Media Links')}
          </span>
        </div>

        {/* Add Social Link Form */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Platform Input + Suggestions */}
          <div className="relative flex-1 min-w-0">
            <Input
              id="social-platform"
              type="text"
              placeholder={t(
                'settings.profile.platformPlaceholder',
                'Platform (e.g. Twitch, YouTube)',
              )}
              value={newSocialLink.platform}
              onChange={(e) => handlePlatformChange(e.target.value)}
              className="bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-accent/50"
              autoComplete="off"
            />
            {platformSuggestions.length > 0 && newSocialLink.platform && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-level-2 border border-accent/50 rounded-md shadow-lg max-h-40 overflow-y-auto p-1">
                {platformSuggestions.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handlePlatformChange(platform)}
                    className="w-full text-left px-2 py-1.5 hover:bg-level-1 rounded-xs transition-colors text-xs text-text-main flex items-center gap-2 cursor-pointer"
                  >
                    <SocialLinkHint socialKey={platform} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* URL Input */}
          <div className="flex-1 min-w-0">
            <Input
              id="social-url"
              type="url"
              placeholder={t('settings.profile.urlPlaceholder', 'https://...')}
              value={newSocialLink.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-accent/50"
            />
          </div>

          {/* Add Link Button */}
          <Btn
            onClick={handleAddSocialLink}
            disabled={uiState.socialLoading.add || false}
            className="h-8 px-3 bg-level-2 text-xs font-semibold text-text-main shrink-0 flex items-center gap-1 hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            <span>
              {uiState.socialLoading.add
                ? t('settings.profile.adding', 'Adding...')
                : t('settings.profile.addLink', 'Add Link')}
            </span>
          </Btn>
        </div>

        {/* Configured Social Links List */}
        {Object.keys(socialLinks).length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(socialLinks).map(([platform, url]) => (
              <div
                key={platform}
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-level-2/80 border border-accent/40 hover:border-accent transition-all text-xs"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-text-main hover:underline flex items-center gap-1.5"
                >
                  <SocialLinkHint socialKey={platform} />
                </a>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() =>
                        setUIState((prev) => ({
                          ...prev,
                          deleteConfirmation: platform,
                        }))
                      }
                      disabled={
                        uiState.socialLoading[`delete-${platform}`] || false
                      }
                      className="p-0.5 text-text-placeholder hover:text-red-400 rounded-sm transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-level-2 text-text-main border-accent/40 border text-xs"
                  >
                    <p>
                      {t('settings.profile.removePlatform', {
                        platform,
                        defaultValue: `Remove ${platform}`,
                      })}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 border border-dashed border-accent/60 rounded-md bg-level-1/50 text-center">
            <p className="text-xs text-text-secondary">
              {t(
                'settings.profile.noSocialLinksYet',
                'No social links added yet.',
              )}
            </p>
          </div>
        )}
      </div>

      {/* Card 2.5: Statistics Privacy Settings */}
      <StatsPrivacySettingsSection />

      {/* Card 3: Danger Zone */}
      <div className="p-3 sm:p-4 border border-red-500/30 rounded-md bg-red-500/5 space-y-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
          <AlertTriangle className="size-4" />
          <span>
            {t('settings.profile.killUserProfile.title', 'Delete Account')}
          </span>
        </div>
        <p className="text-xs text-text-secondary">
          {t(
            'settings.profile.killUserProfile.body',
            'Permanently remove your profile, data, and settings. This action cannot be undone.',
          )}
        </p>
        <div className="flex justify-end">
          <Btn
            onClick={handleKillProfile}
            className="h-8 px-3.5 bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-semibold"
          >
            {t('settings.profile.killUserProfile.btnText', 'Delete Account')}
          </Btn>
        </div>
      </div>

      {/* Delete Link Confirmation Dialog */}
      {uiState.deleteConfirmation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="p-4 sm:p-5 max-w-sm w-full bg-level-2 border border-accent/50 rounded-md shadow-2xl space-y-3">
            <h3 className="text-sm font-bold text-text-main">
              {t('settings.profile.confirmDeletion', 'Remove Social Link')}
            </h3>
            <p className="text-xs text-text-secondary">
              {t('settings.profile.confirmDeleteBody', {
                platform: uiState.deleteConfirmation,
                defaultValue: `Are you sure you want to remove ${uiState.deleteConfirmation}?`,
              })}
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() =>
                  setUIState((prev) => ({
                    ...prev,
                    deleteConfirmation: null,
                  }))
                }
                className="h-8 px-3 rounded-md bg-level-1 hover:bg-accent transition-colors text-xs font-semibold text-text-main cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() =>
                  uiState.deleteConfirmation &&
                  handleDeleteSocialLink(uiState.deleteConfirmation)
                }
                disabled={
                  uiState.socialLoading[
                    `delete-${uiState.deleteConfirmation}`
                  ] || false
                }
                className="h-8 px-3 rounded-md bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 transition-colors text-xs font-semibold text-red-400 disabled:opacity-50 cursor-pointer"
              >
                {uiState.socialLoading[`delete-${uiState.deleteConfirmation}`]
                  ? t('settings.profile.deleting', 'Deleting...')
                  : t('settings.profile.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
