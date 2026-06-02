import type { IAuthLoginStrategy } from '../authStrategyManager'

/**
 * DA (Discord/Alternative) authentication strategy
 * Implements both integration and login flows
 */
export class GoogleAuthStrategy implements IAuthLoginStrategy {
  private readonly platformName = 'google'
  private readonly platformDisplayName = 'Google'

  getIntegrationEndpoint(): string {
    return '/user/integration'
  }

  formatIntegrationPayload(code: string): Record<string, unknown> {
    return {
      code: { code },
      type: { type: this.platformName },
    }
  }

  getScopeString(scopes: Array<string>): string {
    return scopes.join(' ')
  }

  getLoginEndpoint(): string {
    return `/login/social/${this.platformName}`
  }

  formatLoginPayload(code: string): Record<string, unknown> {
    return { code }
  }

  getErrorMessage(context: 'network' | 'auth_failed'): string {
    if (context === 'network') {
      return `Network Error: Could not connect to backend for ${this.platformDisplayName} auth code exchange.`
    }
    return `${this.platformDisplayName} authentication failed on backend (invalid code or internal error).`
  }

  getEmailCollisionMessage(username: string): string {
    return `We found an account with the same email as your ${this.platformDisplayName} account (${username}). Do you want to link ${this.platformDisplayName} to your existing account or create a new one?`
  }

  getPlatformName(): string {
    return this.platformName
  }

  allowsEmailCollision(): boolean {
    return true
  }
}
