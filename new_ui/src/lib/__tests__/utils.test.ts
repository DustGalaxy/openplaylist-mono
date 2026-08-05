import { describe, expect, it } from 'vitest'
import { cn, formatTime, getRandomInt } from '../utils'

describe('lib/utils helper functions', () => {
  it('cn should merge class names correctly with tailwind-merge', () => {
    const result = cn('px-2 py-1', 'bg-red-500', { 'text-white': true, 'hidden': false })
    expect(result).toBe('px-2 py-1 bg-red-500 text-white')
  })

  it('formatTime should format seconds into mm:ss string', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(600)).toBe('10:00')
    expect(formatTime(3599)).toBe('59:59')
  })

  it('getRandomInt should return an integer between 0 and max - 1', () => {
    const max = 10
    for (let i = 0; i < 50; i++) {
      const val = getRandomInt(max)
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(max)
      expect(Number.isInteger(val)).toBe(true)
    }
  })
})
