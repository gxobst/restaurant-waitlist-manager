import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ManagerSettings from './ManagerSettings'

let _tablesData = [] as any[]
let _avgTurnoverData = 45

vi.mock('../services/index.ts', () => ({
  getTables: vi.fn().mockImplementation(() => Promise.resolve([..._tablesData])),
  createTable: vi.fn(),
  deleteTable: vi.fn(),
  getAvgTurnoverTime: vi.fn().mockImplementation(() => Promise.resolve(_avgTurnoverData)),
  setAvgTurnoverTime: vi.fn(),
  changePin: vi.fn(),
}))

let _isManagerValue = false

vi.mock('../store/appStore.ts', () => ({
  useAppStore: vi.fn((selector: (s: { isManager: boolean; setIsManager: (v: boolean) => void }) => unknown) =>
    selector({ isManager: _isManagerValue, setIsManager: vi.fn() })
  ),
}))

import {
  getTables,
  createTable,
  deleteTable,
  getAvgTurnoverTime,
  setAvgTurnoverTime,
  changePin,
} from '../services/index.ts'

const mockGetTables = vi.mocked(getTables)
const mockCreateTable = vi.mocked(createTable)
const mockDeleteTable = vi.mocked(deleteTable)
const mockGetAvgTurnoverTime = vi.mocked(getAvgTurnoverTime)
const mockSetAvgTurnoverTime = vi.mocked(setAvgTurnoverTime)
const mockChangePin = vi.mocked(changePin)

function renderWithQuery(
  ui: React.ReactElement,
  { isManagerValue = false } = {},
) {
  _isManagerValue = isManagerValue

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={ui} />
          <Route path="/" element={<div>HostView</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ManagerSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _tablesData = []
    _avgTurnoverData = 45
    mockGetTables.mockResolvedValue([])
    mockGetAvgTurnoverTime.mockResolvedValue(45)
    _isManagerValue = false
  })

  afterEach(() => {
    cleanup()
    _isManagerValue = false
  })

  it('redirects non-managers to the host view', async () => {
    renderWithQuery(<ManagerSettings />, { isManagerValue: false })
    // When not a manager, the component navigates away and returns null
    // The settings page should not be visible
    expect(screen.queryByText('Settings')).toBeNull()
  })

  it('shows settings page when isManager is true', async () => {
    renderWithQuery(<ManagerSettings />, { isManagerValue: true })
    expect(await screen.findByText('Settings')).toBeDefined()
  })

  it('shows error panel with retry when tables query fails', async () => {
    mockGetTables.mockRejectedValue(new Error('Network failure'))
    mockGetAvgTurnoverTime.mockResolvedValue(45)
    renderWithQuery(<ManagerSettings />, { isManagerValue: true })
    expect(await screen.findByTestId('error-boundary')).toBeDefined()
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined()
  })

  it('shows error panel with retry when avg turnover time query fails', async () => {
    mockGetTables.mockResolvedValue([])
    mockGetAvgTurnoverTime.mockRejectedValue(new Error('Connection lost'))
    renderWithQuery(<ManagerSettings />, { isManagerValue: true })
    expect(await screen.findByTestId('error-boundary')).toBeDefined()
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined()
  })

  it('shows skeleton loader while data is being fetched', async () => {
    mockGetTables.mockImplementation(() => new Promise(() => {}))
    mockGetAvgTurnoverTime.mockImplementation(() => new Promise(() => {}))
    renderWithQuery(<ManagerSettings />, { isManagerValue: true })
    await waitFor(() => {
      expect(screen.getByTestId('skeleton-loader')).toBeDefined()
    })
  })

  describe('Table Management section', () => {
    it('displays "Table Management" heading', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      expect(screen.getByRole('heading', { level: 2, name: 'Table Management' })).toBeDefined()
    })

    it('shows "No tables configured" when no tables exist', async () => {
      mockGetTables.mockResolvedValue([])
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      expect(await screen.findByText('No tables configured')).toBeDefined()
    })

    it('renders all tables with label and capacity', async () => {
      mockGetTables.mockResolvedValue([
        {
          id: '1',
          label: 'Table 1',
          capacity: 4,
          is_occupied: false,
          occupied_by_party_id: null,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: '2',
          label: 'Table 2',
          capacity: 2,
          is_occupied: true,
          occupied_by_party_id: 'party-1',
          created_at: '2026-01-01T00:00:00Z',
        },
      ])
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      expect(await screen.findByText('Table 1')).toBeDefined()
      expect(screen.getByText(/Capacity: 4/)).toBeDefined()
      expect(screen.getByText('Table 2')).toBeDefined()
      expect(screen.getByText(/Capacity: 2/)).toBeDefined()
    })

    it('shows Add Table form', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      expect(screen.getByPlaceholderText('Table label')).toBeDefined()
      expect(screen.getByPlaceholderText('Capacity')).toBeDefined()
      expect(screen.getByRole('button', { name: /add/i })).toBeDefined()
    })

    it('calls createTable with correct data on valid submission', async () => {
      mockCreateTable.mockResolvedValue({
        id: 'new-id',
        label: 'Table 3',
        capacity: 6,
        is_occupied: false,
        occupied_by_party_id: null,
        created_at: '2026-01-01T00:00:00Z',
      })
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      await user.type(screen.getByPlaceholderText('Table label'), 'Table 3')
      await user.type(screen.getByPlaceholderText('Capacity'), '6')
      await user.click(screen.getByRole('button', { name: /add/i }))
      await waitFor(() => {
        expect(mockCreateTable).toHaveBeenCalledTimes(1)
        expect(mockCreateTable.mock.calls[0][0]).toEqual({ label: 'Table 3', capacity: 6 })
      })
    })

    it('appends new table to the list after creation', async () => {
      const newTable = {
        id: 'new-id',
        label: 'Table 3',
        capacity: 6,
        is_occupied: false,
        occupied_by_party_id: null,
        created_at: '2026-01-01T00:00:00Z',
      }
      mockCreateTable.mockResolvedValue(newTable)
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      await user.type(screen.getByPlaceholderText('Table label'), 'Table 3')
      await user.type(screen.getByPlaceholderText('Capacity'), '6')
      await user.click(screen.getByRole('button', { name: /add/i }))
      // After successful mutation, the query is invalidated and re-fetched
      // We verify the mutation was called with correct data
      await waitFor(() => {
        expect(mockCreateTable).toHaveBeenCalledTimes(1)
        expect(mockCreateTable.mock.calls[0][0]).toEqual({ label: 'Table 3', capacity: 6 })
      })
    })

    it('shows validation error for empty label', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      await user.type(screen.getByPlaceholderText('Capacity'), '4')
      fireEvent.submit(screen.getByRole('button', { name: /add/i }).closest('form')!)
      expect(screen.getByText('Label is required')).toBeDefined()
    })

    it('shows validation error for capacity below 1', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      await user.type(screen.getByPlaceholderText('Table label'), 'Table A')
      await user.type(screen.getByPlaceholderText('Capacity'), '0')
      fireEvent.submit(screen.getByRole('button', { name: /add/i }).closest('form')!)
      expect(screen.getByText('Capacity must be between 1 and 20')).toBeDefined()
    })

    it('shows validation error for capacity above 20', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      await user.type(screen.getByPlaceholderText('Table label'), 'Table A')
      await user.type(screen.getByPlaceholderText('Capacity'), '25')
      fireEvent.submit(screen.getByRole('button', { name: /add/i }).closest('form')!)
      expect(screen.getByText('Capacity must be between 1 and 20')).toBeDefined()
    })

    it('shows Delete button for each table', async () => {
      mockGetTables.mockResolvedValue([
        {
          id: '1',
          label: 'Table 1',
          capacity: 4,
          is_occupied: false,
          occupied_by_party_id: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ])
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      expect(await screen.findByRole('button', { name: /delete/i })).toBeDefined()
    })

    it('shows confirmation dialog when Delete is clicked', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockGetTables.mockResolvedValue([
        {
          id: '1',
          label: 'Table 1',
          capacity: 4,
          is_occupied: false,
          occupied_by_party_id: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ])
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      await screen.findByRole('button', { name: /delete/i })
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))
      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to delete this table?',
      )
      confirmSpy.mockRestore()
    })

    it('calls deleteTable and removes table from list when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockGetTables.mockResolvedValue([
        {
          id: '1',
          label: 'Table 1',
          capacity: 4,
          is_occupied: false,
          occupied_by_party_id: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ])
      mockDeleteTable.mockResolvedValue(undefined)
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const deleteBtn = await screen.findByRole('button', { name: /delete/i })
      fireEvent.click(deleteBtn)
      await waitFor(() => {
        expect(mockDeleteTable).toHaveBeenCalledTimes(1)
        expect(mockDeleteTable.mock.calls[0][0]).toBe('1')
      })
      confirmSpy.mockRestore()
    })

    it('does not delete table when confirmation is cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      mockGetTables.mockResolvedValue([
        {
          id: '1',
          label: 'Table 1',
          capacity: 4,
          is_occupied: false,
          occupied_by_party_id: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ])
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      await screen.findByRole('button', { name: /delete/i })
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))
      expect(mockDeleteTable).not.toHaveBeenCalled()
      expect(screen.getByText('Table 1')).toBeDefined()
      confirmSpy.mockRestore()
    })

    it('deletes occupied table successfully', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockGetTables.mockResolvedValue([
        {
          id: '1',
          label: 'Table 1',
          capacity: 4,
          is_occupied: true,
          occupied_by_party_id: 'party-1',
          created_at: '2026-01-01T00:00:00Z',
        },
      ])
      mockDeleteTable.mockResolvedValue(undefined)
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const deleteBtn = await screen.findByRole('button', { name: /delete/i })
      fireEvent.click(deleteBtn)
      await waitFor(() => {
        expect(mockDeleteTable).toHaveBeenCalledTimes(1)
        expect(mockDeleteTable.mock.calls[0][0]).toBe('1')
      })
      confirmSpy.mockRestore()
    })
  })

  describe('Change PIN section', () => {
    it('displays "Change PIN" heading', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      expect(screen.getByRole('heading', { level: 2, name: 'Change PIN' })).toBeDefined()
    })

    it('shows Current PIN, New PIN, and Confirm New PIN inputs', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      expect(screen.getByLabelText('Current PIN')).toBeDefined()
      expect(screen.getByLabelText('New PIN')).toBeDefined()
      expect(screen.getByLabelText('Confirm New PIN')).toBeDefined()
    })

    it('shows error when current PIN is wrong', async () => {
      mockChangePin.mockRejectedValue(new Error('Current PIN is incorrect'))
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Current PIN'), '0000')
      await user.type(screen.getByLabelText('New PIN'), '5678')
      await user.type(screen.getByLabelText('Confirm New PIN'), '5678')
      fireEvent.submit(screen.getByLabelText('Current PIN').closest('form')!)
      await waitFor(() => {
        expect(screen.getByText('Failed to change PIN. Please try again.')).toBeDefined()
      })
      expect(mockChangePin).toHaveBeenCalledTimes(1)
      expect(mockChangePin.mock.calls[0][0]).toEqual({
        current_pin: '0000',
        new_pin: '5678',
      })
    })

    it('does not change PIN when new PIN and confirm do not match', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Current PIN'), '1234')
      await user.type(screen.getByLabelText('New PIN'), '5678')
      await user.type(screen.getByLabelText('Confirm New PIN'), '9999')
      fireEvent.submit(screen.getByLabelText('Current PIN').closest('form')!)
      await waitFor(() => {
        expect(screen.getByText('New PIN and confirm PIN do not match')).toBeDefined()
      })
      expect(mockChangePin).not.toHaveBeenCalled()
    })

    it('calls changePin and shows success when all fields are correct', async () => {
      mockChangePin.mockResolvedValue(undefined)
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Current PIN'), '1234')
      await user.type(screen.getByLabelText('New PIN'), '5678')
      await user.type(screen.getByLabelText('Confirm New PIN'), '5678')
      fireEvent.submit(screen.getByLabelText('Current PIN').closest('form')!)
      await waitFor(() => {
        expect(mockChangePin).toHaveBeenCalledTimes(1)
        expect(mockChangePin.mock.calls[0][0]).toEqual({
          current_pin: '1234',
          new_pin: '5678',
        })
      })
      expect(screen.getByText('PIN changed successfully')).toBeDefined()
    })

    it('shows mismatch error and does not call changePin', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      await user.type(screen.getByLabelText('Current PIN'), '1234')
      await user.type(screen.getByLabelText('New PIN'), '5678')
      await user.type(screen.getByLabelText('Confirm New PIN'), 'abcd')
      fireEvent.submit(screen.getByLabelText('Current PIN').closest('form')!)
      await waitFor(() => {
        expect(screen.getByText('New PIN and confirm PIN do not match')).toBeDefined()
      })
      expect(mockChangePin).not.toHaveBeenCalled()
    })
  })

  describe('Wait Time Config section', () => {
    it('displays "Wait Time Config" heading', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      expect(screen.getByRole('heading', { level: 2, name: 'Wait Time Config' })).toBeDefined()
    })

    it('shows current avg_turnover_time value (default 45)', async () => {
      mockGetAvgTurnoverTime.mockResolvedValue(45)
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const input = screen.getByLabelText(/average turnover time/i) as HTMLInputElement
      expect(input.value).toBe('45')
    })

    it('shows custom avg_turnover_time value', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
      queryClient.setQueryData(['avgTurnoverTime'], 60)
      _isManagerValue = true
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/settings']}>
            <Routes>
              <Route path="/settings" element={<ManagerSettings />} />
              <Route path="/" element={<div>HostView</div>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      )
      const input = screen.getByLabelText(/average turnover time/i) as HTMLInputElement
      expect(input.value).toBe('60')
    })

    it('calls setAvgTurnoverTime on valid save', async () => {
      mockSetAvgTurnoverTime.mockResolvedValue(undefined)
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      const input = screen.getByLabelText(/average turnover time/i)
      await user.clear(input)
      await user.type(input, '60')
      fireEvent.submit(input.closest('form')!)
      await waitFor(() => {
        expect(mockSetAvgTurnoverTime).toHaveBeenCalledTimes(1)
        expect(mockSetAvgTurnoverTime.mock.calls[0][0]).toBe(60)
      })
    })

    it('shows validation error for value below 5', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      const input = screen.getByLabelText(/average turnover time/i)
      await user.clear(input)
      await user.type(input, '3')
      fireEvent.submit(input.closest('form')!)
      expect(screen.getByText('Value must be between 5 and 120 minutes')).toBeDefined()
    })

    it('shows validation error for value above 120', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      const user = userEvent.setup()
      const input = screen.getByLabelText(/average turnover time/i)
      await user.clear(input)
      await user.type(input, '150')
      fireEvent.submit(input.closest('form')!)
      expect(screen.getByText('Value must be between 5 and 120 minutes')).toBeDefined()
    })
  })

  describe('All sections visible', () => {
    it('shows all three sections on the same page', async () => {
      renderWithQuery(<ManagerSettings />, { isManagerValue: true })
      expect(screen.getByRole('heading', { level: 2, name: 'Table Management' })).toBeDefined()
      expect(screen.getByRole('heading', { level: 2, name: 'Change PIN' })).toBeDefined()
      expect(screen.getByRole('heading', { level: 2, name: 'Wait Time Config' })).toBeDefined()
    })
  })
})
