import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import GuestStatus from './GuestStatus'

vi.mock('../services/index.ts', () => ({
  getPartyByToken: vi.fn(),
  confirmWaiting: vi.fn(),
  cancelParty: vi.fn(),
}))

import { getPartyByToken, confirmWaiting, cancelParty } from '../services/index.ts'

const mockGetPartyByToken = vi.mocked(getPartyByToken)
const mockConfirmWaiting = vi.mocked(confirmWaiting)
const mockCancelParty = vi.mocked(cancelParty)

const testParty = {
  id: '1',
  name: 'Smith',
  party_size: 4,
  phone: '5551234567',
  email: null,
  status: 'waiting' as const,
  position: 2,
  estimated_wait: 25,
  notes: null,
  urgent: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  notified_at: null,
  seated_at: null,
  canceled_at: null,
  token: 'abc123',
}

function renderWithQuery(_component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/status/abc123']}>
        <Routes>
          <Route path="/status/:token" element={<GuestStatus />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GuestStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows spinner while loading', () => {
    mockGetPartyByToken.mockReturnValue(new Promise(() => {}))
    const { container } = renderWithQuery(<GuestStatus />)
    const skeleton = container.querySelector('[data-testid="skeleton-loader"]')
    expect(skeleton).not.toBeNull()
  })

  it('shows skeleton loader while loading', async () => {
    mockGetPartyByToken.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<GuestStatus />)
    const skeleton = await screen.findByTestId('skeleton-loader')
    expect(skeleton).toBeDefined()
  })

  it('shows error panel with retry on network error', async () => {
    mockGetPartyByToken.mockRejectedValue(new Error('Network failure'))
    renderWithQuery(<GuestStatus />)
    expect(await screen.findByTestId('error-boundary')).toBeDefined()
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined()
    expect(screen.getByText('Unable to load your party')).toBeDefined()
  })

  it('renders party info for valid party', async () => {
    mockGetPartyByToken.mockResolvedValue(testParty)
    renderWithQuery(<GuestStatus />)
    expect(await screen.findByText('Smith')).toBeDefined()
    expect(screen.getByText('Party size')).toBeDefined()
    expect(screen.getByText('4')).toBeDefined()
    expect(screen.getByText('#2')).toBeDefined()
    expect(screen.getByText('25 min')).toBeDefined()
    expect(screen.getByText('Waiting')).toBeDefined()
  })

  it('shows "Party not found" for invalid token', async () => {
    mockGetPartyByToken.mockResolvedValue(null)
    renderWithQuery(<GuestStatus />)
    expect(await screen.findByText('Party not found')).toBeDefined()
    expect(screen.queryByText('Smith')).toBeNull()
  })

  it('shows confirm button when status is waiting', async () => {
    mockGetPartyByToken.mockResolvedValue(testParty)
    renderWithQuery(<GuestStatus />)
    expect(await screen.findByText('Confirm I\'m Waiting')).toBeDefined()
  })

  it('shows cancel button when status is waiting', async () => {
    mockGetPartyByToken.mockResolvedValue(testParty)
    renderWithQuery(<GuestStatus />)
    expect(await screen.findByText('Cancel My Spot')).toBeDefined()
  })

  it('confirms and shows success when confirm button is clicked', async () => {
    mockGetPartyByToken.mockResolvedValue(testParty)
    mockConfirmWaiting.mockResolvedValue({ ...testParty, status: 'seated' })
    const spy = vi.spyOn(window, 'alert')
    renderWithQuery(<GuestStatus />)
    const confirmBtn = await screen.findByText('Confirm I\'m Waiting')
    fireEvent.click(confirmBtn)
    await waitFor(() => {
      expect(mockConfirmWaiting).toHaveBeenCalledWith('abc123')
    })
    expect(spy).toHaveBeenCalledWith('You have been confirmed! Please head to the restaurant.')
    spy.mockRestore()
  })

  it('cancels and shows confirmation when cancel button is clicked', async () => {
    mockGetPartyByToken.mockResolvedValue(testParty)
    mockCancelParty.mockResolvedValue({ ...testParty, status: 'canceled' })
    const spy = vi.spyOn(window, 'alert')
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderWithQuery(<GuestStatus />)
    const cancelBtn = await screen.findByText('Cancel My Spot')
    fireEvent.click(cancelBtn)
    await waitFor(() => {
      expect(mockCancelParty).toHaveBeenCalledWith('abc123')
    })
    expect(spy).toHaveBeenCalledWith('Your party has been canceled.')
    spy.mockRestore()
    confirmSpy.mockRestore()
  })

  it('hides confirm and cancel buttons when status is seated', async () => {
    mockGetPartyByToken.mockResolvedValue({ ...testParty, status: 'seated' })
    renderWithQuery(<GuestStatus />)
    expect(screen.queryByText('Confirm I\'m Waiting')).toBeNull()
    expect(screen.queryByText('Cancel My Spot')).toBeNull()
  })

  it('hides confirm and cancel buttons when status is canceled', async () => {
    mockGetPartyByToken.mockResolvedValue({ ...testParty, status: 'canceled' })
    renderWithQuery(<GuestStatus />)
    expect(screen.queryByText('Confirm I\'m Waiting')).toBeNull()
    expect(screen.queryByText('Cancel My Spot')).toBeNull()
  })

  it('hides confirm and cancel buttons when status is no_show', async () => {
    mockGetPartyByToken.mockResolvedValue({ ...testParty, status: 'no_show' })
    renderWithQuery(<GuestStatus />)
    expect(screen.queryByText('Confirm I\'m Waiting')).toBeNull()
    expect(screen.queryByText('Cancel My Spot')).toBeNull()
  })

  it('shows confirm and cancel buttons when status is notified', async () => {
    mockGetPartyByToken.mockResolvedValue({ ...testParty, status: 'notified' })
    renderWithQuery(<GuestStatus />)
    expect(await screen.findByText('Confirm I\'m Waiting')).toBeDefined()
    expect(screen.getByText('Cancel My Spot')).toBeDefined()
  })
})
