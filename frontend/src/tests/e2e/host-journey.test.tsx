import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import HostView from '../../pages/HostView'
import type { Party, Table } from '../../types/index.ts'

vi.mock('../../services/index.ts', () => ({
  getWaitlist: vi.fn(),
  addParty: vi.fn(),
  updateParty: vi.fn(),
  getTables: vi.fn(),
  updateTable: vi.fn(),
  getWaitlistPaused: vi.fn(),
}))

const mockSetLastAction = vi.fn()
const mockAddToast = vi.fn()

vi.mock('../../store/appStore.ts', () => ({
  useAppStore: vi.fn((selector: (s: {
    isManager: boolean
    wsConnected: boolean
    setLastAction: typeof mockSetLastAction
    addToast: typeof mockAddToast
    toasts: unknown[]
    removeToast: () => void
    currentView: string
    setIsManager: (v: boolean) => void
    setWsConnected: (v: boolean) => void
    setCurrentView: (v: string) => void
  }) => unknown) =>
    selector({
      isManager: false,
      wsConnected: false,
      setLastAction: mockSetLastAction,
      addToast: mockAddToast,
      toasts: [],
      removeToast: vi.fn(),
      currentView: 'host',
      setIsManager: vi.fn(),
      setWsConnected: vi.fn(),
      setCurrentView: vi.fn(),
    })
  ),
}))

vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}))

import { getWaitlist, addParty, updateParty, getTables, updateTable, getWaitlistPaused } from '../../services/index.ts'
import { useWebSocket } from '../../hooks/useWebSocket'

const mockGetWaitlist = vi.mocked(getWaitlist)
const mockAddParty = vi.mocked(addParty)
const mockUpdateParty = vi.mocked(updateParty)
const mockGetTables = vi.mocked(getTables)
const mockUpdateTable = vi.mocked(updateTable)
const mockGetWaitlistPaused = vi.mocked(getWaitlistPaused)
const mockUseWebSocket = vi.mocked(useWebSocket)

const baseParty: Party = {
  id: '1',
  name: 'Smith',
  party_size: 4,
  phone: null,
  email: null,
  status: 'waiting',
  position: 1,
  estimated_wait: null,
  notes: null,
  urgent: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  notified_at: null,
  seated_at: null,
  canceled_at: null,
  token: 'test-token',
}

const baseTable: Table = {
  id: 't1',
  capacity: 4,
  label: 'Table 1',
  is_occupied: false,
  occupied_by_party_id: null,
  created_at: '2026-01-01T00:00:00Z',
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </BrowserRouter>
  )
}

describe('HostView e2e journey', () => {
  let currentParties: Party[] = []
  let currentTables: Table[] = [baseTable]

  beforeEach(() => {
    vi.clearAllMocks()
    currentParties = []
    currentTables = [baseTable]

    mockUseWebSocket.mockImplementation(() => undefined)
    mockGetWaitlistPaused.mockResolvedValue(false)

    mockGetWaitlist.mockImplementation(async () => [...currentParties])
    mockGetTables.mockResolvedValue([baseTable])

    mockAddParty.mockImplementation(async (data: { name: string; party_size: number }) => {
      const newParty: Party = {
        ...baseParty,
        id: '1',
        name: data.name,
        party_size: data.party_size,
      }
      currentParties.push(newParty)
      return newParty
    })

    mockUpdateParty.mockImplementation(async (_id: string, data: { status?: string }) => {
      const idx = currentParties.findIndex((p) => p.id === _id)
      if (idx !== -1) {
        if (data.status === 'seated' || data.status === 'canceled' || data.status === 'no_show') {
          currentParties.splice(idx, 1)
        } else {
          currentParties[idx] = { ...currentParties[idx], ...(data as Partial<Party>) }
        }
      }
      return currentParties.find((p) => p.id === _id) ?? { ...baseParty, id: _id }
    })

    mockUpdateTable.mockImplementation(async (_id: string, data: { is_occupied?: boolean; occupied_by_party_id?: string | null }) => {
      const idx = currentTables.findIndex((t) => t.id === _id)
      if (idx !== -1) {
        currentTables[idx] = { ...currentTables[idx], ...data }
      }
      return currentTables[idx] ?? baseTable
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('verifies the complete host workflow: add → notify → seat', async () => {
    const user = userEvent.setup()

    renderWithQuery(<HostView />)

    // Wait for initial data to load and skeleton to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton-loader')).toBeNull()
    })

    // Step 1: Add Party
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '4')
    await user.click(screen.getByRole('button', { name: /add party/i }))

    // Wait for party to appear in the rendered list
    await waitFor(() => {
      expect(screen.getByText('Smith')).toBeDefined()
      expect(screen.getByText('Party of 4')).toBeDefined()
    })

    // Assert the status badge shows Waiting after submission
    expect(screen.getByText('Waiting')).toBeDefined()

    // Assert addParty was called with correct values
    expect(mockAddParty).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Smith',
        party_size: 4,
      }),
    )

    // Step 2: Notify
    await user.click(screen.getByRole('button', { name: /notify/i }))

    await waitFor(() => {
      expect(mockUpdateParty).toHaveBeenCalledWith('1', { status: 'notified' })
    })

    // Assert status badge changed to Notified
    expect(screen.getByText('Notified')).toBeDefined()

    // Step 3: Seat — wait for Seat button to be enabled (it is disabled while waiting)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seat/i })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: /seat/i }))

    // Assert TableSelectionModal opened
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined()
    })
    expect(screen.getByText(/Seat Smith/)).toBeDefined()

    // Click an available table in the modal
    await user.click(screen.getByRole('button', { name: /Table 1/ }))

    // Assert the modal closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    // Assert the party is no longer present in the waitlist
    await waitFor(() => {
      expect(screen.queryByText('Smith')).toBeNull()
      expect(screen.getByText('No parties waiting')).toBeDefined()
    })

    // Assert table was marked occupied
    expect(mockUpdateTable).toHaveBeenCalledWith('t1', {
      is_occupied: true,
      occupied_by_party_id: '1',
    })

    // Assert updateParty was called with seated status
    expect(mockUpdateParty).toHaveBeenCalledWith('1', { status: 'seated' })

    // Verify full status transition chain via call logs
    const updatePartyCalls = mockUpdateParty.mock.calls
    const statuses = updatePartyCalls.map((call: [string, { status?: string }]) => call[1].status)
    expect(statuses).toContain('notified')
    expect(statuses).toContain('seated')
  })
})
