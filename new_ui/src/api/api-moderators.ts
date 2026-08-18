import apiClient from '@/lib/axios'
import { getConfig, removeNullAndUndefined } from '@/lib/utils'
import type {
  ChannelModeratorResponse,
  CreateChannelModeratorTokenRequest,
  DirectAddChannelModeratorRequest,
  GrantPlaylistAccessRequest,
  ModeratedChannelResponse,
  ModeratorItemResponse,
  ModeratorPlaylistAccessInfo,
  PlaylistAccessResponse,
  UpdateChannelModeratorRequest,
} from '@/types/moderator'

// ─── Channel Moderators V2 ───────────────────────────────────────────────────

const getBaseUrl = () => {
  const config = getConfig()
  return config.API_URL || config.BACKEND_API_URL || `${config.BACKEND_DOMAIN}/api`
}

export const createChannelModeratorToken = async (
  data: CreateChannelModeratorTokenRequest,
): Promise<ChannelModeratorResponse> => {
  const response = await apiClient(
    `${getBaseUrl()}/channel/moderators/token`,
    {
      method: 'POST',
      withCredentials: true,
      data: removeNullAndUndefined(data),
    },
  )
  return response.data
}

export const addChannelModeratorByUserId = async (
  data: DirectAddChannelModeratorRequest,
): Promise<ChannelModeratorResponse> => {
  const config = getConfig()
  const response = await apiClient(
    `${getBaseUrl()}/channel/moderators/user`,
    {
      method: 'POST',
      withCredentials: true,
      data: removeNullAndUndefined(data),
    },
  )
  return response.data
}

export const claimChannelModeratorToken = async (
  token: string,
): Promise<ChannelModeratorResponse> => {
  const config = getConfig()
  const response = await apiClient(
    `${getBaseUrl()}/channel/moderators/claim`,
    {
      method: 'POST',
      withCredentials: true,
      params: { token },
    },
  )
  return response.data
}

export const updateChannelModerator = async (
  moderatorId: string,
  data: UpdateChannelModeratorRequest,
): Promise<ChannelModeratorResponse> => {
  const config = getConfig()
  const response = await apiClient(
    `${getBaseUrl()}/channel/moderators/${moderatorId}`,
    {
      method: 'PATCH',
      withCredentials: true,
      data: removeNullAndUndefined(data),
    },
  )
  return response.data
}

export const revokeChannelModerator = async (
  moderatorId: string,
): Promise<void> => {
  const config = getConfig()
  await apiClient(
    `${getBaseUrl()}/channel/moderators/${moderatorId}`,
    {
      method: 'DELETE',
      withCredentials: true,
    },
  )
}

export const fetchChannelModerators = async (): Promise<
  ChannelModeratorResponse[]
> => {
  const config = getConfig()
  const response = await apiClient(
    `${getBaseUrl()}/channel/moderators`,
    {
      method: 'GET',
      withCredentials: true,
    },
  )
  return response.data
}

export const fetchModeratedChannels = async (): Promise<
  ModeratedChannelResponse[]
> => {
  const config = getConfig()
  const response = await apiClient(
    `${getBaseUrl()}/channel/moderators/moderated`,
    {
      method: 'GET',
      withCredentials: true,
    },
  ).catch(() => null)

  if (response?.data && Array.isArray(response.data)) {
    return response.data
  }
  return []
}

// ─── Playlist Access Grants ───────────────────────────────────────────────────

export const grantPlaylistAccess = async (
  moderatorId: string,
  data: GrantPlaylistAccessRequest,
): Promise<PlaylistAccessResponse> => {
  const config = getConfig()
  const response = await apiClient(
    `${getBaseUrl()}/channel/moderators/${moderatorId}/playlists`,
    {
      method: 'POST',
      withCredentials: true,
      data: removeNullAndUndefined(data),
    },
  )
  return response.data
}

export const revokePlaylistAccess = async (
  moderatorId: string,
  playlistId: string,
): Promise<void> => {
  const config = getConfig()
  await apiClient(
    `${getBaseUrl()}/channel/moderators/${moderatorId}/playlists/${playlistId}`,
    {
      method: 'DELETE',
      withCredentials: true,
    },
  )
}

export const fetchPlaylistModeratorAccess = async (
  playlistId: string,
  token?: string | null,
): Promise<ModeratorPlaylistAccessInfo | null> => {
  if (
    !playlistId ||
    playlistId === 'undefined' ||
    playlistId === 'null' ||
    !playlistId.trim()
  ) {
    return null
  }
  const config = getConfig()
  const params: Record<string, string> = {}
  if (token) {
    params.token = token
  }

  const response = await apiClient(
    `${config.PLST_API_URL}/${playlistId}/moderators/access`,
    {
      method: 'GET',
      withCredentials: true,
      params,
    },
  ).catch((error) => {
    if (error.response?.status === 403 || error.response?.status === 404) {
      return null
    }
    throw error
  })

  if (!response) return null
  return response.data
}

export const leaveModerator = async (_playlistId?: string): Promise<void> => {
  // In V2, moderators manage channels
}

// ─── Compatibility Aliases for Playlist Settings & Legacy Calls ───────────────

export const createModeratorToken = async (
  _playlistId: string,
  data: any,
): Promise<ModeratorItemResponse> => {
  return await createChannelModeratorToken({
    name: data.name || 'Moderator Token',
    can_control_player: data.permissions?.can_manage_playback ?? true,
    can_manage_all_playlists: data.permissions?.can_manage_settings ?? false,
    expires_at: data.expires_at,
  })
}

export const addModeratorByUserId = async (
  _playlistId: string,
  data: any,
): Promise<ModeratorItemResponse> => {
  return await addChannelModeratorByUserId({
    target_user_id: data.target_user_id,
    name: data.name || 'Moderator',
    can_control_player: data.permissions?.can_manage_playback ?? true,
    can_manage_all_playlists: data.permissions?.can_manage_settings ?? false,
    expires_at: data.expires_at,
  })
}

export const claimModeratorToken = async (
  _playlistIdOrToken: string,
  tokenOrUndefined?: string,
): Promise<ModeratorItemResponse> => {
  const token = tokenOrUndefined || _playlistIdOrToken
  return await claimChannelModeratorToken(token)
}

export const updateModerator = async (
  _playlistId: string,
  moderatorId: string,
  data: any,
): Promise<ModeratorItemResponse> => {
  return await updateChannelModerator(moderatorId, {
    name: data.name,
    can_control_player: data.permissions?.can_manage_playback,
    can_manage_all_playlists: data.permissions?.can_manage_settings,
    expires_at: data.expires_at,
    is_active: data.is_active,
  })
}

export const fetchModerators = async (
  _playlistId?: string,
): Promise<ModeratorItemResponse[]> => {
  return await fetchChannelModerators()
}

export const revokeModerator = async (
  _playlistIdOrModId: string,
  moderatorIdOrUndefined?: string,
): Promise<void> => {
  const modId = moderatorIdOrUndefined || _playlistIdOrModId
  await revokeChannelModerator(modId)
}

export const fetchModeratorAccess = fetchPlaylistModeratorAccess
export const fetchUserModeratedPlaylists = fetchModeratedChannels
