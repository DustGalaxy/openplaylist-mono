import { useState, useCallback, useMemo } from 'react'
import type { UserProfile } from '@/types/user'
import { patchSocialLink } from '@/api/api-user'
import { SocialLinkHint } from '@/lib/constants/social_names'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  feedbackErrorClass,
  feedbackSuccessClass,
  panelClass,
  sectionTitleClass,
} from '@/features/landing/styles'

interface ProfileTabProps {
  user: UserProfile | null
}

interface SocialLinkData {
  platform: string
  url: string
}

interface UIState {
  socialLoading: Record<string, boolean>
  socialFeedback: Record<string, { type: 'success' | 'error'; message: string }>
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

const validatePlatform = (platform: string): string | null => {
  const trimmed = platform.trim()
  if (!trimmed) return 'Platform name is required'
  if (trimmed.length < MIN_PLATFORM_LENGTH) {
    return `Platform name must be at least ${MIN_PLATFORM_LENGTH} characters`
  }
  if (trimmed.length > MAX_PLATFORM_LENGTH) {
    return `Platform name must not exceed ${MAX_PLATFORM_LENGTH} characters`
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
    return 'Platform name can only contain letters, numbers, spaces, hyphens, and underscores'
  }
  return null
}

const validateUrl = (url: string): string | null => {
  const trimmed = url.trim()
  if (!trimmed) return 'URL is required'
  if (trimmed.length < MIN_URL_LENGTH) {
    return `URL must be at least ${MIN_URL_LENGTH} characters`
  }
  if (!URL_REGEX.test(trimmed)) {
    return 'URL must start with http:// or https://'
  }
  try {
    new URL(trimmed)
    return null
  } catch {
    return 'Enter a valid URL'
  }
}

export function ProfileTab({ user }: ProfileTabProps) {
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(
    user?.social_links ?? {},
  )
  const [newSocialLink, setNewSocialLink] = useState<SocialLinkData>({
    platform: '',
    url: '',
  })
  const [uiState, setUIState] = useState<UIState>({
    socialLoading: {},
    socialFeedback: {},
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

  const handlePlatformChange = useCallback((value: string) => {
    setNewSocialLink((prev) => ({ ...prev, platform: value }))
    setUIState((prev) => {
      const next = { ...prev }
      delete next.socialFeedback.add
      return next
    })
  }, [])

  const handleUrlChange = useCallback((value: string) => {
    setNewSocialLink((prev) => ({ ...prev, url: value }))
    setUIState((prev) => {
      const next = { ...prev }
      delete next.socialFeedback.add
      return next
    })
  }, [])

  const handleAddSocialLink = useCallback(async () => {
    const platformError = validatePlatform(newSocialLink.platform)
    if (platformError) {
      setUIState((prev) => ({
        ...prev,
        socialFeedback: { add: { type: 'error', message: platformError } },
      }))
      return
    }

    const urlError = validateUrl(newSocialLink.url)
    if (urlError) {
      setUIState((prev) => ({
        ...prev,
        socialFeedback: { add: { type: 'error', message: urlError } },
      }))
      return
    }

    const isDuplicate = Object.keys(socialLinks).some(
      (key) => key.toLowerCase() === newSocialLink.platform.toLowerCase(),
    )
    if (isDuplicate) {
      setUIState((prev) => ({
        ...prev,
        socialFeedback: {
          add: {
            type: 'error',
            message: `${newSocialLink.platform} is already added`,
          },
        },
      }))
      return
    }

    setUIState((prev) => ({ ...prev, socialLoading: { add: true } }))
    setUIState((prev) => {
      const next = { ...prev }
      delete next.socialFeedback.add
      return next
    })

    try {
      const updatedSocials = {
        ...user?.social_links,
        [newSocialLink.platform.trim()]: newSocialLink.url.trim(),
      }
      await patchSocialLink(updatedSocials)
      setSocialLinks(updatedSocials)
      setNewSocialLink({ platform: '', url: '' })
      setUIState((prev) => ({
        ...prev,
        socialFeedback: {
          add: { type: 'success', message: 'Social link added successfully' },
        },
      }))
    } catch (error) {
      setUIState((prev) => ({
        ...prev,
        socialFeedback: {
          add: {
            type: 'error',
            message: getApiErrorMessage(error, 'Failed to add social link'),
          },
        },
      }))
    } finally {
      setUIState((prev) => ({
        ...prev,
        socialLoading: { add: false },
      }))
    }
  }, [newSocialLink, socialLinks])

  const handleDeleteSocialLink = useCallback(async (platform: string) => {
    setUIState((prev) => ({
      ...prev,
      deleteConfirmation: null,
    }))
    setUIState((prev) => ({
      ...prev,
      socialLoading: { [`delete-${platform}`]: true },
    }))

    try {
      const { [platform]: deleted, ...otherSocials } = user?.social_links ?? {}
      await patchSocialLink(otherSocials)
      setSocialLinks(otherSocials)
      setUIState((prev) => ({
        ...prev,
        socialFeedback: {
          [`delete-${platform}`]: {
            type: 'success',
            message: 'Social link deleted',
          },
        },
      }))
    } catch (error) {
      setUIState((prev) => ({
        ...prev,
        socialFeedback: {
          [`delete-${platform}`]: {
            type: 'error',
            message: getApiErrorMessage(error, 'Failed to delete social link'),
          },
        },
      }))
    } finally {
      setUIState((prev) => ({
        ...prev,
        socialLoading: { [`delete-${platform}`]: false },
      }))
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Profile Overview Card */}
      <div className={`p-4 sm:p-6 ${panelClass}`}>
        <h3
          className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main mb-4`}
        >
          Profile Overview
        </h3>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="rounded-full w-[100px] h-[100px] bg-gradient-to-br from-accent-1 to-accent-2 p-1 flex-shrink-0 shadow-lg">
            <div className="w-full h-full rounded-full bg-level-2 overflow-hidden">
              <img
                src={user?.avatar_url || ''}
                alt={`${user?.username || 'User'} avatar`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{user?.username || ''}</h2>
            <p className="mb-4 text-black bg-black hover:text-text-secondary hover:bg-level-2 px-2 py-1 rounded-full">
              {user?.email ? user.email : 'No email set'}
            </p>

            {/* Social Links */}
            <div className="flex flex-wrap gap-2">
              {Object.keys(socialLinks).length > 0 ? (
                Object.entries(socialLinks).map(([platform, url]) => (
                  <div
                    key={platform}
                    className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-level-1 border border-level-4 hover:border-accent-1 transition-all"
                  >
                    <a href={url}>
                      <span className="text-sm font-medium">
                        <SocialLinkHint socialKey={platform} />
                      </span>
                    </a>

                    <button
                      onClick={() =>
                        setUIState((prev) => ({
                          ...prev,
                          deleteConfirmation: platform,
                        }))
                      }
                      disabled={
                        uiState.socialLoading[`delete-${platform}`] || false
                      }
                      className="ml-1 text-text-placeholder hover:text-danger transition-colors disabled:opacity-50"
                      title={`Remove ${platform}`}
                      aria-label={`Delete ${platform} social link`}
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-placeholder italic">
                  No social links added yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Social Links Management Card */}
      <div className={`p-4 sm:p-6 ${panelClass}`}>
        <h3
          className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main mb-4`}
        >
          Add Social Links
        </h3>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="social-platform" className="text-text-main">
                Platform
              </Label>
              <div className="relative">
                <Input
                  id="social-platform"
                  type="text"
                  placeholder="e.g., Twitch, GitHub, LinkedIn"
                  value={newSocialLink.platform}
                  onChange={(e) => handlePlatformChange(e.target.value)}
                  className="h-11 border-level-4 text-text-main bg-level-1 mt-2"
                  aria-label="Social media platform name"
                  autoComplete="off"
                />
                {platformSuggestions.length > 0 && newSocialLink.platform && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-level-1 border border-level-4 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {platformSuggestions.map((platform) => (
                      <button
                        key={platform}
                        type="button"
                        onClick={() => handlePlatformChange(platform)}
                        className="w-full text-left px-3 py-2 hover:bg-level-2 transition-colors text-sm"
                      >
                        <SocialLinkHint socialKey={platform} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {newSocialLink.platform.trim() && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-level-1 border border-level-4 text-xs text-text-secondary">
                  <SocialLinkHint socialKey={newSocialLink.platform.trim()} />
                </div>
              )}
            </div>
            <div className="flex-1">
              <Label htmlFor="social-url" className="text-text-main">
                URL
              </Label>
              <Input
                id="social-url"
                type="url"
                placeholder="https://..."
                value={newSocialLink.url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="h-11 border-level-4 text-text-main bg-level-1 mt-2"
                aria-label="Social media profile URL"
              />
            </div>
            <div className="flex items-end">
              <Btn
                text={uiState.socialLoading.add ? '⟳ Adding...' : '+ Add Link'}
                onClick={handleAddSocialLink}
                disabled={uiState.socialLoading.add || false}
                className="px-4 py-3 text-base font-semibold w-full sm:w-auto"
              />
            </div>
          </div>

          {uiState.socialFeedback.add ? (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                uiState.socialFeedback.add.type === 'success'
                  ? feedbackSuccessClass
                  : feedbackErrorClass
              }`}
              role="alert"
            >
              {uiState.socialFeedback.add.message}
            </div>
          ) : null}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {uiState.deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`p-4 sm:p-6 max-w-sm w-full ${panelClass}`}>
            <h3 className="text-lg font-bold mb-2">Confirm Deletion</h3>
            <p className="text-text-secondary mb-6">
              Are you sure you want to delete{' '}
              <strong>{uiState.deleteConfirmation}</strong>? This action cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setUIState((prev) => ({
                    ...prev,
                    deleteConfirmation: null,
                  }))
                }
                className="flex-1 px-4 py-2 rounded-lg border border-level-4 hover:bg-level-1 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  uiState.deleteConfirmation &&
                  handleDeleteSocialLink(uiState.deleteConfirmation)
                }
                disabled={
                  uiState.socialLoading[
                    `delete-${uiState.deleteConfirmation}`
                  ] || false
                }
                className="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 transition-colors font-medium text-red-300 disabled:opacity-50"
              >
                {uiState.socialLoading[`delete-${uiState.deleteConfirmation}`]
                  ? 'Deleting...'
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
