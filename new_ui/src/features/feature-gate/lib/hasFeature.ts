import type { FeatureFlagStatus } from '../types'

export function hasFeature(
  features: Array<FeatureFlagStatus> | undefined,
  key: string,
): boolean {
  return features?.find((f) => f.key === key)?.unlocked ?? false
}

export function getMinTier(
  features: Array<FeatureFlagStatus> | undefined,
  key: string,
): number | null {
  return features?.find((f) => f.key === key)?.min_tier ?? null
}
