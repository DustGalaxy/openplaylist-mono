// src/features/playlist/lib/trackActions.ts
import {
  ArrowDown,
  ArrowUp,
  Flag,
  Link,
  Play,
  Shield,
  Trash,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type {
  DeleteStatus,
  PlaylistRole,
  Track,
} from '@/stores/playlistStore/types'

export interface TrackCardAction {
  key:
    | 'play'
    | 'remove'
    | 'moveUp'
    | 'moveDown'
    | 'copyLink'
    | 'report'
    | 'block'
  icon: LucideIcon
  label: string
  onClick: (track: Track) => void
}

export interface TrackActionsContext {
  startTrack: (trackId: string) => void
  removeTrack: (trackId: string, reason: DeleteStatus) => void
  reorderStep: (trackId: string, dir: 'up' | 'down') => void
  copyLink: (track: Track) => void
  report: (track: Track) => void
  block: (track: Track) => void
}

export function resolveTrackActions(
  role: PlaylistRole,
  ctx: TrackActionsContext,
): Array<TrackCardAction> {
  const actions: Array<TrackCardAction> = [
    {
      key: 'play',
      icon: Play,
      label: 'play',
      onClick: (t) => ctx.startTrack(t.id),
    },
    {
      key: 'copyLink',
      icon: Link,
      label: 'copyLink',
      onClick: (t) => ctx.copyLink(t),
    },
  ]

  if (role === 'owner' || role === 'operator') {
    actions.push(
      {
        key: 'remove',
        icon: Trash,
        label: 'remove',
        onClick: (t) => ctx.removeTrack(t.id, 'removed'),
      },
      {
        key: 'block',
        icon: Shield,
        label: 'blockRequester',
        onClick: (t) => ctx.block(t),
      },
    )
  }

  if (role === 'viewer') {
    actions.push({
      key: 'report',
      icon: Flag,
      label: 'report',
      onClick: (t) => ctx.report(t),
    })
  }

  return actions
}
