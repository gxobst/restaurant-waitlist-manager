import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import fs from 'fs'
import path from 'path'
import HostView from '../pages/HostView'
import ManagerSettings from '../pages/ManagerSettings'
import Reports from '../pages/Reports'
import GuestStatus from '../pages/GuestStatus'
import TableSelectionModal from '../components/TableSelectionModal'
import ManagerPinModal from '../components/ManagerPinModal'
import AddPartyForm from '../components/AddPartyForm'
import type { Party, Table } from '../types/index.ts'

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'outerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

vi.mock('../services/index.ts', () => ({
  getWaitlist: vi.fn(),
  getWaitlistPaused: vi.fn(),
  getTables: vi.fn(),
  createTable: vi.fn(),
  deleteTable: vi.fn(),
  getAvgTurnoverTime: vi.fn(),
  setAvgTurnoverTime: vi.fn(),
  changePin: vi.fn(),
  getDailyReport: vi.fn(),
  getPartyByToken: vi.fn(),
  confirmWaiting: vi.fn(),
  cancelParty: vi.fn(),
  updateParty: vi.fn(),
  updateTable: vi.fn(),
  undoAction: vi.fn(),
  setWaitlistPaused: vi.fn(),
}))

vi.mock('../store/appStore.ts', () => ({
  useAppStore: vi.fn((selector: (s: {
    isManager: boolean
    setIsManager: (v: boolean) => void
    wsConnected: boolean
    setWsConnected: (v: boolean) => void
    toasts: Array<{ id: string; message: string; partyId: string; actionType: string }>
    addToast: (toast: { message: string; partyId: string; actionType: string }) => void
    removeToast: (id: string) => void
    setLastAction: (action: { type: string; payload?: unknown } | null) => void
    currentView: string
    lastAction: { type: string; payload?: unknown } | null
    setCurrentView: (view: string) => void
  }) => unknown) =>
    selector({
      isManager: false,
      setIsManager: vi.fn(),
      wsConnected: true,
      setWsConnected: vi.fn(),
      toasts: [],
      addToast: vi.fn(),
      removeToast: vi.fn(),
      setLastAction: vi.fn(),
      currentView: 'host',
      lastAction: null,
      setCurrentView: vi.fn(),
    })
  ),
}))

import {
  getWaitlist,
  getWaitlistPaused,
  getTables,
  getDailyReport,
  getPartyByToken,
  updateParty,
} from '../services/index.ts'
import { useAppStore } from '../store/appStore.ts'

const mockGetWaitlist = vi.mocked(getWaitlist)
const mockGetWaitlistPaused = vi.mocked(getWaitlistPaused)
const mockGetTables = vi.mocked(getTables)
const mockGetDailyReport = vi.mocked(getDailyReport)
const mockGetPartyByToken = vi.mocked(getPartyByToken)
const mockUpdateParty = vi.mocked(updateParty)

const mockParty: Party = {
  id: '1',
  name: 'Smith',
  party_size: 4,
  phone: '5551234567',
  email: null,
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
}

const mockTables: Table[] = [
  { id: 't1', capacity: 2, label: 'T1', is_occupied: false, occupied_by_party_id: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 't2', capacity: 4, label: 'T2', is_occupied: false, occupied_by_party_id: null, created_at: '2026-01-01T00:00:00Z' },
]

describe('ResponsiveTablet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWaitlistPaused.mockResolvedValue(false)
    mockGetTables.mockResolvedValue(mockTables)
    mockGetDailyReport.mockResolvedValue({
      date: '2026-01-15',
      total_parties: 12,
      average_wait_minutes: 23.5,
      no_show_rate: 0.08,
      seat_utilization: 0.75,
    })
    mockGetPartyByToken.mockResolvedValue(mockParty)
    mockUpdateParty.mockResolvedValue(mockParty)
  })

  describe('viewport meta tag', () => {
    it('includes width=device-width and initial-scale=1 in index.html', () => {
      const htmlPath = path.resolve(__dirname, '../../index.html')
      const htmlContent = fs.readFileSync(htmlPath, 'utf-8')
      expect(htmlContent).toContain('width=device-width')
      expect(htmlContent).toContain('initial-scale=1')
    })
  })

  describe('sticky header', () => {
    it('renders page content at tablet viewport widths', async () => {
      setViewportWidth(1024)
      mockGetWaitlist.mockResolvedValue([])
      renderWithQuery(
        <MemoryRouter>
          <HostView />
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText('Waitlist')).toBeDefined()
      })
    })

    it('header has sticky top-0 z-50 classes in App source', () => {
      const appPath = path.resolve(__dirname, '../App.tsx')
      const appContent = fs.readFileSync(appPath, 'utf-8')
      expect(appContent).toContain('sticky top-0 z-50')
    })
  })

  describe('touch targets - 48px minimum', () => {
    function assertTouchTargets() {
      const interactiveElements = document.querySelectorAll(
        'button, input, [role="button"], [role="switch"]',
      )
      interactiveElements.forEach((el) => {
        const className = el.getAttribute('class') || ''
        expect(className).toContain('min-h-12')
      })
    }

    it('has min-h-12 on buttons in HostView at 1024px', async () => {
      setViewportWidth(1024)
      mockGetWaitlist.mockResolvedValue([mockParty])
      renderWithQuery(
        <MemoryRouter>
          <HostView />
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText('Smith')).toBeDefined()
      })
      assertTouchTargets()
    })

    it('has min-h-12 on buttons in ManagerSettings at 1024px', async () => {
      setViewportWidth(1024)
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({
          isManager: true,
          setIsManager: vi.fn(),
          wsConnected: true,
          setWsConnected: vi.fn(),
          toasts: [],
          addToast: vi.fn(),
          removeToast: vi.fn(),
          setLastAction: vi.fn(),
          currentView: 'host',
          lastAction: null,
          setCurrentView: vi.fn(),
        })
      )
      renderWithQuery(
        <MemoryRouter initialEntries={['/settings']}>
          <Routes>
            <Route path="/settings" element={<ManagerSettings />} />
            <Route path="/" element={<div>Host</div>} />
          </Routes>
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeDefined()
      })
      assertTouchTargets()
    })

    it('has min-h-12 on buttons in Reports at 1024px', async () => {
      setViewportWidth(1024)
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({
          isManager: true,
          setIsManager: vi.fn(),
          wsConnected: true,
          setWsConnected: vi.fn(),
          toasts: [],
          addToast: vi.fn(),
          removeToast: vi.fn(),
          setLastAction: vi.fn(),
          currentView: 'host',
          lastAction: null,
          setCurrentView: vi.fn(),
        })
      )
      renderWithQuery(
        <MemoryRouter initialEntries={['/reports']}>
          <Routes>
            <Route path="/reports" element={<Reports />} />
            <Route path="/" element={<div>Host</div>} />
          </Routes>
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText('Total Parties')).toBeDefined()
      })
      assertTouchTargets()
    })

    it('has min-h-12 on buttons in GuestStatus at 1024px', async () => {
      setViewportWidth(1024)
      mockGetPartyByToken.mockResolvedValue(mockParty)
      renderWithQuery(
        <MemoryRouter initialEntries={['/status/test-token']}>
          <Routes>
            <Route path="/status/:token" element={<GuestStatus />} />
            <Route path="/" element={<div>Host</div>} />
          </Routes>
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText(/Confirm I.*Waiting/i)).toBeDefined()
      })
      assertTouchTargets()
    })

    it('has min-h-12 on modal buttons at 768px', async () => {
      setViewportWidth(768)
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
      render(
        <QueryClientProvider client={queryClient}>
          <TableSelectionModal party={mockParty} isOpen={true} onClose={vi.fn()} />
        </QueryClientProvider>,
      )
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined()
      })
      const buttons = document.querySelectorAll('button')
      buttons.forEach((btn) => {
        const className = btn.getAttribute('class') || ''
        expect(className).toContain('min-h-12')
      })
    })

    it('has min-h-12 on ManagerPinModal buttons at 768px', async () => {
      setViewportWidth(768)
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
      render(
        <QueryClientProvider client={queryClient}>
          <ManagerPinModal isOpen={true} onClose={vi.fn()} />
        </QueryClientProvider>,
      )
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined()
      })
      const buttons = document.querySelectorAll('button')
      buttons.forEach((btn) => {
        const className = btn.getAttribute('class') || ''
        expect(className).toContain('min-h-12')
      })
    })

    it('has min-h-12 on form inputs at 768px', async () => {
      setViewportWidth(768)
      renderWithQuery(<AddPartyForm />)
      const inputs = document.querySelectorAll('input, textarea')
      inputs.forEach((input) => {
        const className = input.getAttribute('class') || ''
        expect(className).toContain('min-h-12')
      })
    })
  })

  describe('modal centering', () => {
    it('centers TableSelectionModal within 768px container', async () => {
      setViewportWidth(768)
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
      render(
        <QueryClientProvider client={queryClient}>
          <TableSelectionModal party={mockParty} isOpen={true} onClose={vi.fn()} />
        </QueryClientProvider>,
      )
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined()
      })
      const dialog = screen.getByRole('dialog') as HTMLElement
      expect(dialog).toBeInTheDocument()
      const card = dialog.querySelector('.bg-white.rounded-lg') as HTMLElement
      expect(card).toBeInTheDocument()
      expect(card.className).toContain('mx-4')
      expect(card.className).toContain('max-w-md')
    })

    it('centers ManagerPinModal within 768px container', async () => {
      setViewportWidth(768)
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })
      render(
        <QueryClientProvider client={queryClient}>
          <ManagerPinModal isOpen={true} onClose={vi.fn()} />
        </QueryClientProvider>,
      )
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined()
      })
      const dialog = screen.getByRole('dialog') as HTMLElement
      expect(dialog).toBeInTheDocument()
      const card = dialog.querySelector('.bg-white.rounded-lg') as HTMLElement
      expect(card).toBeInTheDocument()
      expect(card.className).toContain('mx-4')
      expect(card.className).toContain('max-w-sm')
    })
  })

  describe('no horizontal overflow', () => {
    it('HostView has no horizontal overflow at 768px', async () => {
      setViewportWidth(768)
      mockGetWaitlist.mockResolvedValue([])
      renderWithQuery(
        <MemoryRouter>
          <HostView />
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText('No parties waiting')).toBeDefined()
      })
      const container = document.querySelector('[class*="space-y-3"]')
      expect(container).not.toBeNull()
      if (container) {
        const containerWidth = container.getBoundingClientRect().width
        const bodyWidth = document.body.getBoundingClientRect().width
        expect(containerWidth).toBeLessThanOrEqual(bodyWidth)
      }
    })

    it('HostView has no horizontal overflow at 1024px', async () => {
      setViewportWidth(1024)
      mockGetWaitlist.mockResolvedValue([mockParty])
      renderWithQuery(
        <MemoryRouter>
          <HostView />
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText('Smith')).toBeDefined()
      })
      const container = document.querySelector('[class*="space-y-3"]')
      expect(container).not.toBeNull()
      if (container) {
        const containerWidth = container.getBoundingClientRect().width
        const bodyWidth = document.body.getBoundingClientRect().width
        expect(containerWidth).toBeLessThanOrEqual(bodyWidth)
      }
    })

    it('ManagerSettings has no horizontal overflow at 768px', async () => {
      setViewportWidth(768)
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({
          isManager: true,
          setIsManager: vi.fn(),
          wsConnected: true,
          setWsConnected: vi.fn(),
          toasts: [],
          addToast: vi.fn(),
          removeToast: vi.fn(),
          setLastAction: vi.fn(),
          currentView: 'host',
          lastAction: null,
          setCurrentView: vi.fn(),
        })
      )
      renderWithQuery(
        <MemoryRouter initialEntries={['/settings']}>
          <Routes>
            <Route path="/settings" element={<ManagerSettings />} />
            <Route path="/" element={<div>Host</div>} />
          </Routes>
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeDefined()
      })
      const container = document.querySelector('[class*="space-y-6"]')
      expect(container).not.toBeNull()
      if (container) {
        const containerWidth = container.getBoundingClientRect().width
        const bodyWidth = document.body.getBoundingClientRect().width
        expect(containerWidth).toBeLessThanOrEqual(bodyWidth)
      }
    })

    it('Reports has no horizontal overflow at 1024px', async () => {
      setViewportWidth(1024)
      vi.mocked(useAppStore).mockImplementation((selector) =>
        selector({
          isManager: true,
          setIsManager: vi.fn(),
          wsConnected: true,
          setWsConnected: vi.fn(),
          toasts: [],
          addToast: vi.fn(),
          removeToast: vi.fn(),
          setLastAction: vi.fn(),
          currentView: 'host',
          lastAction: null,
          setCurrentView: vi.fn(),
        })
      )
      renderWithQuery(
        <MemoryRouter initialEntries={['/reports']}>
          <Routes>
            <Route path="/reports" element={<Reports />} />
            <Route path="/" element={<div>Host</div>} />
          </Routes>
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText('Total Parties')).toBeDefined()
      })
      const container = document.querySelector('[class*="space-y-6"]')
      expect(container).not.toBeNull()
      if (container) {
        const containerWidth = container.getBoundingClientRect().width
        const bodyWidth = document.body.getBoundingClientRect().width
        expect(containerWidth).toBeLessThanOrEqual(bodyWidth)
      }
    })
  })

  describe('viewport simulation', () => {
    it('renders HostView correctly at 768px viewport', async () => {
      setViewportWidth(768)
      mockGetWaitlist.mockResolvedValue([])
      renderWithQuery(
        <MemoryRouter>
          <HostView />
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText('Waitlist')).toBeDefined()
      })
    })

    it('renders HostView correctly at 1024px viewport', async () => {
      setViewportWidth(1024)
      mockGetWaitlist.mockResolvedValue([mockParty])
      renderWithQuery(
        <MemoryRouter>
          <HostView />
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(screen.getByText('Smith')).toBeDefined()
      })
    })
  })
})
