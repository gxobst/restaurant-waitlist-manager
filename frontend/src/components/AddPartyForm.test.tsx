import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AddPartyForm from './AddPartyForm'

vi.mock('../services/index.ts', () => ({
  addParty: vi.fn(),
}))

import { addParty } from '../services/index.ts'

const mockAddParty = vi.mocked(addParty)

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

function submitForm() {
  fireEvent.submit(screen.getByRole('button', { name: /add party/i }).closest('form')!)
}

describe('AddPartyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all form fields', () => {
    renderWithQuery(<AddPartyForm />)
    expect(screen.getByLabelText(/name/i)).toBeDefined()
    expect(screen.getByLabelText(/party size/i)).toBeDefined()
    expect(screen.getByLabelText(/phone/i)).toBeDefined()
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(screen.getByLabelText(/notes/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /add party/i })).toBeDefined()
  })

  it('disables submit button when name is empty', () => {
    renderWithQuery(<AddPartyForm />)
    const button = screen.getByRole('button', { name: /add party/i })
    expect(button).toBeDisabled()
  })

  it('disables submit button when party size is empty', async () => {
    const user = userEvent.setup()
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    const button = screen.getByRole('button', { name: /add party/i })
    expect(button).toBeDisabled()
  })

  it('enables submit button when name and party size are filled', async () => {
    const user = userEvent.setup()
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '4')
    const button = screen.getByRole('button', { name: /add party/i })
    expect(button).toBeEnabled()
  })

  it('shows validation error for empty name on submit attempt', async () => {
    const user = userEvent.setup()
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/party size/i), '4')
    submitForm()
    expect(screen.getByText('Name is required')).toBeDefined()
  })

  it('shows validation error for invalid party size', async () => {
    const user = userEvent.setup()
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '15')
    submitForm()
    expect(screen.getByText('Party size must be between 1 and 12')).toBeDefined()
  })

  it('shows validation error for non-integer party size', async () => {
    const user = userEvent.setup()
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '2.5')
    submitForm()
    expect(screen.getByText('Party size must be between 1 and 12')).toBeDefined()
  })

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup()
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '4')
    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    submitForm()
    expect(screen.getByText('Invalid email format')).toBeDefined()
  })

  it('does not show email validation error for empty email', async () => {
    const user = userEvent.setup()
    mockAddParty.mockResolvedValue({
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
      token: crypto.randomUUID(),
    })
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '4')
    submitForm()
    expect(screen.queryByText('Invalid email format')).toBeNull()
  })

  it('calls addParty with correct values on valid submission', async () => {
    const user = userEvent.setup()
    mockAddParty.mockResolvedValue({
      id: '1',
      name: 'Smith',
      party_size: 4,
      phone: '5551234567',
      email: 'smith@example.com',
      status: 'waiting',
      position: 1,
      estimated_wait: null,
      notes: 'Birthday dinner',
      urgent: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      notified_at: null,
      seated_at: null,
      canceled_at: null,
      token: crypto.randomUUID(),
    })
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '4')
    await user.type(screen.getByLabelText(/phone/i), '5551234567')
    await user.type(screen.getByLabelText(/email/i), 'smith@example.com')
    await user.type(screen.getByLabelText(/notes/i), 'Birthday dinner')
    await user.click(screen.getByRole('button', { name: /add party/i }))
    expect(mockAddParty).toHaveBeenCalledWith({
      name: 'Smith',
      party_size: 4,
      phone: '5551234567',
      email: 'smith@example.com',
      notes: 'Birthday dinner',
    })
  })

  it('clears form fields after successful submission', async () => {
    const user = userEvent.setup()
    mockAddParty.mockResolvedValue({
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
      token: crypto.randomUUID(),
    })
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '4')
    await user.click(screen.getByRole('button', { name: /add party/i }))
    await waitFor(() => {
      expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('')
      expect((screen.getByLabelText(/party size/i) as HTMLInputElement).value).toBe('')
    })
  })

  it('displays error message on service failure', async () => {
    const user = userEvent.setup()
    mockAddParty.mockRejectedValue(new Error('Network error'))
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '4')
    await user.click(screen.getByRole('button', { name: /add party/i }))
    await waitFor(() => {
      expect(screen.getByText('Failed to add party. Please try again.')).toBeDefined()
    })
  })

  it('does not clear form on service error', async () => {
    const user = userEvent.setup()
    mockAddParty.mockRejectedValue(new Error('Network error'))
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '4')
    await user.click(screen.getByRole('button', { name: /add party/i }))
    await waitFor(() => {
      expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('Smith')
      expect((screen.getByLabelText(/party size/i) as HTMLInputElement).value).toBe('4')
    })
  })

  it('disables submit button while submission is in flight', async () => {
    const user = userEvent.setup()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolveAddParty!: (value: any) => void
    mockAddParty.mockImplementation(
      () => new Promise((resolve) => { resolveAddParty = resolve })
    )
    renderWithQuery(<AddPartyForm />)
    await user.type(screen.getByLabelText(/name/i), 'Smith')
    await user.type(screen.getByLabelText(/party size/i), '4')
    await user.click(screen.getByRole('button', { name: /add party/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled()
    })
    resolveAddParty!({
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
      token: crypto.randomUUID(),
    })
  })

  it('trims whitespace from name before validation', async () => {
    renderWithQuery(<AddPartyForm />)
    await (await userEvent.setup()).type(screen.getByLabelText(/name/i), '   ')
    await (await userEvent.setup()).type(screen.getByLabelText(/party size/i), '4')
    submitForm()
    expect(screen.getByText('Name is required')).toBeDefined()
  })
})
