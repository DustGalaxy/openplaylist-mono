// Quick Reference: Auth Strategy Pattern

// ============================================
// 1. INITIALIZE (call once in main.tsx or App.tsx)
// ============================================
import { registerAuthStrategies } from '@/lib/authStrategyRegistry'

// In your app initialization
registerAuthStrategies()


// ============================================
// 2. USE IN COMPONENTS (existing code still works)
// ============================================

// OLD - Platform-specific (still works, now uses strategies):
import { useTwitchAuthMutation, useDAAuthMutation } from '@/hooks/useAuth'

// NEW - Generic approach:
import { useAuthLogin, useIntegration } from '@/hooks/useAuth'

// ============================================
// EXAMPLE: Login with Twitch
// ============================================
import { useAuthLogin } from '@/hooks/useAuth'
import { useNavigate } from '@tanstack/react-router'

function TwitchLoginButton() {
  const navigate = useNavigate()
  const { mutate, isPending, error } = useAuthLogin('twitch', { navigate })

  const handleClick = () => {
    // Get OAuth code from Twitch OAuth flow
    const code = getOAuthCodeFromProvider()
    mutate({ code })
  }

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? 'Logging in...' : 'Login with Twitch'}
      {error && <span>{error.message}</span>}
    </button>
  )
}

// ============================================
// EXAMPLE: Link Twitch Account (Integration)
// ============================================
function LinkTwitchButton() {
  const navigate = useNavigate()
  const { mutate, isPending } = useIntegration('twitch', { navigate })

  const handleClick = () => {
    const code = getOAuthCodeFromProvider()
    mutate({ code })
  }

  return <button onClick={handleClick}>{isPending ? 'Linking...' : 'Link Twitch'}</button>
}

// ============================================
// ADD A NEW PLATFORM (e.g., YouTube)
// ============================================

// 1. Create src/lib/strategies/YouTubeAuthStrategy.ts:
//    import type { IAuthLoginStrategy } from '../authStrategyManager'
//    export class YouTubeAuthStrategy implements IAuthLoginStrategy {
//      // implement interface methods...
//    }

// 2. Register in src/lib/authStrategyRegistry.ts:
//    import { YouTubeAuthStrategy } from './strategies/YouTubeAuthStrategy'
//    const youtubeStrategy = new YouTubeAuthStrategy()
//    authStrategyManager.registerIntegrationStrategy('youtube', youtubeStrategy)
//    authStrategyManager.registerLoginStrategy('youtube', youtubeStrategy)

// 3. Export from src/lib/strategies/index.ts:
//    export { YouTubeAuthStrategy } from './YouTubeAuthStrategy'

// 4. Use in components:
//    const { mutate } = useAuthLogin('youtube', { navigate })

// ============================================
// KEY METHODS IN STRATEGY INTERFACE
// ============================================
interface IAuthLoginStrategy {
  // Integration flow
  getIntegrationEndpoint(): string          // e.g., '/user/integration'
  formatIntegrationPayload(code: string): object

  // Login flow
  getLoginEndpoint(): string                // e.g., '/login/social/twitch'
  formatLoginPayload(code: string): object

  // Error messages
  getErrorMessage(context: 'network' | 'auth_failed'): string
  getEmailCollisionMessage(username: string): string

  // Platform info
  getPlatformName(): string
  allowsEmailCollision(): boolean
}

// ============================================
// SUPPORTED PLATFORMS
// ============================================
const supportedPlatforms = ['twitch', 'da'] // Add more as needed

// Check what's registered:
import { authStrategyManager } from '@/lib/authStrategyManager'
const { integration, login } = authStrategyManager.getRegisteredPlatforms()
console.log('Integration platforms:', integration)
console.log('Login platforms:', login)
