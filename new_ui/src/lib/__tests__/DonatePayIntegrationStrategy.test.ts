import { describe, expect, it } from 'vitest'
import { DonatePayIntegrationStrategy } from '../strategies/DonatePayIntegrationStrategy'

describe('DonatePayIntegrationStrategy', () => {
  const strategy = new DonatePayIntegrationStrategy()

  it('should return correct integration endpoint', () => {
    expect(strategy.getIntegrationEndpoint()).toBe('/user/integration/donatepay/token')
  })

  it('should format payload with user_key', () => {
    const payload = strategy.formatIntegrationPayload('test_key_123')
    expect(payload).toEqual({ user_key: 'test_key_123' })
  })

  it('should disallow email collision', () => {
    expect(strategy.allowsEmailCollision()).toBe(false)
  })
})
