// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { BotSettingsModal } from '../components/BotSettingsModal'
import * as apiUser from '@/api/api-user'
import { toast } from 'sonner'
import type { Integration } from '@/types/user'

vi.mock('@/lib/i18n/featureTranslation', () => ({
  useFeatureTranslation: () => ({
    t: (key: string, fallback?: string, options?: Record<string, any>) => {
      const translations: Record<string, string> = {
        'settings.botSettings.title': 'Настройки бота',
        'settings.botSettings.save': 'Сохранить',
        'settings.botSettings.saving': 'Сохранение...',
        'settings.botSettings.cancel': 'Отмена',
        'settings.botSettings.saved': 'Настройки бота успешно сохранены',
        'settings.botSettings.saveFailed': 'Не удалось сохранить настройки бота',
        'settings.botSettings.twitch.prefix.label': 'Префикс команд',
        'settings.botSettings.twitch.prefix.hint':
          'Символ(ы), который(е) будут использоваться как префикс для команд бота в чате Twitch.',
        'settings.botSettings.twitch.prefix.placeholder': 'Введите префикс команд',
      }
      return translations[key] || fallback || key
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

const mockIntegration: Integration = {
  id: 'int-1',
  platform: 'twitch',
  platform_user_id: '12345',
  platform_username: 'streamer_bot',
  is_dead: false,
  bot_connection: true,
  bot_settings: {
    prefix: '!',
  },
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('BotSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders trigger button and does not render if platform has no fields', () => {
    const onSaved = vi.fn()
    const { rerender } = render(
      <BotSettingsModal
        integration={mockIntegration}
        platformName="Twitch"
        platformIcon={<span data-testid="platform-icon">T</span>}
        onSaved={onSaved}
      />,
    )

    const triggerBtn = screen.getByRole('button', { name: /настройки бота/i })
    expect(triggerBtn).toBeDefined()
    expect(triggerBtn.getAttribute('title')).toBe('Настройки бота')

    // Platform without fields should return null
    rerender(
      <BotSettingsModal
        integration={{ ...mockIntegration, platform: 'donationalerts' }}
        platformName="DonationAlerts"
        platformIcon={<span>DA</span>}
        onSaved={onSaved}
      />,
    )
    expect(screen.queryByRole('button', { name: /настройки бота/i })).toBeNull()
  })

  it('opens modal and displays localized content and fields', () => {
    const onSaved = vi.fn()
    render(
      <BotSettingsModal
        integration={mockIntegration}
        platformName="Twitch"
        platformIcon={<span data-testid="platform-icon">T</span>}
        onSaved={onSaved}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /настройки бота/i }))

    expect(screen.getByText('Настройки бота — Twitch')).toBeDefined()
    expect(screen.getByText('@streamer_bot')).toBeDefined()
    expect(screen.getByText('Префикс команд')).toBeDefined()
    expect(
      screen.getByText(
        'Символ(ы), который(е) будут использоваться как префикс для команд бота в чате Twitch.',
      ),
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /сохранить/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /отмена/i })).toBeDefined()
  })

  it('handles input changes and saves settings successfully', async () => {
    const onSaved = vi.fn()
    const updateSpy = vi
      .spyOn(apiUser, 'updateBotSettings')
      .mockResolvedValue({ prefix: '?' })

    render(
      <BotSettingsModal
        integration={mockIntegration}
        platformName="Twitch"
        platformIcon={<span data-testid="platform-icon">T</span>}
        onSaved={onSaved}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /настройки бота/i }))

    const input = screen.getByDisplayValue('!')
    fireEvent.change(input, { target: { value: '?' } })
    expect((input as HTMLInputElement).value).toBe('?')

    const saveBtn = screen.getByRole('button', { name: /сохранить/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('twitch', '12345', { prefix: '?' })
      expect(onSaved).toHaveBeenCalledWith({
        ...mockIntegration,
        bot_settings: { prefix: '?' },
      })
      expect(toast.success).toHaveBeenCalledWith('Настройки бота успешно сохранены')
    })
  })

  it('shows error toast when save fails', async () => {
    const onSaved = vi.fn()
    vi.spyOn(apiUser, 'updateBotSettings').mockRejectedValue(new Error('Network error'))

    render(
      <BotSettingsModal
        integration={mockIntegration}
        platformName="Twitch"
        platformIcon={<span data-testid="platform-icon">T</span>}
        onSaved={onSaved}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /настройки бота/i }))

    const saveBtn = screen.getByRole('button', { name: /сохранить/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Не удалось сохранить настройки бота')
    })
  })
})
