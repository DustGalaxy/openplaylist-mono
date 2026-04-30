import type { IAuthLoginStrategy } from '../authStrategyManager'

/**
 * DA (Discord/Alternative) authentication strategy
 * Implements both integration and login flows
 */
export class DaAuthStrategy implements IAuthLoginStrategy {
  private readonly platformName = 'da'

  getIntegrationEndpoint(): string {
    return '/user/integration'
  }

  formatIntegrationPayload(code: string): Record<string, unknown> {
    return {
      code: { code },
      type: { type: this.platformName },
    }
  }

  getLoginEndpoint(): string {
    return `/login/social/${this.platformName}`
  }

  formatLoginPayload(code: string): Record<string, unknown> {
    return { code }
  }

  getErrorMessage(context: 'network' | 'auth_failed'): string {
    if (context === 'network') {
      return 'Network Error: Could not connect to backend for DA auth code exchange.'
    }
    return 'DA authentication failed on backend (invalid code or internal error).'
  }

  getEmailCollisionMessage(username: string): string {
    return `We found an account with the same email as your DA account (${username}). Do you want to link DA to your existing account or create a new one?`
  }

  getPlatformName(): string {
    return this.platformName
  }

  allowsEmailCollision(): boolean {
    return true
  }
}
