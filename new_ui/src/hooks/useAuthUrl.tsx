import { useRouterState } from '@tanstack/react-router'
import {
  OAUTH_STATE_KEY,
  REDIRECT_AFTER_LOGIN_KEY,
  generateOAuthState,
} from '@/lib/utils'
import { buildOAuthUrl, isOAuthPlatformSupported } from '@/lib/oauthConfig'

/**
 * OAuth State Structure
 * Format: "${platform}|${operationType}|${randomState}"
 * Example: "twitch|login|abc123def456"
 * Example: "da|integration|xyz789"
 *
 * This compact format is stored in state parameter and can be extracted
 * in the callback page to determine which platform and operation was initiated
 */
export interface OAuthStateData {
  platform: string
  operationType: 'login' | 'integration'
  randomState: string
}

/**
 * Serialize OAuth state data into a compact state parameter
 * Used in OAuth redirect URL: ?state=${serializedState}
 */
export function serializeOAuthState(data: OAuthStateData): string {
  return `${data.platform}|${data.operationType}|${data.randomState}`
}

/**
 * Deserialize OAuth state parameter back to structured data
 * Called in callback page to extract platform and operation type
 */
export function deserializeOAuthState(
  stateParam: string,
): OAuthStateData | null {
  try {
    const parts = stateParam.split('|')
    if (parts.length !== 3) {
      console.error('Invalid state format:', stateParam)
      return null
    }

    const [platform, operationType, randomState] = parts
    if (operationType !== 'login' && operationType !== 'integration') {
      console.error('Invalid operation type:', operationType)
      return null
    }

    return { platform, operationType, randomState }
  } catch (error) {
    console.error('Failed to deserialize OAuth state:', error)
    return null
  }
}

/**
 * Generic OAuth URL generator for all social platforms
 * Supports: Twitch, DA, and any platform added to oauthConfig.ts
 *
 * Usage:
 *   const handleOAuthRedirect = useOAuthUrl()
 *   handleOAuthRedirect('twitch', false)  // login with twitch
 *   handleOAuthRedirect('da', true)       // integration with da
 */
export const useOAuthUrl = () => {
  const routerState = useRouterState()

  const handleOAuthRedirect = async (
    platform: string,
    isIntegration: boolean = false,
  ) => {
    // 1. Validate platform is supported
    if (!isOAuthPlatformSupported(platform) && !isIntegration) {
      console.error(`OAuth not configured for platform: ${platform}`)
      throw new Error(`Platform "${platform}" is not configured for OAuth`)
    }

    // 2. Generate CSRF protection state
    const randomState = generateOAuthState()
    const oauthStateData: OAuthStateData = {
      platform,
      operationType: isIntegration ? 'integration' : 'login',
      randomState,
    }
    const serializedState = serializeOAuthState(oauthStateData)

    // 3. Store state for validation in callback
    localStorage.setItem(OAUTH_STATE_KEY, serializedState)

    // 4. Save current location for redirect after OAuth completes
    const currentPath =
      routerState.location.pathname +
      routerState.location.searchStr +
      routerState.location.hash
    localStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, currentPath)

    // 5. Build complete OAuth authorization URL
    const redirectUri = `${window.location.origin}/oauth-callback`
    const authUrl = await buildOAuthUrl(platform, serializedState, redirectUri)

    // 6. Redirect to OAuth provider
    console.log(
      `Redirecting to ${platform} OAuth with ${isIntegration ? 'integration' : 'login'} operation`,
    )
    window.location.href = authUrl
  }

  return handleOAuthRedirect
}
