/**
 * Auth Strategy Registration Module
 * This module registers all available authentication strategies
 * Similar to the Python decorator pattern in the example:
 *
 * @manager.register('twitch')
 * class TwitchStrategy:
 *    ...
 */

import { authStrategyManager } from './authStrategyManager'
import { TwitchAuthStrategy } from './strategies/TwitchAuthStrategy'
import { DaAuthStrategy } from './strategies/DaAuthStrategy'
import { GoogleAuthStrategy } from './strategies/GoogleAuthStrategy'


/**
 * Initialize and register all available auth strategies
 * Call this function once during app initialization
 */
export function registerAuthStrategies(): void {
  const twitchStrategy = new TwitchAuthStrategy()
  const daStrategy = new DaAuthStrategy()
  const googleStrategy = new GoogleAuthStrategy()


  // Register Twitch strategy
  authStrategyManager.registerIntegrationStrategy('twitch', twitchStrategy)
  authStrategyManager.registerLoginStrategy('twitch', twitchStrategy)

  // Register donationalerts strategy
  authStrategyManager.registerIntegrationStrategy('donationalerts', daStrategy)
  authStrategyManager.registerLoginStrategy('donationalerts', daStrategy)

  // Register google strategy
  authStrategyManager.registerIntegrationStrategy('google', googleStrategy)
  authStrategyManager.registerLoginStrategy('google', googleStrategy)

  console.log(
    'Auth strategies registered:',
    authStrategyManager.getRegisteredPlatforms(),
  )
}

/**
 * Example of how to add a new platform:
 *
 * 1. Create a new strategy file (e.g., src/lib/strategies/YouTubeAuthStrategy.ts)
 * 2. Implement the IAuthLoginStrategy interface
 * 3. Add registration in this file:
 *
 * export class YouTubeAuthStrategy implements IAuthLoginStrategy { ... }
 *
 * In registerAuthStrategies():
 * const youtubeStrategy = new YouTubeAuthStrategy()
 * authStrategyManager.registerIntegrationStrategy('youtube', youtubeStrategy)
 * authStrategyManager.registerLoginStrategy('youtube', youtubeStrategy)
 */
