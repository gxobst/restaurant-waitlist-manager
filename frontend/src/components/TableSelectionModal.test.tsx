import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TableSelectionModal from './TableSelectionModal'
import type { Table, Party } from '../types/index.ts'

vi.mock('../services/index.ts', () => ({
  getTables: vi.fn(),
  updateTable: vi.fn(),
  updateParty: vi.fn(),
}))

vi.mock('../store/appStore.ts', () => ({
  useAppStore: vi.fn((selector: (s: { setLastAction: () => void; addToast: () => void }) => () => void) =>
    selector({ setLastAction: vi.fn(), addToast: vi.fn() })
  ),
}))

import { getTables, updateTable, updateParty } from '../services/index.ts'

const mockGetTables = vi.mocked(getTables)
const mockUpdateTable = vi.mocked(updateTable)
const mockUpdateParty = vi.mocked(updateParty)

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    id: '1',
    name: 'Smith',
    party_size: 4,
    phone: '5551234567',
    email: 'smith@example.com',
    status: 'notified',
    position: 1,
    estimated_wait: 15,
    notes: null,
    urgent: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    notified_at: '2026-01-01T00:10:00Z',
    seated_at: null,
    canceled_at: null,
    token: 'test-token',
    ...overrides,
  }
}

function makeTable(overrides: Partial<Table> = {}): Table {
  return {
    id: 't1',
    capacity: 4,
    label: 'Table 1',
    is_occupied: false,
    occupied_by_party_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const mockTables: Table[] = [
  makeTable({ id: 't1', capacity: 2, label: 'T1', is_occupied: false }),
  makeTable({ id: 't2', capacity: 2, label: 'T2', is_occupied: true }),
  makeTable({ id: 't3', capacity: 4, label: 'T3', is_occupied: false }),
  makeTable({ id: 't4', capacity: 4, label: 'T4', is_occupied: true }),
  makeTable({ id: 't5', capacity: 6, label: 'T5', is_occupied: false }),
]

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

describe('TableSelectionModal', () => {
  const onClose = vi.fn()
  const party = makeParty()

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTables.mockResolvedValue(mockTables)
    mockUpdateTable.mockResolvedValue(makeTable())
    mockUpdateParty.mockResolvedValue(makeParty({ status: 'seated' }))
  })

  it('returns null when isOpen is false', () => {
    const { container } = renderWithQuery(
      <TableSelectionModal party={party} isOpen={false} onClose={onClose} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders the modal with party name when isOpen is true', async () => {
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    expect(await screen.findByText(/Seat Smith/)).toBeDefined()
    expect(screen.getByText(/Party of 4/)).toBeDefined()
  })

  it('shows a loading spinner while tables are loading', () => {
    mockGetTables.mockReturnValue(new Promise(() => {}))
    const { container } = renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).not.toBeNull()
  })

  it('displays capacity group headers', async () => {
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByText('2-Top')).toBeDefined()
      expect(screen.getByText('4-Top')).toBeDefined()
      expect(screen.getByText('6-Top')).toBeDefined()
    })
  })

  it('renders table buttons for each table', async () => {
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'T1' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'T2' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'T3' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'T4' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'T5' })).toBeDefined()
    })
  })

  it('dims and disables occupied tables', async () => {
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      const t2 = screen.getByRole('button', { name: 'T2' })
      const t4 = screen.getByRole('button', { name: 'T4' })
      expect(t2).toBeDisabled()
      expect(t4).toBeDisabled()
    })
  })

  it('calls updateTable and updateParty when an available table is clicked', async () => {
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'T1' })).toBeDefined()
    })
    await screen.getByRole('button', { name: 'T1' }).click()
    await waitFor(() => {
      expect(mockUpdateTable).toHaveBeenCalledWith('t1', {
        is_occupied: true,
        occupied_by_party_id: '1',
      })
      expect(mockUpdateParty).toHaveBeenCalledWith('1', { status: 'seated' })
    })
  })

  it('invalidates both waitlist and tables queries after successful seating', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    render(
      <QueryClientProvider client={queryClient}>
        <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
      </QueryClientProvider>
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'T1' })).toBeDefined()
    })
    await screen.getByRole('button', { name: 'T1' }).click()
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tables'] })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['waitlist'] })
    })
  })

  it('closes modal after successful seating', async () => {
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'T1' })).toBeDefined()
    })
    await screen.getByRole('button', { name: 'T1' }).click()
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('closes modal when Cancel is clicked', async () => {
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined()
    })
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes modal when backdrop is clicked', async () => {
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined()
    })
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes modal when Escape is pressed', async () => {
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined()
    })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error message when table fetching fails', async () => {
    mockGetTables.mockRejectedValue(new Error('Network error'))
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByText('Failed to load tables. Please try again.')).toBeDefined()
    })
  })

  it('shows "No tables available" when no tables exist', async () => {
    mockGetTables.mockResolvedValue([])
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByText('No tables available')).toBeDefined()
    })
  })

  it('shows "No tables available" when all tables are occupied', async () => {
    mockGetTables.mockResolvedValue([
      makeTable({ id: 't1', is_occupied: true }),
      makeTable({ id: 't2', is_occupied: true }),
    ])
    renderWithQuery(
      <TableSelectionModal party={party} isOpen={true} onClose={onClose} />
    )
    await waitFor(() => {
      expect(screen.getByText('No tables available')).toBeDefined()
    })
  })
})
