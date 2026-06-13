import type { IAuthIntegrationStrategy } from '../authStrategyManager'

export class DonateXIntegrayionStrategy implements IAuthIntegrationStrategy {
  private readonly platformName = 'donatex'
  private readonly platformDisplayName = 'DonateX'

  getIntegrationEndpoint(): string {
    return `/user/integration/${this.platformName}`
  }

  formatIntegrationPayload(code: string): Record<string, unknown> {
    const code_verifier = window.sessionStorage.getItem('code_verifier')
    window.sessionStorage.removeItem('code_verifier')
    return {
      code,
      code_verifier,
    }
  }
  getErrorMessage(context: 'network' | 'auth_failed'): string {
    if (context === 'network') {
      return `Network Error: Could not connect to backend for ${this.platformDisplayName} auth code exchange.`
    }
    return `${this.platformDisplayName} authentication failed on backend (invalid code or internal error).`
  }

  allowsEmailCollision(): boolean {
    return false
  }

  getScopeString(scopes: Array<string>): string {
    return scopes.join(' ')
  }
}
