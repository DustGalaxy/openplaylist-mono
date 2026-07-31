import { getMinTier, hasFeature } from '../lib/hasFeature'
import { useFeatures } from './useFeatures'

export function useFeatureGate(key: string) {
  const { data, isLoading } = useFeatures()

  return {
    unlocked: hasFeature(data?.features, key),
    minTier: getMinTier(data?.features, key),
    tier: data?.tier ?? 0,
    isLoading,
  }
}
