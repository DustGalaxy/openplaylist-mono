// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { ModeratorsTab } from '../components/ModeratorsTab'
import * as apiModerators from '@/api/api-moderators'
import * as apiPlaylist from '@/api/api-playlist'

vi.mock('@/lib/i18n/featureTranslation', () => ({
  useFeatureTranslation: () => ({
    t: (key: string, fallback?: string, options?: Record<string, any>) => {
      if (key === 'settings.moderators.channelOwner' && options?.name) {
        return `Канал: ${options.name}`
      }
      if (key === 'settings.moderators.createModal.selectedCount' && options?.count !== undefined) {
        return `Выбрано: ${options.count}`
      }
      return fallback || key
    },
    tc: (key: string, fallback?: string) => fallback || key,
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('ModeratorsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(apiModerators, 'fetchChannelModerators').mockResolvedValue([])
    vi.spyOn(apiModerators, 'fetchModeratedChannels').mockResolvedValue([])
    vi.spyOn(apiPlaylist, 'fetchMyPlaylists').mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders header toolbar and empty state', async () => {
    render(<ModeratorsTab />)

    expect(screen.getByText('Модерация канала (V2)')).toBeDefined()
    expect(screen.getByRole('button', { name: /активировать токен/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /создать ссылку-токен/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /добавить по id/i })).toBeDefined()

    await waitFor(() => {
      expect(
        screen.getByText('У вас пока нет назначенных модераторов на канале.'),
      ).toBeDefined()
    })
  })

  it('renders moderated channels and moderators list when loaded', async () => {
    vi.spyOn(apiModerators, 'fetchChannelModerators').mockResolvedValue([
      {
        id: 'mod-1',
        token: 'token-abc-123',
        name: 'Chat Mod',
        user_id: 'u-1',
        user_name: 'alice',
        can_control_player: true,
        can_manage_all_playlists: false,
        playlist_access: [{ id: 'pa-1', playlist_id: 'pl-1', playlist_name: 'Chill', can_manage_tracks: true, can_manage_settings: false }],
        created_at: '2026-01-01T00:00:00Z',
      },
    ] as any)

    vi.spyOn(apiModerators, 'fetchModeratedChannels').mockResolvedValue([
      {
        moderator_id: 'm-1',
        owner_id: 'owner-1',
        owner_name: 'BobStreamer',
        is_active: true,
        can_control_player: true,
        can_manage_all_playlists: true,
        playlist_access: [],
      },
    ] as any)

    render(<ModeratorsTab />)

    await waitFor(() => {
      expect(screen.getByText('Каналы, на которых вы модератор:')).toBeDefined()
      expect(screen.getByText('Канал: BobStreamer')).toBeDefined()
      expect(screen.getByText('Chat Mod')).toBeDefined()
      expect(screen.getByText('@alice')).toBeDefined()
      expect(screen.getByText('Привязан')).toBeDefined()
    })
  })

  it('opens and closes the claim token modal', () => {
    render(<ModeratorsTab />)

    const claimBtn = screen.getByRole('button', { name: /активировать токен/i })
    fireEvent.click(claimBtn)

    expect(screen.getByText('Активировать токен модератора')).toBeDefined()
    expect(screen.getByPlaceholderText('Вставьте токен или ссылку...')).toBeDefined()

    const cancelBtn = screen.getByRole('button', { name: /отмена/i })
    fireEvent.click(cancelBtn)

    expect(screen.queryByText('Вставьте токен или ссылку...')).toBeNull()
  })

  it('opens the create token modal', () => {
    render(<ModeratorsTab />)

    const createBtn = screen.getByRole('button', { name: /создать ссылку-токен/i })
    fireEvent.click(createBtn)

    expect(screen.getByText('Создать ссылку-токен модератора')).toBeDefined()
    expect(screen.getByPlaceholderText('Например: Модератор чата')).toBeDefined()
  })

  it('opens the direct add modal', () => {
    render(<ModeratorsTab />)

    const addBtn = screen.getByRole('button', { name: /добавить по id/i })
    fireEvent.click(addBtn)

    expect(screen.getByText('Добавить модератора по ID')).toBeDefined()
    expect(screen.getByPlaceholderText('например, 123e4567-e89b-12d3-a456-426614174000')).toBeDefined()
  })
})
