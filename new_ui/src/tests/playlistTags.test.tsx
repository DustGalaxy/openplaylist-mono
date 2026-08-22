// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { TagInput } from '@/components/ui/tag-input'
import { createNewPlaylist, getPublicPlaylists, fetchPopularTags } from '@/api/api-playlist'
import apiClient from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: vi.fn(),
}))

if (typeof window !== 'undefined') {
  ;(window as any).appConfig = {
    PLST_API_URL: 'http://localhost:8000/playlist',
  }
}

describe('Playlist Tags API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('createNewPlaylist passes tags in request payload', async () => {
    const mockData = { id: 'pl-1', name: 'Chill Beats', tags: ['chill', 'lofi'] }
    ;(apiClient as any).mockResolvedValueOnce({ data: mockData })

    const result = await createNewPlaylist('Chill Beats', 'Description', ['chill', 'lofi'])

    expect(apiClient).toHaveBeenCalledWith(
      'http://localhost:8000/playlist',
      expect.objectContaining({
        method: 'POST',
        data: {
          name: 'Chill Beats',
          description: 'Description',
          tags: ['chill', 'lofi'],
        },
      }),
    )
    expect(result).toEqual(mockData)
  })

  it('getPublicPlaylists sends query and tag params correctly', async () => {
    const mockList = [{ id: 'pl-1', name: 'Synthwave', tags: ['synthwave'] }]
    ;(apiClient as any).mockResolvedValueOnce({ data: mockList })

    const result = await getPublicPlaylists('synth', '#synthwave')

    expect(apiClient).toHaveBeenCalledWith(
      'http://localhost:8000/playlist',
      expect.objectContaining({
        method: 'GET',
        params: { query: 'synth', tag: 'synthwave' },
      }),
    )
    expect(result).toEqual(mockList)
  })

  it('fetchPopularTags retrieves popular tags list', async () => {
    const mockPopular = [
      { tag: 'chill', count: 12 },
      { tag: 'lofi', count: 8 },
    ]
    ;(apiClient as any).mockResolvedValueOnce({ data: mockPopular })

    const result = await fetchPopularTags(10)

    expect(apiClient).toHaveBeenCalledWith(
      'http://localhost:8000/playlist/tags/popular',
      expect.objectContaining({
        method: 'GET',
        params: { limit: 10 },
      }),
    )
    expect(result).toEqual(mockPopular)
  })
})

describe('TagInput component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders existing tags as chips', () => {
    const onChange = vi.fn()
    render(<TagInput tags={['lofi', 'chill']} onChange={onChange} label="Tags" />)

    expect(screen.getByText('#lofi')).toBeDefined()
    expect(screen.getByText('#chill')).toBeDefined()
    expect(screen.getByText('2/10')).toBeDefined()
  })

  it('adds a new cleaned tag on Enter', () => {
    const onChange = vi.fn()
    render(<TagInput tags={['lofi']} onChange={onChange} placeholder="Add tag..." />)

    const input = screen.getByPlaceholderText('Add tag...')
    fireEvent.change(input, { target: { value: '  #Synthwave  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(['lofi', 'synthwave'])
  })

  it('removes a tag when close button is clicked', () => {
    const onChange = vi.fn()
    render(<TagInput tags={['lofi', 'chill']} onChange={onChange} />)

    const removeBtn = screen.getByLabelText('Remove tag lofi')
    fireEvent.click(removeBtn)

    expect(onChange).toHaveBeenCalledWith(['chill'])
  })

  it('does not add duplicate tags', () => {
    const onChange = vi.fn()
    render(<TagInput tags={['lofi']} onChange={onChange} placeholder="Add tag..." />)

    const input = screen.getByPlaceholderText('Add tag...')
    fireEvent.change(input, { target: { value: '#LOFI' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).not.toHaveBeenCalled()
  })
})
