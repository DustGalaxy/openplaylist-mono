import type { AxiosError, AxiosResponse } from 'axios'
import { NotImplementedError } from './utils'

/**
 * Response type when there's an email collision during login
 */
export interface EmailCollisionResponse {
  status: 202
  data: {
    link_session_id: string
    display_info: {
      username: string
    }
  }
}

/**
 * Successful login response
 */
export interface SuccessfulLoginResponse {
  status: 200
  data: unknown
}

/**
 * Union type for login response
 */
export type LoginResponse = EmailCollisionResponse | SuccessfulLoginResponse | AxiosResponse

/**
 * Interface for integration strategies (link existing accounts)
 */
export interface IAuthIntegrationStrategy {
  /**
   * Get the endpoint for integration
   */
  getIntegrationEndpoint(): string
  
  /**
   * Format the payload for integration request
   */
  formatIntegrationPayload(code: string): Record<string, unknown>

  /**
   * Get error message for this platform
   */
  getErrorMessage(context: 'network' | 'auth_failed'): string

  /**
   * Allows email collision (account linking)
   */
  allowsEmailCollision(): boolean
}

/**
 * Interface for login strategies (new or existing account login)
 */
export interface IAuthLoginStrategy extends IAuthIntegrationStrategy {
  /**
   * Get the endpoint for login
   */
  getLoginEndpoint(): string

  /**
   * Format the payload for login request
   */
  formatLoginPayload(code: string): Record<string, unknown>

  getScopeString(scopes: Array<string>): string

  /**
   * Get confirmation message for email collision
   */
  getEmailCollisionMessage(username: string): string

  /**
   * Get the platform name for display
   */
  getPlatformName(): string
}

/**
 * Strategy Manager - Registry pattern for auth strategies
 * Similar to the Python AuthStrategyManager
 */
export class AuthStrategyManager {
  private _integrationStrategies: Map<string, IAuthIntegrationStrategy> = new Map()
  private _loginStrategies: Map<string, IAuthLoginStrategy> = new Map()

  /**
   * Register an integration strategy
   */
  registerIntegrationStrategy(
    mark: string,
    strategy: IAuthIntegrationStrategy,
  ): void {
    this._integrationStrategies.set(mark, strategy)
  }

  /**
   * Register a login strategy
   */
  registerLoginStrategy(mark: string, strategy: IAuthLoginStrategy): void {
    this._loginStrategies.set(mark, strategy)
  }

  /**
   * Get an integration strategy by platform name
   */
  getIntegrationStrategy(platform: string): IAuthIntegrationStrategy {
    const strategy = this._integrationStrategies.get(platform)
    if (!strategy) {
      throw new NotImplementedError(
        `Integration strategy for "${platform}" is not implemented`,
      )
    }
    return strategy
  }

  /**
   * Get a login strategy by platform name
   */
  getLoginStrategy(platform: string): IAuthLoginStrategy {
    const strategy = this._loginStrategies.get(platform)
    if (!strategy) {
      throw new NotImplementedError(`Login strategy for "${platform}" is not implemented`)
    }
    return strategy
  }

  /**
   * Get all registered platforms
   */
  getRegisteredPlatforms(): {
    integration: string[]
    login: string[]
  } {
    return {
      integration: Array.from(this._integrationStrategies.keys()),
      login: Array.from(this._loginStrategies.keys()),
    }
  }
}

/**
 * Global strategy manager instance
 */
export const authStrategyManager = new AuthStrategyManager()
