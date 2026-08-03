import type { StateCreator } from 'zustand'
import type { PlaylistRulesSlice, StoreState } from '@/types/playlist'
import {
  createChatRole,
  deleteChatRole,
  updateChatRole as updateChatRoleApi,
} from '@/api/settings/chat-roles'
import {
  createDonationRule,
  deleteDonationRule,
  updateDonation as updateDonationApi,
} from '@/api/settings/donation'
import {
  initPlatformContent,
  updateContent as updateContentApi,
} from '@/api/settings/content'
import { blockUser, unBlockUser } from '@/api/api-playlist'

const itemTimers: Record<string, ReturnType<typeof setTimeout>> = {}
function scheduleItemPatch(key: string, fn: () => Promise<any>, delay = 2000) {
  if (itemTimers[key]) clearTimeout(itemTimers[key])
  itemTimers[key] = setTimeout(() => {
    delete itemTimers[key]
    fn().catch((e) => console.error('[settings] item patch failed', key, e))
  }, delay)
}

export const createPlaylistRulesSlice: StateCreator<
  StoreState,
  [],
  [],
  Pick<StoreState, keyof PlaylistRulesSlice>
> = (set, get) => ({
  addChatRole: async (playlistId, data) => {
    const role = await createChatRole({
      playlist_id: playlistId,
      data: { ...data, playlist_id: playlistId },
    })
    if (role)
      get().updatePlaylistData(playlistId, (p) => ({
        ...p,
        chat_rules: [...p.chat_rules, role],
      }))
    return role
  },

  updateChatRole: (playlistId, role) => {
    get().updatePlaylistData(playlistId, (p) => ({
      ...p,
      chat_rules: p.chat_rules.map((r) => (r.id === role.id ? role : r)),
    }))
    scheduleItemPatch(`chatRole:${role.id}`, () =>
      updateChatRoleApi({ playlist_id: playlistId, data: role }),
    )
  },

  removeChatRole: async (playlistId, roleId) => {
    const success = await deleteChatRole({
      playlist_id: playlistId,
      role_id: roleId,
    })
    if (success)
      get().updatePlaylistData(playlistId, (p) => ({
        ...p,
        chat_rules: p.chat_rules.filter((r) => r.id !== roleId),
      }))
    return success
  },

  addDonationRule: async (playlistId, data) => {
    const rule = await createDonationRule({
      playlist_id: playlistId,
      data: { ...data, playlist_id: playlistId },
    })
    if (rule)
      get().updatePlaylistData(playlistId, (p) => ({
        ...p,
        donation_rules: [...p.donation_rules, rule],
      }))
    return rule
  },

  updateDonationRule: (playlistId, rule) => {
    get().updatePlaylistData(playlistId, (p) => ({
      ...p,
      donation_rules: p.donation_rules.map((r) =>
        r.id === rule.id ? rule : r,
      ),
    }))
    scheduleItemPatch(`donationRule:${rule.id}`, () =>
      updateDonationApi({ playlist_id: playlistId, data: rule }),
    )
  },

  removeDonationRule: async (playlistId, ruleId) => {
    const success = await deleteDonationRule({
      playlist_id: playlistId,
      donation_id: ruleId,
    })
      .then(() => true)
      .catch(() => false)
    if (success)
      get().updatePlaylistData(playlistId, (p) => ({
        ...p,
        donation_rules: p.donation_rules.filter((r) => r.id !== ruleId),
      }))
    return success
  },

  initContentSettings: async (playlistId, platform) => {
    const settings = await initPlatformContent({
      playlist_id: playlistId,
      platform,
    })
    if (settings)
      get().updatePlaylistData(playlistId, (p) => ({
        ...p,
        content_settings: [...p.content_settings, settings],
      }))
    return settings
  },

  updateContentSettings: (playlistId, settings) => {
    get().updatePlaylistData(playlistId, (p) => ({
      ...p,
      content_settings: p.content_settings.map((c) =>
        c.id === settings.id ? settings : c,
      ),
    }))
    scheduleItemPatch(`contentSettings:${settings.id}`, () =>
      updateContentApi({ playlist_id: playlistId, data: settings }),
    )
  },

  blockUserRule: async (playlistId, triggerType, triggerValue, platform) => {
    const res = await blockUser(playlistId, triggerType, triggerValue, platform)
    if (res)
      get().updatePlaylistData(playlistId, (p) => ({
        ...p,
        block_list: [...p.block_list, res],
      }))
    return !!res
  },

  unblockUserRule: async (playlistId, blockId) => {
    const success = await unBlockUser(playlistId, blockId)
    if (success)
      get().updatePlaylistData(playlistId, (p) => ({
        ...p,
        block_list: p.block_list.filter((b) => b.id !== blockId),
      }))
    return success
  },
})
