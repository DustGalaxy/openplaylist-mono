import { useState } from 'react'
import type { UserProfile } from '@/types/user'
import { addSocialLink, deleteSocialLink } from '@/api/api-user'
import Btn from '@/components/ui/my-btn'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfileTabProps {
  user: UserProfile | null
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

export function ProfileTab({ user }: ProfileTabProps) {
  const [socialLinks, setSocialLinks] = useState<
    Array<{ platform: string; url: string }>
  >(user?.socials ?? [])
  const [newSocialLink, setNewSocialLink] = useState<{
    platform: string
    url: string
  }>({ platform: '', url: '' })
  const [socialLoading, setSocialLoading] = useState<Record<string, boolean>>(
    {},
  )
  const [socialFeedback, setSocialFeedback] = useState<
    Record<string, { type: 'success' | 'error'; message: string }>
  >({})

  const handleAddSocialLink = async () => {
    if (!newSocialLink.platform.trim() || !newSocialLink.url.trim()) {
      setSocialFeedback((prev) => ({
        ...prev,
        add: { type: 'error', message: 'Platform and URL are required' },
      }))
      return
    }

    try {
      new URL(newSocialLink.url.trim())
    } catch {
      setSocialFeedback((prev) => ({
        ...prev,
        add: { type: 'error', message: 'Invalid URL format' },
      }))
      return
    }

    setSocialLoading((prev) => ({ ...prev, add: true }))
    setSocialFeedback({})

    try {
      await addSocialLink(
        newSocialLink.platform.trim(),
        newSocialLink.url.trim(),
      )
      setSocialLinks((prev) => [...prev, newSocialLink])
      setNewSocialLink({ platform: '', url: '' })
      setSocialFeedback((prev) => ({
        ...prev,
        add: { type: 'success', message: 'Social link added' },
      }))
    } catch (error) {
      setSocialFeedback((prev) => ({
        ...prev,
        add: {
          type: 'error',
          message: getApiErrorMessage(error, 'Failed to add social link'),
        },
      }))
    } finally {
      setSocialLoading((prev) => ({ ...prev, add: false }))
    }
  }

  const handleDeleteSocialLink = async (platform: string) => {
    setSocialLoading((prev) => ({ ...prev, [`delete-${platform}`]: true }))

    try {
      await deleteSocialLink(platform)
      setSocialLinks((prev) =>
        prev.filter((link) => link.platform !== platform),
      )
      setSocialFeedback((prev) => ({
        ...prev,
        [`delete-${platform}`]: {
          type: 'success',
          message: 'Social link deleted',
        },
      }))
    } catch (error) {
      setSocialFeedback((prev) => ({
        ...prev,
        [`delete-${platform}`]: {
          type: 'error',
          message: getApiErrorMessage(error, 'Failed to delete social link'),
        },
      }))
    } finally {
      setSocialLoading((prev) => ({ ...prev, [`delete-${platform}`]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Profile Overview Card */}
      <div className="bg-level-2 rounded-2xl p-8 shadow-md border border-level-3">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <div className="w-1 h-6 bg-accent-1 rounded"></div>
          Profile Overview
        </h3>

        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="rounded-full w-[100px] h-[100px] bg-gradient-to-br from-accent-1 to-accent-2 p-1 flex-shrink-0 shadow-lg">
            <div className="w-full h-full rounded-full bg-level-2 overflow-hidden">
              <img
                src={user?.profile_image_url || ''}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{user?.username || ''}</h2>
            <p className="text-level-4 mb-4">
              {user?.email
                ? user.email.length > 40
                  ? `${user.email.substring(0, 37)}...`
                  : user.email
                : 'No email set'}
            </p>

            {/* Social Links */}
            <div className="flex flex-wrap gap-2">
              {socialLinks.length > 0 ? (
                socialLinks.map((link) => (
                  <div
                    key={link.platform}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-level-1 border border-level-4 hover:border-accent-1 transition-all"
                  >
                    <span className="text-sm font-medium">{link.platform}</span>
                    <button
                      onClick={() => handleDeleteSocialLink(link.platform)}
                      disabled={
                        socialLoading[`delete-${link.platform}`] || false
                      }
                      className="ml-1 text-level-4 hover:text-red-400 transition-colors disabled:opacity-50"
                      title={`Remove ${link.platform}`}
                    >
                      ✕
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-level-4 italic">
                  No social links added yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Social Links Management Card */}
      <div className="bg-level-2 rounded-2xl p-8 shadow-md border border-level-3">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <div className="w-1 h-6 bg-accent-2 rounded"></div>
          Add Social Links
        </h3>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="social-platform" className="text-text-main">
                Platform
              </Label>
              <Input
                id="social-platform"
                type="text"
                placeholder="e.g., Twitter, GitHub, LinkedIn"
                value={newSocialLink.platform}
                onChange={(e) =>
                  setNewSocialLink((prev) => ({
                    ...prev,
                    platform: e.target.value,
                  }))
                }
                className="h-11 border-level-4 text-text-main bg-level-1 mt-2"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="social-url" className="text-text-main">
                URL
              </Label>
              <Input
                id="social-url"
                type="text"
                placeholder="https://..."
                value={newSocialLink.url}
                onChange={(e) =>
                  setNewSocialLink((prev) => ({
                    ...prev,
                    url: e.target.value,
                  }))
                }
                className="h-11 border-level-4 text-text-main bg-level-1 mt-2"
              />
            </div>
            <div className="flex items-end">
              <Btn
                text={socialLoading.add ? '⟳ Adding...' : '+ Add Link'}
                onClick={handleAddSocialLink}
                disabled={socialLoading.add || false}
                className="px-4 py-3 text-base font-semibold w-full sm:w-auto"
              />
            </div>
          </div>

          {socialFeedback.add ? (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                socialFeedback.add.type === 'success'
                  ? 'border-green-600/50 bg-green-600/10 text-green-400'
                  : 'border-red-500/50 bg-red-500/10 text-red-300'
              }`}
            >
              {socialFeedback.add.message}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
