import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import HostView from './HostView'

vi.mock('../services/index.ts', () => ({
  getWaitlist: vi.fn(),
  getWaitlistPaused: vi.fn(),
}))

import { getWaitlist, getWaitlistPaused } from '../services/index.ts'

const mockGetWaitlist = vi.mocked(getWaitlist)
const mockGetWaitlistPaused = vi.mocked(getWaitlistPaused)

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('HostView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWaitlistPaused.mockResolvedValue(false)
  })

  it('displays "No parties waiting" when waitlist is empty', async () => {
    mockGetWaitlist.mockResolvedValue([])
    renderWithQuery(<HostView />)
    expect(await screen.findByText('No parties waiting')).toBeDefined()
  })

  it('renders party name, party size, and status text', async () => {
    mockGetWaitlist.mockResolvedValue([
      {
        id: '1',
        name: 'Smith',
        party_size: 4,
        phone: '5551234567',
        email: null,
        status: 'waiting',
        position: 1,
        estimated_wait: 25,
        notes: null,
        urgent: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        notified_at: null,
        seated_at: null,
        canceled_at: null,
        token: 'test-token',
      },
    ])
    renderWithQuery(<HostView />)
    expect(await screen.findByText('Smith')).toBeDefined()
    expect(screen.getByText('Party of 4')).toBeDefined()
    expect(screen.getByText('Waiting')).toBeDefined()
  })

  it('shows spinner while loading', () => {
    mockGetWaitlist.mockReturnValue(new Promise(() => {}))
    const { container } = renderWithQuery(<HostView />)
    const skeleton = container.querySelector('[data-testid="skeleton-loader"]')
    expect(skeleton).not.toBeNull()
  })

  it('shows skeleton loader while loading', async () => {
    mockGetWaitlist.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<HostView />)
    const skeleton = await screen.findByTestId('skeleton-loader')
    expect(skeleton).toBeDefined()
  })

  it('shows error panel with retry on waitlist error', async () => {
    mockGetWaitlist.mockRejectedValue(new Error('Network failure'))
    renderWithQuery(<HostView />)
    expect(await screen.findByTestId('error-boundary')).toBeDefined()
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined()
  })

  it('shows error panel with retry on paused query error', async () => {
    mockGetWaitlist.mockResolvedValue([])
    mockGetWaitlistPaused.mockRejectedValue(new Error('Connection lost'))
    renderWithQuery(<HostView />)
    expect(await screen.findByTestId('error-boundary')).toBeDefined()
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined()
  })

  it('shows "Waitlist Paused" banner and hides form when paused', async () => {
    mockGetWaitlistPaused.mockResolvedValue(true)
    mockGetWaitlist.mockResolvedValue([])
    renderWithQuery(<HostView />)
    expect(await screen.findByText('Waitlist Paused')).toBeDefined()
    expect(screen.queryByText('Add Party')).toBeNull()
  })

  it('shows Add Party form and hides banner when resumed', async () => {
    mockGetWaitlistPaused.mockResolvedValue(false)
    mockGetWaitlist.mockResolvedValue([])
    renderWithQuery(<HostView />)
    expect(screen.queryByText('Waitlist Paused')).toBeNull()
    expect(await screen.findByText('Add Party')).toBeDefined()
  })
})

