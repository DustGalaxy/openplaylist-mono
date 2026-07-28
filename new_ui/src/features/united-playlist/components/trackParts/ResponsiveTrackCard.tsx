import TrackCard from './TrackCard'
import MiniTrackCard from './MiniTrackCard'
import type { Track } from '@/types/playlist'
import useWindowDimensions from '@/hooks/useWindowDimensions'

const MOBILE_BREAKPOINT = 768

export default function ResponsiveTrackCard({
  track,
  group,
  isDragging,
  isNowPlaying,
}: {
  track: Track
  group?: 'vip' | 'regular' | 'background'
  isDragging?: boolean
  isNowPlaying?: boolean
}) {
  const { width } = useWindowDimensions()
  const isMobile = width <= MOBILE_BREAKPOINT

  return (
    <div className="">
      {isMobile ? (
        <MiniTrackCard
          track={track}
          group={group}
          isDragging={isDragging}
          isNowPlaying={isNowPlaying}
        />
      ) : (
        <TrackCard
          track={track}
          group={group}
          isDragging={isDragging}
          isNowPlaying={isNowPlaying}
        />
      )}
    </div>
  )
}
