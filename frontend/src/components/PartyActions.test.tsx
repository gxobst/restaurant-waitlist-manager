import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PartyActions from './PartyActions'
import type { Party } from '../types/index.ts'

const mockSetLastAction = vi.fn()
const mockAddToast = vi.fn()

vi.mock('../services/index.ts', () => ({
  updateParty: vi.fn(),
}))

vi.mock('../store/appStore.ts', () => ({
  useAppStore: vi.fn((selector: (s: { setLastAction: typeof mockSetLastAction; addToast: typeof mockAddToast }) => unknown) =>
    selector({ setLastAction: mockSetLastAction, addToast: mockAddToast })
  ),
}))

import { updateParty } from '../services/index.ts'

const mockUpdateParty = vi.mocked(updateParty)

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    id: '1',
    name: 'Smith',
    party_size: 4,
    phone: '5551234567',
    email: 'smith@example.com',
    status: 'waiting',
    position: 1,
    estimated_wait: 15,
    notes: null,
    urgent: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    notified_at: null,
    seated_at: null,
    canceled_at: null,
    token: 'test-token',
    ...overrides,
  }
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('PartyActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateParty.mockResolvedValue(makeParty())
  })

  it('renders all four action buttons', () => {
    renderWithQuery(<PartyActions party={makeParty()} />)
    expect(screen.getByRole('button', { name: /notify/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /seat/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /mark urgent/i })).toBeDefined()
  })

  it('calls updateParty with status "notified" when Notify is clicked', async () => {
    renderWithQuery(<PartyActions party={makeParty()} />)
    await screen.findByRole('button', { name: /notify/i })
    await screen.getByRole('button', { name: /notify/i }).click()
    await waitFor(() => {
      expect(mockUpdateParty).toHaveBeenCalledWith('1', { status: 'notified' })
    })
  })

  it('calls updateParty with status "seated" when Seat is clicked', async () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'notified' })} />)
    await screen.findByRole('button', { name: /seat/i })
    await screen.getByRole('button', { name: /seat/i }).click()
    await waitFor(() => {
      expect(mockUpdateParty).toHaveBeenCalledWith('1', { status: 'seated' })
    })
  })

  it('calls updateParty with status "canceled" when Cancel is clicked', async () => {
    renderWithQuery(<PartyActions party={makeParty()} />)
    await screen.findByRole('button', { name: /cancel/i })
    await screen.getByRole('button', { name: /cancel/i }).click()
    await waitFor(() => {
      expect(mockUpdateParty).toHaveBeenCalledWith('1', { status: 'canceled' })
    })
  })

  it('calls updateParty with urgent toggle when Mark Urgent is clicked', async () => {
    renderWithQuery(<PartyActions party={makeParty({ urgent: false })} />)
    await screen.findByRole('button', { name: /mark urgent/i })
    await screen.getByRole('button', { name: /mark urgent/i }).click()
    await waitFor(() => {
      expect(mockUpdateParty).toHaveBeenCalledWith('1', { urgent: true })
    })
  })

  it('calls updateParty with urgent false when toggling from urgent', async () => {
    renderWithQuery(<PartyActions party={makeParty({ urgent: true })} />)
    await screen.findByRole('button', { name: /mark urgent/i })
    await screen.getByRole('button', { name: /mark urgent/i }).click()
    await waitFor(() => {
      expect(mockUpdateParty).toHaveBeenCalledWith('1', { urgent: false })
    })
  })

  it('disables Notify when party status is seated', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'seated' })} />)
    expect(screen.getByRole('button', { name: /notify/i })).toBeDisabled()
  })

  it('disables Notify when party status is canceled', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'canceled' })} />)
    expect(screen.getByRole('button', { name: /notify/i })).toBeDisabled()
  })

  it('disables Notify when party status is no_show', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'no_show' })} />)
    expect(screen.getByRole('button', { name: /notify/i })).toBeDisabled()
  })

  it('enables Notify when party status is waiting', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'waiting' })} />)
    expect(screen.getByRole('button', { name: /notify/i })).toBeEnabled()
  })

  it('enables Notify when party status is notified', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'notified' })} />)
    expect(screen.getByRole('button', { name: /notify/i })).toBeEnabled()
  })

  it('disables Seat when party status is waiting', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'waiting' })} />)
    expect(screen.getByRole('button', { name: /seat/i })).toBeDisabled()
  })

  it('disables Seat when party status is canceled', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'canceled' })} />)
    expect(screen.getByRole('button', { name: /seat/i })).toBeDisabled()
  })

  it('disables Seat when party status is no_show', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'no_show' })} />)
    expect(screen.getByRole('button', { name: /seat/i })).toBeDisabled()
  })

  it('enables Seat when party status is notified', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'notified' })} />)
    expect(screen.getByRole('button', { name: /seat/i })).toBeEnabled()
  })

  it('disables Cancel when party status is seated', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'seated' })} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })

  it('disables Cancel when party status is no_show', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'no_show' })} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
  })

  it('enables Cancel when party status is waiting', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'waiting' })} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeEnabled()
  })

  it('enables Cancel when party status is notified', () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'notified' })} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeEnabled()
  })

  it('calls onSeat callback when Seat is clicked and onSeat is provided', async () => {
    const onSeat = vi.fn()
    renderWithQuery(<PartyActions party={makeParty({ status: 'notified' })} onSeat={onSeat} />)
    await screen.findByRole('button', { name: /seat/i })
    await screen.getByRole('button', { name: /seat/i }).click()
    await waitFor(() => {
      expect(onSeat).toHaveBeenCalledWith(makeParty({ status: 'notified' }))
    })
    expect(mockUpdateParty).not.toHaveBeenCalled()
  })

  it('does not call updateParty when onSeat is provided', async () => {
    const onSeat = vi.fn()
    renderWithQuery(<PartyActions party={makeParty({ status: 'notified' })} onSeat={onSeat} />)
    await screen.findByRole('button', { name: /seat/i })
    await screen.getByRole('button', { name: /seat/i }).click()
    await waitFor(() => {
      expect(mockUpdateParty).not.toHaveBeenCalled()
    })
  })

  it('Mark Urgent is never disabled for any status', () => {
    const statuses = ['waiting', 'notified', 'seated', 'canceled', 'no_show'] as const
    for (const status of statuses) {
      cleanup()
      renderWithQuery(<PartyActions party={makeParty({ status })} />)
      expect(screen.getByRole('button', { name: /mark urgent/i })).toBeEnabled()
    }
  })

  it('disables all buttons while mutation is in flight', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolve!: (value: any) => void
    mockUpdateParty.mockImplementation(() => new Promise((r) => { resolve = r }))
    renderWithQuery(<PartyActions party={makeParty()} />)

    await screen.getByRole('button', { name: /notify/i }).click()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notify/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /seat/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /mark urgent/i })).toBeDisabled()
    })

    resolve(makeParty())
  })

  it('invalidates waitlist query cache after successful action', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    render(
      <QueryClientProvider client={queryClient}>
        <PartyActions party={makeParty()} />
      </QueryClientProvider>
    )

    await screen.findByRole('button', { name: /notify/i })
    await screen.getByRole('button', { name: /notify/i }).click()

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['waitlist'] })
    })
  })

  it('calls setLastAction with notify action after successful notify', async () => {
    renderWithQuery(<PartyActions party={makeParty()} />)
    await screen.findByRole('button', { name: /notify/i })
    await screen.getByRole('button', { name: /notify/i }).click()
    await waitFor(() => {
      expect(mockSetLastAction).toHaveBeenCalledWith({ type: 'notify', payload: '1' })
    })
  })

  it('calls setLastAction with seat action after successful seat', async () => {
    renderWithQuery(<PartyActions party={makeParty({ status: 'notified' })} />)
    await screen.findByRole('button', { name: /seat/i })
    await screen.getByRole('button', { name: /seat/i }).click()
    await waitFor(() => {
      expect(mockSetLastAction).toHaveBeenCalledWith({ type: 'seat', payload: '1' })
    })
  })

  it('calls setLastAction with cancel action after successful cancel', async () => {
    renderWithQuery(<PartyActions party={makeParty()} />)
    await screen.findByRole('button', { name: /cancel/i })
    await screen.getByRole('button', { name: /cancel/i }).click()
    await waitFor(() => {
      expect(mockSetLastAction).toHaveBeenCalledWith({ type: 'cancel', payload: '1' })
    })
  })

  it('calls setLastAction with toggle_urgent action after successful urgent toggle', async () => {
    renderWithQuery(<PartyActions party={makeParty()} />)
    await screen.findByRole('button', { name: /mark urgent/i })
    await screen.getByRole('button', { name: /mark urgent/i }).click()
    await waitFor(() => {
      expect(mockSetLastAction).toHaveBeenCalledWith({ type: 'toggle_urgent', payload: '1' })
    })
  })

  it('shows error toast when mutation fails', async () => {
    mockUpdateParty.mockRejectedValue(new Error('Network error'))
    renderWithQuery(<PartyActions party={makeParty()} />)
    await screen.findByRole('button', { name: /notify/i })
    await screen.getByRole('button', { name: /notify/i }).click()
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith({ message: 'Action failed. Please try again.', partyId: '1', actionType: 'notify' })
    })
  })
})
