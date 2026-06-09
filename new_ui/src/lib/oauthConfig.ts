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
  code_challenge_method?: string
  code_challenge?: string
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
    case 'donatex':
      return {
        platformName: 'DonateX',
        authorizationUrl: 'https://donatex.gg/api/connect/authorize',
        scopes: config.DONATEX_SCOPES,
        clientId: config.DONATEX_CLIENT_ID,
        code_challenge: '',
        code_challenge_method: config.DONATEX_CODE_CHALLENGE_METHOD,
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
interface PKCEPair {
  codeVerifier: string
  codeChallenge: string
}

export async function generatePKCE(): Promise<PKCEPair> {
  // 1. Генерация случайного code_verifier (используем криптографически стойкий метод)
  const array = new Uint32Array(32)
  window.crypto.getRandomValues(array)

  const codeVerifier = Array.from(array)
    .map((num) => String.fromCharCode((num % 63) + 48)) // Безопасный набор символов
    .join('')
    .replace(/[^a-zA-Z0-9\-._~]/g, '') // Оставляем только разрешенные спецификацией символы
    .substring(0, 128)

  // 2. Хеширование через SHA-256
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)

  // 3. Кодирование в Base64URL (без символов '=', '+' и '/')
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const base64 = btoa(String.fromCharCode(...hashArray))
  const codeChallenge = base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return { codeVerifier, codeChallenge }
}

/**
 * Build complete OAuth authorization URL
 * Standard OAuth 2.0 format
 */
export async function buildOAuthUrl(
  platform: string,
  state: string,
  redirectUri: string,
): Promise<string> {
  const platformConfig = getOAuthPlatformConfig(platform, redirectUri)

  if (!platformConfig) {
    throw new Error(`OAuth not configured for platform: ${platform}`)
  }

  var scope = ''

  if (state.includes('integration')) {
    scope = authStrategyManager
      .getIntegrationStrategy(platform)
      .getScopeString(platformConfig.scopes)
  } else {
    scope = authStrategyManager
      .getLoginStrategy(platform)
      .getScopeString(platformConfig.scopes)
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: platformConfig.clientId,
    redirect_uri: redirectUri,
    scope: scope,
    state: state,
  })

  if (platform === 'donatex') {
    const { codeVerifier, codeChallenge } = await generatePKCE().then(
      (result) => result,
    )
    params.set('code_challenge_method', platformConfig.code_challenge_method!)
    params.set('code_challenge', codeChallenge)
    window.sessionStorage.setItem('code_verifier', codeVerifier)
  }

  if (platform === 'google') {
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
