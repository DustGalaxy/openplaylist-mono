import React from 'react'
import {
  Clock,
  Eye,
  List,
  RefreshCcw,
  Settings,
  ThumbsUp,
  User,
} from 'lucide-react'
import ViewPlayNowCard from './view-track-card'
import Priority from './icons/icon-priority'
import type { ClientPlaylist } from '@/types/playlist'
import AddBar from './addbar'

const InfoCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) => {
  return (
    <div className="bg-level-2 rounded-(--rounded-std) p-2 md:p-3 flex flex-col items-center gap-1 text-center">
      <div className="text-gray-400 flex items-center gap-1">
        {icon}
        <div className="text-xs text-gray-400">{label}</div>
      </div>

      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}

const ViewInfoBar = ({ playlist }: { playlist: ClientPlaylist }) => {
  return (
    <div className="bg-level-1 rounded-(--rounded-std) shadow-lg flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 text-sm font-medium rounded-full ${
              playlist.settings.is_allow_external_requests
                ? 'bg-green-600'
                : 'bg-red-600'
            }`}
          >
            {playlist.settings.is_allow_external_requests
              ? 'Active'
              : 'Inactive'}
          </div>
          <h2 className="text-xl font-semibold">{playlist.name}</h2>
        </div>
        <span className="text-sm text-gray-400">
          {new Date(playlist.updated_at).toLocaleDateString('en-UK', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 line-clamp-1">
        {playlist.description || 'No description provided.'}
      </p>

      {/* Preferences */}
      <div>
        <h3 className="text-sm uppercase tracking-wide text-gray-400 mb-3">
          Preferences
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4 mb-3">
          <InfoCard
            icon={<Settings size={16} />}
            label="Mode"
            value={playlist.settings.mode}
          />
          <InfoCard
            icon={<Eye size={16} />}
            label="Min views"
            value={playlist.settings.min_views}
          />
          <InfoCard
            icon={<ThumbsUp size={16} />}
            label="Min likes"
            value={playlist.settings.min_likes}
          />
          <InfoCard
            icon={<Clock size={16} />}
            label="Max duration"
            value={`${playlist.settings.max_duration} sec`}
          />
          <InfoCard
            icon={<RefreshCcw size={16} />}
            label="Track CD"
            value={`${playlist.settings.track_cooldown}m`}
          />
          <InfoCard
            icon={<User size={16} />}
            label="User CD"
            value={`${playlist.settings.user_cooldown}m`}
          />
          <InfoCard
            icon={<List size={16} />}
            label="Max size"
            value={playlist.settings.max_playlist_size || '∞'}
          />
          <InfoCard
            icon={<Priority width={16} height={16} />}
            label="Priority mode"
            value={playlist.settings.cost_mode}
          />
        </div>

        <div className="mb-3">
          <h3 className="text-sm uppercase tracking-wide text-gray-400 mb-3">
            Add a track
          </h3>
          <AddBar playlistId={playlist.id} />
        </div>

        <div className="mb-3">
          <h3 className="text-sm uppercase tracking-wide text-gray-400 mb-3">
            Now playing
          </h3>
          {playlist.now_playing ? (
            <ViewPlayNowCard
              track={playlist.now_playing}
              settings={playlist.settings}
            />
          ) : (
            <div className="text-gray-400 text-sm uppercase tracking-wide">
              No track is currently playing.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default ViewInfoBar
