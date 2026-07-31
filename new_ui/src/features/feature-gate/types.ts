export interface FeatureFlagStatus {
  key: string
  min_tier: number
  unlocked: boolean
}

export interface FeaturesResponse {
  tier: number
  features: Array<FeatureFlagStatus>
}
