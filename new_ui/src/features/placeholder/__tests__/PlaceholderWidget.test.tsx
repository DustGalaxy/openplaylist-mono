// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { PlaceholderWidget } from '../components/PlaceholderWidget'
import { Wrench } from 'lucide-react'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: Record<string, string>) => {
      if (options?.name) return `Ми активно працюємо над розділом "${options.name}". Він стане доступний у найближчих оновленнях!`
      return fallback || key
    },
  }),
}))

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

describe('PlaceholderWidget', () => {
  it('renders default title and badge correctly', () => {
    render(<PlaceholderWidget />)

    expect(screen.getByText("Скоро з'явиться")).toBeDefined()
    expect(screen.getByText('Функція в розробці')).toBeDefined()
  })

  it('renders custom featureName and description', () => {
    render(
      <PlaceholderWidget
        featureName="История заказов"
        description="Раздел будет открыт совсем скоро"
      />,
    )

    expect(screen.getByText('История заказов')).toBeDefined()
    expect(screen.getByText('Раздел будет открыт совсем скоро')).toBeDefined()
  })

  it('renders custom icon and status tag', () => {
    render(
      <PlaceholderWidget
        featureName="Плейлисты"
        icon={Wrench}
        statusTag="v2.0"
      />,
    )

    expect(screen.getByText('v2.0')).toBeDefined()
  })

  it('renders highlights list when provided', () => {
    const highlights = ['Фильтр по дате', 'Экспорт в CSV']
    render(
      <PlaceholderWidget
        featureName="Аналитика"
        highlights={highlights}
      />,
    )

    expect(screen.getByText('Фильтр по дате')).toBeDefined()
    expect(screen.getByText('Экспорт в CSV')).toBeDefined()
  })

  it('renders action link when actionLink is provided', () => {
    render(
      <PlaceholderWidget
        featureName="Аналитика"
        actionLink="/"
        actionText="На главную"
      />,
    )

    const link = screen.getByRole('link', { name: /на главную/i })
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('/')
  })
})
