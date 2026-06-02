import { getConfig } from '@/lib/utils'
import { authStrategyManager } from './authStrategyManager'
/**
 * OAuth Platform Configuration
 * Defines how to build OAuth authorization URLs for each platform
 */
export interface OAuthPlatformConfig {
  platformName: string
  authorizationUrl: string
  scopes: Array<string>
  clientId: string
  redirectUri: string
}

/**
 * Get OAuth platform configuration
 * Extensible design: add new platforms by updating this function
 */
export function getOAuthPlatformConfig(
  platform: string,
  redirectUri: string,
): OAuthPlatformConfig | null {
  const config = getConfig()

  switch (platform) {
    case 'twitch':
      return {
        platformName: 'Twitch',
        authorizationUrl: 'https://id.twitch.tv/oauth2/authorize',
        scopes: config.TWITCH_SCOPES,
        clientId: config.TWITCH_CLIENT_ID,
        redirectUri,
      }

    case 'donationalerts':
      return {
        platformName: 'Donation Alerts',
        authorizationUrl: 'https://www.donationalerts.com/oauth/authorize',
        scopes: config.DA_SCOPES,
        clientId: config.DA_CLIENT_ID,
        redirectUri,
      }
    case 'google':
      return {
        platformName: 'Google',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        scopes: config.GOOGLE_SCOPES,
        clientId: config.GOOGLE_CLIENT_ID,
        redirectUri,
      }

    // Add more platforms here
    // case 'youtube':
    //   return {
    //     platformName: 'YouTube',
    //     authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    //     scopes: config.YOUTUBE_SCOPES,
    //     clientId: config.YOUTUBE_CLIENT_ID,
    //     redirectUri,
    //   }

    default:
      console.error(`OAuth configuration not found for platform: ${platform}`)
      return null
  }
}

/**
 * Build complete OAuth authorization URL
 * Standard OAuth 2.0 format
 */
export function buildOAuthUrl(
  platform: string,
  state: string,
  redirectUri: string,
): string {
  const platformConfig = getOAuthPlatformConfig(platform, redirectUri)

  if (!platformConfig) {
    throw new Error(`OAuth not configured for platform: ${platform}`)
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: platformConfig.clientId,
    redirect_uri: redirectUri,
    scope: authStrategyManager.getLoginStrategy(platform).getScopeString(
      platformConfig.scopes,
    ),
    state,
  })

  if (platform === "google") {
    params.set('access_type', 'offline')
    params.set('prompt', 'consent')
  }

  return `${platformConfig.authorizationUrl}?${params.toString()}`
}

/**
 * Get all supported OAuth platforms
 */
export function getSupportedOAuthPlatforms(): string[] {
  return ['twitch', 'donationalerts', 'google']
  // Update this list when adding new platforms
}

/**
 * Validate if platform is supported
 */
export function isOAuthPlatformSupported(platform: string): boolean {
  return getSupportedOAuthPlatforms().includes(platform)
}
