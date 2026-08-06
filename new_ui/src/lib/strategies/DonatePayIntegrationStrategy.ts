import type { IAuthIntegrationStrategy } from '../authStrategyManager'

export class DonatePayIntegrationStrategy implements IAuthIntegrationStrategy {
  private readonly platformName = 'donatepay'
  private readonly platformDisplayName = 'DonatePay'

  getIntegrationEndpoint(): string {
    return `/user/integration/${this.platformName}/token`
  }

  formatIntegrationPayload(userKey: string): Record<string, unknown> {
    return { user_key: userKey }
  }

  getErrorMessage(context: 'network' | 'auth_failed'): string {
    if (context === 'network') {
      return `Network Error: Could not connect to backend for ${this.platformDisplayName}.`
    }
    return `${this.platformDisplayName} authentication failed on backend (invalid API key or internal error).`
  }

  allowsEmailCollision(): boolean {
    return false
  }

  getScopeString(scopes: Array<string>): string {
    return scopes.join(' ')
  }
}
