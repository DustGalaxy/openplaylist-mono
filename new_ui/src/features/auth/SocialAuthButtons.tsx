import { useTranslation } from 'react-i18next'
import Btn from '@/components/ui/my-btn'
import {
  getSupportedOAuthPlatforms,
  getOAuthPlatformConfig,
} from '@/lib/oauthConfig'

interface SocialAuthButtonsProps {
  isLoading: boolean
  onPlatformClick: (platform: string) => void
  mode: 'login' | 'register'
}

export function SocialAuthButtons({
  isLoading,
  onPlatformClick,
  mode,
}: SocialAuthButtonsProps) {
  const { t } = useTranslation()
  const platforms = getSupportedOAuthPlatforms()

  return (
    <div className="space-y-3">
      {platforms.map((platform) => {
        const config = getOAuthPlatformConfig(platform, window.location.origin)
        if (!config) return null

        const colors = {
          bg: 'bg-level-2',
          hover: 'hover:bg-level-2/80',
        }
        const buttonText =
          mode === 'login'
            ? t('auth.social.loginWith', { platform: config.platformName })
            : t('auth.social.signUpWith', { platform: config.platformName })

        return (
          <Btn
            key={platform}
            onClick={() => onPlatformClick(platform)}
            disabled={isLoading}
            className={`w-full ${colors.bg} ${colors.hover} text-text-main`}
          >
            {buttonText}
          </Btn>
        )
      })}
    </div>
  )
}
